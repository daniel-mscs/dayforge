const { chromium } = require('playwright'); const fs = require('fs');
const fg = fs.readFileSync(__dirname + '/dayforge-icone.svg', 'utf8').replace(/^<svg /, '<svg width="100%" height="100%" ');
const BG = `<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 42%, #3730a3 0%, #1e1b4b 55%, #0f0d24 100%)"></div>`;
// modo: fg (transparente, 108dp), square (legado c/ cantos), round (círculo), full (sem máscara)
const html = (px, modo) => {
  const raio = modo === 'round' ? '50%' : modo === 'square' ? '18%' : '0';
  // ícones legados: arte ocupa um pouco mais (sem a margem de segurança do adaptativo)
  const escala = modo === "fg" ? 1 : modo === "full" ? 1.12 : 1.32;
  return `<html><body style="margin:0;background:transparent"><div style="position:relative;width:${px}px;height:${px}px;border-radius:${raio};overflow:hidden">
    ${modo === 'fg' ? '' : BG}<div style="position:absolute;inset:0;transform:scale(${escala})">${fg}</div></div></body></html>`;
};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [arq, px, modo] of JSON.parse(process.argv[2])) {
    await p.setViewportSize({ width: px, height: px }); await p.setContent(html(px, modo));
    await p.screenshot({ path: arq, omitBackground: true, clip: { x: 0, y: 0, width: px, height: px } });
  }
  await b.close();
})();
