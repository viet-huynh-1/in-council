// ===================== seats view: cards, chamber, side panel, date bar, strip =====================
function card(x, compact){
  const t=x.t, p=P[t.pid], prov=t.cap!=='substantive';
  const badges=[];
  if(BOTH.has(t.pid) && !prov && t.body!=='SO') badges.push(`<span class="badge">${t.body==='LC'?'Also ExCo':'Also LegCo'}</span>`);
  if(prov) badges.push(`<span class="badge prov">${t.cap[0].toUpperCase()+t.cap.slice(1)}</span>`);
  if(x.away) badges.push(`<span class="badge away">Away</span>`);
  if(x.st==='maybe') badges.push(`<span class="badge maybe">Dates uncertain</span>`);
  if((p.nt||[]).length) badges.push(`<span class="badge flag" title="Sources differ: see the person's page">Sources differ</span>`);
  const cls=['seat',prov?'provisional':'',x.st==='maybe'?'maybe':'',x.away?'away':'',compact?'compact':''];
  if(filtering()) cls.push(matches(x)?'hit':'dim');
  if(S.focus===t.pid) cls.push('focus');
  return `<button class="${cls.join(' ')}" style="--c:${colorFor(x)}" data-pid="${t.pid}" data-tid="${t.id}" data-for="${esc(x.forName||'')}">
    ${sealHTML(t.pid)}<span class="nm">${esc(nameOf(t.pid))}</span><span class="zhn">${esc(p.z)||'&nbsp;'}</span>
    <span class="post">${esc(label(x))}</span>${badges.length?`<span class="badges">${badges.join('')}</span>`:''}</button>`;
}
function sortKey(x){
  const t=x.t;
  if(t.tier==='pres') return '0';
  if(t.tier==='exo') return String(EXO_ORDER[t.seat]??9)+(t.cap==='substantive'?'0':'1');
  if(t.tier==='off') return t.post+(t.cap==='substantive'?'0':'1');
  if(['fc','gc','ecol','elc'].includes(t.tier)) return t.post+surname(t.pid);
  return (t.cap==='substantive'?'0':'1')+surname(t.pid);
}
const TIERORDER=['pres','exo','off','unoff','ecol','fc','gc','elc','plc'];
function sortedView(key,d,acting){
  const xs=view(KEY[key],d,acting);
  return xs.sort((a,c)=>(TIERORDER.indexOf(a.t.tier)-TIERORDER.indexOf(c.t.tier))||sortKey(a).localeCompare(sortKey(c)));
}
function tierBlocks(key, compact){
  const b=BODY[key], xs=sortedView(key,S.date);
  return b.tiers.map(([tier,en,zh])=>{
    const list=xs.filter(x=>x.t.tier===tier);
    if(!list.length) return '';
    const sub=list.filter(x=>x.t.cap==='substantive').length, pr=list.length-sub;
    return `<div class="tier"><div class="tierhead"><span class="sw" style="background:var(${TIERCOL[tier]})"></span><span class="label">${en}</span>${zh?`<span class="zh">${zh}</span>`:''}<span class="label">· ${sub}${pr?` + ${pr} standing in`:''}</span></div><div class="cards">${list.map(x=>card(x,compact)).join('')}</div></div>`;
  }).join('') || `<p class="empty">No one is recorded in this body on this date.</p>`;
}

// ---------- chamber (semicircle) ----------
function arcLayout(N){
  if(N<=0) return {pts:[],seat:0.05};
  let R=1, d; const cap=R=>{ const dd=0.62/R; let c=0; for(let i=0;i<R;i++){ const r=1-i*dd; c+=Math.floor(Math.PI*r/dd)+1; } return c; };
  while(cap(R)<N) R++;
  d=0.62/R; const radii=[...Array(R)].map((_,i)=>1-i*d), sum=radii.reduce((a,b)=>a+b,0);
  let n=radii.map(r=>Math.max(1,Math.round(N*r/sum))); let diff=N-n.reduce((a,b)=>a+b,0);
  for(let i=0;diff!==0;i=(i+1)%R){ if(diff>0){ n[i]++; diff--; } else if(n[i]>1){ n[i]--; diff++; } }
  const pts=[];
  radii.forEach((r,i)=>{ const k=n[i]; for(let j=0;j<k;j++){ const a=k===1?Math.PI/2:Math.PI*(1-j/(k-1)); pts.push({a,r,x:r*Math.cos(a),y:-r*Math.sin(a)}); } });
  pts.sort((p,q)=>(q.a-p.a)||(q.r-p.r));
  return {pts,seat:Math.min(d*0.4, 0.9/Math.max(...n)*1.3)};
}
function chamberSVG(key, d, opt={}){
  const xs=opt.xs||sortedView(key,d);
  const chair=xs.filter(x=>x.t.tier==='pres'), rest=xs.filter(x=>x.t.tier!=='pres');
  const L=arcLayout(rest.length), W=opt.w||560, sc=W/2.3, cx=W/2, cy=W*0.48;
  const seatR=Math.max(4,Math.min(0.03*W,(L.seat||0.05)*sc));
  const filt=filtering() && !opt.plain;
  const dot=(x,px,py,r)=>{
    const t=x.t, prov=t.cap!=='substantive', col=colorFor(x);
    const cls=['cseat',prov?'prov':'',x.st==='maybe'?'maybe':'',x.away?'away':''];
    if(filt) cls.push(matches(x)?'hit':'dim');
    if(S.focus===t.pid) cls.push('focus');
    const lab=`${nameOf(t.pid)}${P[t.pid].z?' '+P[t.pid].z:''}, ${label(x,d)}${x.st==='maybe'?' (dates uncertain)':''}${x.away?' (away)':''}`;
    return `<g class="${cls.join(' ')}" data-pid="${t.pid}" data-tid="${t.id}" data-for="${esc(x.forName||'')}" ${opt.plain?'':'tabindex="0" role="button"'} aria-label="${esc(lab)}" style="--c:${col}"><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(r+3).toFixed(1)}" class="hitarea"/><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(1)}" class="mk"/></g>`;
  };
  let s='';
  rest.forEach((x,i)=>{ const p=L.pts[i]; s+=dot(x,cx+p.x*sc,cy+p.y*sc,seatR); });
  // the chair: centre, below the arc
  const chY=cy-0.12*sc;
  if(chair.length){ chair.slice(0,2).forEach((x,i)=>{ s+=dot(x,cx+(i-(chair.length>1?0.5:0))*seatR*3,chY,seatR*1.35); }); }
  else if(key==='exco'||key==='legco'){ s+=`<circle cx="${cx}" cy="${chY}" r="${seatR*1.35}" fill="none" stroke="var(--line)" stroke-dasharray="3 3"/>`; }
  const chairLab = key==='exco'?'Governor (presides)': key==='senior'?'Governor': key==='plc'?'':'President';
  if(chairLab && !opt.nolabel) s+=`<text x="${cx}" y="${chY+seatR*1.35+16}" text-anchor="middle" class="clab">${chairLab}</text>`;
  if(!opt.nolabel) s+=`<text x="${cx}" y="${cy+28}" text-anchor="middle" class="clab tot">${rest.length+chair.filter(x=>!(key==='exco'&&x.t.seat==='GOV')).length} ${key==='senior'?'posts':'places'}</text>`;
  const H=cy+(opt.nolabel?seatR*1.6:38);
  return `<svg class="chamber" viewBox="0 ${Math.max(0,cy-1*sc-seatR-6).toFixed(0)} ${W} ${(H-Math.max(0,cy-1*sc-seatR-6)).toFixed(0)}" role="group" aria-label="${esc(BODY[key].en)} on ${fd(d)}, as a chamber diagram">${s}</svg>`;
}
function chamberLegend(key){
  const xs=view(KEY[key],S.date);
  if(S.colorby==='seat'){
    const tiers=TIERORDER.filter(tr=>xs.some(x=>x.t.tier===tr));
    return `<div class="clegend">${tiers.map(tr=>`<span><b style="background:var(${TIERCOL[tr]})"></b>${esc((BODY[key].tiers.find(r=>r[0]===tr)||[,TIERLAB[tr]])[1])} <span class="v">${xs.filter(x=>x.t.tier===tr).length}</span></span>`).join('')}<span><b class="hollow"></b>Standing in</span><span><b class="dashed"></b>Dates uncertain</span></div>`;
  }
  const gs=GROUPS.filter(([g])=>S.colorby==='bg'?xs.some(x=>bgGroup(x.t.pid)===g):g==='unk');
  return `<div class="clegend">${gs.map(([g,n])=>`<span><b style="background:${groupCol(g)}"></b>${esc(S.colorby==='eth'&&g==='unk'?'Unknown (no source yet)':n)} <span class="v">${xs.filter(x=>S.colorby==='bg'?bgGroup(x.t.pid)===g:true).length}</span></span>`).join('')}<span><b class="hollow"></b>Standing in</span><span><b class="dashed"></b>Dates uncertain</span></div>`;
}
const LCGAPS=[['1985-08-08','1985-10-29','The fully appointed council last sat on 7 August 1985; the first council with elected members met on 30 October 1985.'],
  ['1988-08-26','1988-10-11','The 1985–88 council ended on 25 August 1988; the new council first met on 12 October 1988.'],
  ['1991-08-23','1991-10-08','The 1988–91 council ended on 22 August 1991; the new council, with the first directly elected members, first met on 9 October 1991.'],
  ['1995-08-01','1995-10-10','The 1991–95 council was dissolved on 31 July 1995; the fully elected council first met on 11 October 1995.']];
function bodyNote(key){
  const xs=view(KEY[key],S.date).filter(x=>x.t.cap==='substantive'||x.t.cap==='acting'); // acting holders fill the seat they act in
  const n=xs.filter(x=>!(key==='exco'&&x.t.seat==='GOV')).length;
  const maybe=xs.filter(x=>x.st==='maybe').length;
  let s='';
  if(key==='legco') s=`${n} members on this date, counting the President${S.date<'1993-01-13'?' (the Governor)':''}.`;
  if(key==='exco') s=`${n} members on this date. The Governor presided but was not a member.`;
  if(key==='senior') s=`The Governor and the senior posts. ${S.date>='1985-01-01'?'From 1985 our sources only show the policy secretaries who sat on LegCo or ExCo, so this list is incomplete.':'Policy secretaries begin in 1972–73.'}`;
  if(key==='plc') s=`${n} members. The Provisional Legislative Council was selected on 21 December 1996 and sat alongside the elected LegCo until 30 June 1997.`;
  if(maybe) s+=` ${maybe} ${maybe===1?'place has':'places have'} a dashed outline: the sources don't give the exact day ${maybe===1?'that person':'those people'} joined or left, and this date falls in the gap.`;
  if(key==='legco' && S.date>='1993-01-13' && S.date<'1993-02-19') s+=' The Governor no longer presided from January 1993. John Swaine took the chair as Deputy President until members elected him President on 19 February 1993.';
  const gap=LCGAPS.find(([a,b])=>S.date>=a && S.date<=b);
  if(key==='legco' && gap) s=`Between councils. ${gap[2]} The members database shows ${n?`only ${n} ${n===1?'member':'members'} whose appointment ran on`:'no one'} serving in between.`;
  return s;
}
function renderBoard(){
  const el=$('#board'); BOTH=bothSet(S.date);
  if(S.focus){ const keys=S.body==='all'?['LC','EC','SO']:[KEY[S.body]]; if(!keys.some(k=>view(k,S.date).some(x=>x.t.pid===S.focus))){ S.focus=''; S.notice=''; } }
  if(S.notice && renderBoard.lastDate && renderBoard.lastDate!==S.date && !S.notice.startsWith('Jumped to '+fd(S.date))) S.notice='';
  renderBoard.lastDate=S.date;
  const on=`<span class="label on">On ${fd(S.date)}</span>`;
  const notice=S.notice?`<p class="notice" role="status">${esc(S.notice)} <button class="linkish" data-act="clearfocus">Clear</button></p>`:'';
  const chamber=S.layout==='chamber';
  if(S.body==='all'){
    el.innerHTML=`<div class="bodyhead"><h2>All three bodies</h2>${on}</div>${notice}<p class="bodynote">${BOTH.size} people sat on both councils on this date. Turn on “Sat on both councils” to pick them out.</p><div class="all">`+
      ['legco','exco','senior'].map(k=>`<h3>${BODY[k].en}${BODY[k].zh?` <span class="zh">${BODY[k].zh}</span>`:''}</h3>${chamber?`<div class="chwrap sm">${chamberSVG(k,S.date,{w:520})}</div>${chamberLegend(k)}`:tierBlocks(k,true)}`).join('')+`</div>`;
  } else {
    const b=BODY[S.body];
    el.innerHTML=`<div class="bodyhead"><h2>${b.en}</h2>${b.zh?`<span class="zh">${b.zh}</span>`:''}${on}</div>${notice}<p class="bodynote">${bodyNote(S.body)}</p>`+
      (chamber?`<div class="chwrap">${chamberSVG(S.body,S.date)}</div>${chamberLegend(S.body)}<p class="muted small">Each dot is a place, grouped by type from left to right. Hover or tab to a dot for the name; click it for the person's roles and sources. Switch to Tiers for the full list of names.</p>`:tierBlocks(S.body,false));
  }
  const n=new Set($$('.seat.hit,.cseat.hit').map(e=>e.dataset.pid)).size; $('#qn').textContent=filtering()?`${n} match${n===1?'':'es'}`:'';
  if(S.focus){ const f=$('.seat.focus,.cseat.focus'); if(f && !renderBoard.noScroll) f.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); }
}
function renderSide(){
  const keys=S.body==='all'?['legco','exco','senior']:[S.body];
  const xs=keys.flatMap(k=>view(KEY[k],S.date));
  let h='';
  if(S.colorby==='seat'){
    const lab={...TIERLAB,pres:S.body==='exco'?'Presiding':'President / Governor',off:S.body==='senior'?'Secretaries':'Officials',plc:'Members'};
    const rows=TIERORDER.map(tr=>[lab[tr],xs.filter(x=>x.t.cap==='substantive'&&x.t.tier===tr).length,`var(${TIERCOL[tr]})`]).filter(r=>r[1]);
    const total=rows.reduce((a,r)=>a+r[1],0), prov=xs.filter(x=>x.t.cap!=='substantive').length;
    h+=`<div class="box"><h4>${keys.length>1?'Places on this date, all bodies':'On this date'}</h4><div class="big">${total}<small>${S.body==='senior'?'posts':'people'}</small></div>
      <div class="stack">${rows.map(r=>`<span style="flex:${r[1]};background:${r[2]}"></span>`).join('')}</div>
      <div class="legend">${rows.map(r=>`<div><b style="background:${r[2]}"></b>${r[0]}<span class="v">${r[1]}</span></div>`).join('')}</div>
      ${prov?`<p class="muted" style="margin-top:10px;font-size:14px">Plus ${prov} standing in (acting, provisional or temporary).</p>`:''}</div>`;
  } else {
    const ps=[...new Set(xs.map(x=>x.t.pid))]; const c={};
    ps.forEach(p=>{ const k=S.colorby==='bg'?bgGroup(p):'unk'; c[k]=(c[k]||0)+1; });
    const rows=GROUPS.filter(([g])=>c[g]).map(([g,n])=>[S.colorby==='eth'?'Unknown':n,c[g],groupCol(g)]);
    h+=`<div class="box"><h4>${S.colorby==='bg'?'Main background':'Ethnicity'}</h4><div class="big">${ps.length}<small>people</small></div>
      <div class="stack">${rows.map(r=>`<span style="flex:${r[1]};background:${r[2]}"></span>`).join('')}</div>
      <div class="legend">${rows.map(r=>`<div><b style="background:${r[2]}"></b>${esc(r[0])}<span class="v">${r[1]}</span></div>`).join('')}</div>
      <p class="muted" style="margin-top:10px;font-size:14px">${S.colorby==='bg'?'From posts held, occupations in the LegCo database and company histories. <a href="#limits">How complete is this?</a>':'No source used so far states anyone\'s ethnicity, so everyone shows as Unknown for now. <a href="#limits">See what\'s missing</a>.'}</p></div>`;
  }
  if(S.body!=='senior' && S.body!=='plc'){
    const bn=[...BOTH].map(nameOf).sort();
    h+=`<div class="box"><h4>Across the councils</h4><p>${BOTH.size?`${BOTH.size} ${BOTH.size===1?'person':'people'} sat on both councils on this date${BOTH.size<=12?': '+bn.join(', '):''}.`:'No one sat on both councils on this date.'}</p></div>`;
  }
  const ck=changeKey(), yr=S.date.slice(0,4), inYr=CHANGES[ck].filter(d=>d.startsWith(yr)).length;
  h+=`<div class="box"><h4>Changes in ${yr}</h4><p>${inYr} ${inYr===1?'day':'days'} with a change in ${S.body==='all'?'any of the three bodies':BODY[S.body].en}. Set the arrows to “change” to step through them.</p></div>`;
  const ids=[...new Set(xs.map(x=>x.t.src).filter(Boolean).flatMap(s=>s.split(/[;,]/)))].sort();
  h+=`<div class="box"><h4>Sources for this view</h4><ul>${ids.map(i=>{const s=D.sources[i]; if(!s) return ''; return `<li>${s.link?`<a href="${esc(s.link)}">${esc(shortCite(s))}</a>`:esc(shortCite(s))}</li>`}).join('')}</ul></div>`;
  $('#side').innerHTML=h;
}
function renderFilters(){
  $('#cochips').innerHTML=COMPANIES.map(o=>`<button class="chip" data-org="${o.org_id}" aria-pressed="${S.hlOrg===o.org_id}">${esc(o.english_name)}</button>`).join('');
  $('#clear').hidden=!filtering();
  $('#hl-bg').value=S.hlBg; $('#hl-edu').value=S.hlEdu; $('#colorby').value=S.colorby;
  $('#hl-more').value=OTHERORGS.some(o=>o.org_id===S.hlOrg)?S.hlOrg:'';
  $('#hl-bg').classList.toggle('on',!!S.hlBg); $('#hl-edu').classList.toggle('on',!!S.hlEdu); $('#hl-more').classList.toggle('on',OTHERORGS.some(o=>o.org_id===S.hlOrg));
  $('#hl-both').setAttribute('aria-pressed',S.hlBoth);
  $$('[data-layout]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.layout===S.layout));
}
function stepDate(dir){
  const u=S.unit;
  if(u==='change'){ const ch=CHANGES[changeKey()]; if(dir<0){ const c=ch.filter(d=>d<S.date); return c.length?c[c.length-1]:S.date; } return ch.find(d=>d>S.date)||S.date; }
  if(u==='day') return clampDate(addDays(S.date,dir));
  if(u==='month') return clampDate(addMonths(S.date,dir));
  return clampDate(addMonths(S.date,12*dir));
}
function renderDatebar(){
  $('#date').value=S.date;
  $('#prev').disabled=stepDate(-1)===S.date; $('#next').disabled=stepDate(1)===S.date;
  const lab={change:'change',day:'day',month:'month',year:'year'}[S.unit];
  $('#prev').setAttribute('aria-label','Back one '+lab); $('#next').setAttribute('aria-label','Forward one '+lab);
  $('#prev').title='Back one '+lab; $('#next').title='Forward one '+lab;
  $('#unit').value=S.unit;
  $('#chg').textContent=CHANGES[changeKey()].includes(S.date)?'a change on this day':'';
  const plcOn=S.date>=PLC_FROM; const pt=$('#plctab'); pt.disabled=!plcOn; pt.title=plcOn?'':'The Provisional Legislative Council existed from 21 December 1996';
  pt.hidden=!plcOn;
  if(S.body==='plc' && !plcOn){ S.body='legco'; }
  $$('[data-body]').forEach(b=>b.setAttribute('aria-selected',b.dataset.body===S.body));
  $('#play').setAttribute('aria-pressed',S.playing); $('#play').innerHTML=S.playing?'<span aria-hidden="true">❚❚</span> Pause':'<span aria-hidden="true">▶</span> Play';
  $('#posterbtn').href=`#poster/${S.body==='all'?'legco':S.body}/${S.date}`;
}
// ---------- timeline strip (drag to move through time) ----------
const TLW=1200, TLX0=30, TLX1=TLW-20, tlX=v=>TLX0+(v-1960)/(1997.5-1960)*(TLX1-TLX0), tlV=x=>1960+(x-TLX0)/(TLX1-TLX0)*(1997.5-1960);
function yearCounts(key){ const c={}; for(const d of CHANGES[key]){ const y=+d.slice(0,4); c[y]=(c[y]||0)+1; } return c; }
function evX(d){ return d.length===4?+d+.5:dateFrac(d); }
function tlSVG(key, h, interactive){
  const yc=yearCounts(key), mx=Math.max(...Object.values(yc),1);
  let s='';
  for(let y=1960;y<=1997;y++){ const n=yc[y]||0, bh=n?Math.max(3,n/mx*(h-40)):0; s+=`<rect class="yr" data-year="${y}" x="${tlX(y)+2}" y="${h-26-bh}" width="${tlX(y+1)-tlX(y)-4}" height="${bh}" rx="2" fill="var(--green)" opacity=".75"><title>${y}: ${n} ${n===1?'day':'days'} with a change</title></rect>`; }
  s+=`<line x1="${TLX0}" y1="${h-26}" x2="${TLX1}" y2="${h-26}" stroke="var(--line)" stroke-width="1.5"/>`;
  for(let y=1960;y<=1995;y+=5) s+=`<text x="${tlX(y)}" y="${h-8}" font-family="Courier Prime, monospace" font-size="13" fill="var(--muted)">${y}</text>`;
  if(interactive) s+=`<rect class="tlhit" x="${TLX0-10}" y="0" width="${TLX1-TLX0+20}" height="${h}" fill="transparent"/>`;
  for(const [d,lab] of D.events){ const v=evX(d); s+=`<g class="ev" ${d.length>4?`data-jump="${d}"`:''}><title>${esc((d.length>4?fd(d)+': ':d+': ')+lab)}</title><rect x="${tlX(v)-5}" y="${h-31}" width="10" height="10" transform="rotate(45 ${tlX(v)} ${h-26})" fill="var(--bg)" stroke="var(--accent)" stroke-width="2"/></g>`; }
  if(interactive){ const cv=dateFrac(S.date); s+=`<g class="tlmark" transform="translate(${tlX(cv)},0)"><line x1="0" y1="6" x2="0" y2="${h-22}" stroke="var(--amber)" stroke-width="3"/><circle cx="0" cy="${h-26}" r="7" fill="var(--amber)"/></g>`; }
  return `<svg viewBox="0 0 ${TLW} ${h}" ${interactive?`class="tlsvg" tabindex="0" role="slider" aria-label="Date" aria-valuemin="1960" aria-valuemax="1997.5" aria-valuenow="${dateFrac(S.date).toFixed(2)}" aria-valuetext="${fd(S.date)}"`:`role="img" aria-label="Changes per year, 1960 to 1997"`}>${s}</svg>`;
}
let TLKEY='';
function renderTL(){
  const key=changeKey();
  if(TLKEY!==key){
    TLKEY=key;
    $('#tl').innerHTML=`<div class="tlhead"><span class="label">Timeline · 年表</span><span class="muted" style="font-size:14px">Drag along the strip (or use the arrow keys on it) to move through time. Bars count the days with a change in ${S.body==='all'?'any body':BODY[S.body].en}, per year. Diamonds mark turning points: hover for details, click to jump.</span></div>${tlSVG(key,110,true)}`;
  }
  updateMarker();
}
function updateMarker(){
  const m=$('#tl .tlmark'), sv=$('#tl .tlsvg'); if(!m) return;
  m.setAttribute('transform',`translate(${tlX(dateFrac(S.date)).toFixed(1)},0)`);
  sv.setAttribute('aria-valuenow',dateFrac(S.date).toFixed(2)); sv.setAttribute('aria-valuetext',fd(S.date));
}
let dragRAF=0;
function tlPointer(e){
  const sv=$('#tl .tlsvg'); const r=sv.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width*TLW;
  S.date=clampDate(fracDate(Math.max(1960,Math.min(1997.499,tlV(x)))));
  updateMarker(); $('#date').value=S.date;
  if(!dragRAF) dragRAF=requestAnimationFrame(()=>{ dragRAF=0; renderBoard.noScroll=true; renderLight(); renderBoard.noScroll=false; });
}
function renderLight(){ renderDatebar(); renderBoard(); renderSide(); setHash(); }
function render(){ renderDatebar(); renderFilters(); renderBoard(); renderSide(); renderTL(); setHash(); }
// ---------- play ----------
let playTimer=0;
function setPlaying(on){
  S.playing=on; clearInterval(playTimer);
  if(on){ if(S.date>=MAX) S.date=MIN; playTimer=setInterval(()=>{ const n=clampDate(addMonths(S.date,12)); if(n===S.date||S.date>=MAX){ setPlaying(false); return; } S.date=n; renderBoard.noScroll=true; render(); renderBoard.noScroll=false; }, 1000/S.speed); }
  renderDatebar();
}
