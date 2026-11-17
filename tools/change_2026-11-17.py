# Record of the data changes made on 17 November 2026 (person pages, stage 3).
# Kept for the record; it has already been applied to data/council-data.json. Don't run it again.
#
# 1. Chinese names for the 19 people who sat only in the Provisional LegCo, read on 16 Nov 2026 from each
#    member's Chinese-language profile in the LegCo Members Database (source S001).
# 2. A new "other names" field (on): [name, label, source]. Ellen Li gets the two forms in her HKU
#    honorary degree citation (S017). Her Chinese names 曹秀群 / 李曹秀群 are held back: only Chinese
#    Wikipedia (S015, a lead) gives them.
# 3. A saved web address (slug) for every person, so correcting a name later doesn't move the page.
# 4. A label for the styled name (sts) where it isn't from the 1 January 1970 list: George Stewart (P0426,
#    1960-61 Year Books) and Philip Higham (P0427, a 1969 remark).
# 5. The data date ("built") moves to 2026-11-17.
import json, re, sys, unicodedata
path = sys.argv[1]
raw = open(path, encoding='utf-8').read()
d = json.loads(raw)
assert json.dumps(d, ensure_ascii=False, separators=(',', ':')) == raw  # the file's exact format

ZH = {"P0407": "陳財喜", "P0408": "程介南", "P0409": "霍震霆", "P0410": "何鍾泰", "P0411": "簡福飴", "P0412": "劉江華",
      "P0413": "梁振英", "P0414": "梁劉柔芬", "P0415": "馬逢國", "P0416": "吳清輝", "P0417": "吳亮星", "P0418": "曾鈺成",
      "P0419": "曹王敏賢", "P0420": "王紹爾", "P0421": "黃英豪", "P0422": "胡經昌", "P0423": "楊釗", "P0424": "楊耀忠", "P0425": "袁武"}
P = d['people']
for pid, zh in ZH.items():
    assert P[pid]['z'] == '', pid
    P[pid]['z'] = zh

P['P0200']['on'] = [["Mrs Ellen Li Shu Pui", "As named in her HKU honorary degree citation, 1969", "S017"],
                    ["Sau Kuan", "Her given name, as the HKU citation gives it", "S017"]]

for pid in ('P0426', 'P0427'):
    assert P[pid]['st']
    P[pid]['sts'] = 'As printed in the Year Book'

def slugify(s):
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^A-Za-z0-9]+', '-', s).strip('-').lower()
seen = set()
for pid, p in P.items():
    s = slugify(p['k'] or p['n'])
    assert s and s not in seen, (pid, s)
    seen.add(s); p['slug'] = s

d['built'] = '2026-11-17'
open(path, 'w', encoding='utf-8', newline='\n').write(json.dumps(d, ensure_ascii=False, separators=(',', ':')))
print('done:', len(ZH), 'Chinese names,', len(seen), 'addresses')
