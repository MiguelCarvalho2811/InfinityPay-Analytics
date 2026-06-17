async function analyzeTransactions(maxCount) {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const results = [];
  const limit = Math.min(maxCount || 999, 999);

  async function closeDialog() {
    const btn = document.querySelector("button[data-testid='icon-icon-navigation-back']");
    if (btn) btn.click();
    else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await sleep(500);
    if (document.querySelector("dialog[open]")) {
      const btn2 = document.querySelector("button[data-testid='icon-icon-navigation-back']");
      if (btn2) btn2.click();
      await sleep(400);
    }
  }

  // Scroll to bottom to trigger lazy loading of all transactions
  const scrollTarget = document.querySelector('[class*="statement"]') || document.querySelector('main, [class*="content"], [class*="list"]') || document.body;
  for (let s = 0; s < 10; s++) {
    scrollTarget.scrollTop = scrollTarget.scrollHeight;
    await sleep(500);
    const prev = scrollTarget.scrollTop;
    scrollTarget.scrollTop = scrollTarget.scrollHeight;
    await sleep(300);
    if (scrollTarget.scrollTop === prev) break;
  }

  const h3Els = [...document.querySelectorAll("h3")].filter(el =>
    el.innerText.toLowerCase().includes("pix")
  );

  for (let i = 0; i < Math.min(h3Els.length, limit); i++) {
    const el = h3Els[i];
    try {
      let pixEnding = '';
      let valor = 0;
      const oldUrl = location.href;
      el.click();

      let dlg = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        if (dlg) break;
        for (let w = 0; w < 40; w++) {
          if (location.href.includes('modal=') && location.href !== oldUrl) {
            await sleep(300);
            dlg = document.querySelector(
              "dialog[open], [role='dialog'], " +
              "[class*='drawer'][class*='open'], [class*='sheet'], " +
              "[data-testid*='drawer'], [data-testid*='modal']"
            );
            if (!dlg) dlg = document.body;
            break;
          }
          await sleep(200);
        }
        if (!dlg && attempt === 0) {
          el.click();
          await sleep(300);
        }
      }

      if (dlg) {
        for (let w = 0; w < 8; w++) {
          if (dlg.innerText.match(/\+?\s*R?\$?\s*[\d.,]+/)) break;
          await sleep(1000);
        }

        const text = dlg.innerText;

        const valM = text.match(/([+-]?)\s*R?\$?\s*([\d.,]+)/);
        if (valM) {
          const sign = valM[1] === '-' ? -1 : 1;
          const raw = valM[2].replace(/\./g, '').replace(',', '.');
          valor = parseFloat(raw) * sign;
        }

        const pm = text.match(/chave pix[\s\S]*?(\d{3,6})(?!\d)/i);
        pixEnding = pm ? pm[1] : '';

        await closeDialog();
      }

      if (valor > 0) results.push({ valor, pixEnding });
    } catch (e) {}
  }

  // Final cleanup
  if (document.querySelector("dialog[open]")) {
    await closeDialog();
  }

  return results;
}
