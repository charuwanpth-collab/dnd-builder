// เลเวลอัป: ตัวแก้ไขรายเลเวล (ใช้ทั้งในวิซาร์ดและหน้าต่าง Level Up บนใบตัวละคร)
import { D } from '../data.js';
import { h, sheet, toast, sign } from '../util.js';
import {
  ABIL, ABIL_SHORT, MAX_LEVEL, compute, levelInfo, ensureLevels, featChoices, featAsiRule, meetsPrimary, hitDieAvg, subOf,
} from '../rules.js';
import { classFeatureCard, original } from './parts.js';

const SUBFEAT_LATER = new Set(['skilled', 'magic-initiate']);

/** สรุปสั้นของเลเวลหนึ่ง เช่น "Fighter 4 · HP +8 · ASI STR+2" */
export function levelSummary(c, li, x = compute(c)) {
  const d = li.cls?.hitDie;
  const hp = d ? Math.max(1, (li.i === 0 ? d : li.e.hp || hitDieAvg(d)) + x.m.con) : 0;
  const parts = [`${li.cls?.name || '?'} ${li.cl}`, `HP +${hp}`];
  if (li.asi || li.boon) {
    const f = D.feat[li.e.feat];
    if (!f) parts.push(`⚠ ยังไม่เลือก ${li.boon ? 'Epic Boon' : 'ASI/Feat'}`);
    else {
      const up = Object.entries(li.e.asi || {}).filter(([, n]) => n > 0).map(([a, n]) => `${ABIL_SHORT[a]}+${n}`).join(' ');
      parts.push(f.id === 'ability-score-improvement' ? `ASI ${up}` : `${f.name}${up ? ' ' + up : ''}`);
    }
  }
  return parts.join(' · ');
}

/** ตัวแก้ไขของเลเวลที่ i (c.levels[i]) — คืน array ของ node */
export function levelEditor(c, i, changed) {
  const LI = levelInfo(c), li = LI[i], e = li.e;
  const x = compute(c);
  const out = [];

  // ---- คลาส ----
  if (i === 0) {
    out.push(h('p', h('b', `${li.cls?.name || '?'} 1`), ' — คลาสหลัก (เปลี่ยนได้ที่ขั้น Class)'));
  } else {
    const before = {};
    for (const o of LI.slice(0, i)) if (o.e.c) before[o.e.c] = (before[o.e.c] || 0) + 1;
    out.push(h('label.lbl', 'เลเวลนี้อัปคลาสไหน'),
      h('select.inp', { onchange: ev => { e.c = ev.target.value; delete e.feat; delete e.asi; delete e.hp; changed(); } },
        D.classes.map(k => h('option', { value: k.id, selected: k.id === e.c },
          `${k.name} ${(before[k.id] || 0) + 1}${k.id === c.classId ? ' (คลาสหลัก)' : before[k.id] ? '' : ' — Multiclass ใหม่'}`))));
    if (e.c !== c.classId) {
      const bad = [D.cls[c.classId], ...Object.keys(before).map(id => D.cls[id]), li.cls].filter((k, j, a) => k && a.indexOf(k) === j && !meetsPrimary(k, x.score));
      if (bad.length) out.push(h('p.warn', `Multiclass ต้องมีค่าพลังหลัก 13+ ทั้งคลาสเดิมและคลาสใหม่ — ยังไม่ผ่าน: ${bad.map(k => `${k.name} (${k.core['Primary Ability']})`).join(', ')} · ถ้า DM อนุญาตก็เลือกได้`));
      out.push(h('p.muted.small', '🧪 Multiclass รอบนี้นับ HP, PB, ฟีเจอร์คลาส และ Extra Attack แล้ว — สเปลสลอตรวม, proficiency แบบจำกัด และซับคลาสของคลาสที่ 2 จะตามมาในอัปเดตถัดไป'));
    }
  }

  // ---- ได้อะไรที่เลเวลนี้ ----
  if (li.cls) {
    const isMain = li.cls.id === c.classId;
    const sub = isMain ? subOf(c) : null;
    const fs = [
      ...li.cls.features.filter(f => f.level === li.cl && !/Subclass$|^Ability Score Improvement$|^Epic Boon$/.test(f.name)).map(f => [f, false]),
      ...(sub && li.cl >= 3 ? sub.features.filter(f => f.level === li.cl).map(f => [f, true]) : []),
    ];
    out.push(h('div.lv-gains', h('small.muted', 'ได้ที่เลเวลนี้: '), li.gains ? li.gains.split(/,\s*/).map(g => h('i.tag', g)) : h('i.tag', '—')));
    if (fs.length) out.push(h('details.orig', h('summary', `อ่านฟีเจอร์ใหม่ (${fs.length})`), fs.map(([f, s]) => classFeatureCard(li.cls, f, s))));
  }

  // ---- HP ----
  const d = li.cls?.hitDie;
  if (d) {
    const con = x.m.con;
    if (i === 0) out.push(h('p.small', `HP: เลเวลแรกได้เต๋าเต็ม d${d} = ${d} ${sign(con)} (CON) = `, h('b', String(Math.max(1, d + con)))));
    else {
      const avg = hitDieAvg(d);
      out.push(h('label.lbl', `HP เลเวลนี้ (d${d})`),
        h('div.seg',
          h('button.seg-btn' + (!e.hp ? '.on' : ''), { type: 'button', onclick: () => { delete e.hp; changed(); } }, `ค่าเฉลี่ย ${avg}`),
          h('button.seg-btn' + (e.hp ? '.on' : ''), { type: 'button', onclick: () => { e.hp = 1 + Math.floor(Math.random() * d); changed(); } }, e.hp ? `🎲 ทอยได้ ${e.hp}` : `🎲 ทอย d${d}`)),
        h('p.muted.small', `ได้ HP +${Math.max(1, (e.hp || avg) + con)} (เต๋า ${e.hp || avg} ${sign(con)} CON) · ถ้าอัป CON ทีหลัง HP จะเพิ่มย้อนหลังให้อัตโนมัติ`));
    }
  }

  // ---- ASI / Feat / Epic Boon ----
  if (li.asi || li.boon) {
    const opts = featChoices(c, li);
    out.push(h('label.lbl', li.boon ? 'Epic Boon (หรือ feat อื่นที่เข้าเงื่อนไข)' : 'Ability Score Improvement หรือ Feat'),
      h('select.inp', { onchange: ev => { if (ev.target.value) e.feat = ev.target.value; else delete e.feat; e.asi = {}; changed(); } },
        h('option', { value: '' }, '— เลือก —'),
        opts.map(f => h('option', { value: f.id, selected: f.id === e.feat }, `${f.pack ? '📦 ' : ''}${f.name} (${f.category})`))));
    const f = D.feat[e.feat];
    if (f) {
      const r = featAsiRule(f);
      if (r) {
        const asi = e.asi = e.asi || {};
        const used = Object.values(asi).reduce((s, n) => s + n, 0);
        out.push(h('p.small', r.total === 2 ? `แจกแต้มรวม 2 (ค่าเดียว +2 หรือสองค่า +1) · สูงสุด ${r.cap}` : `เลือกค่าพลัง +1 · สูงสุด ${r.cap}`, h('b', ` เหลือ ${r.total - used}`)),
          h('div.asi-grid', r.abil.map(a => {
            const n = asi[a] || 0;
            return h('div.asi-cell' + (n ? '.on' : ''),
              h('small', ABIL_SHORT[a]), h('b', String(x.score[a])),
              h('div.stepper-inp',
                h('button.icon-btn', { disabled: n <= 0, 'aria-label': 'ลด', onclick: () => { asi[a] = n - 1; if (!asi[a]) delete asi[a]; changed(); } }, '−'),
                h('span', n ? `+${n}` : '0'),
                h('button.icon-btn', { disabled: used >= r.total || n >= r.per || x.score[a] >= r.cap, 'aria-label': 'เพิ่ม', onclick: () => { asi[a] = n + 1; changed(); } }, '+')));
          })));
      }
      const th = D.th.feats?.[f.id];
      if (th?.s) out.push(h('p.th', th.s));
      if (SUBFEAT_LATER.has(f.id) && f.id !== 'ability-score-improvement') out.push(h('p.muted.small', 'ℹ️ ตัวเลือกย่อยของ feat นี้ (สกิล/สเปล) ตอนเลเวลอัปจะเลือกได้ในอัปเดตถัดไป — ตอนนี้จดไว้ในโน้ตก่อนนะ'));
      out.push(original(f.text, `${f.name} (EN)`));
    }
  }
  return out;
}

/** หน้าต่าง Level Up บนใบตัวละคร */
export function openLevelUp(c, onDone) {
  ensureLevels(c);
  if (c.level >= MAX_LEVEL) { toast(`เลเวล ${MAX_LEVEL} แล้ว สุดทางแล้ว 🎉`); return; }
  const t = structuredClone(c);
  ensureLevels(t);
  t.levels.push({ c: t.levels[t.levels.length - 1].c || t.classId });
  t.level = t.levels.length;
  const x0 = compute(c);
  const body = h('div.lvup');
  const draw = () => {
    const x1 = compute(t);
    body.replaceChildren(
      h('p.lvup-head', h('b', `Lv ${c.level} → ${t.level}`), ` · HP สูงสุด ${x0.hpMax} → ${x1.hpMax}`, x1.pb !== x0.pb ? ` · Prof ${sign(x0.pb)} → ${sign(x1.pb)}` : ''),
      ...levelEditor(t, t.levels.length - 1, draw));
  };
  draw();
  sheet('⬆️ เลเวลอัป', body, [
    { label: 'ยกเลิก' },
    { label: 'ยืนยันเลเวลอัป', primary: true, onClick: () => {
      const li = levelInfo(t)[t.levels.length - 1];
      if ((li.asi || li.boon) && !t.levels[li.i].feat && !confirm('ยังไม่ได้เลือก ASI/Feat — อัปไปก่อนแล้วค่อยเลือกทีหลังก็ได้ ตกลงไหม?')) return false;
      c.levels = t.levels;
      c.level = t.level;
      const gain = compute(c).hpMax - x0.hpMax;
      if (c.play && c.play.hp != null) c.play.hp = Math.max(0, c.play.hp + gain);
      onDone?.();
      toast(`ยินดีด้วย! เลเวล ${c.level} แล้ว (HP +${gain})`);
    } },
  ]);
}
