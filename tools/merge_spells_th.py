"""รวมคำแปลสเปลเข้า data/th/spells.json (สรุป) + data/th/full/spells.json (เต็ม)
ใช้: python3 tools/merge_spells_th.py <ไฟล์ .py ที่มี dict S = {id: (สรุป, แปลเต็ม)}>
เรียงคีย์ตามลำดับใน SRD และคงรูปแบบไฟล์เดิม (indent 2 / 1)"""
import json, os, sys, runpy
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
S = runpy.run_path(sys.argv[1])['S']
order = [s['id'] for s in json.load(open('data/srd/spells.json'))]
bad = [k for k in S if k not in order]
if bad: sys.exit('id ไม่มีใน SRD: ' + ', '.join(bad))
for p, i, ind in [('data/th/spells.json', 0, 2), ('data/th/full/spells.json', 1, 1)]:
  d = json.load(open(p))
  for k, v in S.items(): d[k] = v[i].strip()
  d = {k: d[k] for k in sorted(d, key=lambda k: order.index(k) if k in order else 10**6)}
  open(p, 'w').write(json.dumps(d, ensure_ascii=False, indent=ind) + '\n')
  print(p, len(d))
