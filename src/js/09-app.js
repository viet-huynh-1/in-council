// ===================== people directory, events, routing, init =====================
const PSTATE={q:'',body:'',dec:'',bg:''};
function renderPeople(){
  const ids=PIDS.filter(pid=>{ const s=SUMM[pid];
    if(PSTATE.body && !s.bodies.includes(PSTATE.body)) return false;
    if(PSTATE.dec){ const a=+PSTATE.dec, b=a+9; if(s.y1<a||s.y0>b) return false; }
    if(PSTATE.bg && bgGroup(pid)!==PSTATE.bg) return false;
    if(PSTATE.q){ const hay=[P[pid].n,P[pid].k,P[pid].z,...s.ts.map(t=>t.post),...affOf(pid).map(a=>ORGS[a.org_id].english_name)].join(' ').toLowerCase(); if(!PSTATE.q.toLowerCase().split(/\s+/).every(w=>hay.includes(w))) return false; }
    return true; }).sort((a,b)=>surname(a).localeCompare(surname(b)));
  const BC={LC:['LegCo','--unoff'],EC:['ExCo','--exo'],SO:['Senior','--off'],PLC:['PLC','--plc']};
  let last='', html='';
  for(const pid of ids){ const L=surname(pid)[0].toUpperCase(); if(L!==last){ html+=`<div class="letter">${L}</div>`; last=L; }
    const s=SUMM[pid];
    html+=`<a class="prow" href="#person/${pid}">${sealHTML(pid)}<span><span class="nm">${esc(nameOf(pid))}</span> <span class="zh muted" style="font-size:13px">${esc(P[pid].z)}</span><br><span class="meta">${s.y0}–${s.y1>=1997?'1997':s.y1}</span></span><span class="pchips">${s.bodies.map(b=>`<span class="pchip" style="background:var(${BC[b][1]})">${BC[b][0]}</span>`).join('')}${(P[pid].nt||[]).length?'<span class="badge flag" style="font-size:9.5px">Sources differ</span>':''}</span></a>`; }
  $('#plist').innerHTML=html||'<p class="empty">No one matches.</p>';
  $('#pcount').textContent=`${ids.length} of ${PIDS.length} people`;
}
function setupPeople(){
  $('#peopleview').innerHTML=`<div class="label kicker"><span class="zh">人物</span> &nbsp;People</div><h1>People</h1><p class="lede">Everyone who sat on either council or held a senior post between 1960 and 1997. Each has a page of their own with their roles, dates and sources.</p>
  <div class="pfilters"><label class="search" style="margin-left:0"><span aria-hidden="true">⌕</span><input id="pq" type="search" placeholder="Search names, posts, companies" autocomplete="off" aria-label="Search people"></label>
  <select class="sel" id="pbody-f" aria-label="Body"><option value="">All bodies</option><option value="LC">LegCo</option><option value="EC">ExCo</option><option value="SO">Senior Officials</option><option value="PLC">Provisional LegCo</option></select>
  <select class="sel" id="pdec" aria-label="Decade"><option value="">All years</option><option value="1960">1960s</option><option value="1970">1970s</option><option value="1980">1980s</option><option value="1990">1990s</option></select>
  <select class="sel" id="pbg" aria-label="Background"><option value="">All backgrounds</option>${GROUPS.map(([g,n])=>`<option value="${g}">${n}</option>`).join('')}</select>
  <span class="label" id="pcount" role="status"></span></div><div class="plist" id="plist"></div>`;
  $('#pq').addEventListener('input',e=>{PSTATE.q=e.target.value.trim(); renderPeople();});
  $('#pbody-f').addEventListener('change',e=>{PSTATE.body=e.target.value; renderPeople();});
  $('#pdec').addEventListener('change',e=>{PSTATE.dec=e.target.value; renderPeople();});
  $('#pbg').addEventListener('change',e=>{PSTATE.bg=e.target.value; renderPeople();});
}
// ---------- events ----------
document.addEventListener('mousemove',e=>{ const s=e.target.closest('.seat,.cseat'); if(s) showTip(s,e.clientX,e.clientY); else if(!e.target.closest('svg.comp')) tip.classList.remove('on'); });
document.addEventListener('focusin',e=>{ const s=e.target.closest('.seat,.cseat'); if(s){ const r=s.getBoundingClientRect(); showTip(s,r.left+10,r.bottom); } else tip.classList.remove('on'); });
document.addEventListener('click',e=>{
  const s=e.target.closest('.seat,.cseat,.pn'); if(s){ closeProfile.from=s; tip.classList.remove('on'); openProfile(s.dataset.pid); return; }
  if(e.target.closest('[data-close]')){ closeProfile(); return; }
  const tab=e.target.closest('[data-body]'); if(tab&&!tab.disabled){ S.body=tab.dataset.body; go(seatsHash()); render(); return; }
  const lay=e.target.closest('[data-layout]'); if(lay){ S.layout=lay.dataset.layout; render(); return; }
  const co=e.target.closest('[data-org]'); if(co){ S.hlOrg=S.hlOrg===co.dataset.org?'':co.dataset.org; render(); return; }
  if(e.target.closest('[data-act="clearfocus"]')){ S.focus=''; S.notice=''; render(); return; }
  const dl=e.target.closest('[data-dl]'); if(dl){ download(dl.dataset.dl); return; }
  const cp=e.target.closest('[data-copy]'); if(cp){ const url=location.href.split('#')[0]+'#person/'+cp.dataset.copy; (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(()=>{ cp.textContent='Link copied'; },()=>{ cp.textContent=url; }); return; }
  const j=e.target.closest('[data-jump]'); if(j){ S.date=j.dataset.jump; if(j.dataset.jb) S.body=j.dataset.jb; go(seatsHash()); render(); return; }
  const sg=e.target.closest('#sugg li[data-i]'); if(sg){ pickSug(SUG[+sg.dataset.i]); return; }
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ if($('#drawer').classList.contains('open')){ closeProfile(); return; } if(!$('#sugg').hidden){ $('#sugg').hidden=true; return; } }
  const c=e.target.closest('.cseat'); if(c && (e.key==='Enter'||e.key===' ')){ e.preventDefault(); closeProfile.from=c; openProfile(c.dataset.pid); }
});
// focus trap in the drawer
$('#drawer').addEventListener('keydown',e=>{ if(e.key!=='Tab') return; const f=$$('#drawer a[href],#drawer button,#drawer summary').filter(x=>x.offsetParent); if(!f.length) return; const a=f[0], z=f[f.length-1]; if(e.shiftKey&&document.activeElement===a){ e.preventDefault(); z.focus(); } else if(!e.shiftKey&&document.activeElement===z){ e.preventDefault(); a.focus(); } });
$('#date').addEventListener('change',e=>{ let v=e.target.value; if(!isDate(v)) return; S.date=clampDate(v); setPlaying(false); render(); });
$('#prev').addEventListener('click',()=>{ setPlaying(false); S.date=stepDate(-1); render(); });
$('#next').addEventListener('click',()=>{ setPlaying(false); S.date=stepDate(1); render(); });
$('#unit').addEventListener('change',e=>{ S.unit=e.target.value; renderDatebar(); });
$('#play').addEventListener('click',()=>setPlaying(!S.playing));
$('#filtbtn').addEventListener('click',()=>{ const on=document.body.classList.toggle('show-filters'); $('#filtbtn').setAttribute('aria-expanded',on); });
$('#speed').addEventListener('change',e=>{ S.speed=+e.target.value; if(S.playing) setPlaying(true); });
$('#acting').addEventListener('click',()=>{ S.acting=!S.acting; $('#acting').setAttribute('aria-checked',S.acting); render(); });
$('#colorby').addEventListener('change',e=>{ S.colorby=e.target.value; render(); });
$('#hl-bg').addEventListener('change',e=>{ S.hlBg=e.target.value; render(); });
$('#hl-edu').addEventListener('change',e=>{ S.hlEdu=e.target.value; render(); });
$('#hl-more').addEventListener('change',e=>{ S.hlOrg=e.target.value; render(); });
$('#hl-both').addEventListener('click',()=>{ S.hlBoth=!S.hlBoth; render(); });
$('#q').addEventListener('input',e=>{ S.q=e.target.value.trim(); SUGI=-1; renderSug(); renderBoard(); renderFilters(); });
$('#q').addEventListener('focus',renderSug);
$('#q').addEventListener('blur',()=>setTimeout(()=>{ if(!$('#sugg').contains(document.activeElement)) $('#sugg').hidden=true; },150));
$('#q').addEventListener('keydown',e=>{
  const open=!$('#sugg').hidden && SUG.length;
  if(e.key==='ArrowDown'&&open){ e.preventDefault(); SUGI=Math.min(SUG.length-1,SUGI+1); renderSug(); return; }
  if(e.key==='ArrowUp'&&open){ e.preventDefault(); SUGI=Math.max(-1,SUGI-1); renderSug(); return; }
  if(e.key==='Enter'){ e.preventDefault(); if(open){ pickSug(SUG[Math.max(0,SUGI)]); return; } const h=$('.seat.hit,.cseat.hit'); if(h){ closeProfile.from=h; openProfile(h.dataset.pid); } }
});
$('#clear').addEventListener('click',()=>{ Object.assign(S,{hlBg:'',hlEdu:'',hlBoth:false,hlOrg:'',q:'',focus:'',notice:''}); $('#q').value=''; render(); });
// timeline strip: drag, click, keys
$('#tl').addEventListener('pointerdown',e=>{ const ev=e.target.closest('.ev'); if(ev){ return; } const sv=e.target.closest('.tlsvg'); if(!sv) return; e.preventDefault(); setPlaying(false); sv.setPointerCapture(e.pointerId); sv.classList.add('dragging'); tlPointer(e);
  const mv=ev2=>tlPointer(ev2), up=()=>{ sv.classList.remove('dragging'); sv.removeEventListener('pointermove',mv); sv.removeEventListener('pointerup',up); sv.removeEventListener('pointercancel',up); render(); };
  sv.addEventListener('pointermove',mv); sv.addEventListener('pointerup',up); sv.addEventListener('pointercancel',up); });
$('#tl').addEventListener('keydown',e=>{ if(!e.target.closest('.tlsvg')) return; const k=e.key; let n=null;
  if(k==='ArrowLeft') n=addMonths(S.date,-1); if(k==='ArrowRight') n=addMonths(S.date,1); if(k==='PageDown') n=addMonths(S.date,-12); if(k==='PageUp') n=addMonths(S.date,12); if(k==='Home') n=MIN; if(k==='End') n=MAX;
  if(n){ e.preventDefault(); setPlaying(false); S.date=clampDate(n); render(); $('#tl .tlsvg').focus(); } });
// home opener
document.addEventListener('submit',e=>{ if(e.target.id==='opener'){ e.preventDefault(); const d=$('#op-date').value; if(!isDate(d)) return; S.date=clampDate(d); S.body=$('#op-body').value; go(seatsHash()); } });
// ---------- routing ----------
let PAGE='home', PID='';
const PAGES=['home','seats','timeline','people','person','connections','how','limits','about','data','poster'];
function seatsHash(){ return `#${S.body}/${S.date}${S.layout==='chamber'?'/chamber':''}`; }
function pageHash(){
  if(PAGE==='seats') return seatsHash();
  if(PAGE==='person') return '#person/'+PID;
  if(PAGE==='poster') return `#poster/${PS.body}/${PS.date}`;
  if(PAGE==='timeline' && (TS.cb!=='legco'||TS.a!=='1984-01-01'||TS.b!=='1986-01-01')) return `#compare/${TS.cb}/${TS.a}/${TS.b}`;
  if(PAGE==='connections' && (NS.from!==1960||NS.to!==1997)) return `#connections/${NS.from}-${NS.to}`;
  return '#'+PAGE;
}
function setHash(){ const h=pageHash(); if(location.hash!==h) history.replaceState(null,'',h); const sl=$('.stop[data-go="seats"]'); if(sl) sl.href=seatsHash(); }
function go(h){ if(location.hash!==h) location.hash=h; else { fromHash(); show(); } }
const TITLES={home:'In Council: Hong Kong, 1960–1997',seats:'Seats',timeline:'Timeline',people:'People',connections:'Connections',how:'How it works',limits:'What\'s missing',about:'About',data:'The data',poster:'Poster'};
function show(scrollTo){
  closeProfile();
  const map={home:'#homeview',seats:'#seatsview',timeline:'#timelineview',people:'#peopleview',person:'#personview',connections:'#connectionsview',how:'#howview',limits:'#limitsview',about:'#aboutview',data:'#dataview',poster:'#posterview'};
  Object.entries(map).forEach(([k,sel])=>{ $(sel).hidden=k!==PAGE; });
  document.body.dataset.page=PAGE;
  $$('.stop').forEach(b=>{ const on=b.dataset.go===PAGE||(PAGE==='person'&&b.dataset.go==='people')||(PAGE==='poster'&&b.dataset.go==='seats'); b.classList.toggle('on',on); if(on) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
  if(PAGE!=='seats' && S.playing) setPlaying(false);
  if(PAGE==='seats') render();
  if(PAGE==='home') renderHome();
  if(PAGE==='timeline') renderTimelinePage(scrollTo);
  if(PAGE==='people') renderPeople();
  if(PAGE==='person') renderPerson(PID);
  if(PAGE==='connections') renderNetwork();
  if(PAGE==='how') renderHow();
  if(PAGE==='limits') renderLimits();
  if(PAGE==='about') renderAbout();
  if(PAGE==='data') renderData();
  if(PAGE==='poster') renderPoster();
  if(PAGE!=='person') document.title = PAGE==='home'?TITLES.home:`${TITLES[PAGE]} · In Council`;
  setHash();
}
function fromHash(){
  const h=decodeURIComponent(location.hash.slice(1)); show.scroll=null;
  if(!h){ PAGE='home'; return; }
  let m=h.match(/^(legco|exco|senior|all|plc)(?:\/(\d{4}-\d{2}-\d{2}))?(?:\/(chamber|tiers))?$/);
  if(m){ PAGE='seats'; S.body=m[1]; if(m[2]) S.date=clampDate(m[2]); S.layout=m[3]||'tiers'; return; }
  m=h.match(/^person\/(P\d{4})$/); if(m){ PAGE='person'; PID=m[1]; return; }
  m=h.match(/^poster\/(legco|exco|senior|plc)\/(\d{4}-\d{2}-\d{2})$/); if(m){ PAGE='poster'; PS.body=m[1]; PS.date=clampDate(m[2]); return; }
  m=h.match(/^compare\/(legco|exco|senior)\/(\d{4}-\d{2}-\d{2})\/(\d{4}-\d{2}-\d{2})$/); if(m){ PAGE='timeline'; TS.cb=m[1]; TS.a=clampDate(m[2]); TS.b=clampDate(m[3]); show.scroll='compare'; return; }
  m=h.match(/^connections\/(\d{4})-(\d{4})$/); if(m){ PAGE='connections'; NS.from=Math.max(1960,Math.min(1997,+m[1])); NS.to=Math.max(1960,Math.min(1997,+m[2])); return; }
  if(PAGES.includes(h)) { PAGE=h; return; }
  PAGE='home';
}
let lastPage='';
window.addEventListener('hashchange',()=>{ const before=PAGE; fromHash(); show(show.scroll); if(PAGE!==before && PAGE!=='seats' && !show.scroll) scrollTo(0,0); });
// ---------- theme ----------
function isDark(){ const a=document.documentElement.dataset.theme; return a?a==='dark':matchMedia('(prefers-color-scheme: dark)').matches; }
function syncTheme(){ const d=isDark(); $('#th-night').setAttribute('aria-pressed',d); $('#th-day').setAttribute('aria-pressed',!d); }
function setTheme(t){ document.documentElement.dataset.theme=t; try{ localStorage.setItem('ic-theme',t); }catch(e){} syncTheme(); }
$('#th-day').addEventListener('click',()=>setTheme('light'));
$('#th-night').addEventListener('click',()=>setTheme('dark'));
try{ const t=localStorage.getItem('ic-theme'); if(t) document.documentElement.dataset.theme=t; }catch(e){}
// ---------- init ----------
const bgCats=[...new Set(Object.values(P).flatMap(p=>(p.bg||[]).map(b=>b[0])))].sort();
$('#hl-bg').innerHTML='<option value="">Background</option>'+bgCats.map(c=>`<option>${esc(c)}</option>`).join('');
$('#hl-edu').innerHTML='<option value="">Education</option>'+EDU.filter(([l])=>PIDS.some(p=>eduOf(p).includes(l))).map(([l])=>`<option>${esc(l)}</option>`).join('');
$('#hl-more').innerHTML='<option value="">More</option>'+OTHERORGS.map(o=>`<option value="${o.org_id}">${esc(o.english_name)}</option>`).join('');
$('#built').textContent=fd(D.built);
setupPeople(); setupTimelineEvents(); setupNetworkEvents(); setupPosterEvents(); syncTheme(); fromHash(); show(show.scroll);
