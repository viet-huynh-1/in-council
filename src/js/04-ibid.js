// ===================== Ibid, the duck from viet-huynh.com, in costume =====================
// Drawn from the site's own duck paths. Colours come from CSS variables, so day and night both work.
function duck(o={}){
  let s='';
  s+=`<path class="dk-line" d="M28,38 L26,48 L20,50 M26,48 L31,50 M42,39 L42,48 L36,50 M42,48 L47,50"/>`;
  s+=`<path class="dk" d="M10,2 C0,18 8,38 32,39 C54,40 71,31 77,15 L82,4 C72,11 61,12 52,8 C43,4 35,6 28,2"/>`;
  s+= o.wingUp ? `<path class="dk" d="M34,12 C34,-6 48,-22 72,-26 C66,-18 68,-12 61,-8 C65,-5 62,1 56,2 C58,7 52,11 46,14"/>` : `<path class="dk-line" d="M33,19 C41,29 55,29 62,19"/>`;
  s+=`<circle class="dk" cx="17" cy="-9" r="14"/>`;
  s+=`<path class="dk" d="M5,-11 C-4,-12 -11,-8 -11,-5 C-8,-2 0,-2 5,-4"/>`;
  s+= o.eye==='up' ? `<circle class="dk-eye" cx="14" cy="-14" r="2.4"/>` : `<circle class="dk-eye" cx="13" cy="-12" r="2.4"/>`;
  if(!o.noScarf) s+=`<path class="dk-scarf" d="M4,-1 C10,6 24,6 31,-1 L32,4 C24,10 10,10 4,4 Z"/><path class="dk-scarf" d="M26,4 L40,16 L34,19 L24,7"/>`;
  return s;
}
const IBID={
  // About: a civil servant, with bowler, umbrella and the red dispatch box
  about:{vb:'-90 -62 220 120', label:'Ibid the duck in a bowler hat, with an umbrella and a red dispatch box', svg:()=>
    `<path class="p-line" d="M46,30 L46,-28"/><path class="p-green" d="M14,-24 C20,-48 72,-48 78,-24 C72,-30 66,-30 61,-24 C56,-30 51,-30 46,-24 C41,-30 36,-30 31,-24 C26,-30 20,-30 14,-24 Z"/><path class="p-line" d="M46,30 C46,37 39,37 39,32"/>`+
    duck()+
    `<path class="p-dark" d="M6,-19 C5,-33 29,-33 28,-19 Z"/><path class="p-line" d="M0,-18 C8,-16 26,-16 34,-18"/>`+
    `<g transform="translate(-58,8) rotate(-6)"><rect class="p-red" x="0" y="0" width="46" height="30" rx="3"/><rect class="p-line" x="17" y="-6" width="12" height="7" rx="2"/><rect class="p-gold" x="18" y="12" width="10" height="7"/></g>`},
  // Home: a tour guide, with cap, pennant and lanyard
  home:{vb:'-40 -98 178 160', label:'Ibid the duck as a tour guide, in a cap, holding up a pennant, with a lanyard badge', svg:()=>
    `<path class="p-line thick" d="M66,-12 L75,-84"/><path class="p-red" d="M74,-83 L118,-73 L72,-62 Z"/><text x="88" y="-69" class="p-flagtext">議</text>`+
    duck({wingUp:true})+
    `<path class="p-red" d="M4,-18 C3,-33 31,-33 30,-18 Z"/><path class="p-red" d="M7,-19 C-1,-20 -11,-17 -14,-13 C-6,-13 1,-15 7,-16 Z"/><circle class="p-paper" cx="17" cy="-31" r="2"/>`+
    `<path class="p-cord" d="M8,1 L18,16 L28,1"/><rect class="p-paper" x="12.5" y="15" width="12" height="15" rx="1.5"/><path class="p-line fine" d="M15,21 L22,21 M15,25 L20,25"/>`},
  // Limitations: an archivist, with eyeshade, magnifier and an archive box marked "?"
  limits:{vb:'-48 -66 200 128', label:'Ibid the duck as an archivist, with a magnifying glass and an open archive box with a question mark on it', svg:()=>
    `<g transform="translate(72,4)"><rect class="p-manila" x="0" y="10" width="70" height="42"/><path class="p-manila" d="M-6,-8 L66,-14 L68,-4 L-4,2 Z"/><rect class="p-paper" x="20" y="22" width="30" height="14"/><text x="35" y="33.5" class="p-boxtext">?</text></g>`+
    duck({eye:'up'})+
    `<circle class="p-lens" cx="-24" cy="-4" r="11"/><path class="p-line thick" d="M-16,4 L-6,14"/>`+
    `<text x="46" y="-30" class="p-q">?</text>`}
};
function ibidSVG(which, w=300){ const c=IBID[which]; return `<svg class="ibid" viewBox="${c.vb}" width="${w}" role="img" aria-label="${esc(c.label)}"><g class="fx">${c.svg()}</g></svg>`; }
function cameo(which, caption, stamp){ return `<figure class="cameo">${ibidSVG(which)}<figcaption class="note">${caption}</figcaption>${stamp?`<span class="stamp">${stamp}</span>`:''}</figure>`; }
