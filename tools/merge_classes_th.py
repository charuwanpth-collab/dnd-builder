"""รวมคำแปลเต็มฟีเจอร์คลาส/ซับคลาสเข้า data/th/full/classes.json
ใช้: python3 tools/merge_classes_th.py <ไฟล์ .py ที่มี dict S = {'classId/f|sub/featureId': แปลเต็ม (markdown)}>
ทับค่าเดิมได้ · เรียงคีย์ตามลำดับฟีเจอร์ใน SRD · คงรูปแบบไฟล์เดิม (indent 1, ไม่มีบรรทัดว่างท้ายไฟล์)"""
import json, os, sys, runpy
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
S = runpy.run_path(sys.argv[1])['S']
cls = {c['id']: c for c in json.load(open('data/srd/classes.json'))}
order = {(c, 'f'): [f['id'] for f in x['features']] for c, x in cls.items()}
order.update({(c, 'sub'): [f['id'] for f in x['subclass']['features']] for c, x in cls.items()})
bad = [k for k in S if len(k.split('/')) != 3 or k.split('/')[2] not in order.get(tuple(k.split('/')[:2]), [])]
if bad: sys.exit('id ไม่มีใน SRD: ' + ', '.join(bad))
p = 'data/th/full/classes.json'
d = json.load(open(p))
for k, v in S.items():
  c, g, i = k.split('/')
  d.setdefault(c, {}).setdefault(g, {})[i] = v.strip()
for c in d:
  for g in d[c]:
    o = order.get((c, g), [])
    d[c][g] = {k: d[c][g][k] for k in sorted(d[c][g], key=lambda k: o.index(k) if k in o else 10**6)}
open(p, 'w').write(json.dumps(d, ensure_ascii=False, indent=1))
print(p, 'เพิ่ม/แก้', len(S), 'อัน')
