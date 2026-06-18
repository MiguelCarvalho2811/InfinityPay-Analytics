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

  // Scroll all possible containers to trigger lazy loading
  const scrollCandidates = [...document.querySelectorAll('[class*="statement"], [class*="list"], [class*="content"], [class*="table"], [class*="items"], main, section')].filter(el => el.scrollHeight > el.clientHeight);
  if (scrollCandidates.length === 0) scrollCandidates.push(document.body);
  for (const target of scrollCandidates) {
    for (let s = 0; s < 15; s++) {
      target.scrollTop = target.scrollHeight;
      await sleep(400);
      const prev = target.scrollTop;
      target.scrollTop = target.scrollHeight;
      await sleep(200);
      if (target.scrollTop === prev) break;
    }
  }

  let h3Els = [...document.querySelectorAll("h3")].filter(el => {
    const t = el.innerText.toLowerCase();
    return t.includes("pix") && !t.includes("qr code");
  });

  // Second scroll pass to catch any remaining lazy-loaded items
  for (const target of scrollCandidates) {
    target.scrollTop = target.scrollHeight;
    await sleep(500);
  }
  h3Els = [...document.querySelectorAll("h3")].filter(el => {
    const t = el.innerText.toLowerCase();
    return t.includes("pix") && !t.includes("qr code");
  });

    for (let i = 0; i < Math.min(h3Els.length, limit); i++) {
      const el = h3Els[i];
      try {
        let pixEnding = '';
        let horario = '';
        let dataHora = '';
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

        const timeM = text.match(/(?:•|\bat\b)\s*(\d{1,2}:\d{2})\b/);
        const dateM = text.match(/(\d{1,2}\s+\w+[,.\s]+\d{4})/);
        if (timeM) horario = timeM[1];
        if (dateM) dataHora = `${dateM[1].replace(/[.,]\s*/, ' ') + ' ' + horario}`;

        await closeDialog();
      }

      if (valor > 0) {
        results.push({ valor, pixEnding, horario, dataHora });
      }
    } catch (e) {}
  }

  // Final cleanup
  if (document.querySelector("dialog[open]")) {
    await closeDialog();
  }

  return { transactions: results, h3Found: h3Els.length };
}
