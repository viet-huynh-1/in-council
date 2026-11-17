# Run from the in-council folder after adding Chinese names:  python src/seal_glyphs.py  (needs fontTools and the Noto Serif CJK font)
# Glyph outlines for the person seals, from the same font and with the same placement as viet-huynh.com's seal
# (Noto Serif CJK HK Black; scale 0.04817; centred on the glyph's bounding box in a 62-unit stone).
import json
from fontTools.ttLib import TTCollection
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
import os
HERE=os.path.dirname(os.path.abspath(__file__))
d=json.load(open(os.path.join(HERE,'..','data','council-data.json'),encoding='utf-8'))
chars=set(p['z'][0] for p in d['people'].values() if p.get('z'))|set('議席年表人物關係海報數據')
f=[x for x in TTCollection('/usr/share/fonts/opentype/noto/NotoSerifCJK-Black.ttc').fonts if x['name'].getDebugName(4)=='Noto Serif CJK HK Black'][0]
cmap=f.getBestCmap(); gs=f.getGlyphSet(); out={}
for ch in sorted(chars):
    g=cmap.get(ord(ch))
    if not g: continue
    pen=SVGPathPen(gs); gs[g].draw(pen); bp=BoundsPen(gs); gs[g].draw(bp); x0,y0,x1,y1=bp.bounds
    out['%x'%ord(ch)]=[pen.getCommands(), round(31-(x0+x1)/2*0.04817,2)]
json.dump(out,open(os.path.join(HERE,'glyphs.json'),'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
print(len(chars),'chars',len(out),'glyphs',sum(len(v[0]) for v in out.values())//1024,'KB')
