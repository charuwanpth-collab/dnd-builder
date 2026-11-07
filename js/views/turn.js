// แถบเทิร์นแบบ BG3 — นับ Action / Bonus Action / Reaction / Movement ต่อเทิร์น (เก็บใน c.play.turn)
import { D, thFeature } from '../data.js';
import { h, sheet, toast, sign } from '../util.js';
import { featureCard, classFeatureCard, spellDetail, TYPE_LABEL, LEVEL_TH } from './parts.js';
import { showTerm } from './glossary.js';

const INCAP = ['Incapacitated', 'Paralyzed', 'Petrified', 'Stunned', 'Unconscious'];
const NO_MOVE = ['Grappled', 'Restrained', 'Paralyzed', 'Petrified', 'Stunned', 'Unconscious'];
const BASIC = [
  ['dash', 'Dash', 'ได้ Movement เพิ่มอีกเท่าของ Speed'],
  ['disengage', 'Disengage', 'เดินออกจากระยะศัตรูโดยไม่โดน Opportunity Attack'],
  ['dodge', 'Dodge', 'ศัตรูตีเรามี Disadvantage · เซฟ DEX มี Advantage (จนถึงต้นเทิร์นหน้า)'],
  ['help', 'Help', 'ช่วยเพื่อนให้ได้ Advantage ในการทอยครั้งถัดไป'],
  ['hide', 'Hide', 'ทอย DEX (Stealth) เพื่อซ่อนตัว'],
  ['influence', 'Influence', 'โน้มน้าว / หลอก / ข่มขู่ครีเจอร์'],
  ['ready', 'Ready', 'เตรียมท่ารอเงื่อนไข แล้วใช้ Reaction ตอนเกิดเหตุ'],
  ['search', 'Search', 'ทอย WIS เพื่อหา / สังเกตบางอย่าง'],
  ['study', 'Study', 'ทอย INT เพื่อนึกความรู้ / วิเคราะห์'],
  ['utilize', 'Utilize', 'ใช้สิ่งของที่ต้องใช้ Action เช่น ไขกลไก'],
];
// ทรัพยากรที่ใช้แล้วกิน Bonus Action / ให้ Action เพิ่ม (id ไม่รวม prefix คลาสที่ 2)
const RES_ECON = { rage: 'b', sw: 'b', surge: 'surge', bardic: 'b', wild: 'b', fe: 'b', innate: 'b', adrenaline: 'b' };
const KIND_TH = { a: 'Action', b: 'Bonus Action', r: 'Reaction' };

const fresh = round => ({ round, a: 0, aMax: 1, b: 0, r: 0, move: 0, dash: 0, atk: 0, slot: 0, once: {} });
const incap = P => P.conditions.some(k => INCAP.includes(k));
const speedMax = (P, x) => (P.conditions.some(k => NO_MOVE.includes(k)) ? 0 : x.speed * (1 + P.turn.dash));
const closeAll = () => document.querySelectorAll('#sheet-root .bs-backdrop').forEach(b => b.click());

export function leftOf(P) {
  const t = P.turn, no = incap(P);
  return { a: no ? 0 : Math.max(0, t.aMax - t.a), b: no || t.b ? 0 : 1, r: no || t.r ? 0 : 1 };
}

/** ใช้ Action/Bonus/Reaction 1 ครั้ง — คืนข้อความสั้นไว้ต่อท้าย toast (ขึ้นต้น ⚠ = เกิน) */
export function spend(P, kind) {
  const t = P.turn;
  if (!t || !kind) return '';
  if (kind === 'surge') { t.aMax++; return 'Action Surge: ได้ Action เพิ่ม 1'; }
  if (incap(P)) return '⚠ ติด Incapacitated — ใช้ Action/Bonus/Reaction ไม่ได้';
  if (kind === 'a') { if (t.a >= t.aMax) return '⚠ Action เทิร์นนี้หมดแล้ว'; t.a++; t.atk = 0; return 'ใช้ Action'; }
  if (kind === 'b') { if (t.b) return '⚠ Bonus Action เทิร์นนี้ใช้ไปแล้ว'; t.b = 1; return 'ใช้ Bonus Action'; }
  if (kind === 'r') { if (t.r) return '⚠ Reaction ใช้ไปแล้ว (ได้คืนตอนเริ่มเทิร์นเรา)'; t.r = 1; return 'ใช้ Reaction'; }
  return '';
}

/** ทอยโจมตีด้วยอาวุธ = Attack action (นับ Extra Attack ให้) */
export function attack(P, x) {
  const t = P.turn;
  if (!t) return '';
  const per = x.atkPer || 1;
  if (t.atk > 0 && t.atk < per) { t.atk++; const m = `โจมตี ${t.atk}/${per}`; if (t.atk >= per) t.atk = 0; return m; }
  const m = spend(P, 'a');
  if (m.startsWith('⚠')) return m;
  if (per > 1) { t.atk = 1; return `Attack action · โจมตี 1/${per}`; }
  return 'ใช้ Attack action';
}

/** ใช้ Spell Slot ในเทิร์นเรา (กฎ 2024: 1 สลอตต่อเทิร์น) */
export function slot(P) {
  const t = P.turn;
  if (!t) return '';
  if (t.slot) return '⚠ เทิร์นนี้ใช้ Spell Slot ไปแล้ว (กฎ 2024: ร่ายด้วยสลอตได้ 1 ครั้งต่อเทิร์น)';
  t.slot = 1;
  return '';
}

/** กดใช้ทรัพยากร (จุด) — ถ้าเป็นของที่กิน Bonus Action / Action Surge ให้มาร์คแถบเทิร์นเอง */
export function resUsed(P, id) {
  if (!P.turn) return '';
  const i = id.indexOf('-');
  const k = i > 0 && D.cls[id.slice(0, i)] ? id.slice(i + 1) : id;
  return spend(P, RES_ECON[k]);
}

export const castKind = s => (/^Bonus Action/i.test(s.time) ? 'b' : /^Reaction/i.test(s.time) ? 'r' : /^Action/i.test(s.time) ? 'a' : null);

function slotPools(x, P) {
  const seen = new Map();
  for (const b of x.casting) for (const [lv, n] of Object.entries(b.slots || {})) {
    const key = (b.pact ? 'p' : '') + lv;
    if (!seen.has(key)) seen.set(key, { key, lv: +lv, pact: !!b.pact, left: n - (P.slots[key] || 0) });
  }
  return [...seen.values()];
}
const canCast = (s, pools) => !s.level || pools.some(p => p.lv >= s.level && p.left > 0);

/** ปุ่มใต้การ์ดสเปล: ร่ายแล้วหักสลอต + มาร์คแถบเทิร์น */
export function castActions(s, x, P, done) {
  const go = key => {
    const k0 = castKind(s);
    if (P.turn) {
      const L = leftOf(P), warn = [];
      if (k0 && !L[k0] && !(k0 === 'a' && P.turn.atk)) warn.push(`${KIND_TH[k0]} เทิร์นนี้หมดแล้ว`);
      if (key && k0 !== 'r' && P.turn.slot) warn.push('เทิร์นนี้ใช้ Spell Slot ไปแล้ว (กฎ 2024: 1 สลอตต่อเทิร์น)');
      if (warn.length && !confirm(`⚠ ${warn.join('\n⚠ ')}\n\nร่ายต่อไหม?`)) return false;
    }
    if (key) P.slots[key] = (P.slots[key] || 0) + 1;
    const k = castKind(s), msgs = [];
    if (P.turn) { if (key && k !== 'r') msgs.push(slot(P)); msgs.push(spend(P, k)); }
    const m = msgs.filter(Boolean);
    toast(`✨ ร่าย ${s.name}${key ? ` (${key.startsWith('p') ? 'Pact ' : ''}Slot Lv ${key.replace('p', '')})` : ''}${m.length ? ' · ' + m.join(' · ') : ''}`);
    done();
  };
  if (!s.level) return [{ label: 'ร่าย', primary: true, onClick: () => go(null) }];
  const ok = slotPools(x, P).filter(p => p.lv >= s.level && p.left > 0).sort((a, b) => a.lv - b.lv);
  if (!ok.length) return [{ label: 'สลอตหมดแล้ว', onClick: () => false }];
  const acts = [{ label: `ร่าย (Slot Lv ${ok[0].lv})`, primary: true, onClick: () => go(ok[0].key) }];
  if (ok.length > 1) acts.push({ label: 'ใช้สลอตสูงกว่า…', onClick: () => {
    let close;
    close = sheet('เลือกระดับสลอต', h('div.menu-list', ok.slice(1).map(p => h('button.menu-item', { onclick: () => { close(); go(p.key); } },
      `${p.pact ? 'Pact ' : ''}Slot Lv ${p.lv} · เหลือ ${p.left}`))));
  } });
  return acts;
}

/** ของที่ต้องจำว่าใช้ไปแล้วในเทิร์นนี้ (1 ครั้งต่อเทิร์น) */
function onceItems(x) {
  const L = [];
  if (x.CLs.rogue) L.push(['sneak', 'Sneak Attack', `+${Math.ceil(x.CLs.rogue / 2)}d6 (ต้องมี Advantage หรือเพื่อนอยู่ข้างเป้า)`]);
  if (x.featIds.includes('savage-attacker')) L.push(['savage', 'Savage Attacker', 'ทอยดาเมจอาวุธ 2 รอบ เลือกอันสูง']);
  if (x.featIds.includes('boon-of-combat-prowess')) L.push(['prowess', 'Peerless Aim', 'ตีพลาด → เปลี่ยนเป็นโดน']);
  return L;
}

// ---------- แถบบนใบตัวละคร ----------
export function turnBar(c, x, P, save, redraw) {
  const t = P.turn;
  if (!t) return h('button.turn-start', { onclick: () => { P.turn = fresh(1); save(); redraw(); } }, '⚔️ เริ่มต่อสู้ — นับ Action / Bonus / Reaction');
  const L = leftOf(P), sp = speedMax(P, x), mv = Math.max(0, sp - t.move), no = incap(P);
  const ch = () => { save(); redraw(); };
  const pill = (cls, label, val, on, onclick) => h(`button.tpill.${cls}${on ? '' : '.used'}`, { onclick, 'aria-label': label, 'aria-pressed': on ? 'false' : 'true' },
    h('i'), h('small', label), val != null ? h('b', val) : null);
  const notes = [`รอบ ${t.round}`];
  if (t.atk > 0) notes.push(`⚔️ ตีต่อได้อีก ${x.atkPer - t.atk}`);
  if (t.slot) notes.push('ใช้สลอตแล้ว');
  for (const [id, name] of onceItems(x)) if (t.once[id]) notes.push(`${name} ✓`);
  if (no) notes.push('⚠ Incapacitated');
  else if (!sp) notes.push('⚠ Speed 0');
  return h('div.turn',
    h('div.turn-bar',
      pill('t-a', 'Action', t.aMax > 1 ? `${L.a}/${t.aMax}` : null, L.a > 0, () => { if (no) return; t.a = t.a >= t.aMax ? 0 : t.a + 1; t.atk = 0; ch(); }),
      pill('t-b', 'Bonus', null, L.b > 0, () => { if (no) return; t.b = t.b ? 0 : 1; ch(); }),
      pill('t-r', 'React', null, L.r > 0, () => { if (no) return; t.r = t.r ? 0 : 1; ch(); }),
      pill('t-m', `${mv}ft`, null, mv > 0, () => moveSheet(x, P, ch)),
      h('button.tbtn', { onclick: () => openPanel(c, x, P, save, redraw), 'aria-label': 'เหลืออะไรทำได้อีก' }, '📋'),
      h('button.tbtn.next', { onclick: () => { P.turn = fresh(t.round + 1); ch(); toast(`เริ่มเทิร์นใหม่ (รอบ ${t.round + 1}) — Action / Bonus / Reaction / Movement คืนหมด`); }, 'aria-label': 'เทิร์นใหม่' }, '⏭')),
    h('p.turn-note', notes.join(' · ')));
}

function moveSheet(x, P, ch) {
  const t = P.turn, sp = speedMax(P, x);
  let close;
  const btn = (label, fn) => h('button.btn', { onclick: () => { fn(); ch(); close(); } }, label);
  const dash = k => () => { const m = spend(P, k); if (!m.startsWith('⚠')) t.dash++; toast(m.startsWith('⚠') ? m : `Dash: Movement +${x.speed} ft`); };
  close = sheet(`Movement · เหลือ ${Math.max(0, sp - t.move)}/${sp} ft`, h('div.move-sheet',
    sp === 0 ? h('p.tip', '⚠ Speed เป็น 0 จาก Condition ที่ติดอยู่') : null,
    h('p.muted.small', 'เดินไปเท่าไหร่ก็กดหักไว้ — แบ่งเดินก่อน/หลังโจมตีได้'),
    h('div.row.wrap', [5, 10, 15, 20, 30].map(n => btn(`−${n}`, () => { t.move = Math.min(sp, t.move + n); }))),
    h('div.row.wrap', btn('คืน +5', () => { t.move = Math.max(0, t.move - 5); }), btn('รีเซ็ต', () => { t.move = 0; })),
    h('div.row.wrap', btn('Dash (ใช้ Action)', dash('a')),
      (x.CLs.rogue || 0) >= 2 ? btn('Dash (Bonus · Cunning Action)', dash('b')) : null,
      P.conditions.includes('Prone') ? btn(`ลุกขึ้น (−${Math.floor(x.speed / 2)} ft)`, () => { t.move += Math.floor(x.speed / 2); P.conditions = P.conditions.filter(k => k !== 'Prone'); }) : null)));
}

// ---------- แผง "เหลืออะไรทำได้อีก" ----------
function collect(c, x, P, save, redraw) {
  const items = { a: [], b: [], r: [] }, seen = new Set();
  const resOf = name => { const r = x.res.find(r => r.name.split(' (')[0] === name); return r ? { r, left: r.max - (P.res[r.id] || 0) } : null; };
  const addF = (name, th, card) => {
    const k = { action: 'a', magic: 'a', bonus: 'b', reaction: 'r' }[th?.t];
    if (!k || seen.has(name)) return;
    seen.add(name);
    const rl = resOf(name);
    if (rl && rl.left <= 0) return;
    items[k].push({ name, s: th.s, note: rl ? `เหลือ ${rl.left}` : null, tag: TYPE_LABEL[th.t], open: () => featSheet(name, k, card, rl) });
  };
  const featSheet = (name, k, card, rl) => sheet(name, card(), [{ label: `ใช้ (${KIND_TH[k]})`, primary: true, onClick: () => {
    const m = spend(P, k);
    if (!m.startsWith('⚠') && rl) P.res[rl.r.id] = (P.res[rl.r.id] || 0) + 1;
    toast(`${name} · ${m}`); done();
  } }]);
  const done = () => { save(); closeAll(); redraw(); };

  if (x.cls) for (const f of x.feats) addF(f.name, f.pack ? f.th : thFeature(x.cls.id, f.id, f.src === 'sub'), () => classFeatureCard(x.cls, f, f.src === 'sub'));
  for (const mc of x.mcFeats) for (const f of mc.feats) addF(f.name, f.pack ? f.th : thFeature(mc.cls.id, f.id, f.src === 'sub'), () => classFeatureCard(mc.cls, f, f.src === 'sub'));
  for (const id of new Set(x.featIds)) { const f = D.feat[id]; if (f) addF(f.name, D.th.feats?.[id], () => featureCard({ name: f.name, text: f.text, th: D.th.feats?.[id], tag: f.category, full: ['feats', id], pack: f.pack })); }
  if (x.sp) for (const tr of x.sp.traits) { const th = D.th.species?.[x.sp.id]?.f?.[tr.id]; addF(tr.name, th, () => featureCard({ name: tr.name, text: tr.text, th, full: ['species', [x.sp.id, tr.id]] })); }

  // สเปลที่ร่ายได้ตอนนี้ (Cantrip เสมอ · สเปลมีเลเวลต้องมีสลอตเหลือ)
  const pools = slotPools(x, P);
  for (const b of x.casting) for (const id of [...(b.cantrips || []), ...(b.always || []), ...(b.prepared || [])]) {
    const s = D.spell[id], k = s && castKind(s);
    if (!k || seen.has('sp:' + id) || !canCast(s, pools)) continue;
    seen.add('sp:' + id);
    items[k].push({ name: s.name, s: D.th.spells?.[id], tag: LEVEL_TH(s.level), spell: true, open: () => spellDetail(s, castActions(s, x, P, done)) });
  }
  return { items, done };
}

function attackSheet(x, P, kind, title, done) {
  let close;
  close = sheet(title, h('div.card.list', x.attacks.map(a => h('div.atk', { onclick: () => {
    const r = 1 + Math.floor(Math.random() * 20);
    const m = kind === 'a' ? attack(P, x) : spend(P, kind);
    toast(`🎲 ${a.name}: ${r} ${sign(a.hit)} = ${r + a.hit}${r === 20 ? ' 🔥 คริ!' : r === 1 ? ' 💀' : ''} · ดาเมจ ${a.dmg}${m ? ' · ' + m : ''}`);
    close(); done();
  } }, h('div', h('b', a.name), h('small', a.props || '')), h('span.atk-hit', sign(a.hit)), h('span.atk-dmg', a.dmg)))));
}

export function openPanel(c, x, P, save, redraw) {
  const t = P.turn, L = leftOf(P);
  const { items, done } = collect(c, x, P, save, redraw);
  const row = it => h('button.titem', { onclick: it.open },
    h('div', h('b', it.name), it.tag ? h('i.tag', it.tag) : null, it.s ? h('small', it.s) : null), it.note ? h('span.badge', it.note) : null);
  const out = [];
  const surge = x.res.find(r => /^surge$|-surge$/.test(r.id));
  if (L.a > 0 || t.atk > 0) {
    const light = x.attacks.filter(a => /\bLight\b/.test(a.props || '')).length >= 2;
    const head = [];
    if (t.atk > 0) head.push({ name: `⚔️ โจมตีต่อ (เหลือ ${x.atkPer - t.atk} ครั้ง)`, s: 'ยังอยู่ใน Attack action เดิม', open: () => attackSheet(x, P, 'a', 'โจมตีต่อ', done) });
    if (L.a > 0) head.push({ name: 'โจมตี (Attack action)', s: x.atkPer > 1 ? `ตีได้ ${x.atkPer} ครั้ง (Extra Attack)` : 'ตีด้วยอาวุธ 1 ครั้ง', open: () => attackSheet(x, P, 'a', 'เลือกอาวุธ', done) });
    out.push(h('h3.tsec.t-a', `🟢 Action${t.aMax > 1 ? ` (เหลือ ${L.a})` : ''}`), h('div.titems', [...head, ...(L.a > 0 ? items.a : [])].map(row)));
    if (L.a > 0) out.push(h('details.orig', h('summary', 'Action พื้นฐาน (Dash, Dodge, Hide…)'), h('div.titems', BASIC.map(([id, name, s]) => row({
      name, s, open: () => sheet(name + ' action', h('p.th', s), [
        { label: 'ความหมายเต็ม', onClick: () => { showTerm(id); } },
        { label: 'ใช้ (Action)', primary: true, onClick: () => { const m = spend(P, 'a'); if (id === 'dash' && !m.startsWith('⚠')) t.dash++; toast(`${name} · ${m}`); done(); } }]),
    })))));
    if (light && L.b > 0) items.b.unshift({ name: 'โจมตีมือรอง (Light)', s: 'หลังโจมตีด้วยอาวุธ Light ตีด้วยอาวุธ Light อีกอันได้ (ไม่บวกค่าพลังในดาเมจ)', open: () => attackSheet(x, P, 'b', 'โจมตีมือรอง', done) });
  }
  if (surge && surge.max - (P.res[surge.id] || 0) > 0 && !incap(P)) out.unshift(h('div.titems', row({ name: '⚡ Action Surge', s: 'ได้ Action เพิ่มอีก 1 ในเทิร์นนี้', note: `เหลือ ${surge.max - (P.res[surge.id] || 0)}`,
    open: () => { P.res[surge.id] = (P.res[surge.id] || 0) + 1; toast(spend(P, 'surge')); done(); } })));
  if (L.b > 0 && items.b.length) out.push(h('h3.tsec.t-b', '🔺 Bonus Action'), h('div.titems', items.b.map(row)));
  if (L.r > 0) out.push(h('h3.tsec.t-r', '🟣 Reaction'), h('div.titems', [{ name: 'Opportunity Attack', s: 'ศัตรูเดินออกจากระยะเอื้อม → ตีได้ 1 ครั้ง', open: () => attackSheet(x, P, 'r', 'Opportunity Attack', done) }, ...items.r].map(row)));
  const once = onceItems(x);
  if (once.length) out.push(h('h3.tsec', '1 ครั้งต่อเทิร์น'), h('div.chips', once.map(([id, name]) => h('button.chip' + (t.once[id] ? '.on' : ''), { onclick: e => {
    t.once[id] = !t.once[id]; e.currentTarget.classList.toggle('on', !!t.once[id]); save(); redraw(); } }, name))),
  h('p.muted.small', once.map(o => `${o[1]}: ${o[2]}`).join(' · ')));
  if (!L.a && !L.b && !L.r && !t.atk) out.unshift(h('p.tip', incap(P) ? '⚠ ติด Incapacitated — ทำอะไรไม่ได้ในเทิร์นนี้' : 'เทิร์นนี้ใช้ Action / Bonus / Reaction หมดแล้ว — เดินที่เหลือได้ แล้วกด ⏭ เทิร์นใหม่'));
  out.push(h('p.muted.small', `👣 เดินได้อีก ${Math.max(0, speedMax(P, x) - t.move)} ft · แตะแต่ละอันเพื่อดูคำอธิบายและกดใช้`));
  sheet(`เหลืออะไรทำได้อีก · รอบ ${t.round}`, h('div.tpanel', ...out), [
    { label: 'จบการต่อสู้', onClick: () => { P.turn = null; save(); redraw(); toast('จบการต่อสู้แล้ว'); } },
  ]);
}
