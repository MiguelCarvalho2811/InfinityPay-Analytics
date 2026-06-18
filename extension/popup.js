document.addEventListener('DOMContentLoaded', () => {
  const btnAnalyze = document.getElementById('btn-analyze');
  const btnConfig = document.getElementById('btn-config');
  const btnDashboard = document.getElementById('btn-dashboard');
  const statusMessage = document.getElementById('status-message');
  const resultArea = document.getElementById('result-area');
  const summaryCards = document.getElementById('summary-cards');
  const configStatus = document.getElementById('config-status');

  checkConfig();
  redirectToStatements();

  btnAnalyze.addEventListener('click', (e) => {
    if (e.shiftKey) showDebugInfo();
    else analyzeSales();
  });
  btnConfig.addEventListener('click', () => openPage('config.html'));
  btnDashboard.addEventListener('click', () => openPage('dashboard.html'));

  async function checkConfig() {
    const { products } = await chrome.storage.local.get('products');
    configStatus.textContent = products?.length
      ? `${products.length} produto(s) configurado(s)`
      : 'Sem produtos configurados';
  }

  async function redirectToStatements() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url?.includes('infinitepay.io/statements')) {
        showStatus('Redirecionando para o extrato...', 'info');
        await chrome.tabs.update(tab?.id, { url: 'https://app.infinitepay.io/statements' });
        await new Promise(resolve => {
          const onUpdated = (tabId, info) => {
            if (tabId === tab.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(onUpdated);
              resolve();
            }
          };
          chrome.tabs.onUpdated.addListener(onUpdated);
          setTimeout(() => { chrome.tabs.onUpdated.removeListener(onUpdated); resolve(); }, 20000);
        });
        showStatus('Extrato carregado!', 'success');
        setTimeout(() => showStatus('', ''), 1500);
      }
    } catch (e) {}
  }

  async function analyzeSales() {
    const { products } = await chrome.storage.local.get('products');
    if (!products || products.length === 0) {
      showStatus('Configure pelo menos um produto primeiro.', 'error');
      return;
    }

    showStatus('Analisando vendas... Aguarde.', 'info');
    btnAnalyze.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url?.includes('infinitepay.io')) {
        showStatus('Acesse a InfinitePay primeiro.', 'error');
        btnAnalyze.disabled = false;
        return;
      }

      showStatus('Extraindo transações... Pode levar alguns minutos.', 'info');

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        args: [999],
        func: analyzeTransactions
      });

      const result = results?.[0]?.result || [];
      const transactions = result.transactions || result;
      const h3Found = result.h3Found || transactions.length;

      if (transactions.length === 0) {
        showStatus('Nenhuma transação encontrada. Verifique se há vendas no extrato.', 'error');
        btnAnalyze.disabled = false;
        return;
      }

      const classified = classifyTransactions(transactions, products);
      const summary = generateSummary(classified);
      await saveAnalysis(summary);

      displaySummary(summary, classified);
      const nid = classified.filter(tx => tx.tipo === 'incompativel').length;
      const desc = classified.filter(tx => tx.tipo === 'desconhecido').length;
      const parts = [`${summary.totalVendas} venda(s)`];
      if (nid) parts.push(`${nid} sem ticket`);
      if (desc) parts.push(`${desc} sem produto`);
      showStatus(`Análise concluída: ${parts.join(', ')}.`, 'success');
    } catch (err) {
      showStatus('Erro ao analisar: ' + err.message, 'error');
    } finally {
      btnAnalyze.disabled = false;
    }
  }

  function classifyTransactions(transactions, products) {
    const pixProductMap = {};
    for (const p of products) {
      if (p.pixEnding) pixProductMap[p.pixEnding] = p;
    }

    return transactions.map(tx => {
      const product = tx.pixEnding ? pixProductMap[tx.pixEnding] : null;

      if (!product) {
        return { ...tx, produto: 'Sem Produto', tipo: 'desconhecido' };
      }

      const candidates = [
        { value: product.ticketCompleto, type: 'completo' },
        { value: product.ticketBasico, type: 'basico' },
        { value: product.upCompleto, type: 'upcompleto' },
        ...(product.upsells || []).map(u => ({ value: u, type: 'upsell' }))
      ];

      let best = candidates[0];
      let bestDiff = Math.abs(tx.valor - best.value);
      for (let i = 1; i < candidates.length; i++) {
        const diff = Math.abs(tx.valor - candidates[i].value);
        if (diff < bestDiff) { bestDiff = diff; best = candidates[i]; }
      }

      return { ...tx, produto: product.nome, tipo: bestDiff <= 0.50 ? best.type : 'incompativel' };
    });
  }

  function generateSummary(classified) {
    const produtosMap = {};
    let totalVendas = 0, totalReceita = 0, totalUpsells = 0, totalNaoId = 0, totalDesconhecido = 0;

    classified.forEach(tx => {
      totalVendas++;
      totalReceita += tx.valor;
      if (tx.tipo === 'desconhecido') {
        totalDesconhecido++;
        const p = produtosMap['Sem Produto'] || (produtosMap['Sem Produto'] = { receita: 0, vendas: 0, upsells: 0, naoId: 0, semProduto: true });
        p.vendas++;
        p.receita += tx.valor;
        return;
      }
      const p = produtosMap[tx.produto] || (produtosMap[tx.produto] = { receita: 0, vendas: 0, upsells: 0, naoId: 0 });
      p.vendas++;
      p.receita += tx.valor;
      if (tx.tipo === 'upsell') { totalUpsells++; p.upsells++; }
      if (tx.tipo === 'incompativel') { totalNaoId++; p.naoId++; }
    });

    const produtos = Object.entries(produtosMap).map(([nome, data]) => ({
      nome, ...data, ticketMedio: data.vendas > 0 ? data.receita / data.vendas : 0
    })).sort((a, b) => {
      if (a.semProduto) return 1;
      if (b.semProduto) return -1;
      return b.receita - a.receita;
    });

    return {
      data: new Date().toISOString().split('T')[0],
      _sortKey: Date.now(),
      totalVendas,
      totalReceita: Math.round(totalReceita * 100) / 100,
      ticketMedio: totalVendas > 0 ? Math.round((totalReceita / totalVendas) * 100) / 100 : 0,
      totalUpsells,
      totalNaoId,
      totalDesconhecido,
      produtos,
      transactions: classified
    };
  }

  async function saveAnalysis(summary) {
    const { analyses } = await chrome.storage.local.get('analyses');
    const all = analyses || [];
    const idx = all.findIndex(a => a.data === summary.data);
    if (idx >= 0) all[idx] = summary; else all.push(summary);
    await chrome.storage.local.set({ analyses: all });
  }

  function displaySummary(summary, classified) {
    resultArea.classList.remove('hidden');
    let html = `
      <div class="summary-card"><div class="value">R$ ${summary.totalReceita.toFixed(2)}</div><div class="label">Receita Total</div></div>
      <div class="summary-card"><div class="value">${summary.totalVendas}</div><div class="label">Vendas</div></div>
      <div class="summary-card"><div class="value">R$ ${summary.ticketMedio.toFixed(2)}</div><div class="label">Ticket Médio</div></div>
      <div class="summary-card"><div class="value">${summary.totalUpsells}</div><div class="label">Upsells</div></div>
      <div class="summary-card"><div class="value">${summary.totalNaoId}</div><div class="label">Não Identificadas</div></div>
      <div class="summary-card"><div class="value">${summary.totalDesconhecido}</div><div class="label">Sem Produto</div></div>
    `;
    if (summary.produtos?.length) {
      html += '<div style="grid-column:1/-1;margin-top:8px"><div style="font-size:11px;color:#A0A0A0;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:8px">Por Produto</div>';
      summary.produtos.forEach(p => {
        const chips = [`${p.vendas} vendas`, `R$ ${p.receita.toFixed(2)}`];
        if (p.upsells) chips.push(`${p.upsells} upsells`);
        if (p.naoId) chips.push(`${p.naoId} não id.`);
        html += `<div style="display:flex;justify-content:space-between;padding:6px 8px;background:#0B0B0B;border-radius:6px;margin-bottom:4px;font-size:12px">
          <span style="color:#F4F4F4">${p.nome}</span>
          <span style="color:#C8FF1A;font-weight:600">${chips.join(' · ')}</span>
        </div>`;
      });
      html += '</div>';
    }
    summaryCards.innerHTML = html;
  }

  function showStatus(msg, type) {
    statusMessage.textContent = msg;
    statusMessage.className = `status ${type}`;
  }

  function openPage(page) {
    chrome.tabs.create({ url: chrome.runtime.getURL(page) });
  }

  async function showDebugInfo() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url?.includes('infinitepay.io')) {
        showStatus('[DEBUG] Acesse a InfinitePay primeiro.', 'error');
        return;
      }
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: async () => {
          const info = {};
          info.url = location.href;
          try {
            const headers = [...document.querySelectorAll('h1,h2,h3,h4')].map(h => h.innerText?.trim()).filter(Boolean);
            info.headings = headers.slice(0, 15);
          } catch(e) {}
          try {
            const h3Pix = [...document.querySelectorAll('h3')].filter(el => el.innerText.toLowerCase().includes('pix'));
            info.h3PixCount = h3Pix.length;
            info.h3PixSamples = h3Pix.slice(0, 5).map(el => el.innerText?.trim().slice(0, 80));
          } catch(e) {}
          try {
            info.txCount = window.__infyTransactions?.length || 0;
          } catch(e) {}
          return info;
        }
      });
      const info = results?.[0]?.result || {};
      let msg = `URL: ${info.url}\n\n`;
      msg += `<h3> Pix encontrados: ${info.h3PixCount}\n`;
      if (info.h3PixSamples?.length) {
        msg += '\nAmostras:\n';
        info.h3PixSamples.forEach(s => msg += `  ${s}\n`);
      }
      msg += `\nAPI transactions: ${info.txCount}`;
      showStatus(msg, 'info');
    } catch (e) {
      showStatus('[DEBUG] ' + e.message, 'error');
    }
  }
});
