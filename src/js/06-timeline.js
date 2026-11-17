// ===================== timeline page: composition charts, compare, play, changes =====================
const TS={body:'legco',group:'seat',table:false,cb:'legco',a:'1984-01-01',b:'1986-01-01'};
const COMP_CACHE={};
function compSamples(key){
  if(key==='plc'){ const out=['1996-12-21']; for(let m=1;m<=6;m++) out.push(`1997-0${m}-01`); out.push(MAX); return [...new Set(out)].sort(); }
  const out=[]; for(let y=1960;y<=1997;y++) for(let m=1;m<=12;m++){ const d=`${y}-${String(m).padStart(2,'0')}-01`; if(d<=MAX) out.push(d); } out.push(MAX); return out;
}
function seriesFor(key,group){
  if(group==='seat') return BODY[key].tiers.map(([tr,en])=>[tr,en,`var(${TIERCOL[tr]})`]).filter(([tr])=>!(key==='exco'&&tr==='pres'));
  if(group==='bg') return GROUPS.map(([g,n])=>[g,n,groupCol(g)]);
  return [['unk','Unknown (no source yet)','var(--unknown)']];
}
function composition(key,group){
  const ck=key+'|'+group; if(COMP_CACHE[ck]) return COMP_CACHE[ck];
  const ser=seriesFor(key,group), ds=compSamples(key);
  const rows=ds.map(d=>{ const xs=view(KEY[key],d,false).filter(x=>!(key==='exco'&&x.t.seat==='GOV')); const c=Object.fromEntries(ser.map(s=>[s[0],0])); let unc=0;
    xs.forEach(x=>{ const k=group==='seat'?x.t.tier:group==='bg'?bgGroup(x.t.pid):'unk'; if(k in c) c[k]++; if(x.st==='maybe') unc++; }); return {d,c,total:xs.length,unc}; });
  const used=ser.filter(s=>rows.some(r=>r.c[s[0]]>0));
  return COMP_CACHE[ck]={ser:used,rows};
}
function niceMax(v){ const st=[5,10,20,25,50]; for(const s of st){ const m=Math.ceil(v/s)*s; if(m/s<=6) return [m,s]; } return [Math.ceil(v/10)*10,10]; }
function compChart(key,group){
  const {ser,rows}=composition(key,group);
  const W=1000,H=330,ml=40,mr=14,mt=12,mb=44;
  const dom = key==='plc'?[dateFrac('1996-12-15'),dateFrac(MAX)+0.003]:[1960,1997.5];
  const X=v=>ml+(v-dom[0])/(dom[1]-dom[0])*(W-ml-mr);
  const [ym,step]=niceMax(Math.max(...rows.map(r=>r.total),1)); const Y=v=>mt+(1-v/ym)*(H-mt-mb);
  let s='';
  for(let v=0;v<=ym;v+=step) s+=`<line x1="${ml}" x2="${W-mr}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${ml-8}" y="${Y(v)+4}" text-anchor="end" class="ax">${v}</text>`;
  // stacked areas (step shape: counts hold until the next sample)
  const base=rows.map(()=>0);
  ser.forEach(([k,n,col])=>{
    const top=rows.map((r,i)=>base[i]+r.c[k]);
    let up='', dn='';
    rows.forEach((r,i)=>{ const x=X(dateFrac(r.d)), x2=i<rows.length-1?X(dateFrac(rows[i+1].d)):x; up+=`${i?'L':'M'}${x.toFixed(1)},${Y(top[i]).toFixed(1)} L${x2.toFixed(1)},${Y(top[i]).toFixed(1)} `; });
    for(let i=rows.length-1;i>=0;i--){ const x=X(dateFrac(rows[i].d)), x2=i<rows.length-1?X(dateFrac(rows[i+1].d)):x; dn+=`L${x2.toFixed(1)},${Y(base[i]).toFixed(1)} L${x.toFixed(1)},${Y(base[i]).toFixed(1)} `; }
    s+=`<path d="${up}${dn}Z" fill="${col}" class="area"><title>${esc(n)}</title></path><path d="${up}" class="gap"/>`;
    top.forEach((v,i)=>base[i]=v);
  });
  // axis + events
  s+=`<line x1="${ml}" x2="${W-mr}" y1="${Y(0)}" y2="${Y(0)}" class="axis"/>`;
  if(key==='plc'){ ['1997-01-01','1997-03-01','1997-05-01'].forEach(d=>s+=`<text x="${X(dateFrac(d))}" y="${H-mb+18}" text-anchor="middle" class="ax">${fd(d,1).slice(2)}</text>`); }
  else for(let y=1960;y<=1995;y+=5) s+=`<text x="${X(y)}" y="${H-mb+18}" text-anchor="middle" class="ax">${y}</text>`;
  for(const [d,lab] of D.events){ const v=evX(d); if(v<dom[0]||v>dom[1]) continue; s+=`<g class="ev" ${d.length>4?`data-jump="${d}" data-jb="${key}"`:''}><title>${esc((d.length>4?fd(d)+': ':d+': ')+lab)}</title><rect x="${X(v)-5}" y="${H-mb+26}" width="9" height="9" transform="rotate(45 ${X(v)} ${H-mb+30})" fill="var(--bg)" stroke="var(--accent)" stroke-width="2"/></g>`; }
  s+=`<rect class="chit" x="${ml}" y="${mt}" width="${W-ml-mr}" height="${H-mt-mb}" fill="transparent"/><line class="xhair" x1="0" x2="0" y1="${mt}" y2="${H-mb}" hidden/>`;
  compChart.geo={X,dom,W,ml,mr,rows,ser,key};
  return `<svg class="comp" viewBox="0 0 ${W} ${H}" tabindex="0" role="img" aria-label="${esc(BODY[key].en)}: members over time by ${group==='seat'?'type of seat':group==='bg'?'background':'ethnicity'}. A table view is available.">${s}</svg>`;
}
function compTable(key,group){
  const {ser,rows}=composition(key,group);
  const pick=rows.filter(r=>r.d.endsWith('-01-01')||r.d===MAX||(key==='plc'));
  return `<div class="tablewrap"><table class="ctable"><thead><tr><th>Date</th>${ser.map(([k,n,c])=>`<th><span class="key" style="background:${c}"></span>${esc(n)}</th>`).join('')}<th>Total</th><th>Of which uncertain</th></tr></thead><tbody>${pick.map(r=>`<tr><td><a href="#${key}/${r.d}">${fd(r.d,1)}</a></td>${ser.map(([k])=>`<td>${r.c[k]||''}</td>`).join('')}<td><b>${r.total}</b></td><td>${r.unc||''}</td></tr>`).join('')}</tbody></table></div>`;
}
function compTip(e){
  const g=compChart.geo, sv=$('svg.comp'); if(!g||!sv) return;
  const r=sv.getBoundingClientRect(), x=(e.clientX-r.left)/r.width*g.W;
  const v=g.dom[0]+(x-g.ml)/(g.W-g.ml-g.mr)*(g.dom[1]-g.dom[0]);
  let i=g.rows.findIndex(rr=>dateFrac(rr.d)>v); i = i<=0 ? (i===0?0:g.rows.length-1) : i-1;
  const row=g.rows[i]; const xh=$('.xhair',sv); xh.removeAttribute('hidden'); const px=g.X(dateFrac(row.d)); xh.setAttribute('x1',px); xh.setAttribute('x2',px);
  sv.dataset.d=row.d;
  tip.innerHTML=`<div class="t1">${fd(row.d)}</div>`+g.ser.slice().reverse().map(([k,n,c])=>row.c[k]?`<div class="trow"><span class="lk" style="background:${c}"></span><b>${row.c[k]}</b> ${esc(n)}</div>`:'').join('')+`<div class="trow"><b>${row.total}</b> in all${row.unc?` · ${row.unc} with uncertain dates`:''}</div><div class="t2">Click to open that day</div>`;
  tip.classList.add('on'); placeTip(e.clientX,e.clientY);
}
function compareHTML(){
  const key=TS.cb; const A=view(KEY[key],TS.a,false).filter(x=>!(key==='exco'&&x.t.seat==='GOV')), B=view(KEY[key],TS.b,false).filter(x=>!(key==='exco'&&x.t.seat==='GOV'));
  const ma=new Map(A.map(x=>[x.t.pid,x])), mb=new Map(B.map(x=>[x.t.pid,x]));
  const joined=B.filter(x=>!ma.has(x.t.pid)), left=A.filter(x=>!mb.has(x.t.pid));
  const moved=B.filter(x=>ma.has(x.t.pid) && (ma.get(x.t.pid).t.seat!==x.t.seat || postName(ma.get(x.t.pid).t,TS.a)!==postName(x.t,TS.b)));
  const stayed=B.filter(x=>ma.has(x.t.pid) && !moved.includes(x));
  const chip=(x,d,from)=>`<a class="pchipx" href="#person/${x.t.pid}" style="--c:var(${TIERCOL[x.t.tier]})">${sealHTML(x.t.pid)}<span><span class="nm">${esc(nameOf(x.t.pid))}</span> <span class="zh muted">${esc(P[x.t.pid].z)}</span><br><span class="meta">${from?esc(postName(from.t,TS.a))+' → ':''}${esc(label(x,d))}</span></span></a>`;
  const col=(d,xs)=>{ const keep=S.colorby; S.colorby='seat'; const svg=chamberSVG(key,d,{plain:true,w:420,xs:sortedView(key,d,false)}); S.colorby=keep;
    const c={}; xs.forEach(x=>c[x.t.tier]=(c[x.t.tier]||0)+1);
    return `<div class="cmpcol"><div class="label">${fd(d)}</div><div class="big">${xs.length}<small>${key==='senior'?'posts':'members'}</small></div>${svg}<div class="clegend">${TIERORDER.filter(t=>c[t]).map(t=>`<span><b style="background:var(${TIERCOL[t]})"></b>${esc((BODY[key].tiers.find(r=>r[0]===t)||[,TIERLAB[t]])[1])} <span class="v">${c[t]}</span></span>`).join('')}</div><a class="rj" href="#${key}/${d}">Open the seats on this day</a></div>`; };
  const sameOrder = TS.a<=TS.b;
  return `<div class="cmpgrid">${col(TS.a,A)}${col(TS.b,B)}</div>
   <div class="cmplists">
    <section><h3>${sameOrder?'Joined':'Not yet there on the first date'} <span class="cnt">${joined.length}</span></h3>${joined.length?joined.sort((a,b)=>sortKey(a).localeCompare(sortKey(b))).map(x=>chip(x,TS.b)).join(''):'<p class="empty">No one.</p>'}</section>
    <section><h3>${sameOrder?'Left':'Gone by the first date'} <span class="cnt">${left.length}</span></h3>${left.length?left.sort((a,b)=>sortKey(a).localeCompare(sortKey(b))).map(x=>chip(x,TS.a)).join(''):'<p class="empty">No one.</p>'}</section>
    <section><h3>Changed seat or post <span class="cnt">${moved.length}</span></h3>${moved.length?moved.map(x=>chip(x,TS.b,ma.get(x.t.pid))).join(''):'<p class="empty">No one.</p>'}</section>
   </div>
   <details class="stayed"><summary>${stayed.length} stayed in the same place</summary><p class="namelist">${stayed.map(x=>`<a href="#person/${x.t.pid}">${esc(nameOf(x.t.pid))}</a>`).join('')}</p></details>
   <p class="muted small">Counts people holding places in their own right on each day; stand-ins are left out. People whose dates are uncertain on either day are included.</p>`;
}
function renderTimelinePage(scrollTo){
  const yc={LC:yearCounts('LC'),EC:yearCounts('EC'),SO:yearCounts('SO')};
  let rows='';
  for(let y=1960;y<=1997;y++){ const ds=CHANGES.ALL.filter(d=>d.startsWith(y+'')); rows+=`<tr><td>${y}</td><td>${yc.LC[y]||0}</td><td>${yc.EC[y]||0}</td><td>${yc.SO[y]||0}</td><td>${ds.length?`<a href="#all/${ds[0]}">first change: ${fd(ds[0],1)}</a>`:''}</td></tr>`; }
  const segB=(id,cur,opts)=>`<div class="seg" role="group" id="${id}">${opts.map(([v,l])=>`<button data-v="${v}" aria-pressed="${cur===v}">${l}</button>`).join('')}</div>`;
  const comp=composition(TS.body,TS.group);
  $('#timelineview').innerHTML=`<div class="label kicker"><span class="zh">年表</span> &nbsp;Timeline</div><h1>How the councils changed</h1>
  <p class="lede">Chart who held the seats over time, play the years forward, or set two dates side by side.</p>
  <div class="playcard"><div><b>Play the years</b><span>Watch the seats change, one year a second, from any starting date.</span></div><button class="go" data-act="playfrom" data-d="${MIN}">▶ Play from 1960</button><button class="go ghost" data-act="playfrom" data-d="1985-01-01">From 1985</button></div>
  <section class="tsec" id="composition"><h2>Who held the seats</h2>
    <div class="ctrls"><span class="flabel">Body</span>${segB('cb-body',TS.body,[['legco','LegCo'],['exco','ExCo'],['senior','Senior Officials'],['plc','Provisional LegCo']])}
    <span class="flabel">Group by</span>${segB('cb-group',TS.group,[['seat','Type of seat'],['bg','Background'],['eth','Ethnicity']])}
    <span class="flabel">Show</span>${segB('cb-view',TS.table?'table':'chart',[['chart','Chart'],['table','Table']])}</div>
    <div class="clegend">${comp.ser.map(([k,n,c])=>`<span><b style="background:${c}"></b>${esc(n)}</span>`).join('')}</div>
    ${TS.table?compTable(TS.body,TS.group):compChart(TS.body,TS.group)}
    <p class="muted small">Members holding places in their own right, counted on the first of each month (stand-ins left out). People whose dates are uncertain on that day are counted; hover to see how many.${TS.group==='bg'?' Backgrounds are rough: see <a href="#limits">what\'s missing</a>.':''}${TS.group==='eth'?' No source used so far states anyone\'s ethnicity.':''}${TS.body==='senior'?' Senior Officials are incomplete from 1985.':''} Diamonds mark turning points.</p>
  </section>
  <section class="tsec" id="compare"><h2>Compare two dates</h2>
    <form class="ctrls" id="cmpform"><span class="flabel">Body</span>${segB('cmp-body',TS.cb,[['legco','LegCo'],['exco','ExCo'],['senior','Senior Officials']])}
    <label class="datebox"><input type="date" id="cmp-a" min="${MIN}" max="${MAX}" value="${TS.a}" aria-label="First date"></label><button type="button" class="chip" data-act="swap" aria-label="Swap the dates">⇄</button><label class="datebox"><input type="date" id="cmp-b" min="${MIN}" max="${MAX}" value="${TS.b}" aria-label="Second date"></label></form>
    <div id="cmpout">${compareHTML()}</div>
  </section>
  <section class="tsec" id="changes"><h2>Days with a change</h2>
    <p class="muted">Each bar counts the days on which someone joined, left or stood in. Click a turning point to open that day.</p>
    <h3 class="label">Legislative Council</h3>${tlSVG('LC',100)}<h3 class="label">Executive Council</h3>${tlSVG('EC',100)}<h3 class="label">Senior Officials</h3>${tlSVG('SO',100)}
    <h3 class="label" style="margin-top:22px">Turning points</h3><ul class="events">${D.events.map(([d,l])=>`<li><span class="label">${d.length>4?fd(d,1):d}</span>${d.length>4?`<a href="#legco/${d}">${esc(l)}</a>`:esc(l)}</li>`).join('')}</ul>
    <details><summary>Days with a change, year by year</summary><div class="tablewrap"><table class="ctable"><thead><tr><th>Year</th><th>LegCo</th><th>ExCo</th><th>Senior</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></details>
  </section>`;
  if(scrollTo){ const el=$('#'+scrollTo); if(el) el.scrollIntoView(); }
}
function setupTimelineEvents(){
  const el=$('#timelineview');
  el.addEventListener('click',e=>{
    const b=e.target.closest('.seg button'); if(b){ const g=b.parentElement.id, v=b.dataset.v;
      if(g==='cb-body') TS.body=v; if(g==='cb-group') TS.group=v; if(g==='cb-view') TS.table=v==='table';
      if(g==='cmp-body'){ TS.cb=v; $('#cmpout').innerHTML=compareHTML(); $$('#cmp-body button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.v===v)); setHash(); return; }
      const y=scrollY; renderTimelinePage(); scrollTo(0,y); return; }
    if(e.target.closest('[data-act="swap"]')){ [TS.a,TS.b]=[TS.b,TS.a]; $('#cmp-a').value=TS.a; $('#cmp-b').value=TS.b; $('#cmpout').innerHTML=compareHTML(); setHash(); return; }
    const pf=e.target.closest('[data-act="playfrom"]'); if(pf){ S.date=pf.dataset.d; if(S.body==='plc') S.body='legco'; go(seatsHash()); setTimeout(()=>setPlaying(true),50); return; }
    const sv=e.target.closest('svg.comp'); if(sv && !e.target.closest('.ev') && sv.dataset.d){ S.date=sv.dataset.d; S.body=TS.body; tip.classList.remove('on'); go(seatsHash()); return; }
  });
  el.addEventListener('change',e=>{ if(e.target.id==='cmp-a'||e.target.id==='cmp-b'){ const v=e.target.value; if(!isDate(v)) return; TS[e.target.id==='cmp-a'?'a':'b']=clampDate(v); $('#cmpout').innerHTML=compareHTML(); setHash(); } });
  el.addEventListener('pointermove',e=>{ if(e.target.closest('svg.comp .chit')) compTip(e); else if(!e.target.closest('svg.comp')){ const xh=$('svg.comp .xhair'); if(xh) xh.setAttribute('hidden',''); } });
  el.addEventListener('pointerleave',()=>{ const xh=$('svg.comp .xhair'); if(xh) xh.setAttribute('hidden',''); tip.classList.remove('on'); });
  el.addEventListener('keydown',e=>{ const sv=e.target.closest('svg.comp'); if(!sv||!compChart.geo) return; const g=compChart.geo; if(!['ArrowLeft','ArrowRight','Enter'].includes(e.key)) return; e.preventDefault();
    let i=g.rows.findIndex(r=>r.d===sv.dataset.d); if(i<0) i=0; if(e.key==='ArrowLeft') i=Math.max(0,i-12); if(e.key==='ArrowRight') i=Math.min(g.rows.length-1,i+12);
    if(e.key==='Enter' && sv.dataset.d){ S.date=sv.dataset.d; S.body=TS.body; go(seatsHash()); return; }
    const r=sv.getBoundingClientRect(); const px=r.left+g.X(dateFrac(g.rows[i].d))/g.W*r.width; compTip({clientX:px,clientY:r.top+r.height*0.35}); });
}
