// ===================== core: data, helpers, state =====================
const D = __DATA__;
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MIN='1960-01-01', MAX='1997-06-30', PLC_FROM='1996-12-21';
const CAP={s:'substantive',a:'acting',p:'provisional',t:'temporary'};
const T = D.terms.map(a=>({id:a[0],pid:a[1],body:a[2],seat:a[3],tier:a[4],post:a[5],cap:CAP[a[6]],s0:a[7],s1:a[8],e0:a[9],e1:a[10],src:a[11],note:a[12],for:a[13]}));
const TBYID = Object.fromEntries(T.map(t=>[t.id,t]));
const P = D.people;
const PIDS = Object.keys(P);
const TBYPID = {}; T.forEach(t=>{ (TBYPID[t.pid]=TBYPID[t.pid]||[]).push(t); });
function fd(s, short){ if(!s) return ''; const [y,m,d]=s.split('-'); return (+d)+' '+(short?MONTHS[+m-1].slice(0,3):MONTHS[+m-1])+' '+y; }
function addDays(s,n){ const d=new Date(s+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
function addMonths(s,n){ let [y,m,d]=s.split('-').map(Number); m+=n; y+=Math.floor((m-1)/12); m=((m-1)%12+12)%12+1; const dim=new Date(Date.UTC(y,m,0)).getUTCDate(); return `${y}-${String(m).padStart(2,'0')}-${String(Math.min(d,dim)).padStart(2,'0')}`; }
const clampDate = s => s<MIN?MIN:(s>MAX?MAX:s);
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s||'');
function dateFrac(s){ const y=+s.slice(0,4), st=Date.UTC(y,0,1), en=Date.UTC(y+1,0,1); return y+(Date.parse(s+'T00:00:00Z')-st)/(en-st); }
function fracDate(v){ const y=Math.floor(v), st=Date.UTC(y,0,1), en=Date.UTC(y+1,0,1); return new Date(st+Math.round((v-y)*(en-st)/864e5)*864e5).toISOString().slice(0,10); }
function span(t){
  const a = t.s0===t.s1 ? fd(t.s0,1) : `between ${fd(t.s0,1)} and ${fd(t.s1,1)}`;
  const b = t.e1>=MAX && t.e0>=MAX ? '30 Jun 1997' : (t.e0===t.e1 ? fd(t.e0,1) : `between ${fd(t.e0,1)} and ${fd(t.e1,1)}`);
  return `${a} – ${b}`;
}
function status(t,d){ if(d<t.s0||d>t.e1) return null; return (t.s1<=d && d<=t.e0) ? 'yes' : 'maybe'; }
const KEY={legco:'LC',exco:'EC',senior:'SO',plc:'PLC'};
const BKEY={LC:'legco',EC:'exco',SO:'senior',PLC:'plc'};
const BODY={
  legco:{en:'Legislative Council',short:'LegCo',zh:'立法局',tiers:[['pres','President','主席'],['exo','Ex officio members','當然官守議員'],['off','Official members','官守議員'],['unoff','Appointed unofficial members','委任非官守議員'],['ecol','Elected by the Electoral College','選舉團'],['fc','Elected by functional constituencies','功能組別'],['gc','Elected by geographical constituencies','地方選區'],['elc','Elected by the Election Committee','選舉委員會']]},
  exco:{en:'Executive Council',short:'ExCo',zh:'行政局',tiers:[['pres','Presiding','主持'],['exo','Ex officio members','當然官守議員'],['off','Nominated official members','官守議員'],['unoff','Unofficial members','非官守議員']]},
  senior:{en:'Senior Officials',short:'Senior Officials',zh:'',tiers:[['pres','Governor','總督'],['exo','Principal officials',''],['off','Policy and resource secretaries','']]},
  plc:{en:'Provisional Legislative Council',short:'Provisional LegCo',zh:'臨時立法會',tiers:[['plc','Members','議員']]}
};
const BODYNAME={LC:'Legislative Council',EC:'Executive Council',SO:'Senior Officials',PLC:'Provisional Legislative Council'};
const TIERCOL={pres:'--gov',exo:'--exo',off:'--off',unoff:'--unoff',ecol:'--ecol',fc:'--fc',gc:'--gc',elc:'--elc',plc:'--plc'};
const TIERLAB={pres:'President / Governor',exo:'Ex officio',off:'Officials',unoff:'Appointed unofficials',ecol:'Electoral College',fc:'Functional constituencies',gc:'Geographical constituencies',elc:'Election Committee',plc:'Provisional LegCo members'};
// background groups (eight, validated for colour) — the finer categories stay in the Highlight menu
const BGGROUP={'Civil service':'civ','Military':'civ','Law':'law','Banking and finance':'bank','Trading houses (hongs)':'trade','Shipping':'trade','Manufacturing and industry':'trade','Business':'trade','Medicine':'prof','Accounting and engineering':'prof','Education and academia':'edu','Community and charity':'com','Labour':'com','Religion':'com','Full-time legislator':'pol'};
const GROUPS=[['civ','Civil service and military'],['law','Law'],['bank','Banking and finance'],['trade','Trade, shipping and industry'],['prof','Medicine, accounting and engineering'],['edu','Education and academia'],['com','Community, labour and religion'],['pol','Full-time legislator'],['unk','Not yet sourced']];
const GROUPNAME=Object.fromEntries(GROUPS);
const groupCol = g => g==='unk'?'var(--unknown)':`var(--g-${g})`;
const EDU=[['University of Hong Kong',/University of Hong Kong|\(Hong Kong\)|H\.?K\.?U/i],['Chinese University of Hong Kong',/Chinese University/i],['Cambridge',/Cambridge|Cantab/i],['Oxford',/Oxford|Oxon/i],['London',/London|Lond\./i],['Edinburgh',/Edinburgh|Edin/i],['Glasgow',/Glasgow|Glas/i],['United States',/U\.S\.A|United States|Harvard|Stanford|Columbia|Cornell|Yale|Michigan|California/i],['Canada',/Canada|Toronto|McGill|British Columbia/i],['Australia',/Australia|Sydney|Melbourne/i]];
const EXO_ORDER={GOV:0,PRES:0,CS:1,FS:2,AG:3,SHA:4,CBF:5};
const ORGS = Object.fromEntries(D.orgs.map(o=>[o.org_id,o]));
const COMPANIES = D.orgs.filter(o=>o.has_button==='Yes');
const AFFBYPID={}; D.affiliations.forEach(a=>{ (AFFBYPID[a.person_id]=AFFBYPID[a.person_id]||[]).push(a); });
const affOf = pid => AFFBYPID[pid]||[];
const ORGCOUNT={}; D.affiliations.forEach(a=>{ ORGCOUNT[a.org_id]=ORGCOUNT[a.org_id]||new Set(); ORGCOUNT[a.org_id].add(a.person_id); });
const OTHERORGS = D.orgs.filter(o=>o.has_button!=='Yes' && ORGCOUNT[o.org_id] && ORGCOUNT[o.org_id].size>=2).sort((a,b)=>a.english_name.localeCompare(b.english_name));
const nameOf = pid => { const p=P[pid]; return p ? (p.k||p.n) : pid; };
const surname = pid => { const n=P[pid].n.split(/\s+/); const i=n.findIndex(w=>/^[A-Z][a-z]+-[a-z]+$/.test(w)); return (i>0? n[i-1] : n[n.length-1]).toLowerCase(); };
const bgOf = pid => (P[pid]?.bg)||[];
const primaryBg = pid => { const b=bgOf(pid); return ((b.find(x=>x[1])||b[0])||[])[0]||''; };
const bgGroup = pid => BGGROUP[primaryBg(pid)]||'unk';
const eduOf = pid => EDU.filter(([l,re])=>re.test((P[pid].ed||[]).join(' | '))).map(([l])=>l);
function sealChar(pid){ const p=P[pid]; if(p.z) return {t:p.z[0],lat:false}; const w=(p.k||p.n).replace(/^(Sir|Dr|Mrs|Mr)\s+/,'').split(/\s+/); return {t:(w[0][0]+(w[w.length-1][0]||'')).toUpperCase(),lat:true}; }
function postName(t,d){ // the Colonial Secretary was retitled Chief Secretary during 1976; the Secretary for Chinese Affairs became Secretary for Home Affairs during 1969
  if(t.post==='Colonial Secretary' && d){ if(d>='1977-01-01') return 'Chief Secretary'; if(d>='1976-01-02') return 'Colonial Secretary (retitled Chief Secretary during 1976)'; }
  if(t.post==='Secretary for Chinese Affairs' && d){ if(d>='1969-06-13') return 'Secretary for Home Affairs'; if(d>='1969-01-02') return 'Secretary for Chinese Affairs (renamed Secretary for Home Affairs during 1969)'; }
  return t.post||'';
}

// ---------- change dates per body ----------
const CHANGES={};
for(const k of ['LC','EC','SO','PLC']){
  const s=new Set();
  for(const t of T) if(t.body===k){ [t.s0,t.s1].forEach(x=>{ if(x>MIN&&x<=MAX) s.add(x); }); [t.e0,t.e1].forEach(x=>{ const y=addDays(x,1); if(y>MIN&&y<=MAX) s.add(y); }); }
  CHANGES[k]=[...s].sort();
}
CHANGES.ALL=[...new Set([...CHANGES.LC,...CHANGES.EC,...CHANGES.SO])].sort();

// ---------- state ----------
const S={body:'legco',date:'1970-01-01',acting:true,layout:'tiers',colorby:'seat',hlBg:'',hlEdu:'',hlBoth:false,hlOrg:'',q:'',focus:'',unit:'change',playing:false,speed:1,notice:''};
const changeKey = () => S.body==='all' ? 'ALL' : KEY[S.body];

function view(key, d, acting=S.acting){
  // returns list of {t, st, away, forName, also}
  const act=T.filter(t=>t.body===key && status(t,d));
  const subs=act.filter(t=>t.cap==='substantive');
  const others=act.filter(t=>t.cap!=='substantive');
  let out=subs.map(t=>({t,st:status(t,d)}));
  if(acting){
    const keyed=new Set(['GOV','PRES','CS','FS','AG','SHA','CBF']);
    for(const o of others){
      const isKeyed = keyed.has(o.seat) || o.seat.startsWith('OFF:') || o.seat.startsWith('SEC:');
      if(isKeyed){
        const holders=out.filter(x=>x.t.seat===o.seat && x.t.cap==='substantive');
        holders.forEach(h=>h.hidden=true);
        out.push({t:o,st:status(o,d),forName:holders.map(h=>nameOf(h.t.pid)).join(', ')});
      } else {
        const f=o.for ? out.find(x=>x.t.pid===o.for && x.t.cap==='substantive') : null;
        if(f) f.away=true;
        out.push({t:o,st:status(o,d),forName:o.for?nameOf(o.for):''});
      }
    }
  }
  const seen=new Set(); out=out.filter(x=>{ if(x.hidden) return false; const k=x.t.pid+'|'+x.t.seat+'|'+x.t.cap; if(seen.has(k)) return false; seen.add(k); return true; });
  if(key==='LC'){
    const pres=out.filter(x=>x.t.tier==='pres' && x.t.post!=='Governor' && x.t.cap==='substantive');
    for(const pr of pres){ const other=out.filter(x=>x!==pr && x.t.pid===pr.t.pid && x.t.cap==='substantive'); if(other.length){ pr.also=other.map(o=>o.t.post).join('; '); out=out.filter(x=>!other.includes(x)); } }
  }
  return out;
}
function bothSet(d){
  const lc=new Set(T.filter(t=>t.body==='LC'&&t.cap==='substantive'&&status(t,d)).map(t=>t.pid));
  return new Set(T.filter(t=>t.body==='EC'&&t.cap==='substantive'&&status(t,d)&&t.seat!=='GOV').map(t=>t.pid).filter(p=>lc.has(p)));
}
function label(x, d=S.date){
  const t=x.t, post=postName(t,d);
  if(t.cap==='acting'){ return (t.seat==='PRES'&&t.post==='Governor'?'Acting Governor, presiding':'Acting '+post)+(x.forName?` (for ${x.forName})`:''); }
  if(t.cap==='provisional') return 'Provisional member'+(x.forName?`, for ${x.forName}`:'');
  if(t.cap==='temporary') return 'Temporary member';
  if(t.body==='EC' && t.seat==='GOV') return 'Governor (presides; not a member)';
  if(t.body==='LC' && t.seat==='PRES') return t.post==='Governor' ? 'President (the Governor)' : 'President'+(x.also?' · also '+x.also:'');
  return post;
}
function colorFor(x){
  const pid=x.t.pid;
  if(S.colorby==='seat') return `var(${TIERCOL[x.t.tier]})`;
  if(S.colorby==='bg') return groupCol(bgGroup(pid));
  return 'var(--unknown)';
}
let BOTH=new Set();
function matches(x){
  const pid=x.t.pid, p=P[pid];
  if(S.focus && pid!==S.focus) return false;
  if(S.hlBg && !bgOf(pid).some(b=>b[0]===S.hlBg)) return false;
  if(S.hlEdu && !eduOf(pid).includes(S.hlEdu)) return false;
  if(S.hlBoth && !BOTH.has(pid)) return false;
  if(S.hlOrg && !affOf(pid).some(a=>a.org_id===S.hlOrg)) return false;
  if(S.q){
    const hay=[p.n,p.k,p.z,label(x),x.t.post,(p.oc||[]).join(' '),...affOf(pid).map(a=>(ORGS[a.org_id]||{}).english_name)].join(' ').toLowerCase();
    if(!S.q.toLowerCase().split(/\s+/).filter(Boolean).every(w=>hay.includes(w))) return false;
  }
  return true;
}
const filtering = () => !!(S.hlBg||S.hlEdu||S.hlBoth||S.hlOrg||S.q||S.focus);
function shortCite(s){ return s.citation.replace(/\.$/,'').replace(/^Hong Kong Government\. /,'').replace(/^Legislative Council Library\. /,'').replace(/^Legislative Council\. /,'LegCo, ').slice(0,120); }
function personSummary(pid){
  const ts=TBYPID[pid]||[];
  const bodies=[...new Set(ts.map(t=>t.body))];
  const y0=Math.min(...ts.map(t=>+t.s0.slice(0,4))), y1=Math.max(...ts.map(t=>+t.e1.slice(0,4)));
  return {bodies,y0,y1,ts};
}
const SUMM={}; PIDS.forEach(p=>SUMM[p]=personSummary(p));
const GLYPHS=__GLYPHS__;
// one hidden set of glyph shapes, reused by every seal on the page
(()=>{ const s=Object.entries(GLYPHS).map(([k,[d]])=>`<symbol id="sg-${k}" viewBox="0 0 1 1" overflow="visible"><path d="${d}"/></symbol>`).join(''); const div=document.createElement('div'); div.innerHTML=`<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${s}</defs></svg>`; document.body.prepend(div.firstChild); })();
function stoneSVG(chars, cls, lat){
  // same stone as viet-huynh.com's seal: 62 units wide, 5-unit corners by day; an inset 3-unit outline with 8-unit corners and pink glyphs by night
  const list=lat?[]:[...chars].slice(0,2), H=lat?62:(list.length>1?110:62), base=[49.18,97.18];
  const glyphs=lat?`<text class="bs-t lat" x="31" y="40" text-anchor="middle" font-size="${chars.length>2?20:25}">${esc(chars)}</text>`
    :list.map((ch,i)=>{ const k=ch.codePointAt(0).toString(16), g=GLYPHS[k];
      return g?`<use class="bs-g" href="#sg-${k}" width="1" height="1" transform="translate(${g[1]},${base[i]}) scale(0.04817,-0.04817)"/>`
              :`<text class="bs-t" x="31" y="${base[i]}" text-anchor="middle" font-size="48.17">${esc(ch)}</text>`; }).join('');
  return `<svg class="${cls}" viewBox="0 0 62 ${H}" aria-hidden="true" focusable="false"><g class="bs-fx"><rect class="bs-day" x="1.5" y="1.5" width="59" height="${H-3}" rx="5"/><rect class="bs-night" x="4" y="4" width="54" height="${H-8}" rx="8"/>${glyphs}</g></svg>`;
}
function sealHTML(pid, cls=''){ const sc=sealChar(pid); return stoneSVG(sc.t, `seal pseal ${sc.lat?'lat':''} ${cls}`, sc.lat); }
