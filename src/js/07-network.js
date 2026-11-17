// ===================== connections: people ↔ organizations =====================
const NS={from:1960,to:1997,bodies:{LC:true,EC:true,SO:true,PLC:true},singles:false,sel:'',colorby:'body'};
const BODYCOL={LC:'--unoff',EC:'--exo',SO:'--off',PLC:'--plc'};
function netData(){
  const a=`${NS.from}-01-01`, b=`${NS.to}-12-31`;
  const inSpan=t=>NS.bodies[t.body] && t.cap==='substantive' && t.s0<=b && t.e1>=a;
  const people=new Set(T.filter(inSpan).map(t=>t.pid));
  const links=D.affiliations.filter(x=>people.has(x.person_id) && (()=>{ const s=+x.start_year||null, e=+x.end_year||s; if(!s&&!e) return true; return (s||e)<=NS.to && (e||s)>=NS.from; })());
  const byOrg={}; links.forEach(l=>{ (byOrg[l.org_id]=byOrg[l.org_id]||new Map()).set(l.person_id,l); });
  const tally=Object.entries(byOrg).map(([oid,m])=>({oid,n:m.size,dated:[...m.values()].filter(l=>l.start_year||l.end_year).length})).sort((x,y)=>y.n-x.n||ORGS[x.oid].english_name.localeCompare(ORGS[y.oid].english_name));
  const shownOrgs=new Set(tally.filter(t=>NS.singles||t.n>=2).map(t=>t.oid));
  const edges=links.filter(l=>shownOrgs.has(l.org_id));
  const ppl=[...new Set(edges.map(l=>l.person_id))];
  const mainBody=pid=>{ const ts=(TBYPID[pid]||[]).filter(inSpan); const c={}; ts.forEach(t=>c[t.body]=(c[t.body]||0)+1); return ['EC','LC','SO','PLC'].find(k=>c[k])||'LC'; };
  return {people,ppl,orgs:[...shownOrgs],edges,tally,mainBody,a,b};
}
function layoutNet(nodes,edges,W,H){
  // deterministic force layout
  const n=nodes.length, idx=new Map(nodes.map((d,i)=>[d.id,i]));
  nodes.forEach((d,i)=>{ const a=i*2.399963, r=Math.sqrt(i+0.5)/Math.sqrt(n)*Math.min(W,H)*0.45; d.x=W/2+r*Math.cos(a); d.y=H/2+r*Math.sin(a); d.vx=0; d.vy=0; });
  const E=edges.map(e=>[idx.get(e.s),idx.get(e.t)]).filter(e=>e[0]!=null&&e[1]!=null);
  const k=Math.sqrt(W*H/Math.max(n,1))*0.55;
  for(let it=0;it<320;it++){
    const temp=(1-it/320)*k*0.6+1;
    for(let i=0;i<n;i++){ const p=nodes[i]; p.fx=0; p.fy=0; }
    for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){ const p=nodes[i],q=nodes[j]; let dx=p.x-q.x, dy=p.y-q.y; let d2=dx*dx+dy*dy+0.01; const f=k*k/d2*(p.org||q.org?1.4:1); p.fx+=dx*f/Math.sqrt(d2); p.fy+=dy*f/Math.sqrt(d2); q.fx-=dx*f/Math.sqrt(d2); q.fy-=dy*f/Math.sqrt(d2); }
    for(const [i,j] of E){ const p=nodes[i],q=nodes[j]; const dx=p.x-q.x, dy=p.y-q.y, d=Math.sqrt(dx*dx+dy*dy)+0.01; const f=d*d/k*0.9; p.fx-=dx/d*f; p.fy-=dy/d*f; q.fx+=dx/d*f; q.fy+=dy/d*f; }
    for(const p of nodes){ p.fx+=(W/2-p.x)*0.02*(p.org?1.5:1); p.fy+=(H/2-p.y)*0.03*(p.org?1.5:1); const f=Math.hypot(p.fx,p.fy)||1; const m=Math.min(f,temp); p.x+=p.fx/f*m; p.y+=p.fy/f*m; p.x=Math.max(20,Math.min(W-20,p.x)); p.y=Math.max(20,Math.min(H-20,p.y)); }
  }
  // fit the drawing to the frame
  if(n>1){ const xs=nodes.map(p=>p.x), ys=nodes.map(p=>p.y); const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);
    const sc=Math.min((W-180)/Math.max(1,x1-x0),(H-90)/Math.max(1,y1-y0),4); const cx=(x0+x1)/2, cy=(y0+y1)/2;
    nodes.forEach(p=>{ p.x=W/2+(p.x-cx)*sc; p.y=H/2-10+(p.y-cy)*sc; }); }
}
function renderNetwork(){
  const N=netData(), W=1000, H=700;
  const nodes=[...N.orgs.map(o=>({id:o,org:true,n:N.tally.find(t=>t.oid===o).n})),...N.ppl.map(p=>({id:p,org:false}))];
  const edges=N.edges.map(l=>({s:l.org_id,t:l.person_id,dated:!!(l.start_year||l.end_year),l}));
  layoutNet(nodes,edges,W,H);
  const pos=Object.fromEntries(nodes.map(d=>[d.id,d]));
  const pcol=pid=>NS.colorby==='body'?`var(${BODYCOL[N.mainBody(pid)]})`:groupCol(bgGroup(pid));
  let s='<g class="edges">';
  edges.forEach(e=>{ const a=pos[e.s], b=pos[e.t]; s+=`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" class="${e.dated?'':'undated'}" data-o="${e.s}" data-p="${e.t}"/>`; });
  s+='</g><g class="pnodes">';
  nodes.filter(d=>!d.org).forEach(d=>{ s+=`<g class="pn" data-p="${d.id}" data-pid="${d.id}"><circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="9" class="hitarea"/><circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="5.5" style="fill:${pcol(d.id)}"/><text x="${(d.x+8).toFixed(1)}" y="${(d.y+4).toFixed(1)}" class="pl">${esc(nameOf(d.id))}</text><title>${esc(nameOf(d.id))}</title></g>`; });
  s+='</g><g class="onodes">';
  nodes.filter(d=>d.org).forEach(d=>{ const r=6+Math.sqrt(d.n)*4.2, o=ORGS[d.id]; s+=`<g class="on ${COMPANIES.some(c=>c.org_id===d.id)?'major':''}" data-o="${d.id}" tabindex="0" role="button" aria-label="${esc(o.english_name)}, ${d.n} linked"><rect x="${(d.x-r).toFixed(1)}" y="${(d.y-r).toFixed(1)}" width="${(2*r).toFixed(1)}" height="${(2*r).toFixed(1)}" rx="4"/><text x="${d.x.toFixed(1)}" y="${(d.y+r+13).toFixed(1)}" text-anchor="middle" class="ol">${esc(o.english_name.length>28?o.english_name.slice(0,26)+'…':o.english_name)}</text><text x="${d.x.toFixed(1)}" y="${(d.y+4).toFixed(1)}" text-anchor="middle" class="on-n">${d.n}</text></g>`; });
  s+='</g>';
  const svg=nodes.length?`<svg class="net" viewBox="0 0 ${W} ${H}" role="group" aria-label="Network of council members and organizations, ${NS.from} to ${NS.to}. The table beside it lists the same organizations.">${s}</svg>`:`<p class="empty">No ties recorded for this selection. Try a wider span, or include organizations with one link.</p>`;
  const yrs=[...Array(38)].map((_,i)=>1960+i);
  const ysel=(id,v)=>`<select class="sel" id="${id}" aria-label="${id==='n-from'?'From year':'To year'}">${yrs.map(y=>`<option ${y===v?'selected':''}>${y}</option>`).join('')}</select>`;
  const legendP = NS.colorby==='body' ? ['LC','EC','SO','PLC'].map(b=>`<span><b class="dot" style="background:var(${BODYCOL[b]})"></b>${({LC:'LegCo',EC:'ExCo (incl. if also LegCo)',SO:'Senior official',PLC:'Provisional LegCo'})[b]}</span>`).join('') : GROUPS.map(([g,n])=>`<span><b class="dot" style="background:${groupCol(g)}"></b>${n}</span>`).join('');
  $('#connectionsview').innerHTML=`<div class="label kicker"><span class="zh">關係</span> &nbsp;Connections</div><h1>Companies and institutions</h1>
  <p class="lede">Which firms, banks, schools and bodies council members were tied to. Squares are organizations, sized by how many members they link; dots are people.</p>
  <div class="ctrls"><span class="flabel">Years</span>${ysel('n-from',NS.from)}<span>to</span>${ysel('n-to',NS.to)}
   <span class="flabel">Bodies</span>${['LC','EC','SO','PLC'].map(b=>`<button class="chip" data-nb="${b}" aria-pressed="${NS.bodies[b]}">${({LC:'LegCo',EC:'ExCo',SO:'Senior Officials',PLC:'Provisional LegCo'})[b]}</button>`).join('')}
   <button class="switch" id="n-singles" role="switch" aria-checked="${NS.singles}"><i></i>Include one-link organizations</button>
   <span class="flabel">Colour people by</span><select class="sel" id="n-color"><option value="body" ${NS.colorby==='body'?'selected':''}>Body</option><option value="bg" ${NS.colorby==='bg'?'selected':''}>Background</option></select></div>
  <div class="netgrid"><div class="netbox">${svg}<div class="clegend">${legendP}<span><b class="sq"></b>Organization</span><span><b class="ln"></b>Tie with years</span><span><b class="ln dash"></b>Tie without years</span></div>
   <p class="muted small">${N.people.size} people held a place in the chosen bodies between ${NS.from} and ${NS.to}; ${new Set(D.affiliations.filter(l=>N.people.has(l.person_id)).map(l=>l.person_id)).size} of them have any tie recorded. Ties without years (most come from the occupations in the LegCo database) are shown whatever span you choose. Ties are sparse: see <a href="#limits">what's missing</a>.</p></div>
   <aside class="side"><div class="box" id="n-detail">${netDetail(N)}</div>
   <div class="box"><h4>Organization tally, ${NS.from}–${NS.to}</h4><div class="tablewrap tall"><table class="ctable tally"><thead><tr><th>Organization</th><th title="Council members linked in this span">Members</th><th title="Of whom the tie has no years">Undated</th></tr></thead><tbody>${N.tally.map(t=>`<tr class="${NS.sel===t.oid?'sel':''}"><td><button class="linkish" data-o="${t.oid}">${esc(ORGS[t.oid].english_name)}</button> <span class="muted small">${esc(ORGS[t.oid].type||'')}</span></td><td><b>${t.n}</b></td><td class="muted">${t.n-t.dated||''}</td></tr>`).join('')}</tbody></table></div></div></aside></div>`;
  if(NS.sel) netHighlight(NS.sel,true);
}
function netDetail(N){
  if(!NS.sel || !ORGS[NS.sel]) return `<h4>Pick an organization</h4><p>Click a square or a name in the tally to list the people tied to it.</p>`;
  const o=ORGS[NS.sel]; const ls=N.edges.filter(l=>l.org_id===NS.sel).length?N.edges.filter(l=>l.org_id===NS.sel):D.affiliations.filter(l=>l.org_id===NS.sel&&N.people.has(l.person_id));
  const byP={}; ls.forEach(l=>{ (byP[l.person_id]=byP[l.person_id]||[]).push(l); });
  const firstDate=(()=>{ const ts=T.filter(t=>byP[t.pid]&&t.cap==='substantive'&&t.s0<=N.b&&t.e1>=N.a).sort((x,y)=>x.s1.localeCompare(y.s1)); return ts.length?(ts[0].s1<N.a?N.a:ts[0].s1):N.a; })();
  return `<h4>${esc(o.english_name)} ${o.chinese_name?`<span class="zh">${esc(o.chinese_name)}</span>`:''}</h4><p class="muted small">${esc(o.type||'')}</p><ul class="nlist">${Object.entries(byP).map(([pid,arr])=>`<li><a href="#person/${pid}">${esc(nameOf(pid))}</a> <span class="muted small">${arr.map(l=>esc(l.role)+(l.start_year||l.end_year?` ${l.start_year||'?'}–${l.end_year||'?'}`:'')).join('; ')}</span></li>`).join('')}</ul><button class="go" data-act="hl-org" data-o="${NS.sel}" data-d="${clampDate(firstDate)}">Highlight them on the seats</button>`;
}
function netHighlight(oid,on){
  const sv=$('svg.net'); if(!sv) return;
  sv.classList.toggle('focusing',!!on);
  $$('.on,.pn,.edges line',sv).forEach(e=>e.classList.remove('lit'));
  if(!on) return;
  const ps=new Set($$(`.edges line[data-o="${oid}"]`,sv).map(l=>{ l.classList.add('lit'); return l.dataset.p; }));
  const on_=$(`.on[data-o="${oid}"]`,sv); if(on_) on_.classList.add('lit');
  $$('.pn',sv).forEach(g=>{ if(ps.has(g.dataset.p)) g.classList.add('lit'); });
}
function netHighlightPerson(pid,on){
  const sv=$('svg.net'); if(!sv) return;
  if(!on){ if(NS.sel) netHighlight(NS.sel,true); else netHighlight('',false); return; }
  sv.classList.add('focusing'); $$('.on,.pn,.edges line',sv).forEach(e=>e.classList.remove('lit'));
  const os=new Set($$(`.edges line[data-p="${pid}"]`,sv).map(l=>{ l.classList.add('lit'); return l.dataset.o; }));
  $$('.on',sv).forEach(g=>{ if(os.has(g.dataset.o)) g.classList.add('lit'); }); const pn=$(`.pn[data-p="${pid}"]`,sv); if(pn) pn.classList.add('lit');
}
function setupNetworkEvents(){
  const el=$('#connectionsview');
  el.addEventListener('click',e=>{
    const nb=e.target.closest('[data-nb]'); if(nb){ NS.bodies[nb.dataset.nb]=!NS.bodies[nb.dataset.nb]; renderNetwork(); return; }
    if(e.target.closest('#n-singles')){ NS.singles=!NS.singles; renderNetwork(); return; }
    const hl=e.target.closest('[data-act="hl-org"]'); if(hl){ Object.assign(S,{hlOrg:hl.dataset.o,focus:'',q:'',notice:''}); S.date=hl.dataset.d; if(S.body==='plc'&&S.date<PLC_FROM) S.body='legco'; go(seatsHash()); return; }
    const o=e.target.closest('[data-o]'); if(o && !e.target.closest('.edges')){ NS.sel = NS.sel===o.dataset.o?'':o.dataset.o; $('#n-detail').innerHTML=netDetail(netData()); $$('.tally tr').forEach(r=>r.classList.toggle('sel',!!NS.sel && !!$(`[data-o="${NS.sel}"]`,r))); netHighlight(NS.sel,!!NS.sel); setHash(); return; }
  });
  el.addEventListener('change',e=>{
    if(e.target.id==='n-from'||e.target.id==='n-to'){ NS.from=+$('#n-from').value; NS.to=+$('#n-to').value; if(NS.from>NS.to) [NS.from,NS.to]=[NS.to,NS.from]; renderNetwork(); setHash(); }
    if(e.target.id==='n-color'){ NS.colorby=e.target.value; renderNetwork(); }
  });
  el.addEventListener('mouseover',e=>{ const on=e.target.closest('.on'); if(on){ netHighlight(on.dataset.o,true); return; } const pn=e.target.closest('.pn'); if(pn){ netHighlightPerson(pn.dataset.p,true); } });
  el.addEventListener('mouseout',e=>{ if(e.target.closest('.on,.pn')){ if(NS.sel) netHighlight(NS.sel,true); else netHighlight('',false); } });
  el.addEventListener('keydown',e=>{ const on=e.target.closest('.on'); if(on && (e.key==='Enter'||e.key===' ')){ e.preventDefault(); on.dispatchEvent(new MouseEvent('click',{bubbles:true})); } });
}
