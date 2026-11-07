// ชิ้นส่วน UI ที่ใช้ร่วมกัน: การ์ดฟีเจอร์, แถวสเปล, รายละเอียดสเปล, ตัวเลือก
import { D, thFeature, loadFull } from '../data.js';
import { h, icon, iconSvg, sheet, sign } from '../util.js';
import { md } from '../md.js';

export const TYPE_LABEL = { action: 'Action', bonus: 'Bonus Action', reaction: 'Reaction', passive: 'ติดตัว', magic: 'Magic Action' };
export const SCHOOL_TH = { Abjuration: 'ป้องกัน', Conjuration: 'เรียก/เสก', Divination: 'พยากรณ์', Enchantment: 'สะกดจิต', Evocation: 'พลังงาน', Illusion: 'ภาพลวง', Necromancy: 'ความตาย', Transmutation: 'แปรสภาพ' };
export const LEVEL_TH = l => (l === 0 ? 'Cantrip' : `Level ${l}`);

/** กล่อง "ต้นฉบับ (EN)" พับได้ */
export function original(text) {
  if (!text) return null;
  return h('details.orig', h('summary', 'ต้นฉบับ (EN) — SRD 5.2.1'), h('div.md', { html: md(text) }));
}

/** กล่อง "แปลเต็ม (ไทย)" พับได้ — โหลดไฟล์กลุ่ม g ตอนเปิดครั้งแรก, id เป็น string หรือ path เช่น ['wizard','f','scholar'] */
export function fullTh(g, id) {
  if (!g || !id) return null;
  const body = h('div.md', h('p.muted.small', 'กำลังโหลด…'));
  let done = false;
  return h('details.full', {
    ontoggle: e => {
      if (done || !e.currentTarget.open) return;
      done = true;
      loadFull(g).then(d => {
        const v = [].concat(id).reduce((o, k) => o?.[k], d);
        body.innerHTML = typeof v === 'string' ? md(v) : '<p class="muted small">ยังไม่มีคำแปลเต็ม — ดูต้นฉบับด้านล่าง</p>';
      });
    },
  }, h('summary', 'แปลเต็ม (ไทย)'), body);
}

/** การ์ดฟีเจอร์ — th = {t, s, tip}, full = [กลุ่ม, id] สำหรับคำแปลเต็ม */
export function featureCard({ name, level, text, th, tag, full }) {
  const t = th?.t || 'passive';
  return h('article.feat.t-' + t,
    h('header',
      h('span.feat-ico', { html: iconSvg(t === 'magic' ? 'action' : t) }),
      h('div.feat-title', h('b', name), h('small', [level ? `Lv ${level}` : null, tag, TYPE_LABEL[t]].filter(Boolean).join(' · ')))),
    th?.s ? h('p.th', th.s) : h('p.th.muted', 'ยังไม่มีคำอธิบายภาษาไทย — ดูต้นฉบับด้านล่าง'),
    th?.tip ? h('p.tip', '💡 ' + th.tip) : null,
    full ? fullTh(...full) : null,
    original(text));
}

export function classFeatureCard(cls, f, sub) {
  return featureCard({ name: f.name, level: f.level, text: f.text, th: thFeature(cls.id, f.id, sub), tag: sub ? cls.subclass.name : null, full: ['classes', [cls.id, sub ? 'sub' : 'f', f.id]] });
}

export function spellMeta(s) {
  return [LEVEL_TH(s.level), s.school, s.time, s.range, s.concentration ? 'สมาธิ (C)' : null, s.ritual ? 'Ritual' : null].filter(Boolean).join(' · ');
}

export function spellDetail(s, actions = []) {
  sheet(s.name, h('div.spell-detail',
    h('div.spell-head', h('span.school', { html: iconSvg(s.school) }), h('div', h('b', `${LEVEL_TH(s.level)} · ${s.school}`), h('small', `สำนัก${SCHOOL_TH[s.school] || ''}`))),
    D.th.spells?.[s.id] ? h('p.th', D.th.spells[s.id]) : null,
    h('dl.kv',
      h('dt', 'Casting Time'), h('dd', s.time),
      h('dt', 'Range'), h('dd', s.range),
      h('dt', 'Components'), h('dd', s.components),
      h('dt', 'Duration'), h('dd', s.duration)),
    h('p.muted.small', 'คลาสที่ใช้ได้: ' + s.classes.map(c => D.cls[c]?.name || c).join(', ')),
    h('div.md', { html: md(s.text) })), actions);
}

export function spellRow(s, { selected, disabled, onToggle, badge } = {}) {
  const row = h('div.spell-row' + (selected ? '.on' : '') + (disabled ? '.off' : ''),
    h('span.school', { html: iconSvg(s.school) }),
    h('div.spell-main', { onclick: () => spellDetail(s) },
      h('b', s.name, s.concentration ? h('i.tag', 'C') : null, s.ritual ? h('i.tag', 'R') : null),
      h('small', D.th.spells?.[s.id] || spellMeta(s))),
    badge ? h('span.badge', badge) : null,
    onToggle ? h('button.check', { 'aria-pressed': selected ? 'true' : 'false', 'aria-label': (selected ? 'เอาออก ' : 'เลือก ') + s.name, disabled: disabled && !selected, onclick: onToggle }, selected ? '✓' : '+') : null);
  return row;
}

/** การ์ดตัวเลือกแบบกริด */
export function choiceCard({ id, iconName, title, sub, desc, selected, onClick }) {
  return h('button.choice' + (selected ? '.on' : ''), { type: 'button', 'aria-pressed': selected ? 'true' : 'false', 'data-id': id, onclick: onClick },
    iconName ? h('span.choice-ico', { html: iconSvg(iconName) }) : null,
    h('span.choice-txt', h('b', title), sub ? h('small', sub) : null, desc ? h('span.choice-desc', desc) : null));
}

/** เลือกหลายอย่างแบบชิป */
export function chips(options, value, max, onChange, { labels = {}, locked = [] } = {}) {
  const set = new Set(value);
  return h('div.chips', options.map(o => {
    const on = set.has(o) || locked.includes(o);
    return h('button.chip' + (on ? '.on' : '') + (locked.includes(o) ? '.locked' : ''), {
      type: 'button', 'aria-pressed': on ? 'true' : 'false', disabled: locked.includes(o),
      onclick: () => {
        if (set.has(o)) set.delete(o);
        else if (max === 1) { set.clear(); set.add(o); }
        else if (set.size < max) set.add(o);
        else return;
        onChange([...set]);
      },
    }, labels[o] || (D.th.misc?.skills?.[o] ? [h('span', o), h('small.chip-th', D.th.misc.skills[o])] : o));
  }));
}

export function counter(n, max, label) {
  return h('span.counter' + (n === max ? '.done' : n > max ? '.over' : ''), `${label ? label + ' ' : ''}${n}/${max}`);
}

export function statBox(label, value, sub, ico) {
  return h('div.stat', ico ? h('span.stat-ico', { html: iconSvg(ico) }) : null, h('small', label), h('b', value), sub ? h('span', sub) : null);
}

export { sign, icon };
