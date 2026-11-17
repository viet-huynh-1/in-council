const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const url = 'file://' + require('path').join(__dirname, '..', 'public', 'index.html');
  const shots = process.argv.slice(2);
  for (const s of shots) {
    const [name, hash, theme, w, h, full] = s.split('|');
    const p = await b.newPage({ viewport: { width: +w || 1360, height: +h || 900 } });
    await p.goto(url + hash); await p.evaluate(t => { setTheme(t); }, theme || 'light'); await p.waitForTimeout(400);
    if (hash === '#timeline' && name.includes('hover')) { const cb = await p.locator('svg.comp').boundingBox(); await p.mouse.move(cb.x + cb.width * 0.72, cb.y + cb.height * 0.4); await p.waitForTimeout(100); }
    await p.screenshot({ path: `/tmp/v3/${name}.png`, fullPage: full === 'full' });
    await p.close();
  }
  await b.close();
})();
