#!/usr/bin/env node
// In Council builder.
//
// Run it from the in-council folder with:   node build.js
// It needs only Node (no installs). It reads the one data file, data/council-data.json,
// and writes the finished site into public/:
//   public/index.html                 the visualizer (same code as before, data built in)
//   public/people/<name>/index.html   one page per person, readable without JavaScript
//   public/people/index.html          the A-Z list of everyone
//   public/assets/in-council.css      the shared look for those pages
//   public/sitemap.xml                every address, for search engines
//
// Other ways to run it:
//   node build.js --visualizer-only                 only public/index.html
//   node build.js --sample P0102,P0300 --out DIR    a few person pages in DIR, for previewing
//                                                    by double-click (links into the live site)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const PUB = path.join(ROOT, 'public');
const DATA_FILE = path.join(ROOT, 'data', 'council-data.json');
const SITE = 'https://council.viet-huynh.com';
const SITE_NAME = 'In Council: Hong Kong, 1960–1997';

// ---------- small helpers ----------
const read = f => fs.readFileSync(f, 'utf8').replace(/\r\n?/g, '\n');
const swap = (s, a, b) => s.split(a).join(b); // replace every copy, with no special characters
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const write = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s, 'utf8'); };
const joinAnd = xs => { xs = xs.filter(Boolean); return xs.length < 2 ? (xs[0] || '') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]; };
const joinList = xs => xs.some(x => /[,(]/.test(x)) ? xs.join('; ') : joinAnd(xs); // posts whose names contain commas are split with semicolons
const joinSemi = xs => xs.length < 2 ? (xs[0] || '') : xs.slice(0, -1).join('; ') + '; and ' + xs[xs.length - 1];
const yr = s => +s.slice(0, 4);

// ---------- 1. the visualizer: the same steps as the old build.py ----------
function visualizerParts() {
  const css = read(path.join(SRC, 'v3.css')) + read(path.join(SRC, 'v3-extra.css'));
  const jsFiles = fs.readdirSync(path.join(SRC, 'js')).filter(f => f.endsWith('.js')).sort();
  const jsRaw = Object.fromEntries(jsFiles.map(f => [f, read(path.join(SRC, 'js', f))]));
  const data = swap(read(DATA_FILE), '</', '<\\/');
  const seal = read(path.join(SRC, 'seal.svg.txt'));
  const glyphs = read(path.join(SRC, 'glyphs.json'));
  const fill = js => swap(swap(swap(js, '__DATA__', data), '__SEAL__', seal), '__GLYPHS__', glyphs);
  const js = fill(jsFiles.map(f => jsRaw[f]).join('\n'));
  const html = swap(swap(swap(read(path.join(SRC, 'shell.html')), '__CSS__', css), '__JS__', js), '__SEAL__', seal);
  return { html, css, seal, jsRaw, fill };
}

// ---------- 2. borrow the visualizer's own date and label code ----------
// The person pages call the visualizer's functions (dates, seat labels, career strip, seals),
// so a page always says exactly what the visualizer says. They run here without a browser.
function visualizerHelpers(parts) {
  const stub = () => { const f = function () {}; const p = new Proxy(f, {
    get: (t, k) => k === Symbol.iterator ? function* () {} : k === Symbol.toPrimitive ? () => '' : k === 'length' ? 0 : p,
    apply: () => p, construct: () => p, set: () => true }); return p; };
  const ctx = { console, document: stub(), window: stub(), localStorage: stub(), location: stub(), navigator: stub(),
    matchMedia: () => ({ matches: false }), addEventListener: () => {}, setTimeout: () => 0, clearTimeout: () => {},
    requestAnimationFrame: () => 0, innerWidth: 1200, innerHeight: 800 };
  const code = ['01-core.js', '03-search-profile.js'].map(f => parts.fill(parts.jsRaw[f])).join('\n') +
    '\n;globalThis.__H={D,P,T,TBYPID,BODY,BODYNAME,TIERCOL,BKEY,KEY,ORGS,MIN,MAX,GLYPHS,fd,span,postName,label,careerSVG,sealChar,stoneSVG,nameOf,affOf,bgOf,dateFrac};';
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: 'visualizer-helpers.js' });
  return ctx.__H;
}

// ---------- 3. addresses ----------
function slugify(s) {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}
function makeSlugs(H) { // the address saved for each person in the data
  return Object.fromEntries(Object.keys(H.P).map(pid => [pid, H.P[pid].slug || slugify(H.nameOf(pid))]));
}

// ---------- 4. the fixed sentence templates ----------
const NUM = { 1: 'once', 2: 'twice', 3: 'three times', 4: 'four times', 5: 'five times', 6: 'six times', 7: 'seven times', 8: 'eight times', 9: 'nine times' };
const times = n => NUM[n] || `${n} times`;
const COUNCIL = { LC: 'the Legislative Council', EC: 'the Executive Council', PLC: 'the Provisional Legislative Council' };
const SENIOR_ORDER = ['Governor', 'Chief Secretary', 'Colonial Secretary', 'Financial Secretary', 'Attorney General', 'Secretary for Chinese Affairs', 'Secretary for Home Affairs'];
function when(ts) {
  const a0 = Math.min(...ts.map(t => yr(t.s0))), a1 = Math.min(...ts.map(t => yr(t.s1)));
  const b0 = Math.max(...ts.map(t => Math.min(yr(t.e0), 1997))), b1 = Math.max(...ts.map(t => Math.min(yr(t.e1), 1997)));
  const two = (x, y) => x === y ? String(x) : `${x} or ${y}`;
  if (b1 - b0 > 1 || a1 - a0 > 1) return `some time between ${a0} and ${b1}`;
  if (a0 === a1 && b0 === b1) return a0 === b1 ? `in ${a0}` : `between ${a0} and ${b1}`;
  return `from ${two(a0, a1)} to ${two(b0, b1)}`;
}
function years(ts) {
  const a = Math.min(...ts.map(t => yr(t.s0))), b = Math.max(...ts.map(t => Math.min(yr(t.e1), 1997)));
  return a === b ? `${a}` : `${a}–${b}`;
}
const postLabel = t => t.post + (t.post === 'Colonial Secretary' && t.e0 >= '1977-01-01' ? ' (retitled Chief Secretary during 1976)' : '');
function spellsOnce(ts) { // one acting spell is often recorded in LegCo, ExCo and the senior posts at once
  const seen = new Map();
  for (const t of ts) { const k = [t.cap, t.cap === 'acting' ? t.post : t.body, t.s0, t.e1].join('|'); if (!seen.has(k)) seen.set(k, t); }
  return [...seen.values()];
}
function summary(H, pid) {
  const p = H.P[pid], ts = H.TBYPID[pid] || [], nm = H.nameOf(pid);
  const he = p.g === 'Female' ? 'she' : 'he', He = he[0].toUpperCase() + he.slice(1);
  const lead = p.z ? `${nm} (${p.z})` : nm;
  const sub = ts.filter(t => t.cap === 'substantive'), side = ts.filter(t => t.cap !== 'substantive');
  const out = []; let subj = lead;
  const so = sub.filter(t => t.body === 'SO'), gov = so.filter(t => t.post === 'Governor');
  if (gov.length) { out.push(`${subj} was Governor ${when(gov)}.`); subj = He; }
  const rest = so.filter(t => t.post !== 'Governor');
  if (rest.length) {
    const posts = [...new Set(rest.slice().sort((a, b) => a.s0.localeCompare(b.s0)).map(postLabel))];
    if (posts.length === 1) out.push(`${subj} held the post of ${posts[0]} ${when(rest)}.`);
    else out.push(`${subj} held the posts of ` + joinAnd(posts.map(x => `${x} (${years(rest.filter(t => postLabel(t) === x))})`)) + '.');
    subj = He;
  }
  const named = new Set(so.map(t => t.post));
  const bits = []; let govLead = false;
  for (const b of ['LC', 'EC', 'PLC']) {
    let bt = sub.filter(t => t.body === b);
    if (!bt.length) continue;
    if (gov.length && bt.every(t => t.post === 'Governor')) {
      const w = when(bt) === when(gov) ? '' : ' ' + when(bt);
      if (!bits.length) govLead = true;
      bits.push(b === 'EC' ? `presided over ${COUNCIL[b]}${w}` : `was President of ${COUNCIL[b]}${w}`);
      continue;
    }
    bt = bt.filter(t => t.post !== 'Governor');
    const ph = [];
    for (const tier of ['pres', 'exo', 'off', 'unoff', 'ecol', 'fc', 'gc', 'elc', 'plc']) {
      const tt = bt.filter(t => t.tier === tier); if (!tt.length) continue;
      let posts = [...new Set(tt.map(t => t.post))];
      if (tier === 'pres') { ph.push('President'); continue; }
      if (tier === 'plc') continue;
      const base = { exo: 'an ex officio member', off: 'an official member', unoff: b === 'EC' ? 'an unofficial member' : 'an appointed unofficial member',
        ecol: 'a member elected by the Electoral College', fc: 'a member elected by a functional constituency',
        gc: 'a member elected by a geographical constituency', elc: 'a member elected by the Election Committee' }[tier];
      if (tier === 'exo' || tier === 'off') {
        const extra = (b === 'EC' && tier === 'off') ? [] : posts.filter(x => !named.has(x));
        ph.push(base + (extra.length && extra.length <= 2 ? ` (${joinList(extra)})` : ''));
      } else if (tier === 'fc' || tier === 'gc') {
        posts = posts.map(x => x.replace(/^(Functional|Geographical) constituency:\s*/, ''));
        ph.push(base + (posts.length <= 2 ? ` (${joinList(posts)})` : ''));
      } else ph.push(base);
    }
    const first = !bits.length && !govLead;
    bits.push(`sat on ${first ? 'Hong Kong’s ' + COUNCIL[b].slice(4) : COUNCIL[b]} ${when(bt)}` + (ph.length ? `, as ${joinAnd(ph)}` : ''));
  }
  if (bits.length) {
    const pre = govLead ? `As Governor, ${he}` : subj;
    out.push(`${pre} ` + (bits.some(x => x.includes(',')) ? joinSemi(bits) : joinAnd(bits)) + '.');
    subj = He;
  }
  const sp = spellsOnce(side), acts = [];
  for (const post of [...new Set(sp.filter(t => t.cap === 'acting').map(t => t.post))]) {
    const g = sp.filter(t => t.cap === 'acting' && t.post === post);
    acts.push(`acted as ${post} ${times(g.length)} (${years(g)})`);
  }
  const grouped = cap => ['LC', 'EC', 'PLC'].map(b => [b, sp.filter(t => t.cap === cap && t.body === b)]).filter(([, g]) => g.length);
  const pv = grouped('provisional').map(([b, g]) => `on ${COUNCIL[b]} ${times(g.length)} (${years(g)})`);
  if (pv.length) acts.push('sat provisionally, standing in for absent members, ' + joinAnd(pv));
  const tp = grouped('temporary').map(([b, g]) => `${COUNCIL[b]} ${times(g.length)} (${years(g)})`);
  if (tp.length) acts.push('sat as a temporary member of ' + joinAnd(tp));
  if (acts.length) {
    const j = (acts.length > 2 || acts.slice(0, -1).some(a => a.includes(','))) ? joinSemi(acts) : joinAnd(acts);
    out.push(out.length ? `${He} also ${j}.` : `${lead} appears in these records only as a stand-in: ${he} ${j}.`);
  }
  if ((p.nt || []).length) out.push('The sources disagree about some of these dates; see “Where the sources differ” below.');
  return out.join(' ');
}
function roleLabel(H, pid) { // for the browser-tab title
  const ts = H.TBYPID[pid] || [], so = ts.filter(t => t.cap === 'substantive' && t.body === 'SO');
  const held = post => so.filter(t => t.post === post);
  const longest = [...new Set(so.map(t => t.post))].sort((a, b) =>
    held(b).reduce((n, t) => n + yr(t.e1) - yr(t.s0), 0) - held(a).reduce((n, t) => n + yr(t.e1) - yr(t.s0), 0));
  for (const post of [...SENIOR_ORDER, ...longest]) {
    const g = held(post);
    if (g.length) return [post === 'Governor' ? 'Governor of Hong Kong' : 'Hong Kong ' + post, years(g)];
  }
  const short = { LC: 'LegCo', EC: 'ExCo', PLC: 'Provisional LegCo' };
  const bodies = ['LC', 'EC', 'PLC'].filter(b => ts.some(t => t.body === b));
  return ['Hong Kong ' + joinAnd(bodies.map(b => short[b])) + ' member', years(ts.filter(t => bodies.includes(t.body)))];
}
function pageTitle(H, pid) {
  const p = H.P[pid], [lab, y] = roleLabel(H, pid);
  return `${H.nameOf(pid)}${p.z ? ' ' + p.z : ''} – ${lab}, ${y} | In Council`;
}
function pageDescription(H, pid) {
  const p = H.P[pid], ts = H.TBYPID[pid] || [];
  const full = { LC: 'Legislative Council', EC: 'Executive Council', SO: 'senior official posts', PLC: 'Provisional Legislative Council' };
  const bodies = ['LC', 'EC', 'SO', 'PLC'].filter(b => ts.some(t => t.body === b));
  const orgs = [...new Set(H.affOf(pid).map(a => H.ORGS[a.org_id].english_name))];
  const what = ['Exact dates of every seat' + (bodies.includes('SO') ? ' or post' : '')];
  if (ts.some(t => t.cap !== 'substantive')) what.push('stand-in spells');
  if (orgs.length) what.push('links to ' + joinAnd(orgs.slice(0, 2)) + (orgs.length > 2 ? ' and others' : ''));
  return `${H.nameOf(pid)}${p.z ? ` (${p.z})` : ''} on Hong Kong’s ${joinAnd(bodies.map(b => full[b]))}, ${years(ts)}. ${joinAnd(what)}, each with its source.`;
}

// ---------- 5. names on record ----------
function namesOnRecord(H, pid) {
  const p = H.P[pid], nameSrc = p.db ? 'S001' : (p.src || [])[0];
  const rows = [[p.n, 'Name as recorded', nameSrc]];
  if (p.k) rows.push([p.k, 'Name usually used', '']);
  rows.push([p.z || null, 'Chinese name', p.z ? nameSrc : '']);
  const title = (p.ti || '').replace(/^The Honourable\s+/, '');
  if (/^(Sir|Lieutenant-General Sir)$/.test(title)) rows.push([`${title} ${H.nameOf(pid)}`, 'With title', 'S001']);
  if (/^Lord /.test(title)) rows.push([title, 'Title as the LegCo database lists it today', 'S001']);
  if (p.st) rows.push([p.st, p.sts || 'As styled on 1 January 1970', p.sts ? 'S005' : 'S014']);
  for (const [nm, lab, src] of (p.on || [])) rows.push([nm, lab, src]);
  return rows;
}

// ---------- 6. related people ----------
const CANON_POST = { 'Chief Secretary': 'Colonial Secretary', 'Secretary for Chinese Affairs': 'Secretary for Home Affairs' };
function relatedIndex(H) {
  const seq = {}; // post or seat -> holders in order
  for (const t of H.T) {
    if (t.cap !== 'substantive') continue;
    let k = null;
    if (t.body === 'SO') k = 'post:' + (CANON_POST[t.post] || t.post);
    else if (t.seat === 'CBF' && t.body === 'EC') k = 'post:Commander British Forces';
    else if (t.body === 'LC' && /^(OFF|SEC):/.test(t.seat)) k = 'post:' + t.seat.replace(/^(OFF|SEC):/, '');
    else if (/^elected-/.test(t.seat)) k = 'seat:' + t.seat;
    if (k) (seq[k] = seq[k] || []).push(t);
  }
  for (const k in seq) seq[k].sort((a, b) => a.s0.localeCompare(b.s0));
  return seq;
}
function related(H, pid, seq) {
  const groups = [];
  const he = H.P[pid].g === 'Female' ? 'her' : 'him', He = H.P[pid].g === 'Female' ? 'She' : 'He';
  const mine = H.TBYPID[pid] || [];
  const forWhom = new Map(); const addFor = (o, t) => (forWhom.get(o) || forWhom.set(o, []).get(o)).push(t);
  for (const t of mine) {
    if (t.for && t.for !== pid) addFor(t.for, t);
    else if (t.cap === 'acting') { // as the visualizer labels it: acting for whoever held the post on the first day
      const d = t.s1 <= t.e0 ? t.s1 : t.s0;
      for (const h of H.T) if (h.cap === 'substantive' && h.body === t.body && h.seat === t.seat && h.pid !== pid && h.s0 <= d && d <= h.e1) addFor(h.pid, t);
    }
  }
  for (const [o, list] of forWhom) forWhom.set(o, [...new Map(list.map(t => [t.s0 + t.post, t])).values()]);
  if (forWhom.size) groups.push([`${He} stood in for`, [...forWhom].map(([o, ts]) => [o, years(ts)])]);
  const byOthers = new Map(); const addBy = (o, t) => (byOthers.get(o) || byOthers.set(o, []).get(o)).push(t);
  for (const t of H.T) if (t.for === pid && t.pid !== pid) addBy(t.pid, t);
  for (const h of mine) if (h.cap === 'substantive') for (const t of H.T) {
    if (t.cap !== 'acting' || t.for || t.pid === pid || t.body !== h.body || t.seat !== h.seat) continue;
    const d = t.s1 <= t.e0 ? t.s1 : t.s0; if (h.s0 <= d && d <= h.e1) addBy(t.pid, t);
  }
  if (byOthers.size) groups.push([`Stood in for ${he}`, [...byOthers].map(([o, ts]) => [o, years(ts)])]);
  for (const k in seq) {
    const list = seq[k]; if (!list.some(t => t.pid === pid)) continue;
    const name = k.replace(/^(post|seat):/, '').replace(/^elected-\w+:/, '');
    if (k.startsWith('post:')) {
      const holders = []; for (const t of list) if (!holders.length || holders[holders.length - 1].pid !== t.pid) holders.push({ pid: t.pid, ts: [t] }); else holders[holders.length - 1].ts.push(t);
      const before = new Set(), after = new Set();
      holders.forEach((h, i) => { if (h.pid !== pid) return; if (holders[i - 1] && holders[i - 1].pid !== pid) before.add(holders[i - 1].pid); if (holders[i + 1] && holders[i + 1].pid !== pid) after.add(holders[i + 1].pid); });
      const yrsOf = o => years(list.filter(t => t.pid === o));
      if (before.size) groups.push([`Before ${he} as ${name}`, [...before].map(o => [o, yrsOf(o)])]);
      if (after.size) groups.push([`After ${he} as ${name}`, [...after].map(o => [o, yrsOf(o)])]);
    } else {
      const others = [...new Set(list.filter(t => t.pid !== pid).map(t => t.pid))];
      if (others.length) groups.push([`Also elected for ${name}`, others.map(o => [o, years(list.filter(t => t.pid === o))])]);
    }
  }
  for (const a of H.affOf(pid)) {
    const o = H.ORGS[a.org_id];
    const others = H.D.affiliations.filter(x => x.org_id === a.org_id && x.person_id !== pid);
    if (others.length) groups.push([`Also linked to ${o.english_name}`, others.map(x => [x.person_id, [x.role, x.start_year && x.end_year ? (x.start_year === x.end_year ? x.start_year : `${x.start_year}–${x.end_year}`) : (x.start_year || x.end_year || '')].filter(Boolean).join(', ')])]);
  }
  const seen = new Set(); // one group per heading; people in date order
  return groups.filter(([h]) => !seen.has(h) && seen.add(h))
    .map(([h, list]) => [h, list.slice().sort((x, y) => String(x[1]).replace(/\D*(\d{4}).*/, '$1').localeCompare(String(y[1]).replace(/\D*(\d{4}).*/, '$1')))]);
}

// ---------- 7. one person's page ----------
function personPage(H, pid, ctx) {
  const p = H.P[pid], nm = H.nameOf(pid), ts = (H.TBYPID[pid] || []).slice().sort((a, b) => a.s0.localeCompare(b.s0) || a.body.localeCompare(b.body));
  const url = `${SITE}/people/${ctx.slugs[pid]}/`;
  const viz = ctx.vizBase; // where links into the visualizer point
  const personHref = o => ctx.preview ? `../${ctx.slugs[o]}/index.html` : `../${ctx.slugs[o]}/`;
  const refs = []; const ref = ids => String(ids || '').split(/[;,]/).map(s => s.trim()).filter(Boolean).map(i => { if (!refs.includes(i)) refs.push(i); return `<sup class="r"><a href="#src-${refs.indexOf(i) + 1}">${refs.indexOf(i) + 1}</a></sup>`; }).join('');
  const unk = '<span class="unk">Not yet sourced</span>';
  const vizLinks = s => s.replace(/href="#/g, `href="${viz}#`);
  const shortB = { LC: 'LegCo', EC: 'ExCo', SO: 'Senior Officials', PLC: 'Provisional LegCo' };
  const jd = t => t.s1 <= t.e0 ? t.s1 : t.s0;
  const bodyOrder = { LC: 0, EC: 1, PLC: 2, SO: 3 };
  const byStart = xs => xs.slice().sort((x, y) => x.s0.localeCompare(y.s0) || bodyOrder[x.body] - bodyOrder[y.body]);
  const main = byStart(ts.filter(t => t.cap === 'substantive' && t.body !== 'SO'))[0] || byStart(ts.filter(t => t.cap === 'substantive'))[0] || byStart(ts)[0];
  const desc = pageDescription(H, pid), title = pageTitle(H, pid), sum = summary(H, pid);

  // names
  const names = namesOnRecord(H, pid).map(([v, lab, src]) => `<dt>${esc(lab)}</dt><dd>${v ? `<span${/[\u3400-\u9fff]/.test(v) ? ' class="zh" lang="zh-Hant"' : ''}>${esc(v)}</span>${src ? ref(src) : ''}` : unk}</dd>`).join('');
  const th = [p.ti, p.h].filter(Boolean).join(' · ');
  const titleRow = th ? `<dt>Title and honours</dt><dd>${esc(th)}${ref(p.db ? 'S001' : '')}<br><span class="muted small">As the LegCo database lists them today (final honours).</span></dd>` : '';

  // seats and posts
  const seats = ['LC', 'EC', 'SO', 'PLC'].filter(b => ts.some(t => t.body === b)).map(b => {
    const list = ts.filter(t => t.body === b), full = list.filter(t => t.cap === 'substantive'), side = list.filter(t => t.cap !== 'substantive');
    const one = t => {
      const post = t.post === 'Colonial Secretary' && t.e0 >= '1977-01-01' ? 'Colonial Secretary (retitled Chief Secretary during 1976)' : null;
      const lab = post || H.label({ t, forName: t.for ? H.nameOf(t.for) : '' }, t.s1);
      return `<div class="role ${t.cap !== 'substantive' ? 'prov' : ''}" style="--c:var(${H.TIERCOL[t.tier]})"><div class="rt">${esc(lab)}${ref(t.src)}</div><div class="rd">${esc(H.span(t))}${t.cap !== 'substantive' ? ' · ' + t.cap : ''}</div>${t.note ? `<div class="rn">${esc(t.note)}</div>` : ''}<a class="rj" href="${viz}#${H.BKEY[t.body]}/${jd(t)}">See ${shortB[b]} on ${H.fd(jd(t), 1)}</a></div>`;
    };
    const sideHtml = !side.length ? '' : side.length > 6
      ? `<details><summary>${side.length} spells standing in (acting, provisional or temporary)</summary><div class="roles">${side.map(one).join('')}</div></details>`
      : `<p class="label sub">Standing in</p><div class="roles">${side.map(one).join('')}</div>`;
    return `<h3>${esc(H.BODYNAME[b])}</h3>${full.length ? `<div class="roles">${full.map(one).join('')}</div>` : ''}${sideHtml}`;
  }).join('');

  // about
  const dbref = p.db ? 'S001' : '';
  const bgs = H.bgOf(pid);
  const about = [
    ['Born', p.b || p.bp ? esc([p.b, p.bp].filter(Boolean).join(', ')) + ref(dbref) : unk],
    ['Gender', p.g ? esc(p.g) + ref(dbref || 'S005') : unk],
    ['Ethnicity', '<span class="unk">Unknown: no source yet</span>'],
    ['Education', (p.ed || []).length ? p.ed.map(esc).join('<br>') + ref(dbref) : unk],
    ['Occupation', (p.oc || []).length ? p.oc.map(esc).join('<br>') + ref(dbref) + '<br><span class="muted small">As the LegCo database lists it; not dated.</span>' : unk],
    ['Background', bgs.length ? bgs.map(b => `${esc(b[0])}${b[1] ? ' (main)' : ''}${ref(b[2])}`).join('<br>') : unk],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');

  // companies and bodies
  const affs = H.affOf(pid).slice().sort((a, b) => (+a.start_year || 9999) - (+b.start_year || 9999));
  const orgs = affs.length ? `<ul class="plain">${affs.map(a => { const o = H.ORGS[a.org_id];
    const y = a.start_year || a.end_year ? ', ' + (a.start_year === a.end_year ? a.start_year : `${a.start_year || '?'}–${a.end_year || '?'}`) : '';
    return `<li><b>${esc(o.english_name)}</b>${o.chinese_name ? ` <span class="zh" lang="zh-Hant">${esc(o.chinese_name)}</span>` : ''}: ${esc(a.role)}${y}${ref(a.source_ids)}${a.notes ? `<br><span class="muted small">${esc(a.notes)}</span>` : ''}</li>`; }).join('')}</ul>` : `<p>${unk}</p>`;

  // related people
  const rel = related(H, pid, ctx.seq);
  const relHtml = rel.length ? `<section><h2>Related people</h2><dl class="facts rel">${rel.map(([h, list]) => `<dt>${esc(h)}</dt><dd>${list.map(([o, extra]) => `<a href="${personHref(o)}">${esc(H.nameOf(o))}</a>${H.P[o].z ? ` <span class="zh" lang="zh-Hant">${esc(H.P[o].z)}</span>` : ''}${extra ? ` <span class="muted">(${esc(extra)})</span>` : ''}`).join('<br>')}</dd>`).join('')}</dl></section>` : '';

  const notes = (p.nt || []).length ? `<section><h2>Where the sources differ</h2><div class="notes">${p.nt.map(n => `<p>${esc(n)}</p>`).join('')}</div></section>` : '';
  const pnote = p.pn ? `<section><h2>Note</h2><p class="pnote">${esc(p.pn)}</p></section>` : '';

  // sources, numbered in reading order
  const srcHtml = `<section><h2>Sources</h2><ol class="srcs">${refs.map((i, k) => { const s = H.D.sources[i]; if (!s) return '';
    const extra = i === 'S001' && p.db ? ` · <a href="https://app.legco.gov.hk/member_front/english/library/member_detail.aspx?id=${esc(p.db)}">${p.g === 'Female' ? 'Her' : 'His'} profile in the database</a>` : '';
    return `<li id="src-${k + 1}"><span class="k">${k + 1}</span><span>${s.link ? `<a href="${esc(s.link)}">${esc(s.citation)}</a>` : esc(s.citation)}${s.page_or_record ? ` <span class="muted">${esc(s.page_or_record)}</span>` : ''}${extra}</span></li>`; }).join('')}</ol></section>`;

  // structured data for search engines
  const role = t => { const r = { '@type': 'Role', roleName: H.label({ t }, t.s1), memberOf: { '@type': 'Organization', name: { LC: 'Legislative Council of Hong Kong', EC: 'Executive Council of Hong Kong', PLC: 'Provisional Legislative Council' }[t.body] } };
    const d = (a, b) => a === b ? a : (a.slice(0, 4) === b.slice(0, 4) ? a.slice(0, 4) : null);
    const s = d(t.s0, t.s1), e = t.e1 >= H.MAX && t.e0 >= H.MAX ? null : d(t.e0, t.e1);
    if (s) r.startDate = s; if (e) r.endDate = e; return r; };
  const ld = { '@context': 'https://schema.org', '@type': 'WebPage', url, name: title, description: desc, inLanguage: 'en', dateModified: H.D.built,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE + '/' },
    mainEntity: Object.fromEntries(Object.entries({ '@type': 'Person', '@id': url + '#person', name: nm,
      alternateName: [...new Set(namesOnRecord(H, pid).map(r => r[0]).filter(v => v && v !== nm))],
      gender: p.g || undefined, birthDate: p.b || undefined, birthPlace: p.bp ? { '@type': 'Place', name: p.bp } : undefined,
      honorificSuffix: p.h || undefined, description: sum,
      jobTitle: [...new Set(ts.filter(t => t.body === 'SO' && t.cap === 'substantive').map(t => t.post))],
      hasOccupation: (p.oc || []).map(o => ({ '@type': 'Occupation', name: o })),
      memberOf: ts.filter(t => t.cap === 'substantive' && t.body !== 'SO' && !(t.body === 'EC' && t.seat === 'GOV')).map(role),
      affiliation: [...new Map(affs.map(a => [a.org_id, a])).values()].map(a => ({ '@type': 'Organization', name: H.ORGS[a.org_id].english_name, ...(H.ORGS[a.org_id].chinese_name ? { alternateName: H.ORGS[a.org_id].chinese_name } : {}) })),
      sameAs: p.db ? [`https://app.legco.gov.hk/member_front/english/library/member_detail.aspx?id=${p.db}`] : [],
    }).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length))) };

  const glyphDefs = (() => { const sc = H.sealChar(pid); if (sc.lat) return ''; const k = sc.t.codePointAt(0).toString(16), g = H.GLYPHS[k];
    return g ? `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><symbol id="sg-${k}" viewBox="0 0 1 1" overflow="visible"><path d="${g[0]}"/></symbol></defs></svg>` : ''; })();
  const sc = H.sealChar(pid);
  const seal = H.stoneSVG(sc.t, `seal pseal ${sc.lat ? 'lat' : ''}`, sc.lat);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<link rel="icon" href="../../favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital@0;1&family=Courier+Prime:wght@400;700&family=Noto+Serif+TC:wght@500;700;900&display=swap">
<link rel="stylesheet" href="../../assets/in-council.css">
<script>try{var t=localStorage.getItem('ic-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}</script>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body class="pp">
${glyphDefs}<a class="skip" href="#main">Skip to content</a>
${header(ctx, 'people')}
<main id="main" tabindex="-1" class="page wide">
<article class="person pp-person">
<nav class="crumbs label" aria-label="You are here"><a href="${viz}">In Council</a> › <a href="${ctx.preview ? '../index.html' : '../'}">People</a> › <span>${esc(nm)}</span></nav>
<div class="ptop"><div>
<div class="phead">${seal}<div><h1>${esc(nm)}</h1>${p.z ? `<div class="zhn" lang="zh-Hant">${esc(p.z)}</div>` : ''}</div></div>
<p class="lede">${esc(sum)}</p>
<p class="actions"><a class="go" href="${viz}#person/${pid}">Open in the visualizer</a> <a class="chip" href="${viz}#${H.BKEY[main.body]}/${jd(main)}">See ${shortB[main.body]} on ${H.fd(jd(main))}</a></p>
</div>${vizLinks(H.careerSVG(pid))}</div>
<section><h2>Names on record</h2><dl class="facts">${names}${titleRow}</dl></section>
<section><h2>Seats and posts</h2>${seats}</section>
<section><h2>About</h2><dl class="facts">${about}</dl></section>
<section><h2>Companies and bodies</h2>${orgs}</section>
${relHtml}${notes}${pnote}${srcHtml}
<section class="cite"><h2>How to cite this page</h2><p>${esc(nm)}. <i>${esc(SITE_NAME)}</i>, by Viet Huynh. ${url} (data as of ${H.fd(H.D.built)}).</p></section>
</article>
</main>
${footer(ctx)}
${themeScript()}
</body>
</html>
`;
}

// ---------- 8. shared header, footer and day/night buttons ----------
function header(ctx, here) {
  const v = ctx.vizBase, people = ctx.preview ? (here === 'index' ? 'index.html' : '../index.html') : (here === 'index' ? './' : '../');
  const stop = (go, href, z, e) => `<a class="stop${go === here ? ' on' : ''}" href="${href}"${go === here ? ' aria-current="page"' : ''}><span class="z">${z}</span><span class="dot"></span><span class="e">${e}</span></a>`;
  return `<header class="top">
  <div class="brand">
    <a class="sealink" href="https://viet-huynh.com" title="viet-huynh.com" aria-label="Viet Huynh's website, viet-huynh.com">${ctx.seal}</a>
    <a class="titlelink" href="${v}" title="In Council home"><span class="name">In Council</span><span class="bsub">HONG KONG · 1960–1997 · <span class="zh">立法局 · 行政局</span></span></a>
  </div>
  <nav class="route" aria-label="Sections">
    ${stop('seats', v + '#legco/1970-01-01', '議席', 'Seats')}
    ${stop('timeline', v + '#timeline', '年表', 'Timeline')}
    ${stop('people', people, '人物', 'People')}
    ${stop('connections', v + '#connections', '關係', 'Connections')}
    ${stop('how', v + '#how', '方法', 'How it works')}
    ${stop('limits', v + '#limits', '缺漏', 'Limitations')}
    ${stop('about', v + '#about', '關於', 'About')}
  </nav>
  <div class="theme" role="group" aria-label="Day or night"><button id="th-day" aria-pressed="false" title="Day">日</button><button id="th-night" aria-pressed="false" title="Night">夜</button></div>
</header>`;
}
function footer(ctx) {
  const v = ctx.vizBase;
  return `<footer>
  <span>In Council · a project by <a href="https://viet-huynh.com">Viet Huynh</a> · data as of ${ctx.H.fd(ctx.H.D.built)}</span>
  <span><a href="${v}#limits">What's missing</a> · <a href="${v}#data">Data (CC BY 4.0)</a> · <a href="${v}#how">How it works</a> · Corrections: <a href="mailto:hello@viet-huynh.com">hello@viet-huynh.com</a></span>
</footer>`;
}
function themeScript() {
  return `<script>(function(){var r=document.documentElement,d=document.getElementById('th-day'),n=document.getElementById('th-night');
function dark(){var a=r.dataset.theme;return a?a==='dark':matchMedia('(prefers-color-scheme: dark)').matches;}
function sync(){var k=dark();n.setAttribute('aria-pressed',k);d.setAttribute('aria-pressed',!k);}
function set(t){r.dataset.theme=t;try{localStorage.setItem('ic-theme',t);}catch(e){}sync();}
d.addEventListener('click',function(){set('light');});n.addEventListener('click',function(){set('dark');});sync();})();</script>`;
}

// ---------- 9. the A-Z list (also used as the preview index) ----------
function peopleIndex(H, ctx, pids) {
  const rows = pids.slice().sort((a, b) => H.nameOf(a).localeCompare(H.nameOf(b))).map(pid => {
    const p = H.P[pid], [lab, y] = roleLabel(H, pid);
    return `<li><a href="${ctx.preview ? `${ctx.slugs[pid]}/index.html` : `${ctx.slugs[pid]}/`}">${esc(H.nameOf(pid))}</a>${p.z ? ` <span class="zh" lang="zh-Hant">${esc(p.z)}</span>` : ''} <span class="muted">${esc(lab.replace(/^Hong Kong /, ''))}, ${y}</span></li>`;
  }).join('\n');
  const title = 'People · In Council: Hong Kong, 1960–1997';
  const desc = `Everyone who sat on Hong Kong's Legislative Council or Executive Council, or held a senior official post, between 1960 and 1997: ${pids.length} people, each with a page of dated roles and sources.`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/people/">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital@0;1&family=Courier+Prime:wght@400;700&family=Noto+Serif+TC:wght@500;700;900&display=swap">
<link rel="stylesheet" href="../assets/in-council.css">
<script>try{var t=localStorage.getItem('ic-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}</script>
</head>
<body class="pp">
<a class="skip" href="#main">Skip to content</a>
${header(ctx, 'index')}
<main id="main" tabindex="-1" class="page wide">
<article class="pp-index">
<h1>People</h1>
<p class="lede">${esc(desc)}</p>
<ul class="az">
${rows}
</ul>
</article>
</main>
${footer(ctx)}
${themeScript()}
</body>
</html>
`;
}

// ---------- 10. checks on the data, before anything is built ----------
// Stops with a plain message when an entry points at something that doesn't exist.
function checkData(D) {
  const errs = [], P = D.people, S = D.sources, O = new Set(D.orgs.map(o => o.org_id));
  const isDate = x => /^\d{4}-\d{2}-\d{2}$/.test(x) && !isNaN(Date.parse(x + 'T00:00:00Z'));
  const srcOk = (ids, where) => String(ids || '').split(/[;,]/).map(x => x.trim()).filter(Boolean).forEach(i => { if (!S[i]) errs.push(`${where}: source "${i}" is not in the sources list`); });
  const termIds = new Set();
  for (const t of D.terms) {
    const [id, pid, body, , tier, , cap, s0, s1, e0, e1, src, , forPid] = t, w = `Term ${id} (${(P[pid] || {}).n || pid})`;
    if (termIds.has(id)) errs.push(`${w}: the term ID is used twice`); termIds.add(id);
    if (!P[pid]) errs.push(`${w}: person "${pid}" is not in the people list`);
    if (!['LC', 'EC', 'SO', 'PLC'].includes(body)) errs.push(`${w}: body "${body}" should be LC, EC, SO or PLC`);
    if (!['s', 'a', 'p', 't'].includes(cap)) errs.push(`${w}: capacity "${cap}" should be s, a, p or t`);
    for (const [k, v] of [['first start date', s0], ['last start date', s1], ['first end date', e0], ['last end date', e1]]) if (!isDate(v)) errs.push(`${w}: ${k} "${v}" is not a date like 1970-01-01`);
    if (isDate(s0) && isDate(s1) && s0 > s1) errs.push(`${w}: the start dates are the wrong way round (${s0} after ${s1})`);
    if (isDate(e0) && isDate(e1) && e0 > e1) errs.push(`${w}: the end dates are the wrong way round (${e0} after ${e1})`);
    if (isDate(s0) && isDate(e1) && s0 > e1) errs.push(`${w}: it ends (${e1}) before it starts (${s0})`);
    if (!tier) errs.push(`${w}: the tier is empty`);
    if (forPid && !P[forPid]) errs.push(`${w}: "stood in for" points at "${forPid}", who is not in the people list`);
    srcOk(src, w);
  }
  const slugs = new Map(), withTerms = new Set(D.terms.map(t => t[1]));
  for (const [pid, p] of Object.entries(P)) {
    const w = `Person ${pid} (${p.n || 'no name'})`;
    if (!p.n) errs.push(`${w}: the name is empty`);
    if (!withTerms.has(pid)) errs.push(`${w}: has no seats or posts`);
    for (const s of [p.slug, ...(p.oldslugs || [])].filter(Boolean)) {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)) errs.push(`${w}: the web address "${s}" may only use small letters, numbers and hyphens`);
      if (slugs.has(s)) errs.push(`${w}: the web address "${s}" is also used by ${slugs.get(s)}`); slugs.set(s, pid);
    }
    (p.src || []).forEach(i => srcOk(i, w));
    (p.bg || []).forEach(b => srcOk(b[2], w + ', background'));
    (p.on || []).forEach(o => { if (!Array.isArray(o) || !o[0] || !o[1]) errs.push(`${w}: an "other names" entry needs a name and a label`); else srcOk(o[2], w + ', other names'); });
  }
  for (const a of D.affiliations) {
    const w = `Connection ${a.person_id} → ${a.org_id}`;
    if (!P[a.person_id]) errs.push(`${w}: person "${a.person_id}" is not in the people list`);
    if (!O.has(a.org_id)) errs.push(`${w}: organization "${a.org_id}" is not in the organizations list`);
    for (const k of ['start_year', 'end_year']) if (a[k] !== '' && a[k] != null && !/^\d{4}$/.test(String(a[k]))) errs.push(`${w}: ${k} "${a[k]}" should be a year or blank`);
    srcOk(a.source_ids, w);
  }
  for (const e of D.events) srcOk(e[2], `Event "${e[1]}"`);
  return errs;
}

// New people get a web address saved into the data file, so it never changes afterwards.
function saveNewSlugs(D) {
  const used = new Set(Object.values(D.people).flatMap(p => [p.slug, ...(p.oldslugs || [])].filter(Boolean)));
  const added = [];
  for (const [pid, p] of Object.entries(D.people)) {
    if (p.slug) continue;
    let s = slugify(p.k || p.n); if (used.has(s)) s += '-' + (p.b || pid.toLowerCase());
    p.slug = s; used.add(s); added.push(`${p.k || p.n}: /people/${s}/`);
  }
  if (added.length) fs.writeFileSync(DATA_FILE, JSON.stringify(D), 'utf8');
  return added;
}

// ---------- 11. checks on the finished pages ----------
function checkPages(H, files, slugs) {
  const errs = [], titles = new Map(), descs = new Map(), known = new Set(Object.values(slugs));
  const route = /^#(?:(?:legco|exco|senior|all|plc)\/\d{4}-\d{2}-\d{2}(?:\/chamber)?|person\/P\d{4}|timeline|people|connections|how|limits|about|data)$/;
  for (const [pid, slug] of Object.entries(slugs)) {
    const f = `people/${slug}/index.html`, h = files.get(f), nm = H.nameOf(pid), w = `${nm} (${f})`;
    if (!h) { errs.push(`${w}: page missing`); continue; }
    const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '', desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    const name = nm.replace(/&/g, '&amp;');
    if (!title.includes(name)) errs.push(`${w}: the tab title doesn't contain the name`);
    if (!h.includes(`<h1>${name}</h1>`)) errs.push(`${w}: the main heading isn't the name`);
    if (!desc) errs.push(`${w}: no description`);
    if (H.P[pid].z && !h.includes(H.P[pid].z)) errs.push(`${w}: the Chinese name is missing`);
    (titles.get(title) || titles.set(title, []).get(title)).push(nm); (descs.get(desc) || descs.set(desc, []).get(desc)).push(nm);
    const body = h.replace(/<script[\s\S]*?<\/script>/g, '');
    for (const bad of ['undefined', 'NaN', '[object', '__']) if (body.includes(bad)) errs.push(`${w}: the text "${bad}" appears on the page`);
    for (const m of body.matchAll(/<h2>([^<]*)<\/h2>\s*(<\/section>|<section>|<h2>)/g)) errs.push(`${w}: the "${m[1]}" section is empty`);
    if (!/<p class="lede">[^<]{20,}/.test(body)) errs.push(`${w}: the summary is missing`);
    try { const ld = JSON.parse((h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1]); if (ld.mainEntity.name !== nm) errs.push(`${w}: the hidden Google data names someone else`); }
    catch (e) { errs.push(`${w}: the hidden Google data can't be read`); }
    for (const m of body.matchAll(/href="\.\.\/([a-z0-9-]+)\/"/g)) if (!known.has(m[1])) errs.push(`${w}: links to /people/${m[1]}/, which doesn't exist`);
    for (const m of body.matchAll(/href="\.\.\/\.\.\/(#[^"]*)"/g)) if (!route.test(m[1])) errs.push(`${w}: link into the visualizer "${m[1]}" isn't a real view`);
    for (const m of body.matchAll(/href="#src-(\d+)"/g)) if (!body.includes(`id="src-${m[1]}"`)) errs.push(`${w}: source number ${m[1]} has nothing to jump to`);
  }
  for (const [t, who] of titles) if (who.length > 1) errs.push(`Two pages have the same tab title "${t}": ${who.join(', ')}`);
  for (const [d, who] of descs) if (who.length > 1) errs.push(`Two pages have the same description: ${who.join(', ')}`);
  const idx = files.get('people/index.html') || '';
  for (const slug of known) if (!idx.includes(`href="${slug}/"`)) errs.push(`The A–Z list has no link to /people/${slug}/`);
  const map = files.get('sitemap.xml') || '';
  const locs = (map.match(/<loc>/g) || []).length;
  if (locs !== known.size + 2) errs.push(`The sitemap lists ${locs} addresses; it should list ${known.size + 2}`);
  for (const slug of known) if (!map.includes(`/people/${slug}/</loc>`)) errs.push(`The sitemap is missing /people/${slug}/`);
  if (!(files.get('index.html') || '').includes('href="people/">All people A–Z</a>')) errs.push('The visualizer has lost its "All people A–Z" link');
  return errs;
}

// ---------- 12. make every file in memory ----------
function buildAll(parts, H) {
  const slugs = makeSlugs(H);
  const ctx = { H, slugs, preview: false, seq: relatedIndex(H), seal: parts.seal, vizBase: '../../' };
  const files = new Map();
  files.set('index.html', parts.html);
  files.set('assets/in-council.css', read(path.join(SRC, 'v3.css')) + read(path.join(SRC, 'v3-extra.css')) + read(path.join(SRC, 'person-pages.css')));
  const pids = Object.keys(H.P);
  for (const pid of pids) files.set(`people/${slugs[pid]}/index.html`, personPage(H, pid, ctx));
  for (const pid of pids) for (const old of H.P[pid].oldslugs || []) files.set(`people/${old}/index.html`, forwardPage(slugs[pid], H.nameOf(pid)));
  files.set('people/index.html', peopleIndex(H, { ...ctx, vizBase: '../' }, pids));
  const urls = [`${SITE}/`, `${SITE}/people/`, ...pids.map(pid => `${SITE}/people/${slugs[pid]}/`)];
  files.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc><lastmod>${H.D.built}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  return { files, slugs };
}
function forwardPage(slug, name) { // an old address forwards to the new one
  const url = `${SITE}/people/${slug}/`;
  return `<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><title>${esc(name)} · In Council</title><link rel="canonical" href="${url}"><meta http-equiv="refresh" content="0; url=../${slug}/"></head><body><p>This page has moved to <a href="../${slug}/">${esc(name)}</a>.</p></body></html>\n`;
}
// every generated file under public/, so stale ones can be found
function generatedOnDisk() {
  const out = ['index.html', 'sitemap.xml', 'assets/in-council.css'].filter(f => fs.existsSync(path.join(PUB, f)));
  const dir = path.join(PUB, 'people');
  if (fs.existsSync(dir)) { if (fs.existsSync(path.join(dir, 'index.html'))) out.push('people/index.html');
    for (const d of fs.readdirSync(dir)) if (fs.existsSync(path.join(dir, d, 'index.html'))) out.push(`people/${d}/index.html`); }
  return out;
}

// ---------- 13. run ----------
function main() {
  const args = process.argv.slice(2);
  const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const say = (...x) => console.log(...x);
  const stop = (title, lines) => { console.error(`\nThe builder stopped: ${title}`); lines.slice(0, 40).forEach(l => console.error('  - ' + l)); if (lines.length > 40) console.error(`  … and ${lines.length - 40} more`); process.exit(1); };

  // a. the data
  let D;
  try { D = JSON.parse(read(DATA_FILE)); } catch (e) { stop('data/council-data.json is not valid JSON (often a missing comma or quote near the place named below).', [e.message]); }
  if (!args.includes('--verify') && !args.includes('--sample')) { const added = saveNewSlugs(D); if (added.length) { say('New web addresses saved in the data file:'); added.forEach(a => say('  ' + a)); } }
  const dataErrs = checkData(D);
  if (dataErrs.length) stop(`${dataErrs.length} problem(s) in data/council-data.json. Nothing was built; fix these and run it again.`, dataErrs);

  // b. the visualizer and its helpers
  const parts = visualizerParts();
  if (args.includes('--visualizer-only')) { write(path.join(PUB, 'index.html'), parts.html); say('Visualizer built: public/index.html'); return; }
  let H;
  try { H = visualizerHelpers(parts); } catch (e) { stop("the person pages couldn't use the visualizer's code. This happens if a function in src/js/01-core.js or src/js/03-search-profile.js was renamed or removed.", [e.message]); }

  // c. a few pages for previewing
  const sample = opt('--sample');
  if (sample) {
    const outDir = path.resolve(opt('--out') || path.join(ROOT, 'preview'));
    const slugs = makeSlugs(H), ctx = { H, slugs, preview: true, seq: relatedIndex(H), seal: parts.seal, vizBase: SITE + '/' };
    const pids = sample.split(',').map(x => x.trim());
    write(path.join(outDir, 'assets', 'in-council.css'), read(path.join(SRC, 'v3.css')) + read(path.join(SRC, 'v3-extra.css')) + read(path.join(SRC, 'person-pages.css')));
    for (const pid of pids) write(path.join(outDir, 'people', slugs[pid], 'index.html'), personPage(H, pid, ctx));
    write(path.join(outDir, 'people', 'index.html'), peopleIndex(H, ctx, pids));
    fs.copyFileSync(path.join(PUB, 'favicon.svg'), path.join(outDir, 'favicon.svg'));
    say(`Preview: ${pids.length} pages in ${outDir}`); return;
  }

  // d. everything, then the checks
  const { files, slugs } = buildAll(parts, H);
  const pageErrs = checkPages(H, files, slugs);
  if (pageErrs.length) stop(`${pageErrs.length} problem(s) on the finished pages. Nothing was saved.`, pageErrs);

  // e. --verify (used by GitHub before publishing): do the files in public/ match the data?
  if (args.includes('--verify')) {
    const diff = [];
    for (const [f, txt] of files) { const p = path.join(PUB, f); if (!fs.existsSync(p)) diff.push(`missing: public/${f}`); else if (read(p) !== txt) diff.push(`out of date: public/${f}`); }
    for (const f of generatedOnDisk()) if (!files.has(f)) diff.push(`left over: public/${f}`);
    if (diff.length) stop(`public/ doesn't match the data (${diff.length} file(s)). Run "node build.js" on your PC, then commit and push again.`, diff);
    say(`Verified: all ${files.size} built files match the data, and every check passed.`); return;
  }

  // f. save
  let removed = 0;
  for (const f of generatedOnDisk()) if (!files.has(f)) { fs.rmSync(path.join(PUB, f)); removed++; const d = path.dirname(path.join(PUB, f)); if (d !== PUB && fs.existsSync(d) && !fs.readdirSync(d).length) fs.rmdirSync(d); }
  let changed = 0;
  for (const [f, txt] of files) { const p = path.join(PUB, f); if (!fs.existsSync(p) || read(p) !== txt) { write(p, txt); changed++; } }
  say(`Built: the visualizer, ${Object.keys(slugs).length} person pages, the A–Z list and the sitemap (${Object.keys(slugs).length + 2} addresses).`);
  say(`${changed} file(s) changed${removed ? `, ${removed} old file(s) removed` : ''}. All checks passed.`);
}
if (require.main === module) main();
module.exports = { visualizerParts, visualizerHelpers, summary, pageTitle, pageDescription, makeSlugs, related, relatedIndex, namesOnRecord, checkData, checkPages, buildAll };
