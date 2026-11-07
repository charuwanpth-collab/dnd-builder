// วิซาร์ดสร้าง/แก้ไขตัวละครทีละขั้น
import { D } from '../data.js';
import { h, iconSvg, sheet, toast, sign } from '../util.js';
import * as S from '../store.js';
import {
  ABIL, ABIL_EN, ABIL_SHORT, ABIL_TH, SKILLS, SKILL_AB, LANGS, STANDARD_ARRAY, POINT_COST, MAX_LEVEL,
  SPECIES_OPT, SIZE_CHOICE, FIGHTING_STYLE_AT, MASTERY_AT, EXPERTISE,
  compute, missing, col, setLevel, setPrimaryClass, classLevels, levelInfo, equipOptions, rebuildEquipment, classSpellList, weaponProficient, mod, subOf, srdSub,
} from '../rules.js';
import { featIdOf } from '../packs.js';
import { levelEditor, levelSummary } from './levelup.js';
import { classFeatureCard, featureCard, choiceCard, chips, counter, spellRow, original, statBox, fullTh } from './parts.js';

const STEPS = [
  { id: 'basic', label: 'เริ่ม', icon: 'edit' },
  { id: 'class', label: 'Class', icon: 'crown' },
  { id: 'background', label: 'Background', icon: 'background' },
  { id: 'species', label: 'Species', icon: 'human' },
  { id: 'abilities', label: 'ค่าพลัง', icon: 'str' },
  { id: 'levels', label: 'เลเวล', icon: 'level' },
  { id: 'equipment', label: 'ของติดตัว', icon: 'gear' },
  { id: 'spells', label: 'เวทมนตร์', icon: 'spell' },
  { id: 'done', label: 'สรุป', icon: 'd20' },
];

const thc = id => D.th.classes?.[id] || {};
const ths = id => D.th.species?.[id] || {};
const featTh = id => D.th.feats?.[id];
const packSub = (x, base) => (x?.pack ? [base, '📦 ' + x.pack].filter(Boolean).join(' · ') : base);

export function renderWizard(root, c, stepId, nav) {
  let step = STEPS.findIndex(s => s.id === stepId);
  if (step < 0) step = 0;

  const changed = (re = true) => {
    S.autosave(c);
    if (re) draw();
  };

  function visibleSteps() {
    const x = compute(c);
    const hasSpells = x.casting.some(b => !b.fixed && (b.cantripMax || b.preparedMax));
    return STEPS.filter(s => (s.id !== 'spells' || hasSpells) && (s.id !== 'levels' || c.level > 1));
  }

  function draw() {
    const steps = visibleSteps();
    if (!steps.some(s => s.id === STEPS[step].id)) step = STEPS.indexOf(steps[steps.length - 1]);
    const cur = STEPS[step];
    const pos = steps.indexOf(cur);
    const scrollY = window.scrollY;
    const body = ({ basic, class: klass, background, species, abilities, levels, equipment, spells, done })[cur.id]();
    root.replaceChildren(
      h('nav.stepper', { 'aria-label': 'ขั้นตอน' }, steps.map((s, i) => h('button.step' + (s === cur ? '.on' : '') + (i < pos ? '.past' : ''), {
        type: 'button', onclick: () => go(STEPS.indexOf(s)),
      }, h('span', { html: iconSvg(s.icon) }), h('small', s.label)))),
      h('section.wz-body', body),
      h('footer.wz-foot',
        h('button.btn', { disabled: pos === 0, onclick: () => go(STEPS.indexOf(steps[pos - 1])) }, '← ย้อน'),
        h('span.wz-pos', `${pos + 1}/${steps.length}`),
        pos < steps.length - 1
          ? h('button.btn.primary', { onclick: () => go(STEPS.indexOf(steps[pos + 1])) }, 'ถัดไป →')
          : h('button.btn.primary', { onclick: () => { S.save(c); nav(`#/c/${c.id}`); } }, 'เปิดใบตัวละคร')));
    if (cur.id === stepId) window.scrollTo(0, scrollY);
  }
  function go(i) {
    step = i;
    stepId = STEPS[i].id;
    history.replaceState(null, '', `#/edit/${c.id}/${stepId}`);
    draw();
    window.scrollTo(0, 0);
  }

  const section = (title, ...kids) => h('div.block', h('h3', title), ...kids);
  const intro = (title, text) => h('div.wz-intro', h('h2', title), text ? h('p', text) : null);

  // ---------- 1. เริ่ม ----------
  function basic() {
    return [
      intro('มาสร้าง Character กัน', 'ตั้งชื่อแล้วเลือกเลเวลเริ่มต้น ถ้าเพิ่งเริ่มเล่นครั้งแรก DM ส่วนใหญ่จะให้เริ่มที่เลเวล 1'),
      section('ชื่อตัวละคร', h('input.inp', { value: c.name, placeholder: 'เช่น Jerk', maxlength: 40, oninput: e => { c.name = e.target.value; changed(false); } })),
      section('ชื่อผู้เล่น', h('input.inp', { value: c.player, placeholder: 'ไม่ใส่ก็ได้', maxlength: 40, oninput: e => { c.player = e.target.value; changed(false); } })),
      section('เลเวล',
        h('select.inp.lv-sel', { 'aria-label': 'เลเวล', onchange: async e => {
          const n = +e.target.value;
          if (n < c.level && levelInfo(c).slice(n).some(li => li.e.hp || li.e.feat || li.e.c !== c.classId) && !confirm(`ลดเป็นเลเวล ${n}? ตัวเลือกของเลเวล ${n + 1}–${c.level} (HP/ASI/feat/คลาส) จะหายไป`)) { e.target.value = c.level; return; }
          setLevel(c, n); changed();
        } }, Array.from({ length: MAX_LEVEL }, (_, i) => h('option', { value: i + 1, selected: c.level === i + 1 }, `เลเวล ${i + 1}`))),
        h('p.muted.small', 'ซับคลาสได้ที่เลเวล 3 · ถ้าเริ่มเลเวล 2 ขึ้นไปจะมีขั้น "เลเวล" ให้เลือก HP / ASI / feat / Multiclass ทีละเลเวล')),
      section('รูปลักษณ์ / บุคลิก (ไม่บังคับ)', h('textarea.inp', { rows: 3, placeholder: 'ผมแดงยุ่ง ผิวสีน้ำตาลมีลายขาว ถือขวานสองคม…', oninput: e => { c.look = e.target.value; changed(false); } }, c.look || '')),
    ];
  }

  // ---------- 2. Class ----------
  function classSheet(cls) {
    const t = thc(cls.id);
    const L = Math.max(classLevels(c)[cls.id] || c.level, 3);
    sheet(cls.name, h('div',
      h('div.hero-row', h('span.hero-ico', { html: iconSvg(cls.id) }), h('div', h('b', t.tag || ''), h('p', t.desc || ''))),
      t.tips?.length ? h('div.tips', h('b', '💡 ทิปสำหรับมือใหม่'), h('ul', t.tips.map(x => h('li', x)))) : null,
      h('dl.kv',
        h('dt', 'Primary Ability'), h('dd', cls.core['Primary Ability']),
        h('dt', 'Hit Point Die'), h('dd', `d${cls.hitDie}`),
        h('dt', 'Saving Throws'), h('dd', cls.saves.map(a => ABIL_SHORT[a]).join(', ')),
        h('dt', 'Armor'), h('dd', cls.core['Armor Training']),
        h('dt', 'Weapons'), h('dd', cls.core['Weapon Proficiencies'])),
      h('h4', `ความสามารถถึงเลเวล ${L}`),
      cls.features.filter(f => f.level <= L && !/Subclass$/.test(f.name)).map(f => classFeatureCard(cls, f, false)),
      h('h4', `ซับคลาส: ${cls.subclass.name}`),
      thc(cls.id).sub?.desc ? h('p', thc(cls.id).sub.desc) : null,
      cls.subclass.features.filter(f => f.level <= L).map(f => classFeatureCard(cls, f, true)),
      (D.subs?.[cls.id] || []).length > 1 ? h('p.muted.small', 'ซับคลาสจาก Content Pack: ' + D.subs[cls.id].slice(1).map(x => x.name).join(', ')) : null),
      [{ label: c.classId === cls.id ? 'เลือกอยู่แล้ว' : 'เลือกคลาสนี้', primary: true, onClick: () => pickClass(cls.id) }]);
  }
  function pickClass(id) {
    if (c.classId !== id) {
      setPrimaryClass(c, id);
      c.skills = [];
      c.choices = {};
      c.spells = { cantrips: [], prepared: [], book: [] };
      c.equipment.classOpt = 'A';
      rebuildEquipment(c);
    }
    changed();
  }

  function klass() {
    const out = [intro('เลือกคลาส', 'คลาสคือ "อาชีพ" ของCharacter กำหนดว่าสู้ยังไง ใช้เวทไหม และเก่งเรื่องอะไร แตะการ์ดเพื่ออ่านรายละเอียด')];
    out.push(h('div.grid', D.classes.map(cls => choiceCard({
      id: cls.id, iconName: cls.id, title: cls.name, sub: `d${cls.hitDie} · ${cls.core['Primary Ability']}`,
      desc: thc(cls.id).tag, selected: c.classId === cls.id, onClick: () => classSheet(cls),
    }))));
    const cls = D.cls[c.classId];
    if (!cls) return out;
    const x = compute(c);
    const ch = c.choices;
    const L = x.CL;
    const block = (title, desc, ...kids) => h('div.block.choice-block', h('h3', title), desc ? h('p.muted', desc) : null, ...kids);

    out.push(h('h2.sec', `ตัวเลือกของ ${cls.name}`));
    const list = cls.skillList === 'any' ? SKILLS.map(s => s[0]) : cls.skillList;
    const bgSkills = D.bg[c.bgId]?.skills || [];
    out.push(block('สกิลจากคลาส', `เลือก ${cls.skillChoose} อย่าง (สกิลที่ได้จาก Background จะทำเครื่องหมายไว้)`,
      counter(c.skills.length, cls.skillChoose),
      chips(list, c.skills, cls.skillChoose, v => { c.skills = v; changed(); }, { locked: bgSkills.filter(s => !c.skills.includes(s)) })));

    if (cls.id === 'cleric') out.push(orderBlock('Divine Order', 'divineOrder', ['Protector', 'Thaumaturge']));
    if (cls.id === 'druid') out.push(orderBlock('Primal Order', 'primalOrder', ['Magician', 'Warden']));

    if (FIGHTING_STYLE_AT[cls.id] && L >= FIGHTING_STYLE_AT[cls.id]) {
      const opts = D.feats.filter(f => f.category === 'Fighting Style').map(f => ({ id: f.id, name: f.name, text: f.text }));
      if (cls.id === 'paladin') opts.push({ id: 'blessed-warrior', name: 'Blessed Warrior', text: cls.features.find(f => f.name === 'Fighting Style').text });
      if (cls.id === 'ranger') opts.push({ id: 'druidic-warrior', name: 'Druidic Warrior', text: cls.features.find(f => f.name === 'Fighting Style').text });
      out.push(block('Fighting Style', 'สไตล์การต่อสู้ที่ถนัด (เปลี่ยนได้ตอนเลเวลอัป)',
        h('div.grid.grid-2', opts.map(o => choiceCard({
          id: o.id, iconName: 'weapon', title: o.name, sub: packSub(D.feat[o.id]), desc: featTh(o.id)?.s, selected: ch.fightingStyle === o.id,
          onClick: () => { ch.fightingStyle = o.id; changed(); },
        })))));
    }

    if (MASTERY_AT[cls.id]) {
      const n = parseInt(col(cls, cls.id === 'barbarian' ? 'Mastery' : 'Weapon Mastery', L), 10) || 2;
      const ws = D.weapons.filter(w => (cls.id === 'barbarian' ? /Melee/.test(w.group) : true) && weaponProficient(w, x.weaponRule));
      out.push(block('Weapon Mastery', `เลือกอาวุธ ${n} ชนิดที่ใช้ "ท่าพิเศษ" ได้ (เปลี่ยนได้หลังพักยาว) — แนะนำให้เลือกอาวุธที่ถืออยู่`,
        counter((ch.mastery || []).length, n),
        chips(ws.map(w => w.id), ch.mastery || [], n, v => { ch.mastery = v; changed(); },
          { labels: Object.fromEntries(ws.map(w => [w.id, `${w.name} · ${w.mastery}`])) }),
        h('details.orig', h('summary', 'ท่าพิเศษ (Mastery) แต่ละแบบทำอะไร'),
          h('ul.mastery-list', D.mastery.map(mm => h('li', h('b', mm.name + ': '), D.th.mastery?.[mm.id] || mm.text, fullTh('mastery', mm.id)))))));
    }

    for (const [lv, n, only] of EXPERTISE[cls.id] || []) {
      if (L < lv) continue;
      const profSkills = x.skills.filter(s => s.prof && (!only || only.includes(s.name))).map(s => s.name);
      out.push(block('Expertise', `เลือก ${n} สกิลที่ชำนาญอยู่แล้ว ให้โบนัสเป็นสองเท่า${only ? ' (ต้องเป็นสกิลจากรายการของ Scholar)' : ''}`,
        counter((ch.expertise || []).length, n),
        profSkills.length ? chips(profSkills, (ch.expertise || []).filter(s => profSkills.includes(s)), n, v => { ch.expertise = v; changed(); })
          : h('p.warn', 'เลือกสกิลก่อน แล้วค่อยมาเลือก Expertise')));
    }


    if (cls.id === 'barbarian' && L >= 3) {
      const opts = cls.skillList.filter(s => !x.skills.find(k => k.name === s && k.prof) || ch.primalSkill === s);
      out.push(block('Primal Knowledge', 'เลือกสกิลเพิ่มอีก 1 อย่างจากรายการสกิลของ Barbarian',
        chips(opts, ch.primalSkill ? [ch.primalSkill] : [], 1, v => { ch.primalSkill = v[0]; changed(); })));
    }
    const isSrdSub = srdSub(c);
    if (cls.id === 'bard' && L >= 3 && isSrdSub) {
      const opts = SKILLS.map(k => k[0]).filter(k => !x.skills.find(z => z.name === k && z.prof) || (ch.loreSkills || []).includes(k));
      out.push(block('Bonus Proficiencies (College of Lore)', 'เลือกสกิลที่ยังไม่ชำนาญ 3 อย่าง', counter((ch.loreSkills || []).length, 3),
        chips(opts, ch.loreSkills || [], 3, v => { ch.loreSkills = v; changed(); })));
    }
    if (cls.id === 'druid' && L >= 3 && isSrdSub) out.push(block('ดินแดนของ Circle of the Land', 'เลือกชนิดดินแดน (เปลี่ยนได้ทุกครั้งที่พักยาว) — ได้สเปลติดตัวต่างกัน',
      chips(['Arid', 'Polar', 'Temperate', 'Tropical'], ch.land ? [ch.land[0].toUpperCase() + ch.land.slice(1)] : [], 1, v => { ch.land = v[0]?.toLowerCase(); changed(); },
        { labels: { Arid: 'Arid (ทะเลทราย)', Polar: 'Polar (ขั้วโลก)', Temperate: 'Temperate (เขตอบอุ่น)', Tropical: 'Tropical (เขตร้อน)' } })));
    if (cls.id === 'ranger' && L >= 3 && isSrdSub) out.push(block("Hunter's Prey", 'เลือกสไตล์ล่า (สลับได้หลังพัก)',
      h('div.grid.grid-2', [['Colossus Slayer', 'ตีศัตรูที่เลือดไม่เต็ม ดาเมจ +1d8 (ครั้งเดียวต่อเทิร์น) — เหมาะล่าตัวใหญ่'], ['Horde Breaker', 'ตีแล้วได้ตีอีกครั้งใส่ศัตรูอีกตัวที่ยืนติดกัน — เหมาะเจอฝูง']].map(([n, d]) =>
        choiceCard({ id: n, iconName: 'eye', title: n, desc: d, selected: ch.huntersPrey === n, onClick: () => { ch.huntersPrey = n; changed(); } })))));

    if (cls.id === 'sorcerer' && L >= 2) {
      const items = cls.options['metamagic-options'].items;
      out.push(block('Metamagic', 'เลือก 2 วิธีบิดเวท (ใช้ Sorcery Points)', counter((ch.metamagic || []).length, 2),
        optionList(items, ch.metamagic || [], 2, v => { ch.metamagic = v; changed(); })));
    }
    if (cls.id === 'warlock') {
      const n = parseInt(col(cls, 'Eldritch Invocations', L), 10);
      const items = cls.options['eldritch-invocation-options'].items.filter(i => i.minLevel <= L);
      out.push(block('Eldritch Invocations', `เลือก ${n} อย่าง (บางอย่างต้องมี cantrip ที่ทำดาเมจ เช่น Eldritch Blast)`, counter((ch.invocations || []).length, n),
        optionList(items, ch.invocations || [], n, v => { ch.invocations = v; changed(); })));
    }

    const subs = D.subs?.[cls.id] || [cls.subclass], cur = subOf(c);
    out.push(h('div.block.sub-info',
      h('h3', `ซับคลาส: ${cur.name}`),
      h('p', L >= 3 ? 'ได้รับแล้วที่เลเวล 3' : 'จะได้ตอนเลเวล 3 (เลือกไว้ก่อนได้)'),
      subs.length > 1 ? h('div.grid.grid-2', subs.map(sb => choiceCard({
        id: sb.id, iconName: cls.id, title: sb.name, sub: sb.pack ? '📦 ' + sb.pack : 'SRD',
        desc: sb.pack ? sb.th?.s : thc(cls.id).sub?.desc, selected: cur.id === sb.id,
        onClick: () => { c.subclassId = sb.id === cls.subclass.id ? null : sb.id; changed(); },
      }))) : null,
      cur.pack && L >= 3 ? cur.features.filter(f => f.level <= L).map(f => classFeatureCard(cls, f, true)) : null,
      h('p.muted.small', 'ข้อมูลฟรี (SRD) มีซับคลาสละ 1 แบบ — ซับคลาสอื่นเพิ่มเองได้ที่ ', h('a', { href: '#/packs' }, 'Content Pack'))));
    return out;
  }

  function orderBlock(title, key, opts) {
    const cls = D.cls[c.classId];
    const f = cls.features.find(x => x.name === title);
    return h('div.block.choice-block', h('h3', title), h('p.muted', 'เลือกบทบาท 1 แบบ'),
      h('div.grid.grid-2', opts.map(o => choiceCard({
        id: o, iconName: o === 'Protector' || o === 'Warden' ? 'shield' : 'spell', title: o,
        desc: thc(cls.id).orders?.[o], selected: c.choices[key] === o,
        onClick: () => { c.choices[key] = o; changed(); },
      }))), f ? fullTh('classes', [cls.id, 'f', f.id]) : null, original(f?.text));
  }

  function optionList(items, value, max, onChange) {
    const set = new Set(value);
    return h('div.opt-list', items.map(it => {
      const on = set.has(it.id);
      return h('div.opt' + (on ? '.on' : ''),
        h('div.opt-main',
          h('b', it.name), it.prereq ? h('small.muted', ' · ' + it.prereq) : null,
          h('p', D.th.options?.[it.id] || ''), fullTh('options', it.id), original(it.text)),
        h('button.check', {
          'aria-pressed': on ? 'true' : 'false', disabled: !on && set.size >= max,
          onclick: () => { on ? set.delete(it.id) : set.add(it.id); onChange([...set]); },
        }, on ? '✓' : '+'));
    }));
  }

  // ---------- 3. Background ----------
  function background() {
    const out = [intro('เลือก Background', 'อดีตของCharacter ก่อนออกผจญภัย ให้โบนัสค่าพลัง สกิล 2 อย่าง เครื่องมือ 1 อย่าง และ Origin Feat 1 อย่าง')];
    out.push(h('div.grid', D.backgrounds.map(bg => choiceCard({
      id: bg.id, iconName: 'background', title: bg.name, sub: packSub(bg, bg.abilities.map(a => ABIL_SHORT[a]).join(' · ')),
      desc: D.th.backgrounds?.[bg.id]?.desc, selected: c.bgId === bg.id,
      onClick: () => { if (c.bgId !== bg.id) { c.bgId = bg.id; c.abilities.bonus = {}; c.abilities.plus2 = null; c.abilities.plus1 = null; c.equipment.bgOpt = 'A'; rebuildEquipment(c); } changed(); },
    }))));
    out.push(h('p.muted.small', 'ข้อมูลฟรี (SRD) มี Background 4 แบบ — Background อื่นจากหนังสือ (เช่น Guard) เพิ่มเองได้ที่ ', h('a', { href: '#/packs' }, 'Content Pack')));
    const bg = D.bg[c.bgId];
    if (!bg) return out;
    const A = c.abilities;
    const mode = A.bonusMode || '21';
    const setBonus = () => {
      A.bonus = {};
      if (mode === '111') bg.abilities.forEach(a => (A.bonus[a] = 1));
      else { if (A.plus2) A.bonus[A.plus2] = 2; if (A.plus1 && A.plus1 !== A.plus2) A.bonus[A.plus1] = 1; }
      changed();
    };
    out.push(section('โบนัสค่าพลัง',
      h('p.muted', `เพิ่มค่าพลังจาก ${bg.abilities.map(a => ABIL_EN[a]).join(', ')} — เลือก +2 กับ +1 หรือ +1 ทั้งสาม`),
      h('div.seg', [['21', '+2 / +1'], ['111', '+1 / +1 / +1']].map(([k, l]) => h('button.seg-btn' + (mode === k ? '.on' : ''), { type: 'button', onclick: () => { A.bonusMode = k; setBonus(); } }, l))),
      mode === '21' ? h('div.bonus-pick',
        h('label', '+2 ให้ ', h('select.inp', { onchange: e => { A.plus2 = e.target.value; setBonus(); } }, h('option', { value: '' }, '—'), bg.abilities.map(a => h('option', { value: a, selected: A.plus2 === a }, ABIL_EN[a])))),
        h('label', '+1 ให้ ', h('select.inp', { onchange: e => { A.plus1 = e.target.value; setBonus(); } }, h('option', { value: '' }, '—'), bg.abilities.filter(a => a !== A.plus2).map(a => h('option', { value: a, selected: A.plus1 === a }, ABIL_EN[a]))))) : null));
    const fid = featIdOf(bg.feat);
    const feat = D.feat[fid];
    out.push(section('ได้รับ',
      h('dl.kv', h('dt', 'Skills'), h('dd', bg.skills.join(', ')), h('dt', 'Tool'), h('dd', bg.tool.replace(/\s*\(see.*\)/, '')), h('dt', 'Origin Feat'), h('dd', bg.feat)),
      feat ? featureCard({ name: bg.feat, text: feat.text, th: featTh(fid), tag: 'Origin Feat', full: ['feats', fid], pack: feat.pack }) : null));
    if (fid === 'magic-initiate') out.push(miAbility());
    if (bg.id === 'soldier') out.push(section('Gaming Set', chips(['Dice Set', 'Dragonchess Set', 'Playing Card Set', 'Three-Dragon Ante Set'], c.choices.gamingSet ? [c.choices.gamingSet] : [], 1, v => { c.choices.gamingSet = v[0]; changed(); })));
    return out;
  }
  function miAbility() {
    return section('Magic Initiate: ค่าพลังที่ใช้ร่าย', h('p.muted', 'เลือก INT, WIS หรือ CHA (ส่วนใหญ่เลือกค่าที่สูงสุดในสามตัวนี้) — ไปเลือกเวทในขั้น "เวทมนตร์"'),
      chips(['int', 'wis', 'cha'], c.choices.miAb ? [c.choices.miAb] : [], 1, v => { c.choices.miAb = v[0]; changed(); }, { labels: { int: 'INT', wis: 'WIS', cha: 'CHA' } }));
  }

  // ---------- 4. Species ----------
  function species() {
    const out = [intro('เลือก Species', 'เผ่าพันธุ์ของCharacter ให้ความสามารถพิเศษติดตัว เช่น มองในที่มืด หรือพ่นไฟ')];
    out.push(h('div.grid', D.species.map(s => choiceCard({
      id: s.id, iconName: s.id, title: s.name, sub: `${s.size.split(' ')[0]} · Speed ${s.speed}`,
      desc: ths(s.id).tag, selected: c.speciesId === s.id,
      onClick: () => { if (c.speciesId !== s.id) { c.speciesId = s.id; c.speciesOpt = {}; } changed(); },
    }))));
    const sp = D.sp[c.speciesId];
    if (!sp) return out;
    const so = c.speciesOpt;
    out.push(h('h2.sec', sp.name), ths(sp.id).desc ? h('p', ths(sp.id).desc) : null);
    const opt = SPECIES_OPT[sp.id];
    if (opt) {
      out.push(section(opt.label, chips(opt.opts.map(o => o[0]), so[opt.key] ? [so[opt.key]] : [], 1, v => { so[opt.key] = v[0]; changed(); },
        { labels: Object.fromEntries(opt.opts.map(o => [o[0], o[1] ? `${o[0]} (${o[1]})` : o[0]])) })));
      if (opt.ability) out.push(section('ค่าพลังที่ใช้ร่ายเวทของเผ่า', chips(['int', 'wis', 'cha'], so.ability ? [so.ability] : [], 1, v => { so.ability = v[0]; changed(); }, { labels: { int: 'INT', wis: 'WIS', cha: 'CHA' } })));
    }
    if (SIZE_CHOICE.includes(sp.id)) out.push(section('ขนาดตัว', chips(['Medium', 'Small'], [so.size || 'Medium'], 1, v => { so.size = v[0]; changed(); })));
    if (sp.id === 'elf') out.push(section('Keen Senses', h('p.muted', 'เลือกสกิล 1 อย่าง'), chips(['Insight', 'Perception', 'Survival'], so.skill ? [so.skill] : [], 1, v => { so.skill = v[0]; changed(); })));
    if (sp.id === 'human') {
      out.push(section('Skillful', h('p.muted', 'เลือกสกิลอะไรก็ได้ 1 อย่าง'), chips(SKILLS.map(s => s[0]), so.skill ? [so.skill] : [], 1, v => { so.skill = v[0]; changed(); })));
      const origin = D.feats.filter(f => f.category === 'Origin');
      out.push(section('Versatile: Origin Feat', h('div.grid.grid-2', origin.map(f => choiceCard({
        id: f.id, iconName: 'feat', title: f.name, sub: packSub(f), desc: featTh(f.id)?.s, selected: so.feat === f.id,
        onClick: () => { so.feat = f.id; changed(); },
      })))));
      if (so.feat === 'magic-initiate' && !D.bg[c.bgId]?.feat.startsWith('Magic Initiate')) {
        out.push(section('Magic Initiate: รายการเวท', chips(['cleric', 'druid', 'wizard'], c.choices.miList ? [c.choices.miList] : [], 1, v => { c.choices.miList = v[0]; c.choices.miCantrips = []; c.choices.miSpell = null; changed(); }, { labels: { cleric: 'Cleric', druid: 'Druid', wizard: 'Wizard' } })), miAbility());
      }
      if (so.feat === 'skilled') out.push(section('Skilled', h('p.muted', 'เลือกสกิล 3 อย่าง (กฎจริงเลือกเครื่องมือแทนได้ — จดไว้ในโน้ตได้เลย)'),
        counter((c.choices.skilled || []).length, 3), chips(SKILLS.map(s => s[0]), c.choices.skilled || [], 3, v => { c.choices.skilled = v; changed(); })));
    }
    const nLang = 2 + (c.classId === 'ranger' && (classLevels(c).ranger || 0) >= 2 ? 2 : 0);
    out.push(section('ภาษา', h('p.muted', `รู้ภาษา Common อยู่แล้ว เลือกเพิ่ม ${nLang} ภาษา${nLang > 2 ? ' (รวม 2 ภาษาจาก Deft Explorer ของ Ranger)' : ''}`),
      counter(c.languages.length, nLang), chips(LANGS, c.languages, nLang, v => { c.languages = v; changed(); })));
    out.push(h('h3', 'ความสามารถของเผ่า'));
    out.push(sp.traits.map(t => featureCard({ name: t.name, text: t.text, th: ths(sp.id).f?.[t.id], full: ['species', [sp.id, t.id]] })));
    return out;
  }

  // ---------- 5. ค่าพลัง ----------
  function abilities() {
    const A = c.abilities;
    const method = A.method || 'standard';
    const cls = D.cls[c.classId];
    const out = [intro('ค่าพลัง (Ability Scores)', 'ตัวเลข 6 ตัวที่บอกว่าCharacter เก่งด้านไหน ค่ายิ่งสูงโบนัสยิ่งเยอะ (10 = +0, 12 = +1, 14 = +2, 16 = +3)')];
    if (cls) out.push(h('p.hint', `💡 ${cls.name} ใช้ ${cls.core['Primary Ability']} เป็นหลัก — ใส่ค่าสูงสุดไว้ตรงนั้น` + (thc(cls.id).abilityTip ? ` · ${thc(cls.id).abilityTip}` : '')));
    out.push(h('div.seg', [['standard', 'ชุดมาตรฐาน'], ['pointbuy', 'ซื้อแต้ม'], ['roll', 'ทอยเต๋า']].map(([k, l]) => h('button.seg-btn' + (method === k ? '.on' : ''), {
      type: 'button', onclick: () => { A.method = k; A.assign = {}; if (k === 'pointbuy') ABIL.forEach(a => (A.base[a] = 8)); else ABIL.forEach(a => (A.base[a] = 8)); changed(); },
    }, l))));
    const pool = method === 'roll' ? (A.rolls || []) : STANDARD_ARRAY;
    if (method === 'roll') {
      out.push(h('div.roll-row',
        h('button.btn.primary', { onclick: () => {
          A.rolls = Array.from({ length: 6 }, () => { const d = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b); return d[1] + d[2] + d[3]; }).sort((a, b) => b - a);
          A.assign = {}; ABIL.forEach(a => (A.base[a] = 8)); changed();
        } }, '🎲 ทอย 4d6 ตัดตัวต่ำสุด ×6'),
        A.rolls ? h('span.rolls', A.rolls.join(' · ')) : h('span.muted', 'ทอยต่อหน้า DM นะ 😉')));
    }
    if (method === 'pointbuy') {
      const spent = ABIL.reduce((s, a) => s + (POINT_COST[A.base[a]] ?? 0), 0);
      out.push(h('p', 'แต้มที่เหลือ ', h('b.big', String(27 - spent)), ' / 27 (ค่าเริ่ม 8 สูงสุด 15)'));
    }
    const used = Object.values(A.assign || {});
    const rows = ABIL.map(a => {
      const bonus = A.bonus?.[a] || 0;
      const total = (A.base[a] || 8) + bonus;
      let input;
      if (method === 'pointbuy') {
        const spent = ABIL.reduce((s, k) => s + (POINT_COST[A.base[k]] ?? 0), 0);
        const v = A.base[a];
        input = h('div.stepper-inp',
          h('button.icon-btn', { disabled: v <= 8, onclick: () => { A.base[a] = v - 1; changed(); }, 'aria-label': 'ลด' }, '−'),
          h('b', String(v)),
          h('button.icon-btn', { disabled: v >= 15 || spent - POINT_COST[v] + POINT_COST[v + 1] > 27, onclick: () => { A.base[a] = v + 1; changed(); }, 'aria-label': 'เพิ่ม' }, '+'));
      } else {
        input = h('select.inp', { 'aria-label': ABIL_EN[a], onchange: e => {
          const i = e.target.value;
          A.assign = A.assign || {};
          if (i === '') delete A.assign[a]; else A.assign[a] = +i;
          A.base[a] = i === '' ? 8 : pool[+i];
          changed();
        } }, h('option', { value: '' }, '—'), pool.map((v, i) => h('option', { value: i, selected: A.assign?.[a] === i, disabled: used.includes(i) && A.assign?.[a] !== i }, String(v))));
      }
      return h('div.ab-row',
        h('span.ab-ico', { html: iconSvg(a) }),
        h('div.ab-name', h('b', ABIL_EN[a]), h('small', ABIL_TH[a])),
        input,
        h('span.ab-bonus', bonus ? `+${bonus}` : ''),
        h('div.ab-total', h('b', String(total)), h('small', sign(mod(total)))));
    });
    out.push(h('div.ab-table', rows));
    if (!c.bgId) out.push(h('p.warn', 'ยังไม่ได้เลือก Background — โบนัส +2/+1 จะมาจาก Background'));
    return out;
  }

  // ---------- เลเวล 2+ ----------
  const openLv = new Set();
  function levels() {
    const x = compute(c);
    const out = [intro('เลเวลอัป', `ตั้งค่าทีละเลเวล (2–${c.level}): HP แบบค่าเฉลี่ยหรือทอย, ASI / feat ที่เลเวล 4, 8, 12, 16 (บางคลาสได้เพิ่ม) และ Epic Boon ที่เลเวล 19 · อยากลองคลาสอื่นก็เปลี่ยนคลาสของเลเวลนั้นได้ (Multiclass)`)];
    out.push(h('div.ab-mini', ABIL.map(a => h('div', h('small', ABIL_SHORT[a]), h('b', sign(x.m[a])), h('span', String(x.score[a]))))),
      h('p.muted.small', `HP สูงสุด ${x.hpMax} · ${x.classLine}`));
    for (const li of levelInfo(c).slice(1)) {
      const need = (li.asi || li.boon) && !li.e.feat;
      const open = openLv.has(li.i) || need;
      out.push(h('details.block.lv-card' + (need ? '.need' : ''), {
        open, ontoggle: e => { if (e.currentTarget.open) openLv.add(li.i); else openLv.delete(li.i); },
      }, h('summary', h('b', `Lv ${li.lv}`), ' ', h('span', levelSummary(c, li, x))),
        h('div.lv-body', levelEditor(c, li.i, () => { openLv.add(li.i); changed(); }))));
    }
    return out;
  }

  // ---------- 6. ของติดตัว ----------
  function equipment() {
    const cls = D.cls[c.classId], bg = D.bg[c.bgId];
    const e = c.equipment;
    const out = [intro('ของติดตัวเริ่มต้น', 'เลือกชุดอุปกรณ์จากคลาสและ Background — หรือรับเป็นเงินแล้วไปช้อปเอง')];
    const optBlock = (title, text, key) => {
      const o = equipOptions(text);
      return section(title, h('div.grid.grid-1', Object.entries(o).map(([k, v]) => choiceCard({
        id: k, title: `ชุด ${k}`, desc: v, selected: (e[key] || 'A') === k,
        onClick: () => { e[key] = k; rebuildEquipment(c); changed(); },
      }))));
    };
    if (cls) out.push(optBlock(`จากคลาส ${cls.name}`, cls.core['Starting Equipment'], 'classOpt'));
    if (bg) out.push(optBlock(`จาก Background ${bg.name}`, bg.equipment, 'bgOpt'));
    if (!e.items.length && (cls || bg)) rebuildEquipment(c);
    const armors = e.items.filter(i => i.armor && i.armor !== 'shield');
    out.push(section('สวมใส่',
      h('label.row', 'เกราะ ', h('select.inp', { onchange: ev => { e.armor = ev.target.value || null; changed(); } },
        h('option', { value: '' }, 'ไม่ใส่เกราะ'),
        D.armor.filter(a => a.id !== 'shield').map(a => h('option', { value: a.id, selected: e.armor === a.id }, `${a.name} (AC ${a['armor class (ac)']})${armors.some(x => x.armor === a.id) ? ' ✓มีอยู่' : ''}`)))),
      h('label.row.check-row', h('input', { type: 'checkbox', checked: e.shield, onchange: ev => { e.shield = ev.target.checked; changed(); } }), ' ถือโล่ (Shield +2 AC)')));
    const x = compute(c);
    out.push(h('div.stats-row', statBox('AC', x.ac, x.acNote, 'ac'), statBox('เงิน', `${e.gp} GP`, null, 'coin')));
    x.warn.filter(w => /Armor|STR|Shield/.test(w)).forEach(w => out.push(h('p.warn', w)));
    out.push(section('รายการของ', h('ul.items', e.items.map(i => h('li', i.qty > 1 ? `${i.qty} × ${i.name}` : i.name, i.weapon ? h('i.tag', 'อาวุธ') : null, i.armor ? h('i.tag', 'เกราะ') : null)))));
    return out;
  }

  // ---------- 7. เวท ----------
  function spells() {
    const x = compute(c);
    const out = [intro('เลือกเวทมนตร์', 'Cantrip ร่ายได้ไม่จำกัด ส่วนเวทเลเวล 1+ ต้องใช้ Spell Slot — แตะชื่อเวทเพื่ออ่านรายละเอียด')];
    for (const b of x.casting) {
      if (b.fixed || (!b.cantripMax && !b.preparedMax)) continue;
      out.push(h('h2.sec', b.source), h('p.muted', `ค่าพลังร่าย ${ABIL_SHORT[b.ab]} · Save DC ${b.dc} · Spell Attack ${sign(b.atk)}`));
      const always = new Set(b.always);
      if (b.always.length) out.push(section('เตรียมไว้เสมอ (ไม่นับโควตา)', h('div.spell-list', b.always.map(id => spellRow(D.spell[id], { badge: 'ติดตัว' })))));
      const pick = (title, pool, value, max, onChange) => {
        const set = new Set(value);
        const levels = [...new Set(pool.map(s => s.level))].sort((a, b) => a - b);
        return h('div.block', h('h3', title, ' ', counter(set.size, max)),
          levels.map(lv => [levels.length > 1 ? h('h4.lv', lv === 0 ? 'Cantrips' : `Level ${lv}`) : null,
            h('div.spell-list', pool.filter(s => s.level === lv).map(s => spellRow(s, {
              selected: set.has(s.id), disabled: set.size >= max,
              onToggle: () => { set.has(s.id) ? set.delete(s.id) : set.size < max && set.add(s.id); onChange([...set]); },
            })))]));
      };
      if (b.key === 'class') {
        const all = classSpellList(b.list, b.maxLevel);
        if (b.cantripMax) out.push(pick('Cantrips', all.filter(s => s.level === 0), c.spells.cantrips, b.cantripMax, v => { c.spells.cantrips = v; changed(); }));
        if (b.bookMax) {
          out.push(pick('Spellbook (สมุดเวท)', all.filter(s => s.level > 0), c.spells.book || [], b.bookMax, v => { c.spells.book = v; c.spells.prepared = c.spells.prepared.filter(id => v.includes(id)); changed(); }));
          out.push(pick('เตรียมวันนี้ (เลือกจากสมุดเวท)', (c.spells.book || []).map(id => D.spell[id]).filter(Boolean), c.spells.prepared, b.preparedMax, v => { c.spells.prepared = v; changed(); }));
        } else if (b.preparedMax) {
          out.push(pick('เวทที่เตรียมไว้', all.filter(s => s.level > 0 && !always.has(s.id)), c.spells.prepared, b.preparedMax, v => { c.spells.prepared = v; changed(); }));
        }
        if (['cleric', 'druid', 'paladin', 'ranger', 'wizard'].includes(b.list)) out.push(h('p.muted.small', '💡 คลาสนี้เปลี่ยนเวทที่เตรียมได้ทุกครั้งที่พักยาว'));
      } else if (b.key === 'fs') {
        out.push(pick('Cantrips', classSpellList(b.list, 0).filter(s => s.level === 0), c.choices.fsCantrips || [], 2, v => { c.choices.fsCantrips = v; changed(); }));
      } else if (b.key === 'mi') {
        const all = classSpellList(b.list, 1);
        out.push(pick('Cantrips', all.filter(s => s.level === 0), c.choices.miCantrips || [], 2, v => { c.choices.miCantrips = v; changed(); }));
        out.push(pick('เวทเลเวล 1 (ร่ายฟรีได้ 1 ครั้ง/พักยาว)', all.filter(s => s.level === 1), c.choices.miSpell ? [c.choices.miSpell] : [], 1, v => { c.choices.miSpell = v[0] || null; changed(); }));
      }
    }
    return out;
  }

  // ---------- 8. สรุป ----------
  function done() {
    const x = compute(c);
    const miss = missing(c);
    return [
      intro(c.name || 'Character ไร้ชื่อ', [x.sp?.name, x.classLine, x.bg?.name].filter(Boolean).join(' · ')),
      h('div.stats-row', statBox('AC', x.ac, null, 'ac'), statBox('HP', x.hpMax, null, 'hp'), statBox('Speed', `${x.speed} ft`, null, 'speed'), statBox('Initiative', sign(x.init), null, 'init')),
      h('div.ab-mini', ABIL.map(a => h('div', h('small', ABIL_SHORT[a]), h('b', sign(x.m[a])), h('span', String(x.score[a]))))),
      miss.length ? h('div.block.warn-box', h('h3', 'ยังเลือกไม่ครบ'), h('ul', miss.map(m => h('li', m))), h('p.muted.small', 'เปิดใบตัวละครได้เลย แล้วค่อยกลับมาแก้ทีหลังก็ได้')) : h('p.ok', '✓ เลือกครบแล้ว พร้อมลุย!'),
      x.warn.length ? h('div.block', x.warn.map(w => h('p.warn', w))) : null,
    ];
  }

  draw();
}
