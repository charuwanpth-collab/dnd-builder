#!/usr/bin/env python3
"""แปลง SRD 5.2.1 (markdown จาก oldmanumby/dnd.srd.5.2) เป็น JSON สำหรับเว็บ
ใช้: python3 tools/build_srd.py <srd_dir> <out_dir>
ข้อความต้นฉบับภาษาอังกฤษเก็บไว้ครบตาม CC-BY-4.0
"""
import json, re, sys, os
from pathlib import Path

SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower().replace("'", '')).strip('-')


def read(p):
    return (SRC / p).read_text(encoding='utf-8').replace('\r\n', '\n')


def clean(md):
    md = re.sub(r'(?<=[A-Za-z0-9])--(?=[A-Za-z0-9])', '—', md)
    md = re.sub(r'^(\*\*Spell:\*\* .*)$', '', md, flags=re.M)
    md = re.sub(r'\n{3,}', '\n\n', md)
    return md.strip()


def split_sections(text, level):
    """แบ่งตาม heading ระดับ level → [(title, body)]"""
    pat = re.compile(r'^' + '#' * level + r' (.+)$', re.M)
    out, ms = [], list(pat.finditer(text))
    for i, m in enumerate(ms):
        end = ms[i + 1].start() if i + 1 < len(ms) else len(text)
        out.append((m.group(1).strip(), text[m.end():end]))
    return out


def parse_table(block):
    rows = [l for l in block.split('\n') if l.strip().startswith('|')]
    if len(rows) < 2:
        return None
    cell = lambda l: [c.strip().strip('*').strip() for c in l.strip().strip('|').split('|')]
    head = cell(rows[0])
    body = [cell(r) for r in rows[2:]]
    return {'head': head, 'rows': body}


def first_table_after(text, marker):
    i = text.find(marker)
    if i < 0:
        return None
    rest = text[i + len(marker):]
    m = re.search(r'((?:^\|.*\n?)+)', rest, re.M)
    return parse_table(m.group(1)) if m else None


def fields(body, names):
    d = {}
    for n in names:
        m = re.search(r'(?:^|\*\*)' + re.escape(n) + r':(?:\*\*)?\s*(.+?)(?=\s*\*\*[A-Z][A-Za-z ]+:\*\*|\n|$)', body, re.M)
        if m:
            d[n] = m.group(1).replace('**', '').strip()
    return d


# ---------------- Classes ----------------
ABBR = {'Strength': 'str', 'Dexterity': 'dex', 'Constitution': 'con',
        'Intelligence': 'int', 'Wisdom': 'wis', 'Charisma': 'cha'}


def level_features(text):
    feats = []
    for title, body in split_sections(text, 3):
        m = re.match(r'Level (\d+): (.+)', title)
        if m:
            feats.append({'level': int(m.group(1)), 'name': m.group(2).strip(),
                          'id': slug(m.group(2)), 'text': clean(body)})
    return feats


def options(text):
    out = []
    for title, body in split_sections(text, 3):
        pre = ''
        if 'Prerequisite:' in title:
            title, pre = title.split('Prerequisite:', 1)
            title = title.strip()
        m = re.search(r'\*?Prerequisite:\s*([^*\n]+)\*?', pre or body)
        pre = (m.group(1).strip() if m else pre.strip())
        if m and not pre == '':
            body = body.replace(m.group(0), '', 1)
        lv = re.search(r'Level (\d+)\+', pre)
        out.append({'name': title, 'id': slug(title), 'prereq': pre,
                    'minLevel': int(lv.group(1)) if lv else 1, 'text': clean(body)})
    return out


classes = []
for f in sorted((SRC / '03_Character_Classes/Character_Classes_Each').glob('*.md')):
    t = read(f.relative_to(SRC))
    name = re.search(r'^# (.+)$', t, re.M).group(1).strip()
    core = {}
    tb = first_table_after(t, 'Core ' + name + ' Traits')
    if tb:
        core[tb['head'][0]] = tb['head'][1]
        for r in tb['rows']:
            core[r[0]] = r[1]
    secs = dict(split_sections(t, 2))
    feat_sec = next(v for k, v in secs.items() if k.endswith('Class Features'))
    table = None
    for blk in re.findall(r'((?:^\|.*\n?)+)', feat_sec, re.M):
        tb2 = parse_table(blk)
        if tb2 and tb2['head'][0] == '' and tb2['rows'] and tb2['rows'][0][0] == 'Level':
            tb2 = {'head': tb2['rows'][0], 'rows': tb2['rows'][1:]}
        if not tb2 or tb2['head'][0] != 'Level' or len(tb2['rows']) != 20:
            continue
        if table is None:
            table = tb2
        else:  # ตารางต่อ (เช่น spell slot) → รวมคอลัมน์ตามเลเวล
            table['head'] += tb2['head'][1:]
            for a, b in zip(table['rows'], tb2['rows']):
                a += b[1:]
    sub = next(((k, v) for k, v in secs.items() if 'Subclass:' in k), None)
    sub_name = sub[0].split('Subclass:')[1].strip()
    sub_intro = re.split(r'^### ', sub[1], maxsplit=1, flags=re.M)[0]
    extra = {}
    for k, v in secs.items():
        if k.endswith('Options'):
            extra[slug(k)] = {'title': k, 'items': options(v)}
    saves = [ABBR[w] for w in re.findall('|'.join(ABBR), core.get('Saving Throw Proficiencies', ''))]
    hd = int(re.search(r'D(\d+)', core.get('Hit Point Die', 'D8')).group(1))
    sk = core.get('Skill Proficiencies', '')
    m = re.match(r'Choose (?:any )?(\d+)(?::| from)?\s*(.*)', sk)
    if m:
        n = int(m.group(1))
        lst = m.group(2)
        if 'any' in sk.lower():
            skill_list = 'any'
        else:
            skill_list = [s.strip() for s in re.split(r',\s*(?:or\s+)?|\s+or\s+', lst.rstrip('.')) if s.strip()]
    else:
        n, skill_list = 0, []
    classes.append({
        'id': slug(name), 'name': name, 'hitDie': hd, 'saves': saves,
        'core': core, 'skillChoose': n, 'skillList': skill_list,
        'table': table, 'features': level_features(feat_sec),
        'subclass': {'id': slug(sub_name), 'name': sub_name, 'intro': clean(sub_intro),
                     'features': level_features(sub[1])},
        'options': extra,
    })

# ---------------- Spells ----------------
spells = []
for title, body in split_sections(read('07_Spells/Spells_All.md'), 1):
    m = re.search(r'^\*(Level (\d) (\w+)|(\w+) Cantrip) \(([^)]*)\)\*', body, re.M)
    if not m:
        continue
    lvl = int(m.group(2)) if m.group(2) else 0
    school = m.group(3) or m.group(4)
    cls = [slug(c) for c in m.group(5).split(',')]
    fl = fields(body, ['Casting Time', 'Range', 'Components', 'Component', 'Duration'])
    fl.setdefault('Components', fl.get('Component', ''))
    if not fl.get('Casting Time'):
        m2 = re.search(r'^\**Casting Time\**:?\**\s*(.+)', body, re.M)
        if m2: fl['Casting Time'] = m2.group(1).replace('**', '').strip(' :')
    desc = body[body.find(fl.get('Duration', '')) + len(fl.get('Duration', '')):] if fl.get('Duration') else body
    dur = fl.get('Duration', '')
    spells.append({
        'id': slug(title), 'name': title, 'level': lvl, 'school': school, 'classes': cls,
        'time': fl.get('Casting Time', ''), 'range': fl.get('Range', ''),
        'components': fl.get('Components', ''), 'duration': dur,
        'concentration': dur.startswith('Concentration'),
        'ritual': 'Ritual' in fl.get('Casting Time', ''),
        'text': clean(desc),
    })

# ---------------- Species ----------------
species = []
for title, body in split_sections(read('04_Character_Origins/Species/Species_All.md'), 1):
    fl = fields(body, ['Creature Type', 'Size', 'Speed'])
    traits = []
    tm = list(re.finditer(r'^\*\*\*(.+?)\.\*\*\*\s*', body, re.M))
    for i, m in enumerate(tm):
        end = tm[i + 1].start() if i + 1 < len(tm) else len(body)
        traits.append({'name': m.group(1), 'id': slug(m.group(1)), 'text': clean(body[m.end():end])})
    species.append({'id': slug(title), 'name': title, 'type': fl.get('Creature Type'),
                    'size': fl.get('Size'), 'speed': int(re.search(r'\d+', fl.get('Speed', '30')).group()),
                    'traits': traits})

# ---------------- Backgrounds ----------------
backgrounds = []
for title, body in split_sections(read('04_Character_Origins/Backgrounds/Backgrounds_All.md'), 1):
    body = body.replace('**Tool Proficiency:**', '**Tool Proficiency:** ')
    fl = fields(body, ['Ability Scores', 'Feat', 'Skill Proficiencies', 'Tool Proficiency', 'Equipment'])
    feat = re.sub(r'\s*\(see .*?\)', '', fl.get('Feat', ''))
    backgrounds.append({
        'id': slug(title), 'name': title,
        'abilities': [ABBR[w] for w in re.findall('|'.join(ABBR), fl.get('Ability Scores', ''))],
        'feat': feat, 'skills': [s.strip() for s in fl.get('Skill Proficiencies', '').split(' and ')],
        'tool': fl.get('Tool Proficiency', ''), 'equipment': fl.get('Equipment', ''),
    })

# ---------------- Feats ----------------
feats = []
ft = read('05_Feats/Feats_All+Header.md')
for cat, cbody in split_sections(ft, 3):
    for title, body in split_sections(cbody, 4):
        m = re.search(r'^\*(.+?)\*\s*$', body, re.M)
        feats.append({'id': slug(title), 'name': title, 'category': cat.replace(' Feats', ''),
                      'tag': m.group(1) if m else '', 'text': clean(body[m.end():] if m else body)})

# ---------------- Equipment ----------------
def table_items(md, kind):
    tb = parse_table(re.search(r'((?:^\|.*\n?)+)', md, re.M).group(1))
    items, group = [], ''
    for r in tb['rows']:
        if all(c in ('', '-') for c in r[1:]):
            group = r[0].strip('*').strip()
            continue
        items.append(dict(zip([h.lower() for h in tb['head']], r), group=group))
    return items

wtxt = read('06_Equipment/Equipment_Each/Weapons.md')
weapons = table_items(wtxt[wtxt.find('| **Name**'):], 'weapon')
for w in weapons:
    w['id'] = slug(w['name'])
mastery = [{'name': n, 'id': slug(n), 'text': clean(b)}
           for n, b in split_sections(dict(split_sections(wtxt, 3))['Mastery Properties'], 4)]
props = [{'name': n, 'id': slug(n), 'text': clean(b)} for n, b in split_sections(dict(split_sections(wtxt, 3))['Properties'], 4)]
atxt = read('06_Equipment/Equipment_Each/Armor.md')
armor = table_items(atxt[atxt.find('| **Armor**'):], 'armor')
for a in armor:
    a['id'] = slug(a['armor'])
    a['name'] = a.pop('armor')

gtxt = read('06_Equipment/Equipment_Each/Adventuring_Gear.md')
gear = [{'name': re.sub(r'\s*\(.*\)$', '', n), 'id': slug(re.sub(r'\s*\(.*\)$', '', n)), 'text': clean(b)}
        for n, b in split_sections(gtxt, 4)]

legal = clean(read('Legal.md'))

out = {
    'classes': classes, 'spells': spells, 'species': species, 'backgrounds': backgrounds,
    'feats': feats, 'weapons': weapons, 'weaponProps': props, 'mastery': mastery,
    'armor': armor, 'gear': gear, 'legal': legal,
}
for k, v in out.items():
    (OUT / f'{k}.json').write_text(json.dumps(v, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print({k: len(v) for k, v in out.items()})
