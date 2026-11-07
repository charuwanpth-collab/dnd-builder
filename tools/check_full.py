"""เช็คว่าคำแปลเต็ม (data/th/full/*.json) ครบทุก id — python3 tools/check_full.py"""
import json, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
L = lambda p: json.load(open(p))
cls = L('data/srd/classes.json'); cls = {c['id']: c for c in (cls if isinstance(cls, list) else cls.values())}
want = {
  'options': [i['id'] for c, k in [('sorcerer', 'metamagic-options'), ('warlock', 'eldritch-invocation-options')] for i in cls[c]['options'][k]['items']],
  'feats': [i['id'] for i in L('data/srd/feats.json')],
  'mastery': [i['id'] for i in L('data/srd/mastery.json') + L('data/srd/weaponProps.json')],
}
bad = 0
for g, ids in want.items():
  p = f'data/th/full/{g}.json'
  have = L(p) if os.path.exists(p) else {}
  miss = [i for i in ids if not have.get(i)]; extra = [k for k in have if k not in ids]
  bad += len(miss) + len(extra)
  print(f'{g}: {len(ids) - len(miss)}/{len(ids)}', 'ขาด: ' + ', '.join(miss) if miss else '', 'เกิน: ' + ', '.join(extra) if extra else '')
raise SystemExit(1 if bad else 0)
