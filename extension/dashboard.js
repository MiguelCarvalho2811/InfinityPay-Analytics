document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('btn-refresh');
  const exportCsvBtn = document.getElementById('btn-export-csv');
  const exportJsonBtn = document.getElementById('btn-export-json');
  const backLink = document.getElementById('back-link');

  refreshBtn.addEventListener('click', loadDashboard);
  exportCsvBtn.addEventListener('click', exportCSV);
  exportJsonBtn.addEventListener('click', exportJSON);
  backLink.addEventListener('click', () => window.close());

  loadDashboard();

  async function loadDashboard() {
    const { analyses } = await chrome.storage.local.get('analyses');
    const all = analyses || [];

    if (all.length === 0) {
      showEmptyState();
      return;
    }

    const sorted = [...all].sort((a, b) => (b._sortKey || 0) - (a._sortKey || 0));
    const latest = sorted[0];
    const produtos = latest.produtos || [];
    const classified = latest.transactions || [];

    const totalNaoId = latest.totalNaoId ?? classified.filter(tx => tx.tipo === 'incompativel').length;
    const totalSemProduto = latest.totalDesconhecido ?? classified.filter(tx => tx.tipo === 'desconhecido').length;

    updateCards(latest, totalNaoId, totalSemProduto);
    updateProdutos(produtos);
    updateRanking(produtos);
    updateHorarios(classified);
    updateDetalhamento(produtos, classified);
  }

  function updateCards(summary, totalNaoId, totalSemProduto) {
    document.getElementById('card-receita').textContent = summary.totalReceita.toFixed(2);
    document.getElementById('card-vendas').textContent = summary.totalVendas;
    document.getElementById('card-ticket').textContent = summary.ticketMedio.toFixed(2);
    document.getElementById('card-upsells').textContent = summary.totalUpsells;
    document.getElementById('card-nao-id').textContent = totalNaoId;
    document.getElementById('card-sem-produto').textContent = totalSemProduto;
  }

  function updateProdutos(produtos) {
    const list = document.getElementById('produtos-list');

    if (!produtos || produtos.length === 0) {
      list.innerHTML = '<p class="empty-state">Nenhum produto encontrado.</p>';
      return;
    }

    list.innerHTML = produtos.map(p => `
      <div class="product-card">
        <div class="product-name">${p.nome}</div>
        <div class="product-metrics">
          <div class="metric">
            <span class="metric-value">R$ ${p.receita.toFixed(2)}</span>
            <span class="metric-label">Receita</span>
          </div>
          <div class="metric">
            <span class="metric-value">${p.vendas}</span>
            <span class="metric-label">Vendas</span>
          </div>
          <div class="metric">
            <span class="metric-value">R$ ${p.ticketMedio.toFixed(2)}</span>
            <span class="metric-label">Ticket Médio</span>
          </div>
          <div class="metric">
            <span class="metric-value">${p.upsells}</span>
            <span class="metric-label">Upsells</span>
          </div>
          <div class="metric">
            <span class="metric-value">${p.naoId || 0}</span>
            <span class="metric-label">Não Identificadas</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  function updateRanking(produtos) {
    const body = document.getElementById('ranking-body');

    if (!produtos || produtos.length === 0) {
      body.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum dado disponível.</td></tr>';
      return;
    }

    body.innerHTML = produtos.map(p => `
      <tr>
        <td class="td-produto">${p.nome}</td>
        <td class="td-valor">R$ ${p.receita.toFixed(2)}</td>
        <td>${p.vendas}</td>
        <td>${p.upsells}</td>
        <td>${p.naoId || 0}</td>
        <td>R$ ${p.ticketMedio.toFixed(2)}</td>
      </tr>
    `).join('');
  }

  function updateHorarios(transactions) {
    const container = document.getElementById('horarios-container');
    const comHorario = transactions.filter(tx => tx.horario);

    if (comHorario.length === 0) {
      container.innerHTML = '<p class="empty-state">Nenhum dado de horário disponível.</p>';
      return;
    }

    function buildHourly(txs) {
      const h = Array(24).fill(0);
      txs.forEach(tx => {
        const hr = parseInt(tx.horario.split(':')[0], 10);
        if (hr >= 0 && hr < 24) h[hr]++;
      });
      return h;
    }

    function hourLabel(h) { return `${String(h).padStart(2, '0')}h`; }

    function maxIdx(arr) { return arr.indexOf(Math.max(...arr)); }
    function minIdx(arr) {
      const mn = Math.min(...arr);
      const candidates = arr.map((v, i) => v === mn ? i : -1).filter(i => i >= 0);
      return candidates[Math.floor(candidates.length / 2)];
    }

    function stats(txs, hourly) {
      const sorted = [...txs].sort((a, b) => (a.dataHora || a.horario).localeCompare(b.dataHora || b.horario));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const bestH = maxIdx(hourly);
      const worstH = minIdx(hourly);
      return { first, last, bestH, worstH, bestCount: hourly[bestH], worstCount: hourly[worstH] };
    }

    function renderChart(hourly, st, label) {
      const maxVal = Math.max(...hourly, 1);
      const bars = hourly.map((v, h) => {
        const pct = (v / maxVal) * 100;
        return `<div class="horario-bar-wrap" title="${hourLabel(h)}: ${v} venda(s)">
          <div class="horario-bar-count">${v || ''}</div>
          <div class="horario-bar" style="height:${Math.max(pct, 2)}%"></div>
          <div class="horario-bar-label">${hourLabel(h)}</div>
        </div>`;
      }).join('');

      return `
        <div class="horario-chart">${bars}</div>
        <div class="horario-cards">
          <div class="horario-card">
            <div class="horario-card-value">${hourLabel(st.bestH)}</div>
            <div class="horario-card-label">Melhor horário</div>
            <div class="horario-card-hint">${st.bestCount} venda(s)</div>
          </div>
          <div class="horario-card">
            <div class="horario-card-value">${hourLabel(st.worstH)}</div>
            <div class="horario-card-label">Horário mais fraco</div>
            <div class="horario-card-hint">${st.worstCount} venda(s)</div>
          </div>
          <div class="horario-card">
            <div class="horario-card-value">${st.first.horario || '--'}</div>
            <div class="horario-card-label">Primeira venda</div>
          </div>
          <div class="horario-card">
            <div class="horario-card-value">${st.last.horario || '--'}</div>
            <div class="horario-card-label">Última venda</div>
          </div>
        </div>`;
    }

    const geralHourly = buildHourly(comHorario);
    const geralStats = stats(comHorario, geralHourly);

    let html = `<div class="horario-geral">
      <div class="horario-geral-title">Distribuição de Vendas do Dia</div>
      <div class="horario-geral-sub">Todas as vendas encontradas na análise</div>
      ${renderChart(geralHourly, geralStats, 'Geral')}
    </div>`;

    const produtosAgrupados = {};
    comHorario.forEach(tx => {
      const nome = tx.produto || 'Sem Produto';
      if (!produtosAgrupados[nome]) produtosAgrupados[nome] = [];
      produtosAgrupados[nome].push(tx);
    });

    Object.entries(produtosAgrupados).sort((a, b) => b[1].length - a[1].length).forEach(([nome, txs]) => {
      const hourly = buildHourly(txs);
      const st = stats(txs, hourly);
      html += `<div class="horario-produto">
        <div class="horario-produto-title">Horários — ${nome}</div>
        ${renderChart(hourly, st, nome)}
      </div>`;
    });

    container.innerHTML = html;
  }

  function updateDetalhamento(produtos, transactions) {
    const list = document.getElementById('detalhamento-list');

    if (!produtos || produtos.length === 0) {
      list.innerHTML = '<p class="empty-state">Nenhum dado disponível.</p>';
      return;
    }

    let html = produtos.map((p, idx) => {
      const txProduto = transactions.filter(tx => tx.produto === p.nome);
      const principais = txProduto.filter(tx => tx.tipo !== 'upsell' && tx.tipo !== 'incompativel');
      const upsells = txProduto.filter(tx => tx.tipo === 'upsell');
      const incompativel = txProduto.filter(tx => tx.tipo === 'incompativel');

      const principaisStr = principais.map(tx => `R$ ${tx.valor.toFixed(2)}`).join(' + ');
      const upsellsStr = upsells.map(tx => `R$ ${tx.valor.toFixed(2)}`).join(' + ');
      const incompativelStr = incompativel.map(tx => `R$ ${tx.valor.toFixed(2)}`).join(' + ');

      const somaPrincipal = principais.reduce((acc, tx) => acc + tx.valor, 0);
      const somaUpsells = upsells.reduce((acc, tx) => acc + tx.valor, 0);
      const somaIncompativeis = incompativel.reduce((acc, tx) => acc + tx.valor, 0);

      return `
        <div class="detalhe-card">
          <div class="detalhe-header" onclick="toggleDetalhe(this)">
            ${p.nome}
            <span class="detalhe-toggle">&#9660;</span>
          </div>
          <div class="detalhe-body">
            <div class="detalhe-block">
              <div class="detalhe-subtitle">Vendas Principais</div>
              <div class="detalhe-values">${principaisStr || '—'}</div>
              <div class="detalhe-soma">Soma Principal: <strong>R$ ${somaPrincipal.toFixed(2)}</strong></div>
            </div>
            <div class="detalhe-block">
              <div class="detalhe-subtitle">Upsells</div>
              <div class="detalhe-values">${upsellsStr || '—'}</div>
              <div class="detalhe-soma">Soma dos Upsells: <strong>R$ ${somaUpsells.toFixed(2)}</strong></div>
            </div>
            ${incompativel.length > 0 ? `
            <div class="detalhe-block">
              <div class="detalhe-subtitle">Vendas Não Identificadas</div>
              <div class="detalhe-values">${incompativelStr}</div>
              <div class="detalhe-soma">Soma das Não Identificadas: <strong>R$ ${somaIncompativeis.toFixed(2)}</strong></div>
            </div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    const desconhecidos = transactions.filter(tx => tx.tipo === 'desconhecido');
    if (desconhecidos.length > 0) {
      const soma = desconhecidos.reduce((s, tx) => s + tx.valor, 0);
      html += `
        <div class="detalhe-card" style="opacity:.6;border-color:#303030">
          <div class="detalhe-header" style="color:#A0A0A0" onclick="toggleDetalhe(this)">
            Sem Produto
            <span class="detalhe-toggle">&#9660;</span>
          </div>
          <div class="detalhe-body">
            <div class="detalhe-block">
              <div class="detalhe-values">${desconhecidos.map(tx => `R$ ${tx.valor.toFixed(2)}`).join(' + ')}</div>
              <div class="detalhe-soma">Soma: <strong style="color:#A0A0A0">R$ ${soma.toFixed(2)}</strong></div>
            </div>
          </div>
        </div>`;
    }

    list.innerHTML = html;
  }

  function toggleDetalhe(el) {
    const body = el.nextElementSibling;
    const toggle = el.querySelector('.detalhe-toggle');
    if (body.style.display === 'none') {
      body.style.display = '';
      toggle.classList.remove('collapsed');
    } else {
      body.style.display = 'none';
      toggle.classList.add('collapsed');
    }
  }

  function showEmptyState() {
    document.querySelectorAll('.card-value').forEach(el => el.textContent = '-');
    document.getElementById('produtos-list').innerHTML = '<p class="empty-state">Nenhuma análise encontrada. Use "Analisar Vendas" no popup.</p>';
    document.getElementById('ranking-body').innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum dado disponível.</td></tr>';
    document.getElementById('detalhamento-list').innerHTML = '<p class="empty-state">Nenhum dado disponível.</p>';
  }

  async function exportCSV() {
    const { analyses } = await chrome.storage.local.get('analyses');
    if (!analyses || analyses.length === 0) return alert('Nenhum dado para exportar.');

    const rows = [['data', 'produto', 'valor', 'categoria', 'pix', 'horario', 'dataHora']];
    analyses.forEach(a => {
      (a.transactions || []).forEach(tx => {
        rows.push([tx.data, tx.produto || '', tx.valor, tx.categoria || '', tx.pixEnding || '', tx.horario || '', tx.dataHora || '']);
      });
    });

    const csv = rows.map(r => r.join(',')).join('\n');
    downloadFile(csv, 'infinitepay-analytics.csv', 'text/csv');
  }

  async function exportJSON() {
    const { analyses } = await chrome.storage.local.get('analyses');
    if (!analyses || analyses.length === 0) return alert('Nenhum dado para exportar.');

    const json = JSON.stringify(analyses, null, 2);
    downloadFile(json, 'infinitepay-analytics.json', 'application/json');
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
});
