document.addEventListener('DOMContentLoaded', () => {
  let products = [];
  let editingIndex = -1;

  const productList = document.getElementById('product-list');
  const form = document.getElementById('product-form');
  const formTitle = document.getElementById('form-title');
  const editIndexInput = document.getElementById('edit-index');
  const nomeInput = document.getElementById('produto-nome');
  const pixInput = document.getElementById('produto-pix');
  const completoInput = document.getElementById('produto-completo');
  const basicoInput = document.getElementById('produto-basico');
  const upcompletoInput = document.getElementById('produto-upcompleto');
  const upsellList = document.getElementById('upsell-list');
  const addUpsellBtn = document.getElementById('add-upsell');
  const btnSave = document.getElementById('btn-save');
  const btnCancel = document.getElementById('btn-cancel');
  const backLink = document.getElementById('back-link');

  addUpsellBtn.addEventListener('click', () => addUpsellField());
  form.addEventListener('submit', saveProduct);
  btnCancel.addEventListener('click', cancelEdit);
  backLink.addEventListener('click', () => window.close());

  loadProducts();

  async function loadProducts() {
    const data = await chrome.storage.local.get('products');
    products = data.products || [];
    renderProductList();
  }

  function renderProductList() {
    if (products.length === 0) {
      productList.innerHTML = '<p class="empty-state">Nenhum produto cadastrado ainda.</p>';
      return;
    }

    productList.innerHTML = products.map((p, i) => `
      <div class="product-card">
        <div class="product-info">
          <strong>${p.nome}</strong>
          <span class="product-detail">Pix: ****${p.pixEnding}</span>
          <span class="product-detail">Completo: R$ ${p.ticketCompleto.toFixed(2)} | Básico: R$ ${p.ticketBasico.toFixed(2)} | Up: R$ ${p.upCompleto.toFixed(2)}</span>
          ${p.upsells?.length ? `<span class="product-detail">Upsells: ${p.upsells.map(u => `R$ ${u.toFixed(2)}`).join(', ')}</span>` : ''}
        </div>
        <div class="product-actions">
          <button class="btn btn-small btn-edit" data-index="${i}">Editar</button>
          <button class="btn btn-small btn-delete" data-index="${i}">Remover</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => editProduct(parseInt(btn.dataset.index)));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteProduct(parseInt(btn.dataset.index)));
    });
  }

  function addUpsellField(value = '') {
    const div = document.createElement('div');
    div.className = 'upsell-item';
    div.innerHTML = `
      <input type="number" class="upsell-input" placeholder="R$ 0.00" step="0.01" min="0" value="${value}">
      <button type="button" class="btn-remove-upsell">&times;</button>
    `;
    div.querySelector('.btn-remove-upsell').addEventListener('click', () => div.remove());
    upsellList.appendChild(div);
  }

  function getUpsellValues() {
    return Array.from(document.querySelectorAll('.upsell-input'))
      .map(input => parseFloat(input.value))
      .filter(v => !isNaN(v) && v > 0);
  }

  function saveProduct(e) {
    e.preventDefault();

    const nome = nomeInput.value.trim();
    const pixEnding = pixInput.value.trim();
    const ticketCompleto = parseFloat(completoInput.value);
    const ticketBasico = parseFloat(basicoInput.value);
    const upCompleto = parseFloat(upcompletoInput.value);
    const upsells = getUpsellValues();

    if (!nome || !pixEnding || isNaN(ticketCompleto) || isNaN(ticketBasico) || isNaN(upCompleto)) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    const product = { nome, pixEnding, ticketCompleto, ticketBasico, upCompleto, upsells };

    if (editingIndex >= 0) {
      products[editingIndex] = product;
    } else {
      products.push(product);
    }

    chrome.storage.local.set({ products }, () => {
      resetForm();
      renderProductList();
    });
  }

  function editProduct(index) {
    const p = products[index];
    editingIndex = index;
    editIndexInput.value = index;

    formTitle.textContent = 'Editar Produto';
    btnSave.textContent = 'Atualizar';
    btnCancel.classList.remove('hidden');

    nomeInput.value = p.nome;
    pixInput.value = p.pixEnding;
    completoInput.value = p.ticketCompleto;
    basicoInput.value = p.ticketBasico;
    upcompletoInput.value = p.upCompleto;

    upsellList.innerHTML = '';
    (p.upsells || []).forEach(u => addUpsellField(u));
  }

  function deleteProduct(index) {
    if (!confirm(`Remover "${products[index].nome}"?`)) return;

    products.splice(index, 1);
    chrome.storage.local.set({ products }, () => {
      renderProductList();
    });
  }

  function cancelEdit() {
    resetForm();
  }

  function resetForm() {
    editingIndex = -1;
    editIndexInput.value = -1;
    formTitle.textContent = 'Novo Produto';
    btnSave.textContent = 'Salvar';
    btnCancel.classList.add('hidden');
    form.reset();
    upsellList.innerHTML = '';
  }
});
