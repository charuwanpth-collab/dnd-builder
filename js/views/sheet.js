// ใบตัวละครสำหรับใช้ตอนเล่น
import { D } from '../data.js';
import { h, iconSvg, sheet, toast, sign, confirmSheet } from '../util.js';
import * as S from '../store.js';
import { ABIL, ABIL_EN, ABIL_SHORT, compute, missing, rebuildEquipment } from '../rules.js';
import { classFeatureCard, featureCard, spellRow, statBox, original, LEVEL_TH, fullTh } from './parts.js';

const CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'];
const TABS = [['main', 'หลัก', 'hp'], ['skills', 'สกิล', 'skill'], ['spells', 'เวท', 'spell'], ['features', 'ความสามารถ', 'feat'], ['gear', 'ของ', 'gear'], ['notes', 'โน้ต', 'note']];
const d = n => 1 + Math.floor(Math.random() * n);

export function renderSheet(root, c, tab, nav) {
  let cur = TABS.some(t => t[0] === tab) ? tab : 'main';
  const P = c.play = Object.assign({ hp: null, temp: 0, hdUsed: 0, slots: {}, res: {}, conditions: [], death: { s: 0, f: 0 }, inspiration: false }, c.play);
  const save = () => S.autosave(c);
  const redraw = () => draw();

  function draw() {
    const e = c.equipment;
    if (!e.items.length && !e.gp && (c.classId || c.bgId) && !e.touched) { rebuildEquipment(c); save(); }
    const x = compute(c);
    if (P.hp == null || P.hp > x.hpMax) P.hp = x.hpMax;
    const y = window.scrollY;
    const subtitle = [x.sp?.name + (c.speciesOpt?.lineage ? ` (${c.speciesOpt.lineage})` : ''), `${x.cls?.name || '?'} ${c.level}`, c.level >= 3 && x.cls ? x.cls.subclass.name : null, x.bg?.name].filter(Boolean).join(' · ');
    root.replaceChildren(...[
      h('header.sh-head',
        h('span.sh-ico', { html: iconSvg(c.classId || 'd20') }),
        h('div.sh-title', h('h1', c.name || 'Character ไร้ชื่อ'), h('p', subtitle)),
        h('button.icon-btn', { 'aria-label': 'เมนู', onclick: menu }, '⋯')),
      h('div.stats-row.sticky-stats',
        statBox('AC', x.ac, null, 'ac'),
        statBox('HP', `${P.hp}${P.temp ? '+' + P.temp : ''}`, `/${x.hpMax}`, 'hp'),
        statBox('Speed', x.speed, 'ft', 'speed'),
        statBox('Init', sign(x.init), null, 'init'),
        statBox('Prof', sign(x.pb), null, 'level')),
      missing(c).length ? h('button.miss-bar', { onclick: () => nav(`#/edit/${c.id}/class`) }, `⚠ ยังเลือกไม่ครบ ${missing(c).length} อย่าง — แตะเพื่อแก้`) : null,
      h('nav.tabs', { role: 'tablist' }, TABS.map(([id, label, ico]) => h('button.tab' + (cur === id ? '.on' : ''), {
        role: 'tab', 'aria-selected': cur === id ? 'true' : 'false',
        onclick: () => { cur = id; history.replaceState(null, '', `#/c/${c.id}/${id}`); draw(); window.scrollTo(0, 0); },
      }, h('span', { html: iconSvg(ico) }), h('small', label)))),
      h('section.sh-body', ({ main, skills, spells, features, gear, notes })[cur](x))].filter(Boolean));
    window.scrollTo(0, y);
  }

  function menu() {
    sheet('เมนู', h('div.menu-list',
      h('button.menu-item', { onclick: () => { close(); nav(`#/edit/${c.id}/basic`); } }, '✏️ แก้ไข / เลเวลอัป'),
      h('button.menu-item', { onclick: async () => { close(); await share(); } }, '🔗 แชร์ลิงก์ตัวละคร'),
      h('button.menu-item', { onclick: () => { close(); S.exportFile([c]); toast('ดาวน์โหลดไฟล์สำรองแล้ว'); } }, '💾 ดาวน์โหลดไฟล์สำรอง'),
      h('button.menu-item', { onclick: () => { close(); window.print(); } }, '🖨️ ปริ้น / เซฟเป็น PDF'),
      h('button.menu-item', { onclick: () => { close(); const copy = structuredClone(c); delete copy.id; copy.name = (c.name || 'Character ') + ' (สำเนา)'; S.save(copy); nav(`#/c/${copy.id}`); toast('ทำสำเนาแล้ว'); } }, '📄 ทำสำเนา'),
      h('button.menu-item.danger', { onclick: async () => { close(); if (await confirmSheet('ลบตัวละคร?', `ลบ "${c.name || 'Character ไร้ชื่อ'}" ออกจากเครื่องนี้ (กู้คืนไม่ได้ ถ้าไม่ได้สำรองไว้)`, 'ลบเลย')) { S.remove(c.id); nav('#/'); } } }, '🗑️ ลบตัวละคร')));
    const close = () => document.querySelector('.bs-wrap:last-child .bs-backdrop')?.click();
  }

  async function share() {
    const url = await S.shareUrl(c);
    if (navigator.share) {
      try { await navigator.share({ title: c.name || 'ตัวละคร', text: `ตัวละคร ${c.name || ''}`, url }); return; } catch { /* ยกเลิก */ }
    }
    try { await navigator.clipboard.writeText(url); toast('คัดลอกลิงก์แล้ว ส่งเข้า LINE ได้เลย'); }
    catch { sheet('ลิงก์ตัวละคร', h('textarea.inp', { rows: 5, readonly: true }, url)); }
  }

  // ---------- หลัก ----------
  function main(x) {
    const out = [];
    // HP
    let amt = h('input.inp.num', { type: 'number', inputmode: 'numeric', min: 0, placeholder: '0', 'aria-label': 'จำนวน' });
    const val = () => Math.max(0, parseInt(amt.value, 10) || 0);
    const hpCard = h('div.card.hp-card',
      h('div.hp-big', h('b', String(P.hp)), h('span', `/ ${x.hpMax}`), P.temp ? h('em', `+${P.temp} ชั่วคราว`) : null),
      h('div.hp-bar', h('i', { style: { width: Math.max(0, Math.min(100, P.hp / x.hpMax * 100)) + '%' } })),
      h('div.hp-ctl',
        h('button.btn.dmg', { onclick: () => { let n = val(); const t = Math.min(P.temp, n); P.temp -= t; n -= t; P.hp = Math.max(0, P.hp - n); amt.value = ''; save(); redraw(); } }, '− โดนตี'),
        amt,
        h('button.btn.heal', { onclick: () => { const n = val(); if (P.hp === 0 && n > 0) P.death = { s: 0, f: 0 }; P.hp = Math.min(x.hpMax, P.hp + n); amt.value = ''; save(); redraw(); } }, '+ ฮีล'),
        h('button.btn', { onclick: () => { P.temp = Math.max(P.temp, val()); amt.value = ''; save(); redraw(); } }, 'HP ชั่วคราว')));
    out.push(hpCard);
    if (P.hp === 0) {
      const pips = (k, label) => h('div.death-row', h('span', label), [0, 1, 2].map(i => h('button.pip' + (P.death[k] > i ? '.on' : ''), { 'aria-label': `${label} ${i + 1}`, onclick: () => { P.death[k] = P.death[k] > i ? i : i + 1; save(); redraw(); } })));
      out.push(h('div.card.death', h('h3', '💀 Death Saves'), h('p.muted.small', 'ทอย d20 ต้นเทิร์น: 10+ สำเร็จ, 9- ล้มเหลว, 20 ฟื้นมี HP 1, 1 นับล้มเหลว 2 ครั้ง'), pips('s', 'สำเร็จ'), pips('f', 'ล้มเหลว')));
    }
    // พัก
    const hdLeft = c.level - P.hdUsed;
    out.push(h('div.rest-row',
      h('button.btn', { onclick: () => shortRest(x) }, h('span', { html: iconSvg('short') }), ' พักสั้น'),
      h('button.btn', { onclick: () => longRest(x) }, h('span', { html: iconSvg('long') }), ' พักยาว'),
      h('span.muted.small', `Hit Dice: ${hdLeft}/${c.level} (d${x.cls?.hitDie || 8})`)));
    // ค่าพลัง
    out.push(h('h3', 'ค่าพลัง & Saving Throws'), h('div.abil-grid', ABIL.map(a => {
      const sv = x.saves.find(s => s.ab === a);
      return h('button.abil', { onclick: () => roll(`${ABIL_EN[a]} check`, x.m[a]) },
        h('small', ABIL_SHORT[a]), h('b', sign(x.m[a])), h('span.score', String(x.score[a])),
        h('span.save' + (sv.prof ? '.prof' : ''), { onclick: e => { e.stopPropagation(); roll(`${ABIL_EN[a]} save`, sv.bonus); } }, `Save ${sign(sv.bonus)}`));
    })));
    // โจมตี
    out.push(h('h3', 'โจมตี'), h('div.card.list', x.attacks.map(a => h('div.atk', { onclick: () => roll(`${a.name} (attack)`, a.hit) },
      h('div', h('b', a.name), a.mastery ? h('i.tag.mastery', { title: D.th.mastery?.[a.mastery.toLowerCase()] || '' }, a.mastery) : null, h('small', a.props || (a.name === 'Unarmed Strike' ? 'ต่อย เตะ โขก' : ''))),
      h('span.atk-hit', sign(a.hit)), h('span.atk-dmg', a.dmg)))));
    // ความหมาย Mastery + คุณสมบัติอาวุธที่ตัวละครใช้อยู่
    const wTerms = [...new Set(x.attacks.flatMap(a => [
      ...(a.mastery ? [a.mastery.toLowerCase()] : []),
      ...D.weaponProps.filter(p => new RegExp(`\\b${p.name}\\b`, 'i').test(a.props || '')).map(p => p.id)]))];
    if (wTerms.length) out.push(h('details.orig', h('summary', 'ความหมาย Mastery / คุณสมบัติอาวุธ'),
      wTerms.map(id => { const it = D.masteryById[id] || D.weaponProps.find(p => p.id === id);
        return h('div.wterm', h('b', it.name), D.th.mastery?.[id] ? h('p.th', D.th.mastery[id]) : null, fullTh('mastery', id)); })));
    if (x.cls?.id === 'barbarian') out.push(h('p.muted.small', `💡 ตอน Rage: ดาเมจ ${x.cls.table.rows[c.level - 1][4]} กับการโจมตีที่ใช้ STR`));
    // ทรัพยากร
    if (x.res.length) {
      out.push(h('h3', 'ใช้ได้กี่ครั้ง'), h('div.card.list', x.res.map(r => {
        const used = P.res[r.id] || 0;
        const big = r.max > 8;
        return h('div.res',
          h('span.res-ico', { html: iconSvg(r.icon) }),
          h('div.res-name', h('b', r.name), h('small', r.reset === 'long' ? 'คืนตอนพักยาว' : r.reset === 'short' ? 'คืนตอนพักสั้น/ยาว' : 'พักสั้นคืน 1 · พักยาวคืนหมด')),
          big ? h('div.res-num',
            h('button.icon-btn', { onclick: () => { P.res[r.id] = Math.min(r.max, used + 1); save(); redraw(); }, 'aria-label': 'ใช้' }, '−'),
            h('b', `${r.max - used}`), h('small', `/${r.max}`),
            h('button.icon-btn', { onclick: () => { P.res[r.id] = Math.max(0, used - 1); save(); redraw(); }, 'aria-label': 'คืน' }, '+'))
            : h('div.pips', Array.from({ length: r.max }, (_, i) => h('button.pip' + (i < r.max - used ? '.on' : ''), {
              'aria-label': `${r.name} ${i + 1}`, onclick: () => { P.res[r.id] = i < r.max - used ? r.max - i : r.max - i - 1; save(); redraw(); },
            }))));
      })));
    }
    // สถานะ
    out.push(h('h3', 'สถานะ (Conditions)'), h('div.chips', CONDITIONS.map(k => {
      const on = P.conditions.includes(k);
      return h('button.chip' + (on ? '.on.bad' : ''), { onclick: () => {
        if (on) P.conditions = P.conditions.filter(z => z !== k); else P.conditions.push(k);
        save(); redraw();
        if (!on) conditionInfo(k);
      } }, k);
    })), h('label.row.check-row', h('input', { type: 'checkbox', checked: P.inspiration, onchange: e => { P.inspiration = e.target.checked; save(); } }), ' ✨ Heroic Inspiration (ทอยใหม่ได้ 1 ครั้ง)'));
    return out;
  }

  function conditionInfo(k) {
    const t = D.th.misc?.conditions?.[k];
    if (t) toast(`${k}: ${t}`);
  }

  function roll(label, bonus) {
    const r = d(20);
    toast(`🎲 ${label}: ${r} ${sign(bonus)} = ${r + bonus}${r === 20 ? ' 🔥 คริ!' : r === 1 ? ' 💀' : ''}`);
  }

  function shortRest(x) {
    const hd = x.cls?.hitDie || 8;
    const log = h('p.muted');
    const body = h('div',
      h('p', 'พักสั้น 1 ชั่วโมง: ใช้ Hit Dice ฟื้น HP ได้ (ทอย + CON แต่ละลูก)'),
      h('div.row',
        h('button.btn.primary', { onclick: () => {
          if (c.level - P.hdUsed <= 0) { log.textContent = 'Hit Dice หมดแล้ว'; return; }
          const r = Math.max(1, d(hd) + x.m.con);
          P.hdUsed++; P.hp = Math.min(x.hpMax, P.hp + r); save();
          log.textContent = `ฟื้น ${r} HP → ตอนนี้ ${P.hp}/${x.hpMax} · Hit Dice เหลือ ${c.level - P.hdUsed}`;
        } }, `ใช้ Hit Die (d${hd})`)), log);
    sheet('พักสั้น', body, [{ label: 'พักเสร็จ', primary: true, onClick: () => {
      for (const r of x.res) if (r.reset === 'short') P.res[r.id] = 0; else if (r.reset === 'short1') P.res[r.id] = Math.max(0, (P.res[r.id] || 0) - 1);
      if (x.cls?.id === 'warlock') P.slots = {};
      save(); redraw(); toast('พักสั้นเรียบร้อย');
    } }]);
  }
  async function longRest(x) {
    if (!(await confirmSheet('พักยาว 8 ชั่วโมง?', 'HP เต็ม · Hit Dice คืนหมด · Spell Slot และความสามารถคืนหมด'))) return;
    P.hp = x.hpMax; P.temp = 0; P.hdUsed = 0; P.slots = {}; P.res = {}; P.death = { s: 0, f: 0 };
    P.conditions = P.conditions.filter(k => k !== 'Exhaustion');
    save(); redraw(); toast('พักยาวแล้ว พร้อมลุยต่อ!');
  }

  // ---------- สกิล ----------
  function skills(x) {
    const th = D.th.misc?.skills || {};
    return [
      h('div.stats-row', statBox('Passive Perception', 10 + x.perception, null, 'eye'), x.darkvision ? statBox('Darkvision', x.darkvision, 'ft', 'eye') : null),
      h('div.card.list', x.skills.map(s => h('button.skill-row', { onclick: () => roll(s.name, s.bonus) },
        h('span.dot' + (s.exp ? '.exp' : s.prof ? '.prof' : '')),
        h('div', h('b', s.name), h('small', `${ABIL_SHORT[s.ab]} · ${th[s.name] || ''}`)),
        h('span.skill-bonus', sign(s.bonus))))),
      h('p.muted.small', '● ชำนาญ (+Prof)  ◉ Expertise (+Prof×2) — แตะเพื่อทอย'),
      h('h3', 'ความชำนาญอื่น ๆ'),
      h('dl.kv',
        h('dt', 'Armor'), h('dd', x.training.join(', ') || '—'),
        h('dt', 'Weapons'), h('dd', x.cls?.core['Weapon Proficiencies'] + (x.weaponRule === 'all' && !/Martial/.test(x.cls?.core['Weapon Proficiencies']) ? ' + Martial' : '') || '—'),
        h('dt', 'Tools'), h('dd', [x.cls?.core['Tool Proficiencies'], x.bg?.tool].filter(t => t && t !== 'None').join(', ').replace(/\s*\(see.*?\)/g, '') || '—'),
        h('dt', 'Languages'), h('dd', x.langs.join(', '))),
    ];
  }

  // ---------- เวท ----------
  function spells(x) {
    if (!x.casting.length) return [h('p.muted', 'ตัวละครนี้ไม่ได้ใช้เวท')];
    const out = [];
    for (const b of x.casting) {
      out.push(h('h2.sec', b.source), h('div.stats-row', statBox('Save DC', b.dc), statBox('Spell Attack', sign(b.atk)), statBox('ค่าพลัง', ABIL_SHORT[b.ab])));
      if (b.key === 'class' && Object.keys(b.slots).length) {
        out.push(h('div.card.list', Object.entries(b.slots).map(([lv, n]) => {
          const used = P.slots[lv] || 0;
          return h('div.res', h('div.res-name', h('b', `${b.pact ? 'Pact Slot ' : 'Spell Slot '}Lv ${lv}`), h('small', b.pact ? 'คืนตอนพักสั้น/ยาว' : 'คืนตอนพักยาว')),
            h('div.pips', Array.from({ length: n }, (_, i) => h('button.pip' + (i < n - used ? '.on' : ''), {
              'aria-label': `slot ${lv}-${i + 1}`, onclick: () => { P.slots[lv] = i < n - used ? n - i : n - i - 1; save(); redraw(); },
            }))));
        })));
      }
      const group = (title, ids, badge) => ids.length ? [h('h4.lv', title), h('div.spell-list', ids.map(id => D.spell[id]).filter(Boolean).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)).map(s => spellRow(s, { badge: badge || LEVEL_TH(s.level) })))] : null;
      out.push(group('Cantrips', b.cantrips, 'Cantrip'));
      out.push(group('เตรียมไว้เสมอ', b.always, 'ติดตัว'));
      out.push(group(b.book ? 'เตรียมวันนี้' : 'เวทที่เตรียมไว้', b.prepared));
      if (b.book?.length) out.push(h('details.orig', h('summary', `สมุดเวท (${b.book.length})`), group('', b.book)));
      if (!b.fixed) out.push(h('button.btn.ghost', { onclick: () => nav(`#/edit/${c.id}/spells`) }, '✏️ เปลี่ยนเวท'));
    }
    return out;
  }

  // ---------- ความสามารถ ----------
  function features(x) {
    const out = [];
    if (x.cls) {
      out.push(h('h2.sec', x.cls.name));
      for (const f of x.feats) out.push(classFeatureCard(x.cls, f, f.src === 'sub'));
      const ch = c.choices || {};
      const opts = [...(ch.metamagic || []).map(id => x.cls.options['metamagic-options']?.items.find(i => i.id === id)), ...(ch.invocations || []).map(id => x.cls.options['eldritch-invocation-options']?.items.find(i => i.id === id))].filter(Boolean);
      if (opts.length) { out.push(h('h3', 'ตัวเลือกที่เลือกไว้')); opts.forEach(o => out.push(featureCard({ name: o.name, text: o.text, th: { s: D.th.options?.[o.id] }, full: ['options', o.id] }))); }
      if (ch.huntersPrey) out.push(h('p', h('b', "Hunter's Prey: "), ch.huntersPrey));
      if (ch.divineOrder || ch.primalOrder) out.push(h('p', h('b', 'บทบาท: '), ch.divineOrder || ch.primalOrder));
      if (ch.mastery?.length) out.push(h('p', h('b', 'Weapon Mastery: '), ch.mastery.map(id => `${D.weapon[id]?.name} (${D.weapon[id]?.mastery})`).join(', ')));
    }
    const feats = [...x.featIds];
    if (feats.length) {
      out.push(h('h2.sec', 'Feats'));
      for (const id of new Set(feats)) { const f = D.feat[id]; if (f) out.push(featureCard({ name: f.name, text: f.text, th: D.th.feats?.[id], tag: f.category, full: ['feats', id] })); }
    }
    if (x.sp) {
      out.push(h('h2.sec', x.sp.name));
      for (const t of x.sp.traits) out.push(featureCard({ name: t.name, text: t.text, th: D.th.species?.[x.sp.id]?.f?.[t.id] }));
    }
    return out;
  }

  // ---------- ของ ----------
  function gear(x) {
    const e = c.equipment;
    const coin = (k, label) => h('label.coin', h('small', label), h('input.inp.num', { type: 'number', inputmode: 'numeric', value: e[k] || 0, onchange: ev => { e[k] = parseInt(ev.target.value, 10) || 0; save(); } }));
    let name = h('input.inp', { placeholder: 'เพิ่มของ เช่น Potion of Healing', 'aria-label': 'ชื่อของ' });
    return [
      h('div.coins', coin('pp', 'PP'), coin('gp', 'GP'), coin('ep', 'EP'), coin('sp', 'SP'), coin('cp', 'CP')),
      h('p.muted.small', `สวมอยู่: ${x.acNote} → AC ${x.ac}`),
      h('div.card.list', e.items.map((it, i) => h('div.item-row',
        h('b', it.name), it.weapon ? h('i.tag', 'อาวุธ') : null, it.armor ? h('i.tag', 'เกราะ') : null,
        h('div.qty',
          h('button.icon-btn', { 'aria-label': 'ลด', onclick: () => { it.qty--; if (it.qty <= 0) e.items.splice(i, 1); e.touched = true; save(); redraw(); } }, '−'),
          h('span', String(it.qty)),
          h('button.icon-btn', { 'aria-label': 'เพิ่ม', onclick: () => { it.qty++; save(); redraw(); } }, '+'))))),
      h('div.row', name, h('button.btn.primary', { onclick: () => {
        const n = name.value.trim(); if (!n) return;
        const w = D.weapons.find(z => z.name.toLowerCase() === n.toLowerCase());
        e.items.push({ name: w?.name || n, qty: 1, weapon: w?.id });
        save(); redraw();
      } }, 'เพิ่ม')),
      h('p.muted.small', '💡 พิมพ์ชื่ออาวุธภาษาอังกฤษให้ตรง (เช่น Longsword) แล้วจะขึ้นในช่องโจมตีให้อัตโนมัติ'),
    ];
  }

  // ---------- โน้ต ----------
  function notes() {
    return [
      h('h3', 'รูปลักษณ์ / บุคลิก'),
      h('textarea.inp', { rows: 4, oninput: e => { c.look = e.target.value; save(); } }, c.look || ''),
      h('h3', 'โน้ตการผจญภัย'),
      h('textarea.inp', { rows: 12, placeholder: 'ชื่อ NPC, เควส, ของที่ได้มา…', oninput: e => { c.notes = e.target.value; save(); } }, c.notes || ''),
    ];
  }

  draw();
}
