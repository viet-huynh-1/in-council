// ===================== search (with jump), profile drawer, person pages =====================
const SIDX=[];
PIDS.forEach(pid=>{ const p=P[pid], s=SUMM[pid]; SIDX.push({type:'person',pid,hay:[p.n,p.k,p.z].join(' ').toLowerCase(),name:nameOf(pid),sub:`${p.z?p.z+' · ':''}${s.bodies.map(b=>({LC:'LegCo',EC:'ExCo',SO:'Senior',PLC:'Prov. LegCo'})[b]).join(', ')} · ${s.y0}–${Math.min(s.y1,1997)}`}); });
(()=>{ const posts={}; T.forEach(t=>{ if(t.cap!=='substantive'||!t.post) return; const k=t.post; (posts[k]=posts[k]||new Set()).add(t.body); });
  Object.entries(posts).forEach(([post,bs])=>SIDX.push({type:'post',post,hay:post.toLowerCase(),name:post,sub:'Seat or post · '+[...bs].map(b=>({LC:'LegCo',EC:'ExCo',SO:'Senior',PLC:'Prov. LegCo'})[b]).join(', ')})); })();
D.orgs.forEach(o=>SIDX.push({type:'org',oid:o.org_id,hay:(o.english_name+' '+(o.chinese_name||'')).toLowerCase(),name:o.english_name,sub:`Organization · ${ORGCOUNT[o.org_id]?ORGCOUNT[o.org_id].size:0} linked`}));
function searchAll(q){
  const ws=q.toLowerCase().split(/\s+/).filter(Boolean); if(!ws.length) return [];
  const r=SIDX.filter(x=>ws.every(w=>x.hay.includes(w)));
  const score=x=>(x.hay.startsWith(ws[0])?0:1)+({person:0,post:0.5,org:0.7})[x.type];
  return r.sort((a,b)=>score(a)-score(b)||a.name.localeCompare(b.name)).slice(0,9);
}
let SUG=[], SUGI=-1;
function renderSug(){
  const ul=$('#sugg'), q=$('#q').value.trim();
  SUG=q.length>=2?searchAll(q):[]; SUGI=Math.min(SUGI,SUG.length-1);
  if(!SUG.length || document.activeElement!==$('#q')){ ul.hidden=true; $('#q').setAttribute('aria-expanded','false'); return; }
  ul.innerHTML=SUG.map((x,i)=>`<li role="option" id="sg${i}" data-i="${i}" aria-selected="${i===SUGI}"><span class="sgn">${esc(x.name)}</span><span class="sgs">${esc(x.sub)}</span></li>`).join('')+`<li class="sghint" aria-hidden="true">Pick one to jump to a date when they held a place. Keep typing to filter the cards.</li>`;
  ul.hidden=false; $('#q').setAttribute('aria-expanded','true'); $('#q').setAttribute('aria-activedescendant',SUGI>=0?'sg'+SUGI:'');
}
function nearestTerm(ts, d){
  // the term closest to date d (zero if d falls inside)
  let best=null, bd=Infinity;
  for(const t of ts){ const a=t.s1<=t.e0?t.s1:t.s0, b=t.s1<=t.e0?t.e0:t.e1; const dist=d<a?(Date.parse(a)-Date.parse(d)):d>b?(Date.parse(d)-Date.parse(b)):0; if(dist<bd){ bd=dist; best=t; } }
  if(!best) return null; const a=best.s1<=best.e0?best.s1:best.s0, b=best.s1<=best.e0?best.e0:best.e1;
  return {t:best, d:d<a?a:d>b?b:d};
}
function pickSug(x){
  $('#sugg').hidden=true; S.q=''; $('#q').value='';
  if(x.type==='org'){ S.hlOrg=x.oid; S.focus=''; S.notice='';
    const people=[...(ORGCOUNT[x.oid]||[])];
    const here=S.body==='all'?['LC','EC','SO']:[KEY[S.body]];
    const active=T.some(t=>people.includes(t.pid)&&here.includes(t.body)&&status(t,S.date));
    if(!active){ const n=nearestTerm(T.filter(t=>people.includes(t.pid)&&t.cap==='substantive'),S.date); if(n){ S.date=n.d; if(S.body!=='all') S.body=BKEY[n.t.body]; S.notice=`Jumped to ${fd(S.date)}, the nearest date when someone linked to ${x.name} held a place.`; } }
    go(seatsHash()); render(); return; }
  let ts = x.type==='person' ? (TBYPID[x.pid]||[]).filter(t=>t.cap==='substantive') : T.filter(t=>t.post===x.post && t.cap==='substantive');
  if(!ts.length) ts = x.type==='person' ? (TBYPID[x.pid]||[]) : T.filter(t=>t.post===x.post);
  const prefer = S.body==='all' ? ts.filter(t=>t.body!=='PLC') : ts.filter(t=>t.body===KEY[S.body]);
  const n = nearestTerm(prefer.length?prefer:ts, S.date); if(!n) return;
  const moved = n.d!==S.date || (S.body!=='all' && KEY[S.body]!==n.t.body);
  S.date=n.d; if(S.body!=='all' || n.t.body==='PLC') S.body=BKEY[n.t.body];
  S.focus=n.t.pid;
  S.notice = moved ? `Jumped to ${fd(S.date)}: ${nameOf(n.t.pid)}, ${postName(n.t,S.date)||BODYNAME[n.t.body]}.` : `${nameOf(n.t.pid)} is highlighted.`;
  go(seatsHash()); render();
}

// ---------- profile ----------
function roleList(pid, d){
  const ts=(TBYPID[pid]||[]).slice().sort((a,b)=>a.s0.localeCompare(b.s0)||a.body.localeCompare(b.body));
  const groups={}; ts.forEach(t=>{ (groups[t.body]=groups[t.body]||[]).push(t); });
  return {groups, ts};
}
function profileHTML(pid, mode){
  const p=P[pid];
  const refs=[]; const ref=ids=>String(ids||'').split(/[;,]/).filter(Boolean).map(i=>{ if(!refs.includes(i)) refs.push(i); return `<sup class="r">${refs.indexOf(i)+1}</sup>`; }).join('');
  const {groups}=roleList(pid);
  const roleHtml=['LC','EC','SO','PLC'].filter(b=>groups[b]).map(b=>{
    const list=groups[b];
    const main=list.filter(t=>t.cap==='substantive'), side=list.filter(t=>t.cap!=='substantive');
    const one=t=>{ const post=t.post==='Colonial Secretary'&&t.e0>='1977-01-01'?'Colonial Secretary (retitled Chief Secretary during 1976)':null;
      const jd=t.s1<=t.e0?t.s1:t.s0;
      return `<div class="role ${t.cap!=='substantive'?'prov':''}" style="--c:var(${TIERCOL[t.tier]})"><div class="rt">${esc(post||label({t,forName:t.for?nameOf(t.for):''},t.s1))}${ref(t.src)}</div><div class="rd">${span(t)}${t.cap!=='substantive'?' · '+t.cap:''}${mode!=='page'&&status(t,S.date)?' · on '+fd(S.date,1):''}</div>${t.note?`<div class="rn">${esc(t.note)}</div>`:''}<a class="rj" href="#${BKEY[t.body]}/${jd}">See ${BODY[BKEY[t.body]].short} on ${fd(jd,1)}</a></div>`; };
    const sideHtml = side.length>6 ? `<details><summary class="rd" style="cursor:pointer;margin:6px 0">${side.length} spells standing in (acting, provisional or temporary)</summary><div class="roles" style="margin-top:8px">${side.map(one).join('')}</div></details>` : side.map(one).join('');
    return `<h3>${BODYNAME[b]}</h3><div class="roles">${main.map(one).join('')}${sideHtml}</div>`;
  }).join('');
  const unk='<span class="unk">Not yet sourced</span>';
  const dbref=p.db?'S001':'';
  const facts=[
    ['Name', esc(p.n)+(p.db?ref('S001'):'')],
    p.ti||p.h?['Title and honours', esc([p.ti,p.h].filter(Boolean).join(' · '))+ref(dbref)+'<br><span class="muted" style="font-size:13.5px">As the LegCo database lists them today (final honours).</span>']:null,
    ['Born', p.b||p.bp?esc([p.b,p.bp].filter(Boolean).join(', '))+ref(dbref):unk],
    ['Gender', p.g?esc(p.g)+ref(dbref||'S005'):unk],
    ['Ethnicity','<span class="unk">Unknown: no source yet</span>'],
    ['Education', (p.ed||[]).length?(p.ed.map(esc).join('<br>'))+ref(dbref):unk],
    ['Occupation', (p.oc||[]).length?(p.oc.map(esc).join('<br>'))+ref(dbref)+'<br><span class="muted" style="font-size:13.5px">As the LegCo database lists it; not dated.</span>':unk],
  ].filter(Boolean);
  const bgs=bgOf(pid);
  const bgHtml=bgs.length?bgs.map(b=>`${esc(b[0])}${b[1]?' (main)':''}${ref(b[2])}`).join('<br>'):unk;
  const affs=affOf(pid).slice().sort((a,b)=>(+a.start_year||9999)-(+b.start_year||9999));
  const affHtml=affs.length?affs.map(a=>{const o=ORGS[a.org_id]; const yrs=a.start_year||a.end_year?`, ${a.start_year||'?'}–${a.end_year||'?'}`:''; return `<b>${esc(o.english_name)}</b>${o.chinese_name?' <span class="zh">'+esc(o.chinese_name)+'</span>':''}: ${esc(a.role)}${yrs}${ref(a.source_ids)}${a.notes&&mode==='page'?`<br><span class="muted" style="font-size:13.5px">${esc(a.notes)}</span>`:''}`;}).join('<br>'):unk;
  const notes=(p.nt||[]);
  const head=`<div class="phead">${sealHTML(pid)}<div><${mode==='page'?'h1':'h2'} id="${mode==='page'?'pname-page':'pname'}">${esc(nameOf(pid))}</${mode==='page'?'h1':'h2'}>${p.z?`<div class="zhn">${esc(p.z)}</div>`:''}</div></div>`;
  const links = mode==='page'
    ? `<p class="plinks"><a href="#people">← All people</a> · <button class="linkish" data-copy="${pid}">Copy link to this page</button></p>`
    : `<p class="plinks"><a href="#person/${pid}" data-close>Open as a page</a> (permanent link)</p>`;
  const factsHtml=`<dl class="facts">${facts.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('')}<dt>Background</dt><dd>${bgHtml}</dd><dt>Companies and bodies</dt><dd>${affHtml}</dd></dl>
    ${notes.length?`<h3>Where the sources differ</h3><div class="notes">${notes.map(n=>`<p>${esc(n)}</p>`).join('')}</div>`:''}
    ${p.pn?`<h3>Note</h3><p class="pnote">${esc(p.pn)}</p>`:''}`;
  const rolesHtml=`${roleHtml}
    ${p.db?`<p style="margin-top:14px;font-size:14.5px"><a href="https://app.legco.gov.hk/member_front/english/library/member_detail.aspx?id=${p.db}">Full LegCo database profile</a></p>`:''}`;
  const srcHtml=`<h3>Sources</h3><ol class="srcs">${refs.map((i,k)=>{const s=D.sources[i]; if(!s) return ''; return `<li><span class="k">${k+1}</span><span>${s.link?`<a href="${esc(s.link)}">${esc(s.citation)}</a>`:esc(s.citation)}${s.page_or_record?` <span class="muted">${esc(s.page_or_record)}</span>`:''}</span></li>`}).join('')}</ol>`;
  const styled=p.st?`<p class="styled">${esc(p.sts||'As styled on 1 January 1970')}: ${esc(p.st)}</p>`:'';
  if(mode==='page') return `<div class="ptop"><div>${head}${links}${styled}</div>${careerSVG(pid)}</div>
    <div class="pgrid"><div class="pcol"><h3 class="first">About</h3>${factsHtml}</div><div class="pcol">${rolesHtml.replace('<h3>','<h3 class="first">')}${srcHtml}</div></div>`;
  return `${head}${links}${styled}${factsHtml}${rolesHtml}${srcHtml}`;
}
function careerSVG(pid){
  const ts=TBYPID[pid]||[]; const bodies=['LC','EC','SO','PLC'].filter(b=>ts.some(t=>t.body===b));
  const W=900, x0=110, x1=W-12, X=v=>x0+(v-1960)/(1997.5-1960)*(x1-x0), rh=26, H=bodies.length*rh+30;
  let s='';
  bodies.forEach((b,i)=>{ const y=i*rh+6; s+=`<text x="0" y="${y+14}" class="clab">${({LC:'LegCo',EC:'ExCo',SO:'Senior post',PLC:'Prov. LegCo'})[b]}</text><line x1="${x0}" x2="${x1}" y1="${y+10}" y2="${y+10}" stroke="var(--line)"/>`;
    ts.filter(t=>t.body===b).forEach(t=>{ const a=X(dateFrac(t.s0)), c=X(dateFrac(t.e1>MAX?MAX:t.e1)), ia=X(dateFrac(t.s1)), ic=X(dateFrac(t.e0>MAX?MAX:t.e0)); const sub=t.cap==='substantive';
      s+=`<a href="#${BKEY[b]}/${t.s1<=t.e0?t.s1:t.s0}"><g><title>${esc(label({t},t.s1))}: ${esc(span(t))}${sub?'':' ('+t.cap+')'}</title>`+
        (a<ia||ic<c?`<rect x="${a}" y="${y+4}" width="${Math.max(2,c-a)}" height="12" rx="3" fill="none" stroke="var(${TIERCOL[t.tier]})" stroke-dasharray="3 2"/>`:'')+
        `<rect x="${Math.min(ia,ic)}" y="${y+(sub?4:7)}" width="${Math.max(3,Math.abs(ic-ia))}" height="${sub?12:6}" rx="3" fill="var(${TIERCOL[t.tier]})" opacity="${sub?1:.55}"/></g></a>`; }); });
  for(let y=1960;y<=1995;y+=5) s+=`<text x="${X(y)}" y="${H-4}" class="clab" text-anchor="middle">${y}</text>`;
  return `<figure class="career"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Periods of service, 1960 to 1997">${s}</svg><figcaption class="muted small">Periods of service. Thin bars are spells standing in; dashed outlines show where the start or end date is uncertain. Click a bar to see that council on the first day.</figcaption></figure>`;
}
function openProfile(pid){
  $('#pbody').innerHTML=profileHTML(pid,'drawer');
  const d=$('#drawer'); d.classList.add('open'); d.setAttribute('aria-hidden','false'); $('.panel',d).scrollTop=0; $('.panel',d).focus();
}
function closeProfile(){ const d=$('#drawer'); if(!d.classList.contains('open')) return; d.classList.remove('open'); d.setAttribute('aria-hidden','true'); if(closeProfile.from && document.body.contains(closeProfile.from)) closeProfile.from.focus(); }
function renderPerson(pid){
  const el=$('#personview');
  if(!P[pid]){ el.innerHTML=`<h1>Not found</h1><p>No one in the data has the ID ${esc(pid)}. <a href="#people">See everyone</a>.</p>`; return; }
  el.innerHTML=`<article class="person">${profileHTML(pid,'page')}</article>`;
  document.title=`${nameOf(pid)} · In Council`;
}
// ---------- tooltip ----------
const tip=$('#tip');
function showTip(el,x,y){
  const t=TBYID[el.dataset.tid]; if(!t) return; const p=P[t.pid];
  tip.innerHTML=`<div class="t1">${esc([p.ti,nameOf(t.pid)].filter(Boolean).join(' '))}${p.z?' <span class="zh">'+esc(p.z)+'</span>':''}</div><div>${esc(label({t,forName:el.dataset.for}))}</div><div class="t2">${esc(span(t))}</div><div class="t2">Click for roles and sources</div>`;
  tip.classList.add('on'); placeTip(x,y);
}
function placeTip(x,y){ const r=tip.getBoundingClientRect(); let L=x+14,Tp=y+14;
  if(L+r.width>innerWidth-8) L=x-r.width-14; if(Tp+r.height>innerHeight-8) Tp=y-r.height-14;
  tip.style.left=Math.max(8,L)+'px'; tip.style.top=Math.max(8,Tp)+'px'; }
