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

    const totalReceita = produtos.reduce((s, p) => s + p.receita, 0);
    const totalVendas = produtos.reduce((s, p) => s + p.vendas, 0);
    const totalUpsells = produtos.reduce((s, p) => s + p.upsells, 0);
    const ticketMedio = totalVendas > 0 ? totalReceita / totalVendas : 0;

    updateCards({ totalReceita, totalVendas, totalUpsells, ticketMedio });
    updateProdutos(produtos);
    updateRanking(produtos);
    updateDetalhamento(produtos, classified);
  }

  function updateCards(summary) {
    document.getElementById('card-receita').textContent = `R$ ${summary.totalReceita.toFixed(2)}`;
    document.getElementById('card-vendas').textContent = summary.totalVendas;
    document.getElementById('card-ticket').textContent = `R$ ${summary.ticketMedio.toFixed(2)}`;
    document.getElementById('card-upsells').textContent = summary.totalUpsells;
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
        </div>
      </div>
    `).join('');
  }

  function updateRanking(produtos) {
    const body = document.getElementById('ranking-body');

    if (!produtos || produtos.length === 0) {
      body.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum dado disponível.</td></tr>';
      return;
    }

    body.innerHTML = produtos.map(p => `
      <tr>
        <td class="td-produto">${p.nome}</td>
        <td class="td-valor">R$ ${p.receita.toFixed(2)}</td>
        <td>${p.vendas}</td>
        <td>${p.upsells}</td>
        <td>R$ ${p.ticketMedio.toFixed(2)}</td>
      </tr>
    `).join('');
  }

  function updateDetalhamento(produtos, transactions) {
    const list = document.getElementById('detalhamento-list');

    if (!produtos || produtos.length === 0) {
      list.innerHTML = '<p class="empty-state">Nenhum dado disponível.</p>';
      return;
    }

    list.innerHTML = produtos.map(p => {
      const txProduto = transactions.filter(tx => tx.produto === p.nome);
      const principais = txProduto.filter(tx => tx.tipo !== 'upsell' && tx.tipo !== 'desconhecido');
      const upsells = txProduto.filter(tx => tx.tipo === 'upsell');

      const principaisStr = principais.map(tx => `R$ ${tx.valor.toFixed(2)}`).join(' + ');
      const upsellsStr = upsells.map(tx => `R$ ${tx.valor.toFixed(2)}`).join(' + ');

      const somaPrincipal = principais.reduce((acc, tx) => acc + tx.valor, 0);
      const somaUpsells = upsells.reduce((acc, tx) => acc + tx.valor, 0);

      return `
        <div class="detalhe-card">
          <div class="detalhe-header">${p.nome}</div>
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
        </div>
      `;
    }).join('');
  }

  function showEmptyState() {
    document.querySelectorAll('.card-value').forEach(el => el.textContent = '-');
    document.getElementById('produtos-list').innerHTML = '<p class="empty-state">Nenhuma análise encontrada. Use "Analisar Vendas" no popup.</p>';
    document.getElementById('ranking-body').innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum dado disponível.</td></tr>';
    document.getElementById('detalhamento-list').innerHTML = '<p class="empty-state">Nenhum dado disponível.</p>';
  }

  async function exportCSV() {
    const { analyses } = await chrome.storage.local.get('analyses');
    if (!analyses || analyses.length === 0) return alert('Nenhum dado para exportar.');

    const rows = [['data', 'produto', 'valor', 'tipo', 'pix']];
    analyses.forEach(a => {
      (a.transactions || []).forEach(tx => {
        rows.push([tx.data, tx.produto || '', tx.valor, tx.tipo || '', tx.pixEnding || '']);
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
