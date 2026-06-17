chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      products: [],
      analyses: [],
      settings: { debugMode: false }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getProducts':
      chrome.storage.local.get('products', (data) => {
        sendResponse(data.products || []);
      });
      return true;
    case 'saveProducts':
      chrome.storage.local.set({ products: message.products }, () => {
        sendResponse({ success: true });
      });
      return true;
    case 'getAnalyses':
      chrome.storage.local.get('analyses', (data) => {
        sendResponse(data.analyses || []);
      });
      return true;
    case 'getSettings':
      chrome.storage.local.get('settings', (data) => {
        sendResponse(data.settings || { debugMode: false });
      });
      return true;
    case 'saveSettings':
      chrome.storage.local.set({ settings: message.settings }, () => {
        sendResponse({ success: true });
      });
      return true;
    case 'injectInterceptor':
      injectInterceptorOnTab(sender.tab?.id);
      sendResponse({ success: true });
      return true;
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab?.url?.includes('infinitepay.io/statements') && changeInfo.status === 'loading') {
    injectInterceptorOnTab(tabId);
  }
});

async function injectInterceptorOnTab(tabId) {
  if (!tabId) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: installInterceptor
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: patchXHR
    });
  } catch (e) {
    console.warn('[InfinitePay] Interceptor inject failed:', e);
  }
}

function installInterceptor() {
  if (window.__infyInstalled) return;
  window.__infyInstalled = true;
  window.__infyTransactions = [];
  window.__infyUrls = [];
  window.__infyResponses = {};

  if (typeof window.__infyOrigFetch === 'undefined') {
    window.__infyOrigFetch = window.fetch.bind(window);
  }

  function extractItems(data) {
    if (!data) return [];
    const items = Array.isArray(data) ? data : (data.data || data.results || data.transactions || data.statements || data.entries || []);
    if (!Array.isArray(items)) return [];
    return items.flatMap(i => {
      if (i.transactions || i.entries || i.statements) {
        return extractItems(i.transactions || i.entries || i.statements);
      }
      const raw = i.rawAmount || i.amount_in_cents || 0;
      const formatted = String(i.amount || '');
      const valor = raw > 0 ? raw / 100 : parseFloat(formatted.replace(/\./g, '').replace(',', '.')) || 0;
      const name = (i.title || i.payerName || i.nome || i.payer || i.description || '').replace(/^Pix\s*/i, '').trim();
      return {
        id: i.id || i.transactionId || i.nsu || `${i.dateTime || i.date || ''}_${i.rawAmount || ''}`,
        data: (i.dateTime || i.date || i.createdAt || '').split('T')[0],
        valor,
        pixEnding: String(i.pixEnding || i.pixKeyEnding || i.pixKey || i.finalPix || '').trim(),
        pagador: name,
        status: (i.subtitle || i.status || i.state || 'recebido').toLowerCase(),
        direction: i.direction || 'in'
      };
    }).filter(tx => tx.valor > 0 && tx.direction === 'in');
  }

  window.fetch = function(input, init) {
    const url = typeof input === 'string' ? input : (input?.url || '');
    if (url.includes('/api/') || url.includes('statement') || url.includes('cloudwalk') || url.includes('extract') || url.includes('transaction') || url.includes('balance')) {
      window.__infyUrls.push(url);
      return window.__infyOrigFetch(input, init).then(async res => {
        try {
          const fullText = await res.clone().text();
          const isStmt = url.includes('statement') || url.includes('cloudwalk');
          window.__infyResponses[url + (isStmt ? '_full' : '_preview')] = fullText;
          if (fullText && (fullText[0] === '{' || fullText[0] === '[')) {
            let data;
            try { data = JSON.parse(fullText); } catch (e) { window.__infyResponses[url + '_err'] = e.message; }
            if (data) {
              const items = extractItems(data);
              if (items.length > 0) {
                window.__infyTransactions = items;
              }
            }
          }
        } catch (e) {
          window.__infyResponses[url + '_err'] = e.message;
        }
        return res;
      });
    }
    return window.__infyOrigFetch(input, init);
  };
}



function patchXHR() {
  if (window.__infyXHRPatched) return;
  window.__infyXHRPatched = true;
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  function extractItems(data) {
    if (!data) return [];
    const items = Array.isArray(data) ? data : (data.data || data.results || data.transactions || data.statements || data.entries || []);
    if (!Array.isArray(items)) return [];
    return items.flatMap(i => {
      if (i.transactions || i.entries || i.statements) {
        return extractItems(i.transactions || i.entries || i.statements);
      }
      const raw = i.rawAmount || i.amount_in_cents || 0;
      const formatted = String(i.amount || '');
      const valor = raw > 0 ? raw / 100 : parseFloat(formatted.replace(/\./g, '').replace(',', '.')) || 0;
      const name = (i.title || i.payerName || i.nome || i.payer || i.description || '').replace(/^Pix\s*/i, '').trim();
      return {
        id: i.id || i.transactionId || i.nsu || `${i.dateTime || i.date || ''}_${i.rawAmount || ''}`,
        data: (i.dateTime || i.date || i.createdAt || '').split('T')[0],
        valor,
        pixEnding: String(i.pixEnding || i.pixKeyEnding || i.pixKey || i.finalPix || '').trim(),
        pagador: name,
        status: (i.subtitle || i.status || i.state || 'recebido').toLowerCase(),
        direction: i.direction || 'in'
      };
    }).filter(tx => tx.valor > 0 && tx.direction === 'in');
  }

  XMLHttpRequest.prototype.open = function(method, url) {
    this.__infyUrl = typeof url === 'string' ? url : (url?.toString() || '');
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    const url = this.__infyUrl || '';
    if (url.includes('/api/') || url.includes('statement') || url.includes('cloudwalk') || url.includes('extract') || url.includes('transaction') || url.includes('balance')) {
      if (!window.__infyUrls) window.__infyUrls = [];
      window.__infyUrls.push('[XHR] ' + url);

      this.addEventListener('load', function() {
        try {
          const text = this.responseText || '';
          window.__infyResponses[url + '_xhr_preview'] = text.slice(0, 2000);
          if (text && (text[0] === '{' || text[0] === '[')) {
            let data;
            try { data = JSON.parse(text); } catch (e) {}
            if (data) {
              const items = extractItems(data);
              if (items.length > 0) {
                if (!window.__infyTransactions) window.__infyTransactions = [];
                window.__infyTransactions = items;
              }
            }
          }
        } catch (e) {}
      });
    }
    return origSend.apply(this, arguments);
  };
}
