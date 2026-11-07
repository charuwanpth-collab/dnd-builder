// ทดสอบการคำนวณด้วย node: node tools/test_rules.mjs
import fs from 'fs';
globalThis.document = undefined;
const { D } = await import('../js/data.js');
const rd = k => JSON.parse(fs.readFileSync(`data/srd/${k}.json`));
for (const k of ['classes','spells','species','backgrounds','feats','weapons','weaponProps','mastery','armor','gear']) D[k] = rd(k);
const idx = a => Object.fromEntries(a.map(x => [x.id, x]));
Object.assign(D, { cls: idx(D.classes), sp: idx(D.species), bg: idx(D.backgrounds), feat: idx(D.feats), spell: idx(D.spells), weapon: idx(D.weapons), armorById: idx(D.armor), masteryById: idx(D.mastery), th: {} });
D.spellByName = Object.fromEntries(D.spells.map(s => [s.name.toLowerCase(), s]));
const R = await import('../js/rules.js');
const show = (label, c) => {
  R.rebuildEquipment(c);
  const x = R.compute(c);
  console.log(`\n== ${label}: AC ${x.ac} (${x.acNote}) HP ${x.hpMax} Speed ${x.speed} Init ${x.init} PB ${x.pb} PP ${10 + x.perception}`);
  console.log(' attacks:', x.attacks.map(a => `${a.name} ${a.hit >= 0 ? '+' : ''}${a.hit} ${a.dmg}${a.mastery ? ' [' + a.mastery + ']' : ''}${a.prof ? '' : ' (no prof)'}`).join(' | '));
  console.log(' res:', x.res.map(r => `${r.name}:${r.max}/${r.reset}`).join(', '));
  console.log(' casting:', x.casting.map(s => `${s.source} DC${s.dc} +${s.atk} c${s.cantripMax} p${s.preparedMax} slots ${JSON.stringify(s.slots)} always[${s.always}] cantrips[${s.cantrips}]`).join(' || '));
  console.log(' feats:', x.feats.map(f => f.name).join(', '));
  console.log(' gear:', c.equipment.items.map(i => `${i.qty}x ${i.name}${i.weapon ? '(W)' : ''}${i.armor ? '(A)' : ''}`).join(', '), c.equipment.gp + 'GP');
  console.log(' warn:', x.warn, 'missing:', R.missing(c));
};
const base = (o) => Object.assign(R.newCharacter(), o);
show('Goliath Barbarian 3', base({ level: 3, classId: 'barbarian', speciesId: 'goliath', bgId: 'soldier', speciesOpt: { ancestry: "Hill's Tumble" },
  abilities: { base: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 }, bonus: { str: 2, con: 1 } }, skills: ['Athletics','Perception'],
  choices: { mastery: ['greataxe', 'handaxe'], primalSkill: 'Survival' } }));
show('Wood Elf Cleric 3 (Life, Protector)', base({ level: 3, classId: 'cleric', speciesId: 'elf', bgId: 'acolyte', speciesOpt: { lineage: 'Wood Elf', ability: 'wis', skill: 'Perception' },
  abilities: { base: { str: 13, dex: 12, con: 14, int: 8, wis: 15, cha: 10 }, bonus: { wis: 2, cha: 1 } }, skills: ['Medicine','Persuasion'], choices: { divineOrder: 'Protector' } }));
show('Draconic Sorcerer 3', base({ level: 3, classId: 'sorcerer', speciesId: 'tiefling', bgId: 'sage', speciesOpt: { legacy: 'Infernal', ability: 'cha' },
  abilities: { base: { str: 8, dex: 14, con: 13, int: 12, wis: 10, cha: 15 }, bonus: { con: 2, int: 1 } }, equipment: { classOpt: 'A', bgOpt: 'B' } }));
show('Monk 2 Human', base({ level: 2, classId: 'monk', speciesId: 'human', bgId: 'criminal', speciesOpt: { feat: 'alert', skill: 'Stealth' },
  abilities: { base: { str: 12, dex: 15, con: 13, int: 8, wis: 14, cha: 10 }, bonus: { dex: 2, con: 1 } } }));
show('Warlock 1 / Fighter 3 / Wizard 3 / Paladin 2 / Ranger 3 / Druid 3', base({ level: 1, classId: 'warlock', speciesId: 'dwarf', bgId: 'criminal' }));
for (const id of ['fighter','wizard','paladin','ranger','druid','rogue','bard'])
  show(id, base({ level: id==='paladin'?2:3, classId: id, speciesId: 'human', bgId: 'soldier', choices: { fightingStyle: 'defense', land: 'polar' } }));

// ---- เลเวลสูง / ASI / Multiclass ----
const hi = (label, o, lv) => { const c = base(o); R.setLevel(c, lv.length); lv.forEach((e, i) => Object.assign(c.levels[i], e)); show(label, c);
  const x = R.compute(c); console.log(' line:', x.classLine, 'score', JSON.stringify(x.score), 'atk/turn', x.atkPer, 'saves', x.saves.map(s => s.ab + (s.prof ? '*' : '') + s.bonus).join(' '), 'mc', x.mcFeats.map(m => m.cls.id + m.n + ':' + m.feats.length)); };
const F = (n, extra = {}) => Array.from({ length: n }, () => ({ c: 'fighter', ...extra }));
const lvF = F(20); lvF[3] = { c: 'fighter', feat: 'ability-score-improvement', asi: { str: 2 } }; lvF[5] = { c: 'fighter', feat: 'grappler', asi: { str: 1 } }; lvF[18] = { c: 'fighter', feat: 'boon-of-combat-prowess', asi: { str: 1 } };
hi('Fighter 20', { classId: 'fighter', speciesId: 'human', bgId: 'soldier', abilities: { base: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 }, bonus: { str: 2, con: 1 } }, choices: { fightingStyle: 'defense' } }, lvF);
hi('Paladin 6', { classId: 'paladin', speciesId: 'human', bgId: 'soldier', abilities: { base: { str: 15, dex: 10, con: 14, int: 8, wis: 12, cha: 13 }, bonus: { str: 2, cha: 1 } } }, Array.from({ length: 6 }, () => ({ c: 'paladin' })));
hi('Wizard 9', { classId: 'wizard', speciesId: 'elf', bgId: 'sage', speciesOpt: { lineage: 'High Elf', ability: 'int' }, abilities: { base: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 }, bonus: { int: 2, con: 1 } } }, Array.from({ length: 9 }, () => ({ c: 'wizard' })));
hi('Fighter 3 / Rogue 2', { classId: 'fighter', speciesId: 'human', bgId: 'soldier', abilities: { base: { str: 15, dex: 14, con: 13, int: 8, wis: 12, cha: 10 }, bonus: { str: 2, dex: 1 } } }, [{}, {}, { hp: 10 }, { c: 'rogue' }, { c: 'rogue', hp: 1 }].map(e => ({ c: 'fighter', ...e })));
hi('Barbarian 20', { classId: 'barbarian', speciesId: 'dwarf', bgId: 'soldier', abilities: { base: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 }, bonus: { str: 2, con: 1 } } }, Array.from({ length: 20 }, () => ({ c: 'barbarian' })));
// ---- Multiclass 2L-2 ----
const P = n => Array.from({ length: n }, () => ({ c: 'paladin' }));
hi('Paladin 2 / Sorcerer 3 (slots รวม)', { classId: 'paladin', speciesId: 'human', bgId: 'soldier', choices: { fightingStyle: 'blessed-warrior' }, mc: { sorcerer: { choices: { metamagic: ['quickened-spell', 'twinned-spell'] }, skills: [], spells: { cantrips: [], prepared: [] } } },
  abilities: { base: { str: 15, dex: 10, con: 14, int: 8, wis: 12, cha: 13 }, bonus: { str: 2, cha: 1 } } }, [...P(2), ...Array.from({ length: 3 }, () => ({ c: 'sorcerer' }))]);
hi('Warlock 3 / Wizard 2 (pact แยก)', { classId: 'warlock', speciesId: 'human', bgId: 'sage', abilities: { base: { str: 8, dex: 14, con: 13, int: 13, wis: 10, cha: 15 }, bonus: { cha: 2, int: 1 } } },
  [{ c: 'warlock' }, { c: 'warlock' }, { c: 'warlock' }, { c: 'wizard' }, { c: 'wizard' }]);
hi('Monk 2 / Barbarian 1 (UD อันแรก)', { classId: 'monk', speciesId: 'human', bgId: 'soldier', abilities: { base: { str: 13, dex: 15, con: 14, int: 8, wis: 13, cha: 10 }, bonus: { dex: 2, con: 1 } } },
  [{ c: 'monk' }, { c: 'monk' }, { c: 'barbarian' }]);
