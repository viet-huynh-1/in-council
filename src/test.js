const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text()) && !/ERR_/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const url = 'file://' + require('path').join(__dirname, '..', 'public', 'index.html');
  const routes = ['', '#legco/1970-01-01', '#legco/1975-06-30/chamber', '#exco/1980-01-01', '#senior/1990-01-01', '#all/1986-01-01', '#all/1986-01-01/chamber', '#plc/1997-03-01', '#timeline', '#compare/legco/1984-01-01/1986-01-01', '#people', '#person/P0378', '#connections', '#connections/1970-1979', '#how', '#limits', '#about', '#data', '#poster/legco/1975-01-01', '#poster/exco/1995-01-01'];
  for (const r of routes) {
    await p.goto(url + r); await p.waitForTimeout(250);
    const info = await p.evaluate(() => ({ page: document.body.dataset.page, cards: document.querySelectorAll('.seat').length, dots: document.querySelectorAll('.cseat').length, h1: (document.querySelector('main section:not([hidden]) h1, #seatsview:not([hidden]) h2')||{}).textContent, nodes: document.querySelectorAll('svg.net .pn').length, orgs: document.querySelectorAll('svg.net .on').length }));
    console.log(r || '(home)', JSON.stringify(info));
  }
  // interactions
  await p.goto(url + '#legco/1970-01-01'); await p.waitForTimeout(200);
  await p.fill('#q', 'saunders'); await p.waitForTimeout(100);
  console.log('sugg', await p.evaluate(() => [...document.querySelectorAll('#sugg li[data-i]')].map(l => l.textContent).slice(0, 4)));
  await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  console.log('after pick', await p.evaluate(() => ({ hash: location.hash, notice: (document.querySelector('.notice')||{}).textContent, focus: document.querySelectorAll('.seat.focus').length })));
  await p.fill('#q', 'Lydia'); await p.waitForTimeout(100); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  console.log('lydia', await p.evaluate(() => ({ hash: location.hash, notice: (document.querySelector('.notice')||{}).textContent })));
  await p.fill('#q', 'HSBC'); await p.waitForTimeout(100);
  console.log('sugg hsbc', await p.evaluate(() => [...document.querySelectorAll('#sugg li[data-i]')].map(l => l.textContent).slice(0, 3)));
  await p.goto(url + '#legco/1970-01-01'); await p.waitForTimeout(200);
  await p.selectOption('#unit', 'year'); await p.click('#next'); await p.waitForTimeout(100);
  console.log('year step', await p.evaluate(() => location.hash));
  await p.selectOption('#unit', 'month'); await p.click('#prev'); await p.waitForTimeout(100);
  console.log('month step', await p.evaluate(() => location.hash));
  // drag
  await p.locator('#tl .tlsvg').scrollIntoViewIfNeeded(); const box = await p.locator('#tl .tlsvg').boundingBox();
  await p.mouse.move(box.x + box.width * 0.3, box.y + 40); await p.mouse.down(); await p.mouse.move(box.x + box.width * 0.6, box.y + 40, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
  console.log('drag', await p.evaluate(() => location.hash));
  // play
  await p.click('#play'); await p.waitForTimeout(2300); await p.click('#play');
  console.log('play', await p.evaluate(() => location.hash));
  // click a card -> drawer
  await p.click('.seat >> nth=3'); await p.waitForTimeout(150);
  console.log('drawer', await p.evaluate(() => ({ open: document.querySelector('#drawer').classList.contains('open'), name: document.querySelector('#pname').textContent })));
  await p.keyboard.press('Escape');
  // composition hover
  await p.goto(url + '#timeline'); await p.waitForTimeout(300);
  const cb = await p.locator('svg.comp').boundingBox();
  await p.mouse.move(cb.x + cb.width * 0.7, cb.y + cb.height * 0.5); await p.waitForTimeout(100);
  console.log('tip', await p.evaluate(() => document.querySelector('#tip').textContent.slice(0, 160)));
  for (const g of ['bg', 'eth']) { await p.click(`#cb-group [data-v="${g}"]`); await p.waitForTimeout(150); }
  await p.click('#cb-view [data-v="table"]'); await p.waitForTimeout(150);
  console.log('table rows', await p.evaluate(() => document.querySelectorAll('.ctable tbody tr').length));
  // network select
  await p.goto(url + '#connections'); await p.waitForTimeout(400);
  await p.click('.tally button[data-o="O001"]'); await p.waitForTimeout(150);
  console.log('net detail', await p.evaluate(() => document.querySelector('#n-detail').textContent.slice(0, 200)));
  await p.goto(url + '#poster/legco/1975-01-01'); await p.waitForTimeout(200); await p.emulateMedia({ media: 'print' }); await p.screenshot({ path: '/tmp/v3/print.png', fullPage: true }); await p.emulateMedia({ media: 'screen' });
  await p.goto(url + '#data'); await p.waitForTimeout(200);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-dl="terms"]')]); const path = await dl.path(); const txt = require('fs').readFileSync(path, 'utf8'); console.log('download', dl.suggestedFilename(), txt.split('\n').length, txt.slice(0, 120).replace(/\n/g, ' | '));
  await p.goto(url + '#legco/1990-01-01'); await p.waitForTimeout(200); await p.click('#hl-both'); await p.waitForTimeout(100); console.log('both hits', await p.evaluate(() => document.querySelectorAll('.seat.hit').length));
  await p.click('[data-layout=chamber]'); await p.waitForTimeout(100); console.log('chamber hits', await p.evaluate(() => [document.querySelectorAll('.cseat.hit').length, location.hash]));
  await p.focus('#board .cseat >> nth=5'); await p.keyboard.press('Enter'); await p.waitForTimeout(100); console.log('kbd drawer', await p.evaluate(() => document.querySelector('#drawer').classList.contains('open')));
  await p.keyboard.press('Escape'); await p.goBack(); await p.waitForTimeout(150); console.log('back', await p.evaluate(() => location.hash));
  console.log(errs.length ? errs.join('\n') : 'NO ERRORS');
  await b.close();
})();
