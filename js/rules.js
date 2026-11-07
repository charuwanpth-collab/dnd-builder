// กฎและการคำนวณค่าตัวละคร (D&D 2024 / SRD 5.2.1) — ทุกอย่างคำนวณจากข้อมูลตัวละครดิบ
import { D } from './data.js';
import { featIdOf } from './packs.js';

export const MAX_LEVEL = 3; // เฟส 1
export const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ABIL_EN = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
export const ABIL_SHORT = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
export const ABIL_TH = { str: 'แรง ยก ผลัก ตีหนัก', dex: 'ว่องไว แม่นยำ หลบหลีก', con: 'ถึก อึด เลือดเยอะ', int: 'ความรู้ เหตุผล', wis: 'สังเกต สัญชาตญาณ', cha: 'เสน่ห์ พูดจา ความมั่นใจ' };

export const SKILLS = [
  ['Acrobatics', 'dex'], ['Animal Handling', 'wis'], ['Arcana', 'int'], ['Athletics', 'str'],
  ['Deception', 'cha'], ['History', 'int'], ['Insight', 'wis'], ['Intimidation', 'cha'],
  ['Investigation', 'int'], ['Medicine', 'wis'], ['Nature', 'int'], ['Perception', 'wis'],
  ['Performance', 'cha'], ['Persuasion', 'cha'], ['Religion', 'int'], ['Sleight of Hand', 'dex'],
  ['Stealth', 'dex'], ['Survival', 'wis'],
];
export const SKILL_AB = Object.fromEntries(SKILLS);

export const LANGS = ['Common Sign Language', 'Draconic', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc'];
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

export const SPELL_AB = { bard: 'cha', cleric: 'wis', druid: 'wis', paladin: 'cha', ranger: 'wis', sorcerer: 'cha', warlock: 'cha', wizard: 'int' };
export const FIGHTING_STYLE_AT = { fighter: 1, paladin: 2, ranger: 2 };
export const MASTERY_AT = { barbarian: 1, fighter: 1, paladin: 1, ranger: 1, rogue: 1 };
export const EXPERTISE = { // [ระดับ, จำนวน, รายการจำกัด]
  rogue: [[1, 2]], bard: [[2, 2]], ranger: [[2, 1]],
  wizard: [[2, 1, ['Arcana', 'History', 'Investigation', 'Medicine', 'Nature', 'Religion']]],
};

export const mod = s => Math.floor((s - 10) / 2);
export const pbOf = l => 2 + Math.floor((l - 1) / 4);

/** ตัวเลือกพิเศษของ species */
export const SPECIES_OPT = {
  dragonborn: { key: 'ancestry', label: 'Draconic Ancestry', opts: [['Black', 'Acid'], ['Blue', 'Lightning'], ['Brass', 'Fire'], ['Bronze', 'Lightning'], ['Copper', 'Acid'], ['Gold', 'Fire'], ['Green', 'Poison'], ['Red', 'Fire'], ['Silver', 'Cold'], ['White', 'Cold']] },
  elf: { key: 'lineage', label: 'Elven Lineage', opts: [['Drow'], ['High Elf'], ['Wood Elf']], ability: true },
  gnome: { key: 'lineage', label: 'Gnomish Lineage', opts: [['Forest Gnome'], ['Rock Gnome']], ability: true },
  goliath: { key: 'ancestry', label: 'Giant Ancestry', opts: [["Cloud's Jaunt", 'Cloud Giant'], ["Fire's Burn", 'Fire Giant'], ["Frost's Chill", 'Frost Giant'], ["Hill's Tumble", 'Hill Giant'], ["Stone's Endurance", 'Stone Giant'], ["Storm's Thunder", 'Storm Giant']] },
  tiefling: { key: 'legacy', label: 'Fiendish Legacy', opts: [['Abyssal', 'Poison'], ['Chthonic', 'Necrotic'], ['Infernal', 'Fire']], ability: true },
};
// สเปลจาก species: [cantrip(s) lv1, lv3, lv5]
const SPECIES_SPELLS = {
  Drow: [['Dancing Lights'], 'Faerie Fire', 'Darkness'],
  'High Elf': [['Prestidigitation'], 'Detect Magic', 'Misty Step'],
  'Wood Elf': [['Druidcraft'], 'Longstrider', 'Pass without Trace'],
  'Forest Gnome': [['Minor Illusion'], null, null, 'Speak with Animals'],
  'Rock Gnome': [['Mending', 'Prestidigitation']],
  Abyssal: [['Poison Spray'], 'Ray of Sickness', 'Hold Person'],
  Chthonic: [['Chill Touch'], 'False Life', 'Ray of Enfeeblement'],
  Infernal: [['Fire Bolt'], 'Hellish Rebuke', 'Darkness'],
};
export const SIZE_CHOICE = ['human', 'tiefling'];

// ---------- ตัวช่วยตาราง ----------
export function col(cls, name, level) {
  const t = cls.table, i = t.head.indexOf(name);
  return i < 0 ? null : t.rows[level - 1][i];
}
const num = v => (v == null || v === '-' || v === '—' ? 0 : parseInt(v, 10) || 0);

export function parseMdTables(text) {
  const out = [];
  let label = '';
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    const lm = l.match(/^\*\*(.+?)\*\*$/);
    if (lm) label = lm[1];
    if (l.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++].trim());
      const cells = rows.filter(r => !/^\|[\s:|\-—]+\|?$/.test(r)).map(r => r.replace(/^\||\|$/g, '').split('|').map(c => c.replace(/\*/g, '').trim()));
      out.push({ label, head: cells[0], rows: cells.slice(1) });
    }
  }
  return out;
}

/** ซับคลาสที่ตัวละครเลือก (SRD หรือจาก Content Pack) */
export function subOf(c) {
  const cls = D.cls[c.classId];
  if (!cls) return null;
  return D.subs?.[cls.id]?.find(s => s.id === c.subclassId) || cls.subclass;
}
/** เลือกซับคลาส SRD อยู่หรือเปล่า (ตัวเลือกพิเศษอย่าง Land / Hunter's Prey ใช้เฉพาะซับคลาส SRD) */
export const srdSub = c => !!D.cls[c.classId] && subOf(c) === D.cls[c.classId].subclass;

/** สเปลที่ซับคลาสให้ "เตรียมไว้เสมอ" */
export function subclassSpells(cls, level, land, sub = cls.subclass) {
  if (level < 3) return [];
  if (sub.pack) return (sub.spells || []).filter(r => num(r.level) <= level).flatMap(r => String(r.list || '').split(',').map(x => x.trim()).filter(Boolean));
  const f = sub.features.find(x => /Spells$/.test(x.name));
  if (!f) return [];
  let tables = parseMdTables(f.text);
  if (cls.id === 'druid') tables = tables.filter(t => t.label.toLowerCase().startsWith((land || 'arid').toLowerCase()));
  const names = [];
  for (const r of tables[0]?.rows || []) if (num(r[0]) <= level) names.push(...r[1].split(',').map(s => s.trim()));
  return names;
}

export function casterInfo(cls, level) {
  if (!SPELL_AB[cls.id]) return null;
  const slots = {};
  let maxLevel = 0;
  if (cls.id === 'warlock') {
    const n = num(col(cls, 'Spell Slots', level)), lv = num(col(cls, 'Slot Level', level));
    if (n) { slots[lv] = n; maxLevel = lv; }
  } else {
    for (let s = 1; s <= 9; s++) {
      const n = num(col(cls, String(s), level));
      if (n) { slots[s] = n; maxLevel = s; }
    }
  }
  return {
    ability: SPELL_AB[cls.id],
    cantrips: num(col(cls, 'Cantrips', level)),
    prepared: num(col(cls, 'Prepared Spells', level)),
    slots, maxLevel, pact: cls.id === 'warlock',
  };
}

export function classSpellList(classId, maxLevel, includeCantrips = true) {
  return D.spells.filter(s => s.classes.includes(classId) && (s.level === 0 ? includeCantrips : s.level <= maxLevel));
}

// ---------- อุปกรณ์ ----------
export function equipOptions(text) {
  const out = {};
  const re = /\(([A-C])\)\s*([^;]+?)(?=;|$)/g;
  let m;
  while ((m = re.exec(text || ''))) out[m[1]] = m[2].replace(/^or\s+/i, '').trim();
  return out;
}

const singular = n => n.replace(/ies$/, 'y').replace(/(?<!s)s$/, '');
export function parseItems(text) {
  const items = [];
  let gp = 0;
  for (let part of (text || '').split(/,\s*(?:and\s+)?|\s+and\s+/)) {
    part = part.trim();
    if (!part) continue;
    const g = part.match(/^(\d+)\s*GP$/i);
    if (g) { gp += +g[1]; continue; }
    const q = part.match(/^(\d+)\s+(.+)$/);
    const qty = q ? +q[1] : 1;
    let name = q ? q[2] : part;
    const base = qty > 1 ? singular(name) : name;
    const w = D.weapons.find(x => x.name.toLowerCase() === base.toLowerCase());
    const a = D.armor.find(x => x.name.toLowerCase() === base.toLowerCase());
    items.push({ name: w?.name || a?.name || name, qty, weapon: w?.id, armor: a?.id });
  }
  return { items, gp };
}

// ---------- ความชำนาญอาวุธ/เกราะ ----------
function armorTraining(c, cls) {
  const t = (cls.core['Armor Training'] || '').toLowerCase();
  const set = new Set();
  ['light', 'medium', 'heavy'].forEach(k => t.includes(k) && set.add(k));
  if (t.includes('shield')) set.add('shield');
  const ch = c.choices || {};
  if (cls.id === 'cleric' && ch.divineOrder === 'Protector') set.add('heavy');
  if (cls.id === 'druid' && ch.primalOrder === 'Warden') set.add('medium');
  return set;
}
function weaponRule(c, cls) {
  const t = cls.core['Weapon Proficiencies'] || '';
  const ch = c.choices || {};
  if (/Simple and Martial/i.test(t)) return 'all';
  if ((cls.id === 'cleric' && ch.divineOrder === 'Protector') || (cls.id === 'druid' && ch.primalOrder === 'Warden')) return 'all';
  if (/Finesse or Light/i.test(t)) return 'finesse-light';
  if (/Light property/i.test(t)) return 'light';
  return 'simple';
}
export function weaponProficient(w, rule) {
  if (/^Simple/.test(w.group) || rule === 'all') return true;
  if (rule === 'light') return /\bLight\b/.test(w.properties);
  if (rule === 'finesse-light') return /\b(Light|Finesse)\b/.test(w.properties);
  return false;
}

// ---------- ทรัพยากร (ใช้ได้กี่ครั้ง) ----------
function resources(c, x) {
  const { cls, L, pb, m } = x;
  const R = [];
  const add = (id, name, max, reset, icon) => max > 0 && R.push({ id, name, max, reset, icon });
  const t = n => num(col(cls, n, L));
  switch (cls.id) {
    case 'barbarian': add('rage', 'Rage', t('Rages'), 'short1', 'flame'); break;
    case 'bard': add('bardic', 'Bardic Inspiration', Math.max(1, m.cha), 'long', 'lyre'); break;
    case 'cleric': if (L >= 2) add('cd', 'Channel Divinity', t('Channel Divinity'), 'short1', 'holy-symbol'); break;
    case 'druid': if (L >= 2) add('wild', 'Wild Shape', t('Wild Shape'), 'short1', 'oak-leaf'); break;
    case 'fighter':
      add('sw', 'Second Wind', t('Second Wind'), 'short1', 'hp');
      if (L >= 2) add('surge', 'Action Surge', 1, 'short', 'lightning-helix');
      break;
    case 'monk':
      if (L >= 2) { add('focus', 'Focus Points', t('Focus Points'), 'short', 'fist'); add('meta', 'Uncanny Metabolism', 1, 'long', 'hp'); }
      break;
    case 'paladin':
      add('loh', 'Lay On Hands (HP)', 5 * L, 'long', 'hp');
      if (L >= 2) add('smite', "Paladin's Smite (ร่ายฟรี)", 1, 'long', 'flame');
      if (L >= 3) add('cd', 'Channel Divinity', t('Channel Divinity'), 'short1', 'holy-symbol');
      break;
    case 'ranger': add('fe', "Hunter's Mark (ร่ายฟรี)", t('Favored Enemy'), 'long', 'eye'); break;
    case 'sorcerer':
      add('innate', 'Innate Sorcery', 2, 'long', 'magic-swirl');
      if (L >= 2) add('sp', 'Sorcery Points', t('Sorcery Points'), 'long', 'sorcerer');
      break;
    case 'warlock': if (L >= 2) add('cunning', 'Magical Cunning', 1, 'long', 'warlock-eye'); break;
    case 'wizard': add('arcrec', 'Arcane Recovery', 1, 'long', 'book'); break;
  }
  const sp = c.speciesId, so = c.speciesOpt || {};
  if (sp === 'dragonborn') add('breath', 'Breath Weapon', pb, 'long', 'dragonborn');
  if (sp === 'goliath' && so.ancestry) add('giant', so.ancestry, pb, 'long', 'goliath');
  if (sp === 'orc') { add('adrenaline', 'Adrenaline Rush', pb, 'short', 'orc'); add('relentless', 'Relentless Endurance', 1, 'long', 'hp'); }
  if (sp === 'dwarf') add('stone', 'Stonecunning', pb, 'long', 'dwarf');
  if (sp === 'gnome' && so.lineage === 'Forest Gnome') add('swa', 'Speak with Animals (ร่ายฟรี)', pb, 'long', 'gnome');
  if (SPECIES_SPELLS[so.lineage || so.legacy] && L >= 3 && SPECIES_SPELLS[so.lineage || so.legacy][1])
    add('sp3', SPECIES_SPELLS[so.lineage || so.legacy][1] + ' (ร่ายฟรี)', 1, 'long', 'spell');
  if (x.originFeats.includes('magic-initiate')) add('mi', 'Magic Initiate (ร่ายฟรี)', 1, 'long', 'feat');
  // ฟีเจอร์ซับคลาสจาก Content Pack ที่กำหนดจำนวนครั้งไว้
  if (x.sub?.pack && L >= 3) for (const f of x.sub.features) if (f.level <= L && f.uses?.n) {
    const u = f.uses.n, n = u === 'pb' ? pb : x.m[u] != null ? Math.max(1, x.m[u]) : parseInt(u, 10) || 0;
    add('pk-' + f.id, f.name, n, f.uses.reset === 'short' ? 'short' : 'long', 'feat');
  }
  return R;
}

// ---------- คำนวณทั้งหมด ----------
export function compute(c) {
  const cls = D.cls[c.classId], sp = D.sp[c.speciesId], bg = D.bg[c.bgId];
  const L = c.level || 1, pb = pbOf(L), ch = c.choices || {}, so = c.speciesOpt || {};
  const warn = [];
  const sub = subOf(c), isSrdSub = srdSub(c);
  if (cls && c.subclassId && sub?.id !== c.subclassId) warn.push('ซับคลาสที่เลือกไว้ไม่มีในเครื่องนี้ (แพ็กถูกปิดหรือลบ) — แสดงซับคลาส SRD แทน');

  // ค่าความสามารถ
  const score = {};
  for (const a of ABIL) score[a] = (c.abilities?.base?.[a] ?? 10) + (c.abilities?.bonus?.[a] || 0);
  const m = Object.fromEntries(ABIL.map(a => [a, mod(score[a])]));

  // Origin feats (จาก background + Human Versatile)
  const originFeats = [];
  if (bg) originFeats.push(D.feat[featIdOf(bg.feat)]?.id);
  if (c.speciesId === 'human' && so.feat) originFeats.push(so.feat);
  const featIds = originFeats.filter(Boolean);
  if (ch.fightingStyle && !['blessed-warrior', 'druidic-warrior'].includes(ch.fightingStyle)) featIds.push(ch.fightingStyle);

  // สกิล
  const prof = new Set([...(bg?.skills || []), ...(c.skills || [])]);
  if (so.skill) prof.add(so.skill);
  if (cls?.id === 'barbarian' && L >= 3 && ch.primalSkill) prof.add(ch.primalSkill);
  if (cls?.id === 'bard' && L >= 3 && isSrdSub) (ch.loreSkills || []).forEach(k => prof.add(k));
  for (const k of ['skilled', 'skilled2']) (ch[k] || []).forEach(s => SKILL_AB[s] && prof.add(s));
  const exp = new Set((ch.expertise || []).filter(s => prof.has(s)));
  const skills = SKILLS.map(([name, ab]) => {
    let bonus = m[ab];
    const p = prof.has(name), e = exp.has(name);
    if (e) bonus += pb * 2; else if (p) bonus += pb;
    else if (cls?.id === 'bard' && L >= 2) bonus += Math.floor(pb / 2);
    if ((cls?.id === 'cleric' && ch.divineOrder === 'Thaumaturge' && ['Arcana', 'Religion'].includes(name)) ||
        (cls?.id === 'druid' && ch.primalOrder === 'Magician' && ['Arcana', 'Nature'].includes(name))) bonus += Math.max(1, m.wis);
    return { name, ab, bonus, prof: p, exp: e };
  });

  const saves = ABIL.map(a => ({ ab: a, prof: !!cls?.saves.includes(a), bonus: m[a] + (cls?.saves.includes(a) ? pb : 0) }));

  // เกราะและ AC
  const training = cls ? armorTraining(c, cls) : new Set();
  const items = c.equipment?.items || [];
  const worn = D.armorById[c.equipment?.armor] || null;
  const shield = !!c.equipment?.shield;
  let ac = 10 + m.dex, acNote = 'ไม่ใส่เกราะ (10 + DEX)';
  if (worn) {
    const base = parseInt(worn['armor class (ac)'], 10);
    const heavy = /Heavy/.test(worn.group), medium = /Medium/.test(worn.group);
    ac = base + (heavy ? 0 : medium ? Math.min(2, m.dex) : m.dex);
    acNote = worn.name;
    const kind = heavy ? 'heavy' : medium ? 'medium' : 'light';
    if (!training.has(kind)) warn.push(`ยังไม่มี Armor Training สำหรับ ${worn.name} — ทอยที่ใช้ STR/DEX จะเสียเปรียบและร่ายเวทไม่ได้`);
    const strReq = worn.strength?.match(/\d+/);
    if (strReq && score.str < +strReq[0]) warn.push(`${worn.name} ต้องการ STR ${strReq[0]} — ความเร็วลด 10 ฟุต`);
  } else {
    const alt = [];
    if (cls?.id === 'barbarian') alt.push([10 + m.dex + m.con, 'Unarmored Defense (10 + DEX + CON)']);
    if (cls?.id === 'monk' && !shield) alt.push([10 + m.dex + m.wis, 'Unarmored Defense (10 + DEX + WIS)']);
    if (cls?.id === 'sorcerer' && L >= 3) alt.push([10 + m.dex + m.cha, 'Draconic Resilience (10 + DEX + CHA)']);
    for (const [v, n] of alt) if (v > ac) { ac = v; acNote = n; }
  }
  if (shield) {
    ac += 2; acNote += ' + Shield';
    if (!training.has('shield')) warn.push('ยังไม่มี Shield training');
  }
  if (worn && featIds.includes('defense')) { ac += 1; acNote += ' + Defense'; }

  // HP
  let hpMax = 0;
  if (cls) {
    const per = Math.floor(cls.hitDie / 2) + 1;
    for (let l = 1; l <= L; l++) {
      const roll = l === 1 ? cls.hitDie : (c.hpRolls?.[l] || per);
      hpMax += Math.max(1, roll + m.con);
    }
    if (c.speciesId === 'dwarf') hpMax += L;
    if (cls.id === 'sorcerer' && L >= 3) hpMax += L;
  }

  // ความเร็ว
  let speed = sp?.speed || 30;
  if (so.lineage === 'Wood Elf') speed = 35;
  if (cls?.id === 'monk' && L >= 2 && !worn && !shield) speed += num(col(cls, 'Unarmored Movement', L));
  if (worn?.strength?.match(/\d+/) && score.str < +worn.strength.match(/\d+/)[0]) speed -= 10;

  const init = m.dex + (featIds.includes('alert') ? pb : 0);
  const perception = skills.find(s => s.name === 'Perception').bonus;
  let darkvision = { dragonborn: 60, dwarf: 120, elf: 60, gnome: 60, orc: 120, tiefling: 60 }[c.speciesId] || 0;
  if (so.lineage === 'Drow') darkvision = 120;

  // อาวุธ
  const rule = cls ? weaponRule(c, cls) : 'simple';
  const masteries = new Set(ch.mastery || []);
  const attacks = [];
  const seen = new Set();
  for (const it of items) {
    const w = D.weapon[it.weapon];
    if (!w || seen.has(w.id)) continue;
    seen.add(w.id);
    const ranged = /Ranged/.test(w.group), finesse = /Finesse/.test(w.properties);
    let ab = ranged ? 'dex' : finesse ? (m.dex > m.str ? 'dex' : 'str') : 'str';
    if (cls?.id === 'monk' && !ranged && (/^Simple Melee/.test(w.group) || /\bLight\b/.test(w.properties)) && m.dex > m[ab]) ab = 'dex';
    const p = weaponProficient(w, rule);
    let hit = m[ab] + (p ? pb : 0);
    if (ranged && featIds.includes('archery')) hit += 2;
    let dmg = w.damage.replace(/^(\S+)/, `$1${m[ab] ? (m[ab] > 0 ? '+' : '') + m[ab] : ''}`);
    if (cls?.id === 'monk' && ab === 'dex') {
      const ma = col(cls, 'Martial Arts', L);
      const [d] = w.damage.split(' ');
      if (parseInt(ma.slice(2)) > parseInt(d.split('d')[1])) dmg = w.damage.replace(d, ma + (m.dex ? (m.dex > 0 ? '+' : '') + m.dex : ''));
    }
    attacks.push({ name: w.name, hit, dmg, props: w.properties, mastery: masteries.has(w.id) ? w.mastery : null, prof: p, ranged });
  }
  const unarmedDie = cls?.id === 'monk' ? col(cls, 'Martial Arts', L) : null;
  const uAb = cls?.id === 'monk' && m.dex > m.str ? 'dex' : 'str';
  attacks.push({ name: 'Unarmed Strike', hit: m[uAb] + pb, dmg: unarmedDie ? `${unarmedDie}${m[uAb] >= 0 ? '+' : ''}${m[uAb]} Bludgeoning` : `${Math.max(0, 1 + m.str)} Bludgeoning`, props: '', prof: true });

  // เวท
  const casting = [];
  const ci = cls ? casterInfo(cls, L) : null;
  if (ci) {
    const ab = ci.ability;
    let always = [];
    if (cls.id === 'druid') always.push('Speak with Animals');
    if (cls.id === 'ranger') always.push("Hunter's Mark");
    if (cls.id === 'paladin' && L >= 2) always.push('Divine Smite');
    always.push(...subclassSpells(cls, L, ch.land, sub));
    const extraCantrips = (cls.id === 'cleric' && ch.divineOrder === 'Thaumaturge') || (cls.id === 'druid' && ch.primalOrder === 'Magician') ? 1 : 0;
    casting.push({
      key: 'class', source: cls.name, ab, dc: 8 + pb + m[ab], atk: pb + m[ab],
      cantripMax: ci.cantrips + extraCantrips, preparedMax: ci.prepared, slots: ci.slots, pact: ci.pact, maxLevel: ci.maxLevel,
      cantrips: c.spells?.cantrips || [], prepared: c.spells?.prepared || [], book: c.spells?.book,
      bookMax: cls.id === 'wizard' ? 6 + 2 * (L - 1) : null,
      always: always.map(n => D.spellByName[n.toLowerCase()]?.id).filter(Boolean), list: cls.id,
    });
    if (ci.cantrips + extraCantrips < (c.spells?.cantrips || []).length) warn.push('เลือก cantrip เกินจำนวน');
  }
  if (ch.fightingStyle === 'blessed-warrior' || ch.fightingStyle === 'druidic-warrior') {
    const ab = cls.id === 'paladin' ? 'cha' : 'wis';
    casting.push({ key: 'fs', source: ch.fightingStyle === 'blessed-warrior' ? 'Blessed Warrior' : 'Druidic Warrior', ab, dc: 8 + pb + m[ab], atk: pb + m[ab], cantripMax: 2, preparedMax: 0, cantrips: ch.fsCantrips || [], prepared: [], always: [], list: cls.id === 'paladin' ? 'cleric' : 'druid', slots: {} });
  }
  if (originFeats.includes('magic-initiate')) {
    const listId = (bg?.feat.match(/\((\w+)\)/)?.[1] || ch.miList || 'wizard').toLowerCase();
    const viaHuman = so.feat === 'magic-initiate' && !bg?.feat.startsWith('Magic Initiate');
    const list = viaHuman ? (ch.miList || 'wizard') : listId;
    const ab = ch.miAb || SPELL_AB[list] || 'int';
    casting.push({ key: 'mi', source: `Magic Initiate (${list[0].toUpperCase() + list.slice(1)})`, ab, dc: 8 + pb + m[ab], atk: pb + m[ab], cantripMax: 2, preparedMax: 1, maxLevel: 1, cantrips: ch.miCantrips || [], prepared: ch.miSpell ? [ch.miSpell] : [], always: [], list, slots: {} });
  }
  const sps = SPECIES_SPELLS[so.lineage || so.legacy];
  if (sps) {
    const ab = so.ability || 'int';
    const always = [];
    if (L >= 3 && sps[1]) always.push(sps[1]);
    if (L >= 5 && sps[2]) always.push(sps[2]);
    if (sps[3]) always.push(sps[3]);
    const cantrips = [...sps[0]];
    if (c.speciesId === 'tiefling') cantrips.push('Thaumaturgy');
    casting.push({ key: 'species', source: so.lineage || so.legacy, ab, dc: 8 + pb + m[ab], atk: pb + m[ab], fixed: true, cantripMax: 0, preparedMax: 0, cantrips: cantrips.map(n => D.spellByName[n.toLowerCase()]?.id).filter(Boolean), prepared: [], always: always.map(n => D.spellByName[n.toLowerCase()]?.id).filter(Boolean), slots: {} });
  } else if (c.speciesId === 'tiefling') {
    // ยังไม่เลือก legacy
  }

  // ฟีเจอร์
  const feats = [];
  if (cls) {
    for (const f of cls.features) if (f.level <= L && !/Subclass$|^Ability Score Improvement$|^Epic Boon$/.test(f.name)) feats.push({ ...f, src: 'class' });
    if (L >= 3) for (const f of sub.features) if (f.level <= L) feats.push({ ...f, src: 'sub' });
  }

  const xx = { cls, L, pb, m, originFeats: featIds, sub };
  const res = cls ? resources(c, xx) : [];

  // ภาษา
  const langs = new Set(['Common', ...(c.languages || [])]);
  if (cls?.id === 'druid') langs.add('Druidic');
  if (cls?.id === 'rogue') langs.add("Thieves' Cant");

  // เช็คตัวเลือกที่ยังขาด
  if (!cls) warn.push('ยังไม่ได้เลือกคลาส');
  if (!sp) warn.push('ยังไม่ได้เลือก Species');
  if (!bg) warn.push('ยังไม่ได้เลือก Background');

  return {
    cls, sub, sp, bg, L, pb, score, m, skills, saves, ac, acNote, hpMax, speed, init, perception, darkvision,
    attacks, casting, feats, res, featIds, originFeats: originFeats.filter(Boolean), langs: [...langs],
    training: [...training], weaponRule: rule, warn,
  };
}

/** รายการตัวเลือกที่ผู้เล่นยังไม่ได้เลือก (ใช้ทั้งในวิซาร์ดและใบตัวละคร) */
export function missing(c) {
  const out = [];
  const cls = D.cls[c.classId];
  if (!cls) return ['เลือกคลาส'];
  const L = c.level || 1, ch = c.choices || {};
  if ((c.skills || []).length < cls.skillChoose) out.push(`เลือกสกิลของคลาส (${cls.skillChoose})`);
  if (FIGHTING_STYLE_AT[cls.id] && L >= FIGHTING_STYLE_AT[cls.id] && !ch.fightingStyle) out.push('เลือก Fighting Style');
  if (cls.id === 'cleric' && !ch.divineOrder) out.push('เลือก Divine Order');
  if (cls.id === 'druid' && !ch.primalOrder) out.push('เลือก Primal Order');
  if (MASTERY_AT[cls.id] && (ch.mastery || []).length < num(col(cls, cls.id === 'barbarian' ? 'Mastery' : 'Weapon Mastery', L) || 2)) out.push('เลือก Weapon Mastery');
  if (cls.id === 'barbarian' && L >= 3 && !ch.primalSkill) out.push('เลือกสกิลจาก Primal Knowledge');
  const isSrdSub = srdSub(c);
  if (cls.id === 'bard' && L >= 3 && isSrdSub && (ch.loreSkills || []).length < 3) out.push('เลือกสกิล 3 อย่าง (Bonus Proficiencies)');
  if (cls.id === 'druid' && L >= 3 && isSrdSub && !ch.land) out.push('เลือกชนิดดินแดน (Circle of the Land)');
  if (cls.id === 'ranger' && L >= 3 && isSrdSub && !ch.huntersPrey) out.push("เลือก Hunter's Prey");
  if (cls.id === 'sorcerer' && L >= 2 && (ch.metamagic || []).length < 2) out.push('เลือก Metamagic 2 อย่าง');
  if (cls.id === 'warlock' && (ch.invocations || []).length < num(col(cls, 'Eldritch Invocations', L))) out.push('เลือก Eldritch Invocations');
  for (const [lv, n] of EXPERTISE[cls.id] || []) if (L >= lv && (ch.expertise || []).length < (cls.id === 'ranger' ? 1 : n)) out.push('เลือก Expertise');
  if (SPECIES_OPT[c.speciesId] && !c.speciesOpt?.[SPECIES_OPT[c.speciesId].key]) out.push(`เลือก ${SPECIES_OPT[c.speciesId].label}`);
  if (c.speciesId === 'human' && !c.speciesOpt?.feat) out.push('เลือก Origin Feat (Human Versatile)');
  if (c.speciesId === 'human' && !c.speciesOpt?.skill) out.push('เลือกสกิล (Human Skillful)');
  if (c.speciesId === 'elf' && !c.speciesOpt?.skill) out.push('เลือกสกิล (Keen Senses)');
  return out;
}

export function newCharacter() {
  return {
    v: 1, name: '', player: '', level: 1, classId: null, speciesId: null, bgId: null,
    abilities: { method: 'standard', base: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }, bonus: {}, assign: {} },
    skills: [], languages: [], choices: {}, speciesOpt: {},
    equipment: { classOpt: 'A', bgOpt: 'A', items: [], gp: 0, armor: null, shield: false },
    spells: { cantrips: [], prepared: [], book: [] },
    play: { hp: null, temp: 0, hdUsed: 0, slots: {}, res: {}, conditions: [], death: { s: 0, f: 0 }, inspiration: false },
    notes: '', look: '',
  };
}

/** สร้างรายการของจากตัวเลือก A/B ของคลาสและ background */
export function rebuildEquipment(c) {
  const cls = D.cls[c.classId], bg = D.bg[c.bgId];
  const items = [], e = c.equipment;
  let gp = 0;
  for (const [txt, opt] of [[cls?.core['Starting Equipment'], e.classOpt], [bg?.equipment, e.bgOpt]]) {
    const o = equipOptions(txt)[opt || 'A'];
    if (!o) continue;
    const r = parseItems(o);
    items.push(...r.items);
    gp += r.gp;
  }
  e.items = items;
  e.gp = gp;
  const armor = items.find(i => i.armor && i.armor !== 'shield');
  e.armor = armor?.armor || null;
  e.shield = items.some(i => i.armor === 'shield');
}
