// เฟส 4E — ผลของ Condition / เอฟเฟกต์บนตัวเราต่อการทอย d20 + เอฟเฟกต์นับรอบ (ไม่มี DOM)
// kind: 'atk' | 'check' | 'save' | 'init' · flag = {t: 'adv'|'dis'|'fail'|'plus'|'minus', why, add?}

// ผลของ Condition ที่ติดอยู่ (กฎ 2024) — th = สรุปสั้นไว้แสดงในกล่องสถานะ
export const COND_FX = {
  Blinded: { atk: 'dis', th: 'โจมตีมี Disadvantage · Check ที่ต้องใช้ตามองล้มเหลวเลย · ศัตรูตีเรามี Advantage' },
  Charmed: { th: 'โจมตีคนที่ Charm เราไม่ได้ · มันได้ Advantage เวลาคุยกับเรา' },
  Deafened: { th: 'Check ที่ต้องใช้หูฟังล้มเหลวเลย' },
  Frightened: { atk: 'dis', check: 'dis', th: 'โจมตีและ Check มี Disadvantage (ตอนยังเห็นต้นเหตุ) · เดินเข้าใกล้มันไม่ได้' },
  Grappled: { atk: 'dis', th: 'Speed 0 · โจมตีเป้าอื่นที่ไม่ใช่ตัวที่จับเราไว้มี Disadvantage' },
  Incapacitated: { init: 'dis', th: 'ใช้ Action / Bonus / Reaction ไม่ได้ · สมาธิหลุด · พูดไม่ได้ · Initiative มี Disadvantage' },
  Invisible: { atk: 'adv', init: 'adv', th: 'โจมตีมี Advantage · ศัตรูตีเรามี Disadvantage (ถ้ามันมองไม่เห็นเรา) · Initiative มี Advantage' },
  Paralyzed: { init: 'dis', save: { str: 'fail', dex: 'fail' }, th: 'Incapacitated + Speed 0 · เซฟ STR/DEX ล้มเหลวเลย · ศัตรูในระยะ 5 ฟุตตีโดน = Critical Hit' },
  Petrified: { init: 'dis', save: { str: 'fail', dex: 'fail' }, th: 'กลายเป็นหิน: Incapacitated + Speed 0 · เซฟ STR/DEX ล้มเหลวเลย · Resistance ดาเมจทุกชนิด' },
  Poisoned: { atk: 'dis', check: 'dis', th: 'โจมตีและ Check มี Disadvantage' },
  Prone: { atk: 'dis', th: 'โจมตีมี Disadvantage · ลุกขึ้นเสีย Movement ครึ่งหนึ่ง · ศัตรูข้างตัวตีเรามี Advantage' },
  Restrained: { atk: 'dis', save: { dex: 'dis' }, th: 'Speed 0 · โจมตีและเซฟ DEX มี Disadvantage · ศัตรูตีเรามี Advantage' },
  Stunned: { init: 'dis', save: { str: 'fail', dex: 'fail' }, th: 'Incapacitated · เซฟ STR/DEX ล้มเหลวเลย · ศัตรูตีเรามี Advantage' },
  Unconscious: { init: 'dis', save: { str: 'fail', dex: 'fail' }, th: 'สลบ: Incapacitated + Prone · เซฟ STR/DEX ล้มเหลวเลย · ศัตรูในระยะ 5 ฟุตตีโดน = Critical Hit' },
};

// เอฟเฟกต์สำเร็จรูป (key = id ที่ผูกกับสเปล/ฟีเจอร์) — rounds = จำนวนรอบ (1 นาที = 10 รอบ)
export const FX_PRESET = {
  rage: { name: 'Rage', rounds: 100, check: { str: 'adv' }, save: { str: 'adv' }, th: 'Advantage ทอย STR Check/เซฟ · ดาเมจ STR เพิ่ม · Resistance Bludgeoning/Piercing/Slashing' },
  dodge: { name: 'Dodge', rounds: 1, save: { dex: 'adv' }, th: 'ศัตรูตีเรามี Disadvantage · เซฟ DEX มี Advantage (จนถึงต้นเทิร์นหน้า)' },
  reckless: { name: 'Reckless Attack', rounds: 1, atk: 'adv', th: 'โจมตีที่ใช้ STR มี Advantage · ศัตรูตีเราก็มี Advantage (จนถึงต้นเทิร์นหน้า)' },
  bless: { name: 'Bless', rounds: 10, plus: { atk: '1d4', save: '1d4' }, th: 'บวก 1d4 ทุกครั้งที่ทอยโจมตีหรือเซฟ' },
  bane: { name: 'Bane', rounds: 10, minus: { atk: '1d4', save: '1d4' }, th: 'ลบ 1d4 ทุกครั้งที่ทอยโจมตีหรือเซฟ' },
  haste: { name: 'Haste', rounds: 10, save: { dex: 'adv' }, th: 'AC +2 · Speed ×2 · เซฟ DEX มี Advantage · ได้ Action จำกัดเพิ่ม 1 · หมดแล้วเสียเทิร์นถัดไป' },
  'shield-of-faith': { name: 'Shield of Faith', rounds: 100, th: 'AC +2' },
  'protection-from-evil-and-good': { name: 'Protection from Evil and Good', rounds: 100, th: 'ครีเจอร์บางชนิดตีเรามี Disadvantage · กัน Charmed/Frightened/สิง จากพวกมัน' },
  blur: { name: 'Blur', rounds: 10, th: 'ศัตรูตีเรามี Disadvantage' },
  'mirror-image': { name: 'Mirror Image', rounds: 10, th: 'ร่างลวง 3 ร่าง — โดนตีให้ทอย d6 ว่าโดนร่างลวงไหม' },
  'heroism': { name: 'Heroism', rounds: 10, th: 'กัน Frightened · ได้ Temp HP เท่าค่าร่ายเวททุกต้นเทิร์น' },
  'enlarge-reduce': { name: 'Enlarge/Reduce', rounds: 10, th: 'ขยาย: Advantage ทอย STR · อาวุธ +1d4 · ย่อ: Disadvantage ทอย STR · อาวุธ −1d4' },
};

/** จำนวนรอบจากช่อง Duration ของสเปล ("Concentration, up to 1 minute" → 10) — นานกว่า 10 นาทีหรือไม่ใช่เวลา = 0 */
export function roundsOf(duration) {
  const m = String(duration || '').match(/(\d+)\s*(round|minute|hour)/i);
  if (!m) return 0;
  const n = +m[1] * ({ round: 1, minute: 10, hour: 600 })[m[2].toLowerCase()];
  return n <= 100 ? n : 0;
}

const hasFeat = (x, id) => x.feats?.some(f => f.id === id) || x.mcFeats?.some(mc => mc.feats.some(f => f.id === id));

/**
 * ป้ายบนสูตรทอย: Condition + เอฟเฟกต์ที่ติดอยู่ + ฟีเจอร์ที่ให้ Advantage ถาวร
 * kind: 'atk' | 'check' | 'save' | 'init' · ab = 'str'… · skill = ชื่อสกิล (ถ้ามี)
 */
export function rollFlags(P, x, kind, ab, skill) {
  const out = [];
  const take = (v, why) => {
    if (!v) return;
    const t = typeof v === 'object' ? v[ab] : v;
    if (t) out.push({ t, why });
  };
  for (const k of P?.conditions || []) {
    const fx = COND_FX[k];
    if (fx) take(fx[kind], k);
    if (fx && kind === 'init') take(fx.check, k); // Initiative = DEX Check
  }
  for (const e of P?.fx || []) {
    const p = FX_PRESET[e.key];
    if (!p) continue;
    take(p[kind], e.name);
    if (kind === 'init') take(p.check, e.name);
    if (p.plus?.[kind]) out.push({ t: 'plus', add: p.plus[kind], why: e.name });
    if (p.minus?.[kind]) out.push({ t: 'minus', add: p.minus[kind], why: e.name });
  }
  if (kind === 'init') {
    if (hasFeat(x, 'feral-instinct')) out.push({ t: 'adv', why: 'Feral Instinct' });
    if (hasFeat(x, 'remarkable-athlete')) out.push({ t: 'adv', why: 'Remarkable Athlete' });
  }
  if (kind === 'check' && skill === 'Athletics' && hasFeat(x, 'remarkable-athlete')) out.push({ t: 'adv', why: 'Remarkable Athlete' });
  if (kind === 'save' && ab === 'dex' && hasFeat(x, 'danger-sense') && !(P?.conditions || []).includes('Incapacitated')) out.push({ t: 'adv', why: 'Danger Sense' });
  return out;
}

/** สรุปผลรวมของป้าย → 'adv' | 'dis' | 'fail' | 'both' | '' */
export function flagSum(flags) {
  if (!flags?.length) return '';
  if (flags.some(f => f.t === 'fail')) return 'fail';
  const a = flags.some(f => f.t === 'adv'), d = flags.some(f => f.t === 'dis');
  return a && d ? 'both' : a ? 'adv' : d ? 'dis' : '';
}
