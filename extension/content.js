(function () {
  try {
    const origFetch = window.fetch;
    window.fetch = function () {
      const args = arguments;
      const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
      if (url.indexOf('statement') >= 0 || url.indexOf('extract') >= 0 || url.indexOf('cloudwalk') >= 0) {
        return origFetch.apply(this, args).then(async (res) => {
          try { window.__infyLastResponse = await res.clone().text(); } catch (e) {}
          return res;
        });
      }
      return origFetch.apply(this, args);
    };
  } catch (e) {}
})();
