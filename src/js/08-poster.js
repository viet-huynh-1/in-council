// ===================== printable poster =====================
const PS={body:'legco',date:'1975-01-01'};
function renderPoster(){
  const key=PS.body, d=PS.date, b=BODY[key];
  const keep=[S.colorby,S.acting]; S.colorby='seat';
  const xs=sortedView(key,d,true).filter(x=>!(key==='exco'&&x.t.seat==='GOV'&&false));
  const svg=chamberSVG(key,d,{plain:true,w:640,xs});
  const tiers=b.tiers.map(([tr,en,zh])=>{ const list=xs.filter(x=>x.t.tier===tr); if(!list.length) return '';
    return `<section class="ptier"><h3><span class="sw" style="background:var(${TIERCOL[tr]})"></span>${en}${zh?` <span class="zh">${zh}</span>`:''} <span class="n">${list.length}</span></h3><ol>${list.map(x=>`<li class="${x.t.cap!=='substantive'?'prov':''} ${x.st==='maybe'?'maybe':''}">${sealHTML(x.t.pid)}<span><b>${esc(nameOf(x.t.pid))}</b> <span class="zh">${esc(P[x.t.pid].z)}</span><br><span class="pp">${esc(label(x,d))}${x.st==='maybe'?' · dates uncertain':''}</span></span></li>`).join('')}</ol></section>`; }).join('');
  S.colorby=keep[0];
  const subs=xs.filter(x=>x.t.cap==='substantive' && !(key==='exco'&&x.t.seat==='GOV')).length, prov=xs.length-xs.filter(x=>x.t.cap==='substantive').length;
  const srcs=[...new Set(xs.map(x=>x.t.src).filter(Boolean).flatMap(s=>s.split(/[;,]/)))].map(i=>D.sources[i]).filter(Boolean).map(s=>shortCite(s));
  const opts=k=>`<option value="${k}" ${k===key?'selected':''}>${BODY[k].en}</option>`;
  $('#posterview').innerHTML=`<div class="ptools noprint"><a href="#${key}/${d}">← Back to the seats</a><select class="sel" id="ps-body" aria-label="Body">${['legco','exco','senior'].map(opts).join('')}${d>=PLC_FROM?opts('plc'):''}</select><label class="datebox"><input type="date" id="ps-date" min="${MIN}" max="${MAX}" value="${d}" aria-label="Date"></label><button class="go" data-act="print">Print or save as PDF</button><span class="muted small">Tip: in the print window, choose A3 or A4, portrait, and turn on “Background graphics”.</span></div>
  <article class="sheet" aria-label="Poster">
    <header class="sh">__SEAL__<div><div class="label">In Council · Hong Kong, 1960–1997</div><h1>${b.en}${b.zh?` <span class="zh">${b.zh}</span>`:''}</h1><div class="sdate">${fd(d)}</div></div></header>
    <p class="ssub">${key==='senior'?`${subs} senior posts`:`${subs} members`}${prov?`, and ${prov} standing in for absent members`:''}${key==='legco'&&d<'1993-01-13'?'. The Governor presided as President':''}${key==='exco'?'. The Governor presided but was not a member':''}.</p>
    <div class="schamber">${svg}</div>
    <div class="clegend">${TIERORDER.filter(t=>xs.some(x=>x.t.tier===t)).map(t=>`<span><b style="background:var(${TIERCOL[t]})"></b>${esc((b.tiers.find(r=>r[0]===t)||[,TIERLAB[t]])[1])}</span>`).join('')}<span><b class="hollow"></b>Standing in</span><span><b class="dashed"></b>Dates uncertain</span></div>
    <div class="stiers">${tiers}</div>
    <footer class="sf"><span>Sources: ${esc(srcs.join('; '))}.</span><span>council.viet-huynh.com · data CC BY 4.0 · printed ${fd(new Date().toLocaleDateString('en-CA'))}</span></footer>
  </article>`;
  S.acting=keep[1];
}
function setupPosterEvents(){
  const el=$('#posterview');
  el.addEventListener('change',e=>{ if(e.target.id==='ps-body'){ PS.body=e.target.value; renderPoster(); setHash(); } if(e.target.id==='ps-date'&&isDate(e.target.value)){ PS.date=clampDate(e.target.value); if(PS.body==='plc'&&PS.date<PLC_FROM) PS.body='legco'; renderPoster(); setHash(); } });
  el.addEventListener('click',e=>{ if(e.target.closest('[data-act="print"]')) window.print(); });
}
