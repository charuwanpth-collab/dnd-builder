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
