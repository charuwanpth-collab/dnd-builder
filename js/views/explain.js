// การ์ดอธิบาย "ตัวเลขนี้มาจากไหน" — ใช้เต๋าจริง เว็บแค่บอกสูตร
import { D } from '../data.js';
import { h, sheet } from '../util.js';
import { ABIL_SHORT } from '../rules.js';
import { fullTh } from './parts.js';

const pm = n => (n < 0 ? '− ' : '+ ') + Math.abs(n);

/** ช่วงดาเมจของสูตรเต๋า เช่น "1d8+3 Slashing" → "4–11" (ไม่ใช่สูตรเต๋า = '') */
export function dmgRange(s) {
  const m = String(s || '').replace(/−/g, '-').match(/^(\d+)d(\d+)\s*([+-]\s*\d+)?/);
  if (!m) return '';
  const n = +m[1], d = +m[2], k = m[3] ? parseInt(m[3].replace(/\s/g, ''), 10) : 0;
  return `${Math.max(0, n + k)}–${n * d + k}`;
}

/** ดาเมจสูตร + ช่วงตัวเล็ก */
export const dmgText = s => [s, dmgRange(s) ? h('small.rng', ` (${dmgRange(s)})`) : null];

/** กล่องสูตร: label: d20 + 5 แล้วแตกรายการ STR +3 · Prof +2 */
export function formula(label, total, parts = [], die = 'd20') {
  return h('div.formula',
    h('div.f-main', h('span', label), h('b', `${die} ${pm(total)}`)),
    parts.length ? h('div.f-parts', parts.map(([l, n]) => h('span', l, ' ', h('b', (n < 0 ? '−' : '+') + Math.abs(n))))) : null);
}

/** เปิด bottom sheet อธิบาย */
export function explain(title, body, actions = []) {
  return sheet(title, h('div.explain', body), actions);
}

/** เนื้อหาการ์ดอาวุธ: สูตรโจมตี + ดาเมจ + ความหมาย Mastery / คุณสมบัติ */
export function attackBody(a, x) {
  const terms = [
    ...(a.mastery ? [a.mastery.toLowerCase()] : []),
    ...D.weaponProps.filter(p => new RegExp(`\\b${p.name}\\b`, 'i').test(a.props || '')).map(p => p.id)];
  const mod = x.m[a.ab] || 0;
  return [
    formula('ทอยโจมตี', a.hit, a.hitParts || []),
    h('div.formula',
      h('div.f-main', h('span', 'ดาเมจ'), h('b', ...dmgText(a.dmg))),
      h('div.f-parts', /\d+d\d+/.test(a.dmg) ? [h('span', 'ลูกเต๋าอาวุธ'), h('span', `${ABIL_SHORT[a.ab]} `, h('b', (mod < 0 ? '−' : '+') + Math.abs(mod)))] : h('span', `1 + ${ABIL_SHORT[a.ab]} (ไม่มีลูกเต๋า)`))),
    h('p.muted.small', 'ทอยได้ 20 = Critical Hit: ทอยลูกเต๋าดาเมจ 2 เท่า (ตัวบวกไม่คูณ) · DM บอกเองว่าโดนหรือไม่'),
    a.prof === false ? h('p.tip', '⚠ ยังไม่ชำนาญอาวุธนี้ — ไม่ได้บวก Proficiency') : null,
    x.atkPer > 1 ? h('p.small', `⚔️ Extra Attack: ใช้ Attack action แล้วตีได้ ${x.atkPer} ครั้ง`) : null,
    a.props ? h('p.small', h('b', 'คุณสมบัติ: '), a.props) : a.id === 'unarmed' ? h('p.small', 'ต่อย เตะ โขก — ใช้แทนการ Grapple / Shove ได้') : null,
    terms.map(id => {
      const it = D.masteryById[id] || D.weaponProps.find(p => p.id === id);
      return it ? h('div.wterm', h('b', it.name, id === a.mastery?.toLowerCase() ? h('i.tag.mastery', 'Mastery') : null), D.th.mastery?.[id] ? h('p.th', D.th.mastery[id]) : null, fullTh('mastery', id)) : null;
    }),
  ];
}

/** คำอธิบายค่าบนใบจาก data/th/help.json → [ความหมาย, ใช้ตอนไหน] */
export function helpBody(key) {
  const t = D.th.help?.terms?.[key];
  if (!t) return [];
  return [h('p.th', t.what), t.use ? h('p.help-use', h('b', 'ใช้ยังไง: '), t.use) : null];
}
/** ปุ่ม ⓘ เล็ก ๆ ข้างหัวข้อ เปิดคำอธิบายค่านั้น */
export function infoBtn(key, extra = []) {
  return h('button.info-btn', { 'aria-label': 'ความหมาย', onclick: e => { e.stopPropagation(); explain(D.th.help?.terms?.[key]?.t || key, [...helpBody(key), ...extra]); } }, 'ⓘ');
}

const DMG_T = 'Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder';
const AB_FULL = { Strength: 'STR', Dexterity: 'DEX', Constitution: 'CON', Intelligence: 'INT', Wisdom: 'WIS', Charisma: 'CHA' };
/** สูตรของสเปลด้วยตัวเลขของเรา: ทอยโจมตี / DC เซฟ / ดาเมจหรือฮีล (+ช่วง) / Cantrip ตามเลเวล / อัปสลอต */
export function spellMath(s, b, x) {
  if (!s || !b) return null;
  const t = (s.text || '').replace(/(\w)- (\w)/g, '$1$2').replace(/\s+/g, ' ');
  const out = [], mod = x.m[b.ab] || 0, ab = ABIL_SHORT[b.ab];
  if (/spell attack/i.test(t)) {
    const parts = [['Proficiency', x.pb], [ab, mod]], rest = b.atk - x.pb - mod;
    if (rest) parts.push(['อื่น ๆ', rest]);
    out.push(formula('ทอยโจมตีด้วยเวท', b.atk, parts));
  }
  const sv = t.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/);
  if (sv) out.push(h('div.formula', h('div.f-main', h('span', `เป้าหมายทอยเซฟ ${AB_FULL[sv[1]]}`), h('b', `DC ${b.dc}`)), h('div.f-parts', h('span', 'บอก DM ว่า DC เท่านี้ — DM เป็นคนทอยให้เป้าหมาย'))));
  // ดาเมจ / ฮีล
  let eff = null, m;
  if ((m = t.match(new RegExp(`(\\d+)d(\\d+)(?:\\s*\\+\\s*(\\d+))?\\s+(${DMG_T}) damage`)))) eff = { n: +m[1], d: +m[2], k: +(m[3] || 0), label: `ดาเมจ ${m[4]}` };
  else if ((m = t.match(new RegExp(`(\\d+)d(\\d+) plus your spellcasting ability modifier (${DMG_T}) damage`)))) eff = { n: +m[1], d: +m[2], k: mod, label: `ดาเมจ ${m[3]}` };
  else if ((m = t.match(/Hit Points equal to (\d+)d(\d+)( plus your spellcasting ability modifier)?/))) eff = { n: +m[1], d: +m[2], k: m[3] ? mod : 0, label: 'ฟื้น HP' };
  const dice = (n, d, k) => `${n}d${d}${k ? (k > 0 ? '+' : '') + k : ''}`;
  if (eff) {
    let n = eff.n, note = null;
    const up = t.match(/Cantrip Upgrade\.?\**\s*([^*]*?)(?=\s*\*\*\*|$)/)?.[1] || '';
    if (s.level === 0 && up) {
      const tier = x.L >= 17 ? 3 : x.L >= 11 ? 2 : x.L >= 5 ? 1 : 0;
      const lv = up.match(/levels 5 \((\d+)d\d+\), 11 \((\d+)d\d+\), and 17 \((\d+)d\d+\)/);
      const beams = up.match(/(\w+) beams at level 5, (\w+) beams at level 11, and (\w+) beams at level 17/);
      if (lv && tier) { n = +lv[tier]; note = `เลเวลตัวละคร ${x.L} → ลูกเต๋าเพิ่มเป็น ${n}d${eff.d}`; }
      else if (beams) note = `เลเวลตัวละคร ${x.L} → ยิงได้ ${tier + 1} ลำ (ทอยโจมตีแยกทีละลำ ลำละ ${dice(eff.n, eff.d, eff.k)})`;
    }
    const str = dice(n, eff.d, eff.k);
    out.push(h('div.formula', h('div.f-main', h('span', eff.label), h('b', ...dmgText(str))), note ? h('div.f-parts', h('span', note)) : null));
    // อัปสลอต
    const u = t.match(/(?:damage|healing) increases by (\d+)d(\d+) for each spell slot level above (\d+)/);
    if (u && s.level > 0) {
      const lvs = [...new Set(x.casting.flatMap(z => Object.keys(z.slots || {}).map(Number)))].filter(l => l > s.level).sort((a, c) => a - c);
      if (lvs.length) out.push(h('div.formula', h('div.f-main', h('span', 'ใช้สลอตเลเวลสูงขึ้น')),
        h('div.f-parts', lvs.map(l => { const z = dice(eff.n + (l - +u[3]) * +u[1], eff.d, eff.k); return h('span', `Lv ${l}: `, h('b', z), h('small.rng', ` (${dmgRange(z)})`)); }))));
    }
  }
  if (!out.some(n => n.classList?.contains('up-note')) && !/(?:damage|healing) increases by \d+d\d+ for each/.test(t)) {
    const up = t.match(/Using a Higher-Level Spell Slot\.?\**\s*([^*]*)/)?.[1];
    if (up && s.level > 0) out.push(h('p.small.up-note', '⬆️ ใช้สลอตเลเวลสูงขึ้นแล้วเวทนี้แรงขึ้นได้ — อ่านหัวข้อ "Using a Higher-Level Spell Slot" ในแปลเต็มด้านล่าง'));
  }
  return out.length ? out : null;
}
