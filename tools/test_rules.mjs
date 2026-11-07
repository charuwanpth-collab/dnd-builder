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
// ---- 2L-3 ----
hi('Rogue 6 (Expertise 4)', { classId: 'rogue', speciesId: 'human', bgId: 'criminal', skills: ['Acrobatics', 'Perception', 'Deception', 'Insight'], choices: { expertise: ['Stealth', 'Perception'], mastery: ['dagger', 'shortbow'] } }, Array.from({ length: 6 }, () => ({ c: 'rogue' })));
hi('Bard 10 (Magical Secrets)', { classId: 'bard', speciesId: 'human', bgId: 'sage' }, Array.from({ length: 10 }, () => ({ c: 'bard' })));
hi('Warlock 5 Tome + Thirsting', { classId: 'warlock', speciesId: 'human', bgId: 'sage', choices: { invocations: ['pact-of-the-tome', 'thirsting-blade', 'agonizing-blast'], tomeCantrips: ['guidance'] } }, Array.from({ length: 5 }, () => ({ c: 'warlock' })));
const lvS = Array.from({ length: 4 }, () => ({ c: 'fighter' })); lvS[3] = { c: 'fighter', feat: 'magic-initiate', sub: { miList: 'cleric', miAb: 'wis', miCantrips: ['guidance'] } };
hi('Fighter 4 + MI (cleric) จาก ASI', { classId: 'fighter', speciesId: 'human', bgId: 'soldier', choices: { fightingStyle: 'defense' } }, lvS);
D.subs = { fighter: [D.cls.fighter.subclass, { id: 'ek-x', classId: 'fighter', name: 'Eldritch Knight', pack: 'Test', features: [], spells: [], casting: { list: 'wizard', ab: 'int' } }] };
hi('Fighter 7 EK (pack 1/3)', { classId: 'fighter', subclassId: 'ek-x', speciesId: 'human', bgId: 'soldier', abilities: { base: { str: 15, dex: 12, con: 14, int: 13, wis: 10, cha: 8 }, bonus: { str: 2, int: 1 } } }, Array.from({ length: 7 }, () => ({ c: 'fighter' })));
hi('Fighter 7 EK / Wizard 2', { classId: 'fighter', subclassId: 'ek-x', speciesId: 'human', bgId: 'soldier', abilities: { base: { str: 15, dex: 12, con: 14, int: 13, wis: 10, cha: 8 }, bonus: { str: 2, int: 1 } } }, [...Array.from({ length: 7 }, () => ({ c: 'fighter' })), { c: 'wizard' }, { c: 'wizard' }]);

// ---------- 2B: รายชื่อซับคลาส PHB + ผูกกับแพ็กตามชื่อ ----------
{
  const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); } };
  D.subList = JSON.parse(fs.readFileSync('data/subclass-list.json'));
  const P = await import('../js/packs.js');
  const ok = (cond, msg) => console.log(cond ? '  ✓' : '  ✗ FAIL', msg);
  console.log('\n== 2B subclass list');
  P.applyPacks();
  ok(Object.values(D.subs).reduce((n, l) => n + l.length, 0) === 48, 'ซับคลาสรวม 48 (SRD 12 + ว่าง 36): ' + Object.values(D.subs).reduce((n, l) => n + l.length, 0));
  const lv = n => Array.from({ length: n }, () => ({ c: 'fighter' }));
  const c = base({ classId: 'fighter', speciesId: 'human', bgId: 'soldier', level: 5, levels: lv(5) });
  R.setSub(c, 'fighter', D.subs.fighter.find(s => s.name === 'Battle Master'));
  let x = R.compute(c);
  ok(c.subclassId === 'phb:battle-master' && x.sub.stub && !x.warn.length, 'เลือก Battle Master (ว่าง) → ' + c.subclassId);
  const pk = P.newPack('T'); pk.items.subclasses.push({ id: 'battle-master-ab12', classId: 'fighter', name: 'battle master', features: [{ id: 'cs', level: 3, name: 'Combat Superiority', uses: { n: '4', reset: 'short' } }], spells: [] });
  P.savePack(pk);
  x = R.compute(c);
  ok(!x.sub.stub && x.feats.some(f => f.name === 'Combat Superiority'), 'มีแพ็กชื่อตรง → ได้ฟีเจอร์เอง');
  ok(P.usedPackItems([c]).length === 1, 'ลิงก์แชร์ฝังซับคลาสแพ็กไปด้วย');
  pk.enabled = false; P.savePack(pk);
  x = R.compute(c);
  ok(x.sub.stub && x.sub.name === 'Battle Master', 'ปิดแพ็ก → กลับเป็นซับคลาสว่างชื่อเดิม');
  const old = base({ classId: 'fighter', subclassId: 'my-homebrew-zz99', speciesId: 'human', bgId: 'soldier', level: 3, levels: lv(3) });
  x = R.compute(old);
  ok(x.sub.stub && x.sub.lost && x.sub.name === 'My Homebrew' && x.warn.length === 1, 'ตัวละครเก่าที่แพ็กหาย → ซับคลาสว่าง "' + x.sub.name + '" + เตือน');
  const old2 = base({ classId: 'fighter', subclassId: 'eldritch-knight-q1w2', speciesId: 'human', bgId: 'soldier', level: 3, levels: lv(3) });
  ok(R.compute(old2).sub.phb === 'phb:eldritch-knight', 'ตัวละครเก่า id แพ็ก EK → ผูกกับชื่อ PHB');
  const mc = base({ classId: 'fighter', speciesId: 'human', bgId: 'soldier', abilities: { base: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 13 }, bonus: {} }, level: 6, levels: [...lv(3), { c: 'warlock' }, { c: 'warlock' }, { c: 'warlock' }] });
  R.setSub(mc, 'warlock', D.subs.warlock.find(s => s.name === 'Celestial Patron'));
  x = R.compute(mc);
  ok(x.mcFeats[0].sub.stub && mc.mc.warlock.subclassId === 'phb:celestial-patron', 'Multiclass Warlock 3 → Celestial Patron (ว่าง)');
  R.setSub(mc, 'warlock', D.cls.warlock.subclass);
  ok(mc.mc.warlock.subclassId === null, 'เลือกกลับเป็น SRD → null');
}
