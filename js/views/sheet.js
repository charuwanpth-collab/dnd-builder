// ใบตัวละครสำหรับใช้ตอนเล่น — โครงแบบ D&D Beyond: สแตททั้งหมดอยู่ส่วนบน + แท็บด้านล่าง
// ใช้เต๋าจริง: แตะอะไรก็ได้ = เปิดการ์ดบอกสูตร (เว็บไม่ทอยให้)
import { D } from '../data.js';
import { h, iconSvg, sheet, toast, sign, confirmSheet } from '../util.js';
import * as S from '../store.js';
import { ABIL, ABIL_EN, ABIL_SHORT, ABIL_TH, compute, missing, rebuildEquipment, levelInfo, chOf } from '../rules.js';
import { openLevelUp, levelSummary } from './levelup.js';
import { classFeatureCard, featureCard, spellRow, LEVEL_TH, stubSubBox, TYPE_LABEL } from './parts.js';
import { formula, explain, attackBody, dmgText } from './explain.js';
import { showTerm } from './glossary.js';
import * as T from './turn.js';

const CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'];
const TABS = [['actions', 'ACTIONS', 'การกระทำ'], ['spells', 'SPELLS', 'เวท'], ['inventory', 'INVENTORY', 'ของในกระเป๋า'], ['features', 'FEATURES & TRAITS', 'ความสามารถ'], ['background', 'BACKGROUND', 'ภูมิหลัง'], ['notes', 'NOTES', 'โน้ต']];
const OLD_TAB = { main: 'actions', skills: 'actions', gear: 'inventory' };
const ALIGN = [
  ['Lawful Good', 'ดีและมีระเบียบ — ทำสิ่งที่ถูกต้อง รักษาคำพูด และเคารพกฎที่ยุติธรรม'],
  ['Neutral Good', 'ดีแบบยืดหยุ่น — ช่วยคนเท่าที่ช่วยได้ จะทำตามกฎหรือไม่ก็ดูว่าแบบไหนช่วยคนได้มากกว่า'],
  ['Chaotic Good', 'ดีแบบรักอิสระ — ทำความดีตามหัวใจตัวเอง ถ้ากฎขวางการทำสิ่งที่ถูกก็พร้อมแหกกฎ'],
  ['Lawful Neutral', 'ยึดกฎและระเบียบเป็นหลัก — สนใจว่าทำตามหน้าที่ ประเพณี หรือคำสั่งไหม มากกว่าเรื่องดีหรือชั่ว'],
  ['Neutral', 'เป็นกลาง — ไม่เอียงไปทางไหนชัด ๆ ตัดสินใจตามสถานการณ์ตรงหน้า'],
  ['Chaotic Neutral', 'รักอิสระเหนือสิ่งอื่น — ทำตามใจตัวเอง ไม่ชอบให้ใครมาสั่ง แต่ก็ไม่ได้ตั้งใจทำร้ายใคร'],
  ['Lawful Evil', 'ชั่วแบบมีระบบ — ใช้กฎ อำนาจ และลำดับชั้นหาประโยชน์ให้ตัวเอง และรักษาคำพูดถ้ามันได้ประโยชน์'],
  ['Neutral Evil', 'เห็นแก่ตัวสุด ๆ — ทำทุกอย่างเพื่อตัวเอง ไม่สนว่าใครจะเดือดร้อน'],
  ['Chaotic Evil', 'ชั่วและบ้าระห่ำ — ใช้ความรุนแรงตามอารมณ์ ไม่สนกฎและไม่สนใคร'],
];
const LIFESTYLE = ['Wretched', 'Squalid', 'Poor', 'Modest', 'Comfortable', 'Wealthy', 'Aristocratic'];
const head = (en, th, ...rest) => h('h3.sec2', h('span', en), h('small', th), ...rest);
let obs; // IntersectionObserver ของกล่อง HP (โชว์แถบย่อตอนเลื่อนพ้น)

export function renderSheet(root, c, tab, nav) {
  tab = OLD_TAB[tab] || tab;
  let cur = TABS.some(t => t[0] === tab) ? tab : 'actions';
  const P = c.play = Object.assign({ hp: null, temp: 0, hdUsed: 0, slots: {}, res: {}, conditions: [], death: { s: 0, f: 0 }, inspiration: false }, c.play);
  if (!P.hdu) { P.hdu = {}; const d0 = D.cls[c.classId]?.hitDie; if (P.hdUsed && d0) P.hdu[d0] = P.hdUsed; }
  const Dt = c.details = Object.assign({}, c.details);
  if (c.look) { if (!Dt.appearance) Dt.appearance = c.look; delete c.look; }
  const hdUsedAll = () => Object.values(P.hdu).reduce((s, n) => s + n, 0);
  const save = () => S.autosave(c);
  const redraw = () => draw();
  const done = () => { save(); redraw(); };
  const ui = { act: 'all', feat: 'all', spQ: '', spLv: 'all', spF: '' };

  function draw() {
    const e = c.equipment;
    if (!e.items.length && !e.gp && (c.classId || c.bgId) && !e.touched) { rebuildEquipment(c); save(); }
    const x = compute(c);
    if (P.hp == null || P.hp > x.hpMax) P.hp = x.hpMax;
    const y = window.scrollY;
    const miss = missing(c);
    const tabsEl = h('nav.tabs', { role: 'tablist' }, TABS.map(([id, en, th]) => h('button.tab' + (cur === id ? '.on' : ''), {
      role: 'tab', 'aria-selected': cur === id ? 'true' : 'false', onclick: () => go(id),
    }, h('b', en), h('small', th))));
    const body = h('section.sh-body', ({ actions, spells, inventory, features, background, notes })[cur](x));
    swipe(body);
    root.replaceChildren(...[
      header(x),
      h('div.sticky-stats', mini(x), T.turnBar(c, x, P, save, redraw)),
      miss.length ? h('button.miss-bar', { onclick: () => nav(`#/edit/${c.id}/class`) }, `⚠ ยังเลือกไม่ครบ ${miss.length} อย่าง — แตะเพื่อไปเลือกให้ครบ`) : null,
      top(x), tabsEl, body].filter(Boolean));
    window.scrollTo(0, y);
    const topbarH = document.querySelector('.topbar')?.offsetHeight || 53;
    document.documentElement.style.setProperty('--topbar-h', topbarH + 'px');
    const on = tabsEl.querySelector('.on');
    if (on) tabsEl.scrollLeft = on.offsetLeft - (tabsEl.clientWidth - on.offsetWidth) / 2;
    // แถบย่อ HP/AC โชว์เมื่อเลื่อนพ้นกล่อง HP
    obs?.disconnect();
    const hp = root.querySelector('.hp-box'), m = root.querySelector('.mini');
    if (hp && m && 'IntersectionObserver' in window) {
      obs = new IntersectionObserver(([en]) => m.classList.toggle('show', !en.isIntersecting && en.boundingClientRect.top < topbarH), { rootMargin: `-${topbarH + 40}px 0px 0px 0px` });
      obs.observe(hp);
    }
  }

  function go(id) {
    if (id === cur) return;
    cur = id; history.replaceState(null, '', `#/c/${c.id}/${id}`); draw();
    const tabsEl = root.querySelector('nav.tabs');
    const off = (document.querySelector('.topbar')?.offsetHeight || 53) + (root.querySelector('.sticky-stats')?.offsetHeight || 0);
    const top0 = tabsEl.getBoundingClientRect().top + window.scrollY - off;
    if (window.scrollY > top0) window.scrollTo(0, top0);
  }
  // ปัดซ้าย/ขวาเปลี่ยนแท็บ
  function swipe(el) {
    let sx = 0, sy = 0, ok = false;
    el.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; ok = !e.target.closest('input, textarea, select, .chips, .no-swipe'); }, { passive: true });
    el.addEventListener('touchend', e => {
      if (!ok) return;
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
      const i = TABS.findIndex(z => z[0] === cur) + (dx < 0 ? 1 : -1);
      if (TABS[i]) go(TABS[i][0]);
    }, { passive: true });
  }

  // ---------- หัว ----------
  function header(x) {
    const subtitle = [x.sp?.name + (c.speciesOpt?.lineage ? ` (${c.speciesOpt.lineage})` : ''), x.classLine || '?', x.CL >= 3 && x.sub ? x.sub.name : null, x.bg?.name].filter(Boolean).join(' · ');
    return h('header.sh-head',
      h('span.sh-ico', { html: iconSvg(c.classId || 'd20') }),
      h('div.sh-title', h('h1', c.name || 'Character ไร้ชื่อ'), h('p', subtitle)),
      h('button.rest-btn', { onclick: () => shortRest(x), 'aria-label': 'พักสั้น' }, h('span', { html: iconSvg('short') }), h('small', 'พักสั้น')),
      h('button.rest-btn', { onclick: () => longRest(x), 'aria-label': 'พักยาว' }, h('span', { html: iconSvg('long') }), h('small', 'พักยาว')),
      h('button.icon-btn', { 'aria-label': 'เมนู', onclick: menu }, '⋯'));
  }
  function mini(x) {
    return h('button.mini', { onclick: () => root.querySelector('.hp-box')?.scrollIntoView({ block: 'center', behavior: 'smooth' }) },
      h('span', '❤️ ', h('b', String(P.hp)), `/${x.hpMax}`, P.temp ? h('em', ` +${P.temp}`) : null),
      h('span', '🛡️ AC ', h('b', String(x.ac))), h('span', '👣 ', h('b', String(x.speed)), ' ft'),
      P.conditions.length ? h('span.bad', '⚠ ' + P.conditions.join(', ')) : null);
  }

  function menu() {
    const close = sheet('เมนู', h('div.menu-list',
      h('button.menu-item', { onclick: () => { close(); openLevelUp(c, () => { S.save(c); redraw(); }); } }, `⬆️ เลเวลอัป (→ Lv ${c.level + 1})`),
      c.level > 1 ? h('button.menu-item', { onclick: async () => { close(); await levelDown(); } }, `↩️ ย้อนเลเวล (กลับเป็น Lv ${c.level - 1})`) : null,
      h('button.menu-item', { onclick: () => { close(); nav(`#/edit/${c.id}/basic`); } }, '✏️ แก้ไขตัวละคร'),
      h('button.menu-item', { onclick: async () => { close(); await share(); } }, '🔗 แชร์ลิงก์ตัวละคร'),
      h('button.menu-item', { onclick: () => { close(); S.exportFile([c]); toast('ดาวน์โหลดไฟล์สำรองแล้ว'); } }, '💾 ดาวน์โหลดไฟล์สำรอง'),
      h('button.menu-item', { onclick: () => { close(); window.print(); } }, '🖨️ ปริ้น / เซฟเป็น PDF'),
      h('button.menu-item', { onclick: () => { close(); const copy = structuredClone(c); delete copy.id; copy.name = (c.name || 'Character ') + ' (สำเนา)'; S.save(copy); nav(`#/c/${copy.id}`); toast('ทำสำเนาแล้ว'); } }, '📄 ทำสำเนา'),
      h('button.menu-item.danger', { onclick: async () => { close(); if (await confirmSheet('ลบตัวละคร?', `ลบ "${c.name || 'Character ไร้ชื่อ'}" ออกจากเครื่องนี้ (ถ้าไม่ได้สำรองไว้จะกู้คืนไม่ได้)`, 'ลบเลย')) { S.remove(c.id); nav('#/'); } } }, '🗑️ ลบตัวละคร')));
  }

  async function levelDown() {
    const li = levelInfo(c).at(-1);
    if (!await confirmSheet(`ย้อนเป็นเลเวล ${c.level - 1}?`, `ลบเลเวล ${c.level} (${levelSummary(c, li)}) ออก — ตัวเลือกของเลเวลนี้ (HP / ASI / feat) จะหายไปด้วย`, 'ย้อนเลเวล')) return;
    const before = compute(c).hpMax;
    c.levels.pop();
    c.level = c.levels.length;
    P.hp = Math.max(0, Math.min(compute(c).hpMax, (P.hp ?? before) - (before - compute(c).hpMax)));
    const x2 = compute(c);
    for (const k of Object.keys(P.hdu)) P.hdu[k] = Math.min(P.hdu[k], x2.hitDice.filter(hd => hd.die === +k).reduce((t, hd) => t + hd.n, 0));
    S.save(c); redraw(); toast(`กลับเป็นเลเวล ${c.level} แล้ว`);
  }

  async function share() {
    const url = await S.shareUrl(c);
    if (navigator.share) {
      try { await navigator.share({ title: c.name || 'ตัวละคร', text: `ตัวละคร ${c.name || ''}`, url }); return; } catch { /* ยกเลิก */ }
    }
    try { await navigator.clipboard.writeText(url); toast('คัดลอกลิงก์แล้ว ส่งเข้า LINE ได้เลย'); }
    catch { sheet('ลิงก์ตัวละคร', h('textarea.inp', { rows: 5, readonly: true }, url)); }
  }

  // ---------- ส่วนบน: สแตททั้งหมด ----------
  const box = (en, th, val, unit, onclick, cls = '') => h('button.box' + cls, { onclick }, h('small.en', en), h('b', val, unit ? h('span.unit', unit) : null), th ? h('small.th', th) : null);

  function top(x) {
    const sk = n => 10 + (x.skills.find(s => s.name === n)?.bonus || 0);
    return h('section.sh-top',
      h('div.abil6', ABIL.map(a => h('button.ab6', { onclick: () => abilInfo(a, x) },
        h('small', ABIL_EN[a].toUpperCase()), h('b', sign(x.m[a])), h('span.oval', String(x.score[a]))))),
      h('div.box3',
        box('PROFICIENCY', 'โบนัสชำนาญ', sign(x.pb), null, () => explain('Proficiency Bonus', [
          h('p', `ตอนนี้เลเวลรวม ${x.L} ได้ Proficiency Bonus ${sign(x.pb)} (เริ่มที่ +2 แล้วเพิ่มขึ้นทุก 4 เลเวล)`),
          h('p', 'เราจะบวกเลขนี้ทุกครั้งที่ทอยสิ่งที่เราชำนาญ เช่น โจมตีด้วยอาวุธที่ชำนาญ สกิลที่ติดจุด Saving Throw ของคลาส และการร่ายเวท')])),
        box('SPEED', 'ความเร็ว', String(x.speed), 'ft', () => explain('Speed', [
          h('p', `เทิร์นหนึ่งเราเดินได้ไกลสุด ${x.speed} ฟุต (ตารางละ 5 ฟุต = ${Math.floor(x.speed / 5)} ช่อง) จะแบ่งเดินก่อนและหลังโจมตีก็ได้`),
          h('p.muted.small', 'ใช้ Dash เพื่อเดินได้อีกเท่าตัว · พื้นที่ขรุขระ (Difficult Terrain) เดิน 1 ฟุตเสีย 2 ฟุต')])),
        box('HEROIC', 'Inspiration', P.inspiration ? '✨' : '—', null, () => {
          P.inspiration = !P.inspiration; done();
          toast(P.inspiration ? '✨ ได้ Heroic Inspiration — ทอยอะไรออกมาไม่ถูกใจ ทอยใหม่ได้ 1 ครั้ง' : 'ใช้ Heroic Inspiration ไปแล้ว');
        }, P.inspiration ? '.lit' : '')),
      hpBox(x),
      P.hp === 0 ? deathBox() : null,
      h('div.box4',
        box('INITIATIVE', 'ลำดับเริ่ม', sign(x.init), null, () => explain('Initiative', [
          formula('ทอย Initiative', x.init, x.initParts),
          h('p', 'ทอยตอนเริ่มการต่อสู้ ใครได้เลขสูงกว่าได้เล่นก่อน (DM จะเป็นคนบอกให้ทอย)')])),
        box('ARMOR', 'Class (AC)', String(x.ac), null, () => explain('Armor Class (AC)', [
          h('div.formula', h('div.f-main', h('span', 'AC'), h('b', String(x.ac))), h('div.f-parts', h('span', x.acNote))),
          h('p', 'ยิ่ง AC สูง ศัตรูยิ่งตีโดนยาก — ศัตรูต้องทอยโจมตีให้ได้เท่ากับหรือมากกว่า AC ถึงจะโดน'),
          h('p.muted.small', 'ใส่/ถอดเกราะและโล่ได้ที่แท็บ INVENTORY')])),
        box('DEFENSES', 'ต้านทาน', '—', null, () => explain('Defenses', [
          h('p', 'ช่องนี้รวมดาเมจที่เราทนได้เป็นพิเศษ:'),
          h('ul', h('li', 'Resistance — โดนดาเมจชนิดนั้นแค่ครึ่งเดียว'), h('li', 'Immunity — ไม่โดนดาเมจชนิดนั้นเลย'), h('li', 'Vulnerability — โดนดาเมจชนิดนั้นเป็น 2 เท่า')),
          h('p.muted.small', 'ตอนนี้ยังไม่มีอะไรที่คำนวณให้อัตโนมัติ ถ้าฟีเจอร์ของเราบอกว่าได้ Resistance ให้จำไว้ก่อนนะ')])),
        box('CONDITIONS', 'สถานะ', P.conditions.length ? String(P.conditions.length) : '—', null, () => condSheet(), P.conditions.length ? '.bad' : '')),
      P.conditions.length ? h('p.cond-line', '⚠ ติดอยู่: ', P.conditions.map(k => h('button.link', { onclick: () => showTerm(k.toLowerCase()) }, k)).flatMap((b, i) => (i ? [', ', b] : [b]))) : null,
      head('SAVING THROWS', 'การทอยเซฟ'),
      h('div.saves6', x.saves.map(sv => h('button.save6', { onclick: () => explain(`${ABIL_EN[sv.ab]} Saving Throw`, [
        formula('ทอยเซฟ', sv.bonus, sv.parts),
        h('p', 'DM จะสั่งให้ทอยเซฟเวลาเราต้องต้านอะไรบางอย่าง เช่น หลบระเบิด (DEX) ทนพิษ (CON) หรือต้านเวทสะกดจิต (WIS) — ได้เท่ากับหรือมากกว่าตัวเลขที่ DM ตั้งไว้ถือว่าผ่าน'),
        sv.prof ? h('p.muted.small', '● เราชำนาญเซฟนี้ จึงได้บวก Proficiency ด้วย') : null]) },
        h('span.dot' + (sv.prof ? '.prof' : '')), h('small', ABIL_SHORT[sv.ab]), h('b', sign(sv.bonus))))),
      head('SENSES', 'ประสาทสัมผัส'),
      h('div.card.list.senses',
        senseRow(`Passive Perception`, 'WIS · สังเกตเห็นอะไรโดยไม่ต้องทอย', sk('Perception'), 'Perception'),
        senseRow(`Passive Insight`, 'WIS · จับได้ว่าใครโกหก', sk('Insight'), 'Insight'),
        senseRow(`Passive Investigation`, 'INT · หากับดัก ของซ่อน', sk('Investigation'), 'Investigation'),
        x.darkvision ? h('button.sense', { onclick: () => showTerm('darkvision') }, h('div', h('b', 'Darkvision'), h('small', 'มองในที่มืดได้เหมือนแสงสลัว (เห็นเป็นขาวดำ)')), h('span.sv', `${x.darkvision} ft`)) : null,
        x.truesight ? h('button.sense', { onclick: () => showTerm('truesight') }, h('div', h('b', 'Truesight'), h('small', 'มองทะลุภาพลวง ความมืดเวท และร่างแปลง')), h('span.sv', `${x.truesight} ft`)) : null),
      head('PROFICIENCIES & TRAINING', 'สิ่งที่เราชำนาญ'),
      h('dl.kv.profs',
        h('dt', 'Armor'), h('dd', x.training.join(', ') || '—'),
        h('dt', 'Weapons'), h('dd', x.cls?.core['Weapon Proficiencies'] + (x.weaponRule === 'all' && !/Martial/.test(x.cls?.core['Weapon Proficiencies']) ? ' + Martial' : '') || '—'),
        h('dt', 'Tools'), h('dd', [x.cls?.core['Tool Proficiencies'], x.bg?.tool].filter(t => t && t !== 'None').join(', ').replace(/\s*\(see.*?\)/g, '') || '—'),
        h('dt', 'Languages'), h('dd', x.langs.join(', '))),
      head('SKILLS', 'สกิล'),
      h('div.card.list.skills-tb',
        h('div.sk-row.sk-head', h('small', 'PROF'), h('small', 'MOD'), h('small', 'SKILL'), h('small', 'BONUS')),
        x.skills.map(s => h('button.sk-row', { onclick: () => skillInfo(s) },
          h('span.dot' + (s.exp ? '.exp' : s.prof ? '.prof' : '')), h('small.sk-ab', ABIL_SHORT[s.ab]),
          h('div', h('b', s.name), h('small', D.th.misc?.skills?.[s.name] || '')), h('span.skill-bonus', sign(s.bonus))))),
      h('p.muted.small', '● ชำนาญ (บวก Proficiency) · ◉ Expertise (บวก Proficiency 2 เท่า) · แตะแถวไหนก็ได้เพื่อดูสูตร'));
  }
  function senseRow(name, sub, v, skill) {
    return h('button.sense', { onclick: () => explain(name, [
      h('div.formula', h('div.f-main', h('span', name), h('b', String(v))), h('div.f-parts', h('span', '10 + ', h('b', sign(v - 10)), ` (โบนัส ${skill})`))),
      h('p', `เป็นค่าที่ใช้แทนการทอย ${skill} — DM จะเอาไปเทียบเองเวลามีอะไรให้สังเกตแต่เราไม่ได้ตั้งใจหา ถ้าอยากตั้งใจหาจริง ๆ ให้ทอย ${skill} แทน`)]) },
      h('div', h('b', name), h('small', sub)), h('span.sv', String(v)));
  }
  function abilInfo(a, x) {
    const sv = x.saves.find(s => s.ab === a);
    const sks = x.skills.filter(s => s.ab === a);
    explain(`${ABIL_EN[a]} (${ABIL_SHORT[a]})`, [
      h('p', `ค่าพลัง ${x.score[a]} → ตัวบวก ${sign(x.m[a])} (คำนวณจาก (ค่าพลัง − 10) ÷ 2 ปัดลง)`),
      h('p.th', `${ABIL_SHORT[a]} คือ ${ABIL_TH[a]}`),
      formula(`ทอย ${ABIL_SHORT[a]} Check เปล่า ๆ`, x.m[a], [[ABIL_SHORT[a], x.m[a]]]),
      formula(`ทอย ${ABIL_SHORT[a]} Saving Throw`, sv.bonus, sv.parts),
      sks.length ? h('p.small', h('b', 'สกิลที่ใช้ค่านี้: '), sks.map(s => `${s.name} ${sign(s.bonus)}`).join(' · ')) : h('p.small', 'ไม่มีสกิลที่ใช้ค่านี้โดยตรง แต่ CON ช่วยให้ HP เยอะขึ้นทุกเลเวล'),
    ]);
  }
  function skillInfo(s) {
    explain(`${s.name} (${ABIL_SHORT[s.ab]})`, [
      D.th.misc?.skills?.[s.name] ? h('p.th', `${s.name} ใช้ตอน: ${D.th.misc.skills[s.name]}`) : null,
      formula(`ทอย ${s.name}`, s.bonus, s.parts),
      h('p', 'เราบอก DM ว่าจะทำอะไร แล้ว DM จะสั่งให้ทอยสกิลที่เหมาะ — ทอย d20 แล้วบวกเลขนี้ บอกผลรวมให้ DM'),
    ]);
  }

  function hpBox(x) {
    const amt = h('input.inp.num', { type: 'number', inputmode: 'numeric', min: 0, placeholder: '0', 'aria-label': 'จำนวน HP' });
    const val = () => Math.max(0, parseInt(amt.value, 10) || 0);
    const hdLeft = c.level - hdUsedAll();
    return h('div.hp-box',
      h('div.hp-top', h('small.en', 'HIT POINTS'), h('small.th', 'พลังชีวิต')),
      h('div.hp-nums',
        h('div', h('small', 'CURRENT'), h('b', String(P.hp))), h('span.slash', '/'),
        h('div', h('small', 'MAX'), h('b', String(x.hpMax))),
        h('div.temp', h('small', 'TEMP'), h('b', P.temp ? String(P.temp) : '—'))),
      h('div.hp-bar', h('i', { style: { width: Math.max(0, Math.min(100, P.hp / x.hpMax * 100)) + '%' } })),
      h('div.hp-ctl',
        h('button.btn.heal', { onclick: () => { const n = val(); if (!n) return toast('ใส่ตัวเลขก่อน แล้วค่อยกดฮีล'); if (P.hp === 0) P.death = { s: 0, f: 0 }; P.hp = Math.min(x.hpMax, P.hp + n); done(); } }, 'HEAL', h('small', 'ฮีล')),
        amt,
        h('button.btn.dmg', { onclick: () => { let n = val(); if (!n) return toast('ใส่ดาเมจที่โดนก่อน แล้วค่อยกด'); const t = Math.min(P.temp, n); P.temp -= t; n -= t; P.hp = Math.max(0, P.hp - n); done(); } }, 'DAMAGE', h('small', 'โดนตี'))),
      h('div.hp-sub',
        h('button.link', { onclick: () => { const n = val(); P.temp = Math.max(P.temp, n); done(); toast(n ? `ได้ Temp HP ${P.temp} (Temp HP ไม่ทบกัน เก็บค่าที่สูงกว่าไว้)` : 'ใส่จำนวน Temp HP ก่อนแล้วกดอีกที'); } }, '+ ตั้ง Temp HP'),
        h('small.muted', `Hit Dice เหลือ ${hdLeft}/${c.level} (${x.hitDice.map(d => `${d.n}d${d.die}`).join(' + ') || 'd8'})`)));
  }
  function deathBox() {
    const pips = (k, label) => h('div.death-row', h('span', label), [0, 1, 2].map(i => h('button.pip' + (P.death[k] > i ? '.on' : ''), { 'aria-label': `${label} ${i + 1}`, onclick: () => { P.death[k] = P.death[k] > i ? i : i + 1; done(); } })));
    return h('div.card.death', h('h3.sec2', h('span', 'DEATH SAVES'), h('small', 'ทอยกันตาย')),
      h('p.small', 'HP เหลือ 0 = หมดสติ ทุกต้นเทิร์นให้ทอย d20 เปล่า ๆ: ได้ 10 ขึ้นไปนับสำเร็จ ต่ำกว่า 10 นับล้มเหลว · ได้ 20 ฟื้นขึ้นมามี HP 1 · ได้ 1 นับล้มเหลว 2 ครั้ง · สำเร็จครบ 3 = อาการคงที่ ล้มเหลวครบ 3 = ตาย'),
      pips('s', 'สำเร็จ'), pips('f', 'ล้มเหลว'));
  }
  function condSheet() {
    const list = h('div.chips');
    const fill = () => list.replaceChildren(...CONDITIONS.map(k => {
      const on = P.conditions.includes(k);
      return h('button.chip' + (on ? '.on.bad' : ''), { onclick: () => {
        if (on) P.conditions = P.conditions.filter(z => z !== k); else { P.conditions.push(k); const t = D.th.misc?.conditions?.[k]; if (t) toast(`${k}: ${t}`); }
        done(); fill();
      } }, k);
    }));
    fill();
    sheet('Conditions (สถานะที่ติดอยู่)', h('div', h('p.muted.small', 'แตะเพื่อใส่หรือเอาออก — DM จะบอกเวลาเราติดสถานะอะไร'), list,
      h('p.muted.small', 'อยากรู้ว่าแต่ละอันมีผลยังไง ดูได้ที่หน้า "ศัพท์" หรือแตะชื่อสถานะใต้กล่อง CONDITIONS')));
  }

  // ทรัพยากร: กดแล้ว = ใช้ไปแล้ว (ช่องระบายเต็ม)
  function setUse(obj, key, v, hook) {
    const old = obj[key] || 0;
    obj[key] = v;
    if (v > old && P.turn) { const m = hook(); if (m) toast(m); }
    done();
  }
  function boxes(n, used, onSet, label) {
    return h('div.pips', Array.from({ length: n }, (_, i) => h('button.pip' + (i < used ? '.on' : ''), {
      'aria-label': `${label} ${i + 1}${i < used ? ' (ใช้แล้ว)' : ''}`, onclick: () => onSet(i < used ? i : i + 1),
    })));
  }

  function shortRest(x) {
    const log = h('p.small');
    const rows = h('div.hd-rows');
    const fill = () => rows.replaceChildren(...x.hitDice.map(({ die, n }) => {
      const left = n - (P.hdu[die] || 0);
      const inp = h('input.inp.num', { type: 'number', inputmode: 'numeric', min: 1, max: die, placeholder: `1–${die}`, disabled: left <= 0, 'aria-label': `ผลทอย d${die}` });
      return h('div.hd-row', h('span', h('b', `d${die}`), ` เหลือ ${left}/${n}`), inp, h('button.btn.primary', { disabled: left <= 0, onclick: () => {
        const r = parseInt(inp.value, 10);
        if (!(r >= 1 && r <= die)) return toast(`ใส่เลขที่ทอย d${die} ได้ (1–${die})`);
        const gain = Math.max(1, r + x.m.con);
        P.hdu[die] = (P.hdu[die] || 0) + 1; if (P.hp === 0) P.death = { s: 0, f: 0 }; P.hp = Math.min(x.hpMax, P.hp + gain); done();
        log.textContent = `d${die} ได้ ${r} ${sign(x.m.con)} (CON) = ฟื้น ${gain} HP → ตอนนี้ ${P.hp}/${x.hpMax}`;
        fill();
      } }, 'ใช้'));
    }));
    fill();
    sheet('พักสั้น (1 ชั่วโมง)', h('div',
      h('p', 'ระหว่างพักสั้นใช้ Hit Dice ฟื้น HP ได้: ทอยเต๋าจริงทีละลูก แล้วพิมพ์เลขที่ได้ เว็บจะบวก CON ให้เอง จะใช้กี่ลูกก็ได้เท่าที่เหลือ'), rows, log),
      [{ label: 'พักเสร็จ', primary: true, onClick: () => {
        for (const r of x.res) if (r.reset === 'short') P.res[r.id] = 0; else if (r.reset === 'short1') P.res[r.id] = Math.max(0, (P.res[r.id] || 0) - 1);
        for (const k of Object.keys(P.slots)) if (k.startsWith('p')) delete P.slots[k]; // Pact Magic คืนตอนพักสั้น
        P.turn = null; done(); toast('พักสั้นเรียบร้อย ความสามารถที่คืนตอนพักสั้นกลับมาแล้ว');
      } }]);
  }
  async function longRest(x) {
    if (!(await confirmSheet('พักยาว 8 ชั่วโมง?', 'HP เต็ม · Hit Dice คืนหมด · Spell Slot และความสามารถทุกอย่างคืนหมด'))) return;
    P.hp = x.hpMax; P.temp = 0; P.hdUsed = 0; P.hdu = {}; P.slots = {}; P.res = {}; P.death = { s: 0, f: 0 };
    P.conditions = P.conditions.filter(k => k !== 'Exhaustion'); P.turn = null;
    done(); toast('พักยาวแล้ว พร้อมลุยต่อ!');
  }

  // ---------- ACTIONS ----------
  function actions(x) {
    const F = ui.act, show = k => F === 'all' || F === k;
    const out = [h('div.chips.filter', [['all', 'ทั้งหมด'], ['attack', 'Attack'], ['a', 'Action'], ['b', 'Bonus Action'], ['r', 'Reaction'], ['other', 'อื่น ๆ'], ['limited', 'Limited Use']]
      .map(([id, l]) => h('button.chip' + (F === id ? '.on' : ''), { onclick: () => { ui.act = id; redraw(); } }, l)))];
    const feats = T.featureActions(x);
    const item = (it, extra) => h((it.open ? 'button' : 'div') + '.titem' + (extra?.off ? '.off' : ''), { onclick: it.open },
      h('div', h('b', it.name), it.tag ? h('i.tag', it.tag) : null, it.s ? h('small', it.s) : null), it.note ? h('span.badge', it.note) : null);
    const fItems = k => feats.filter(f => f.k === k).map(f => {
      const left = T.resLeft(P, f.r);
      return item({ name: f.name, s: f.th.s, tag: TYPE_LABEL[f.th.t], note: f.r ? `เหลือ ${left}/${f.r.max}` : null, open: () => T.useFeature(P, f, done) }, { off: left === 0 });
    });
    const atk = a => h('button.atk', { onclick: () => explain(a.name, attackBody(a, x), P.turn ? [{ label: 'ใช้โจมตี', primary: true, onClick: () => { toast(`⚔️ ${a.name} · ${T.attack(P, x) || 'โจมตี'}`); done(); } }] : []) },
      h('div', h('b', a.name), a.mastery ? h('i.tag.mastery', a.mastery) : null, h('small', a.props || (a.id === 'unarmed' ? 'ต่อย เตะ โขก' : ''))),
      h('span.atk-hit', sign(a.hit)), h('span.atk-dmg', ...dmgText(a.dmg)));
    if (show('attack')) out.push(head('ATTACKS', 'การโจมตี', x.atkPer > 1 ? h('i.tag', `Extra Attack ×${x.atkPer}`) : null),
      h('div.card.list', h('div.atk.atk-head', h('small', 'อาวุธ'), h('small', 'HIT'), h('small', 'DAMAGE')), x.attacks.map(atk)),
      h('p.muted.small', x.atkPer > 1 ? `ใช้ Attack action หนึ่งครั้ง ตีได้ ${x.atkPer} ที · แตะอาวุธเพื่อดูสูตรทอยแบบละเอียด` : 'แตะอาวุธเพื่อดูสูตรทอยแบบละเอียด'));
    if (show('a')) {
      out.push(head('ACTION', 'ทำได้ 1 อย่างต่อเทิร์น'), h('div.titems',
        item({ name: 'Attack', tag: 'Action', s: x.atkPer > 1 ? `โจมตีด้วยอาวุธหรือมือเปล่า ${x.atkPer} ครั้ง` : 'โจมตีด้วยอาวุธหรือมือเปล่า 1 ครั้ง', open: () => go2('attack') }),
        x.casting.length ? item({ name: 'Magic', tag: 'Action', s: 'ร่ายเวทที่ใช้เวลาร่าย 1 Action — ดูได้ที่แท็บ SPELLS', open: () => go('spells') }) : null,
        fItems('a')),
      h('details.orig', h('summary', 'Action พื้นฐานที่ทุกคนทำได้ (Dash, Dodge, Hide…)'), h('div.titems', T.BASIC.map(b => item({ name: b[1], s: b[2], open: () => T.basicSheet(P, b, done) })))));
    }
    if (show('b')) {
      const light = x.attacks.filter(a => /\bLight\b/.test(a.props || '')).length >= 2;
      const list = [
        light ? item({ name: 'โจมตีมือรอง (Light)', tag: 'Bonus Action', s: 'หลังตีด้วยอาวุธ Light แล้ว ตีด้วยอาวุธ Light อีกมือได้ 1 ที (ดาเมจไม่บวกค่าพลัง ยกเว้นค่าติดลบ)', open: () => T.attackSheet(x, P, 'b', 'โจมตีมือรอง', done) }) : null,
        ...fItems('b')].filter(Boolean);
      out.push(head('BONUS ACTION', 'ทำได้ 1 อย่างต่อเทิร์น'), list.length ? h('div.titems', list) : h('p.muted.small', 'ตอนนี้ยังไม่มีอะไรที่ใช้ Bonus Action ได้ — จะมีเมื่อได้ฟีเจอร์หรือเวทที่บอกว่าใช้ Bonus Action'));
    }
    if (show('r')) out.push(head('REACTION', 'ใช้ได้ 1 ครั้งต่อรอบ แม้ไม่ใช่เทิร์นเรา'), h('div.titems',
      item({ name: 'Opportunity Attack', tag: 'Reaction', s: 'ศัตรูเดินออกจากระยะที่เราเอื้อมถึง → ตีมันได้ 1 ที', open: () => T.attackSheet(x, P, 'r', 'Opportunity Attack', done) }),
      fItems('r')));
    if (show('other')) {
      const once = T.onceItems(x);
      out.push(head('OTHER', 'อื่น ๆ'), h('div.titems',
        item({ name: 'หยิบ / ใช้ของชิ้นเล็ก', tag: 'ฟรี', s: 'ทุกเทิร์นทำเรื่องเล็ก ๆ ได้ฟรี 1 อย่าง เช่น ชักหรือเก็บอาวุธ เปิดประตู หยิบของจากพื้น' }),
        item({ name: 'พูด / ตะโกนสั้น ๆ', tag: 'ฟรี', s: 'พูดสั้น ๆ หรือส่งสัญญาณให้เพื่อนได้ ไม่เสีย Action' }),
        once.map(([, name, s]) => item({ name, tag: '1 ครั้งต่อเทิร์น', s })),
        x.cls?.id === 'barbarian' ? item({ name: 'ดาเมจตอน Rage', s: `ตอน Rage การโจมตีที่ใช้ STR ได้ดาเมจเพิ่ม ${x.cls.table.rows[x.CL - 1][4]}` }) : null));
    }
    if (show('limited')) {
      out.push(head('LIMITED USE', 'ใช้ได้จำกัดครั้ง'));
      if (!x.res.length) out.push(h('p.muted.small', 'ตอนนี้ไม่มีความสามารถที่ต้องนับจำนวนครั้ง'));
      else out.push(h('p.muted.small', 'ช่องสี่เหลี่ยม: กดแล้วระบายเต็ม = ใช้ไปแล้ว · กดช่องที่ระบายแล้วเพื่อคืน'), h('div.card.list', x.res.map(r => {
        const used = P.res[r.id] || 0;
        return h('div.res',
          h('span.res-ico', { html: iconSvg(r.icon) }),
          h('div.res-name', h('b', r.name), h('small', `${r.reset === 'long' ? 'คืนตอนพักยาว' : r.reset === 'short' ? 'คืนตอนพักสั้นหรือพักยาว' : 'พักสั้นคืน 1 · พักยาวคืนหมด'} · เหลือ ${r.max - used}/${r.max}`)),
          r.max > 8 ? h('div.res-num',
            h('button.icon-btn', { onclick: () => setUse(P.res, r.id, Math.min(r.max, used + 1), () => T.resUsed(P, r.id)), 'aria-label': 'ใช้ 1' }, '−'),
            h('b', `${r.max - used}`), h('small', `/${r.max}`),
            h('button.icon-btn', { onclick: () => { P.res[r.id] = Math.max(0, used - 1); done(); }, 'aria-label': 'คืน 1' }, '+'))
            : boxes(r.max, used, v => setUse(P.res, r.id, v, () => T.resUsed(P, r.id)), r.name));
      })));
    }
    if (F === 'all') out.push(howTo(x));
    return out;
  }
  function go2(f) { ui.act = f; redraw(); }

  // วิธีเล่น: เทิร์นหนึ่งทำอะไรได้ + ทิปมือใหม่ของทุกคลาสที่มี
  function howTo(x) {
    return h('details.orig.howto', h('summary', '🎓 วิธีเล่นเบื้องต้น'),
      h('div.md',
        h('p', h('b', 'ในเทิร์นของเรา ทำอะไรได้บ้าง')),
        h('ul',
          h('li', 'เดินได้ไกลสุดเท่ากับ Speed — จะเดินก่อน ระหว่าง หรือหลังทำอย่างอื่นก็ได้'),
          h('li', '1 Action — เช่น โจมตี ร่ายเวท Dash หรือ Dodge'),
          h('li', '1 Bonus Action — ใช้ได้เฉพาะตอนมีความสามารถหรือเวทที่เขียนว่าใช้ Bonus Action'),
          h('li', '1 Reaction ต่อรอบ — ใช้ตอนไม่ใช่เทิร์นเราก็ได้ เช่น Opportunity Attack'),
          h('li', 'ทำเรื่องเล็ก ๆ ได้ฟรี 1 อย่าง เช่น เปิดประตู ชักอาวุธ หรือพูดสั้น ๆ')),
        h('p.muted.small', 'กด ⚔️ เริ่มต่อสู้ ที่แถบด้านบน แล้วเว็บจะช่วยนับว่าเทิร์นนี้ใช้อะไรไปแล้ว และยังเหลืออะไรให้ใช้อีก')),
      Object.keys(x.CLs).map(id => {
        const t = D.th.classes?.[id];
        if (!t) return null;
        return h('div.howto-cls', h('h4', `${D.cls[id]?.name} — ${t.tag || ''}`), t.desc ? h('p', t.desc) : null,
          t.abilityTip ? h('p.tip', '📊 ' + t.abilityTip) : null,
          t.tips?.length ? h('ul', t.tips.map(z => h('li', z))) : null);
      }));
  }

  // ---------- SPELLS ----------
  function spells(x) {
    if (!x.casting.length) return [h('p.muted', 'ตัวละครนี้ยังไม่ได้ใช้เวท')];
    const out = [];
    const all = x.casting.flatMap(b => [...b.cantrips, ...b.always, ...b.prepared, ...(b.book || [])]).map(id => D.spell[id]).filter(Boolean);
    const lvs = [...new Set(all.map(s => s.level))].sort((a, b) => a - b);
    const q = h('input.inp.sp-q', { type: 'search', placeholder: 'ค้นหาสเปล (ชื่ออังกฤษหรือคำไทย)', value: ui.spQ, oninput: e => { ui.spQ = e.target.value; apply(); } });
    const chipBar = (opts, key) => h('div.chips.filter', opts.map(([id, l]) => h('button.chip' + (ui[key] === id ? '.on' : ''), { 'data-k': key, 'data-v': id, onclick: e => {
      ui[key] = ui[key] === id && key === 'spF' ? '' : id;
      e.currentTarget.parentNode.querySelectorAll('.chip').forEach(b => b.classList.toggle('on', ui[key] === b.dataset.v));
      apply();
    } }, l)));
    out.push(q, chipBar([['all', 'ทุกเลเวล'], ...lvs.map(l => [String(l), l ? `Lv ${l}` : 'Cantrip'])], 'spLv'),
      chipBar([['c', 'Concentration'], ['r', 'Ritual'], ['a', 'Action'], ['b', 'Bonus Action'], ['re', 'Reaction']], 'spF'));
    const empty = h('p.muted.small.sp-empty', 'ไม่เจอสเปลที่ตรงกับที่ค้นหา');
    for (const b of x.casting) {
      out.push(h('h2.sec', b.source), h('div.box3.spell-stats',
        box('SAVE DC', 'ความยากเซฟ', String(b.dc), null, () => explain('Spell Save DC', [
          h('div.formula', h('div.f-main', h('span', 'DC'), h('b', String(b.dc))), h('div.f-parts', h('span', '8 + ', h('b', sign(x.pb)), ' (Prof) + ', h('b', sign(x.m[b.ab])), ` (${ABIL_SHORT[b.ab]})`))),
          h('p', 'เวลาเราร่ายเวทที่ให้ศัตรูทอยเซฟ ให้บอก DM ว่า DC เท่านี้ — ศัตรูต้องทอยให้ได้เท่านี้หรือมากกว่าถึงจะรอด')])),
        box('SPELL ATTACK', 'โจมตีด้วยเวท', sign(b.atk), null, () => explain('Spell Attack', [
          formula('ทอยโจมตีด้วยเวท', b.atk, [['Proficiency', x.pb], [ABIL_SHORT[b.ab], x.m[b.ab]]]),
          h('p', 'ใช้กับเวทที่เขียนว่า "make a spell attack" เช่น Fire Bolt — ทอยแล้วบอก DM ว่าได้เท่าไหร่ เหมือนการตีด้วยอาวุธ')])),
        box('ABILITY', 'ค่าที่ใช้ร่าย', ABIL_SHORT[b.ab], null, () => abilInfo(b.ab, x))));
      if (Object.keys(b.slots).length) {
        out.push(head('SPELL SLOTS', 'ช่องเวท · กดแล้ว = ใช้ไปแล้ว'));
        if (b.casterLv) out.push(h('p.muted.small', `สลอตรวมจาก Multiclass (caster level ${b.casterLv}) — ทุกคลาสใช้สลอตกองเดียวกัน`));
        out.push(h('div.card.list', Object.entries(b.slots).map(([lv0, n]) => {
          const lv = (b.pact ? 'p' : '') + lv0, used = P.slots[lv] || 0;
          return h('div.res', h('div.res-name', h('b', `${b.pact ? 'Pact Slot' : 'Level'} ${lv0}`), h('small', `เหลือ ${n - used}/${n} · ${b.pact ? 'คืนตอนพักสั้นหรือพักยาว' : 'คืนตอนพักยาว'}`)),
            boxes(n, used, v => setUse(P.slots, lv, v, () => T.slot(P)), `slot ${lv}`));
        })));
      }
      const group = (title, ids, badge) => {
        const ss = ids.map(id => D.spell[id]).filter(Boolean).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
        if (!ss.length) return null;
        return h('div.sp-group', title ? h('h4.lv', title) : null, h('div.spell-list', ss.map(s => {
          const row = spellRow(s, { badge: badge || LEVEL_TH(s.level), actions: () => T.castActions(s, x, P, done) });
          Object.assign(row.dataset, { lv: s.level, c: s.concentration ? 1 : '', r: s.ritual ? 1 : '', t: T.castKind(s) || '', q: `${s.name} ${D.th.spells?.[s.id] || ''}`.toLowerCase() });
          return row;
        })));
      };
      out.push(group('Cantrips', b.cantrips, 'Cantrip'), group('เตรียมไว้เสมอ', b.always, 'ติดตัว'), group(b.book ? 'เตรียมไว้วันนี้' : 'เวทที่เตรียมไว้', b.prepared));
      if (b.book?.length) out.push(h('details.orig.sp-book', h('summary', `สมุดเวท (${b.book.length})`), group('', b.book)));
      if (!b.fixed) out.push(h('button.btn.ghost', { onclick: () => nav(`#/edit/${c.id}/spells`) }, '✏️ เปลี่ยนเวท'));
    }
    out.push(empty);
    function apply() {
      const body = root.querySelector('.sh-body'), qq = ui.spQ.trim().toLowerCase();
      let any = 0;
      body.querySelectorAll('.spell-row').forEach(r => {
        const d = r.dataset, F = ui.spF;
        const ok = (!qq || d.q.includes(qq)) && (ui.spLv === 'all' || d.lv === ui.spLv)
          && (!F || (F === 'c' ? d.c : F === 'r' ? d.r : F === 're' ? d.t === 'r' : d.t === F));
        r.hidden = !ok; any += ok;
      });
      body.querySelectorAll('.sp-group').forEach(g => { g.hidden = !g.querySelector('.spell-row:not([hidden])'); });
      const filtering = qq || ui.spLv !== 'all' || ui.spF;
      body.querySelectorAll('.sp-book').forEach(d => { if (filtering && d.querySelector('.spell-row:not([hidden])')) d.open = true; });
      empty.hidden = !!any;
    }
    requestAnimationFrame(apply);
    return out;
  }

  // ---------- INVENTORY ----------
  function inventory(x) {
    const e = c.equipment;
    const coin = (k, label) => h('label.coin', h('small', label), h('input.inp.num', { type: 'number', inputmode: 'numeric', value: e[k] || 0, onchange: ev => { e[k] = parseInt(ev.target.value, 10) || 0; save(); } }));
    const name = h('input.inp', { placeholder: 'เพิ่มของ เช่น Potion of Healing', 'aria-label': 'ชื่อของ' });
    return [
      head('CURRENCY', 'เงิน'),
      h('div.coins', coin('pp', 'PP'), coin('gp', 'GP'), coin('ep', 'EP'), coin('sp', 'SP'), coin('cp', 'CP')),
      head('EQUIPMENT', 'ของที่พกอยู่'),
      h('p.muted.small', `ตอนนี้สวม: ${x.acNote} → AC ${x.ac}`),
      h('div.card.list', e.items.map((it, i) => h('div.item-row',
        h('b', it.name), it.weapon ? h('i.tag', 'อาวุธ') : null, it.armor ? h('i.tag', 'เกราะ') : null,
        h('div.qty',
          h('button.icon-btn', { 'aria-label': 'ลด', onclick: () => { it.qty--; if (it.qty <= 0) e.items.splice(i, 1); e.touched = true; done(); } }, '−'),
          h('span', String(it.qty)),
          h('button.icon-btn', { 'aria-label': 'เพิ่ม', onclick: () => { it.qty++; done(); } }, '+'))))),
      h('div.row', name, h('button.btn.primary', { onclick: () => {
        const n = name.value.trim(); if (!n) return;
        const w = D.weapons.find(z => z.name.toLowerCase() === n.toLowerCase());
        e.items.push({ name: w?.name || n, qty: 1, weapon: w?.id });
        done();
      } }, 'เพิ่ม')),
      h('p.muted.small', '💡 ถ้าเป็นอาวุธ ให้พิมพ์ชื่อภาษาอังกฤษให้ตรง (เช่น Longsword) แล้วอาวุธจะขึ้นในช่องโจมตีให้เอง'),
    ];
  }

  // ---------- FEATURES & TRAITS ----------
  function features(x) {
    const F = ui.feat, show = k => F === 'all' || F === k;
    const out = [h('div.chips.filter', [['all', 'ทั้งหมด'], ['class', 'Class'], ['species', 'Species'], ['feats', 'Feats']].map(([id, l]) => h('button.chip' + (F === id ? '.on' : ''), { onclick: () => { ui.feat = id; redraw(); } }, l)))];
    if (show('class') && x.cls) {
      out.push(h('button.btn.primary.lvup-btn', { onclick: () => openLevelUp(c, () => { S.save(c); redraw(); }) }, `⬆️ เลเวลอัป (→ Lv ${c.level + 1})`));
      out.push(h('h2.sec', `${x.cls.name} ${x.CL}`));
      for (const f of x.feats) out.push(classFeatureCard(x.cls, f, f.src === 'sub'));
      if (x.CL >= 3 && x.sub?.stub) out.push(stubSubBox(x.sub, x.cls.id));
      const ch = c.choices || {};
      const chS = x.CLs.sorcerer ? chOf(c, 'sorcerer') : {}, chW = x.CLs.warlock ? chOf(c, 'warlock') : {};
      const opts = [...(chS.metamagic || []).map(id => D.cls.sorcerer.options['metamagic-options']?.items.find(i => i.id === id)), ...(chW.invocations || []).map(id => D.cls.warlock.options['eldritch-invocation-options']?.items.find(i => i.id === id))].filter(Boolean);
      if (opts.length) { out.push(h('h3', 'ตัวเลือกที่เลือกไว้')); opts.forEach(o => out.push(featureCard({ name: o.name, text: o.text, th: { s: D.th.options?.[o.id] }, full: ['options', o.id] }))); }
      if (ch.huntersPrey && x.sub === x.cls.subclass) out.push(h('p', h('b', "Hunter's Prey: "), ch.huntersPrey));
      if (ch.divineOrder || ch.primalOrder) out.push(h('p', h('b', 'บทบาท: '), ch.divineOrder || ch.primalOrder));
      if (x.masteryIds.length) out.push(h('p', h('b', 'Weapon Mastery: '), x.masteryIds.map(id => `${D.weapon[id]?.name} (${D.weapon[id]?.mastery})`).join(', ')));
      for (const mc of x.mcFeats) {
        out.push(h('h2.sec', `${mc.cls.name} ${mc.n}`), h('p.muted.small', `Multiclass${mc.n >= 3 ? ` · ซับคลาส ${mc.sub.name}` : ''}`));
        for (const f of mc.feats) out.push(classFeatureCard(mc.cls, f, f.src === 'sub'));
        if (mc.n >= 3 && mc.sub?.stub) out.push(stubSubBox(mc.sub, mc.cls.id));
      }
      if (c.level > 1) out.push(h('details.orig', h('summary', `ประวัติเลเวล (${c.level})`),
        h('ol.lv-hist', levelInfo(c).map(li => h('li', levelSummary(c, li, x))))));
    }
    if (show('species') && x.sp) {
      out.push(h('h2.sec', x.sp.name));
      for (const t of x.sp.traits) out.push(featureCard({ name: t.name, text: t.text, th: D.th.species?.[x.sp.id]?.f?.[t.id], full: ['species', [x.sp.id, t.id]] }));
    }
    if (show('feats') && x.featIds.length) {
      out.push(h('h2.sec', 'Feats'));
      for (const id of new Set(x.featIds)) { const f = D.feat[id]; if (f) out.push(featureCard({ name: f.name, text: f.text, th: D.th.feats?.[id], tag: f.category, full: ['feats', id], pack: f.pack })); }
    }
    return out;
  }

  // ---------- BACKGROUND ----------
  const field = (k, label, opt = {}) => h('label.fld', h('small', label), opt.rows
    ? h('textarea.inp', { rows: opt.rows, placeholder: opt.ph || '', oninput: e => { Dt[k] = e.target.value; save(); } }, Dt[k] || '')
    : h('input.inp', { value: Dt[k] || '', placeholder: opt.ph || '', list: opt.list, oninput: e => { Dt[k] = e.target.value; save(); } }));

  function background(x) {
    const out = [];
    if (x.bg) {
      const th = D.th.backgrounds?.[x.bg.id];
      out.push(head('BACKGROUND', 'ภูมิหลัง'), h('div.card',
        h('b', x.bg.name), x.bg.pack ? h('span.pack-badge', '📦 ' + x.bg.pack) : null,
        th?.s ? h('p.th', th.s) : null,
        h('dl.kv',
          h('dt', 'ค่าพลังที่ได้โบนัส'), h('dd', (x.bg.abilities || []).join(', ')),
          h('dt', 'Skills'), h('dd', x.bg.skills.join(', ')),
          x.bg.tool ? [h('dt', 'Tool'), h('dd', x.bg.tool.replace(/\s*\(see.*?\)/g, ''))] : null,
          h('dt', 'Origin Feat'), h('dd', x.bg.feat))));
    } else out.push(h('p.muted', 'ยังไม่ได้เลือก Background'));
    const al = h('p.muted.small', ALIGN.find(a => a[0] === Dt.alignment)?.[1] || '');
    out.push(head('CHARACTER DETAILS', 'รายละเอียดตัวละคร'), h('div.card.details',
      h('label.fld', h('small', 'Alignment (แนวทางนิสัย)'), h('select.inp', { onchange: e => { Dt.alignment = e.target.value; al.textContent = ALIGN.find(a => a[0] === Dt.alignment)?.[1] || ''; save(); } },
        h('option', { value: '' }, '— ยังไม่เลือก —'), ALIGN.map(([n]) => h('option', { value: n, selected: Dt.alignment === n }, n)))),
      al,
      field('faith', 'ความเชื่อ / เทพที่นับถือ'),
      field('lifestyle', 'ไลฟ์สไตล์ (ใช้ชีวิตหรูแค่ไหน)', { list: 'dl-life' }),
      h('datalist#dl-life', LIFESTYLE.map(v => h('option', { value: v })))),
      head('APPEARANCE', 'รูปลักษณ์'), h('div.card.details.grid2',
        field('gender', 'เพศ / สรรพนาม'), field('age', 'อายุ'), field('height', 'ส่วนสูง'), field('weight', 'น้ำหนัก'),
        field('eyes', 'สีตา'), field('hair', 'ผม'), field('skin', 'ผิว'),
        h('div.span2', field('appearance', 'รูปร่างหน้าตาโดยรวม', { rows: 3, ph: 'เช่น ตัวสูงใหญ่ มีแผลเป็นที่แก้มซ้าย ชอบใส่ผ้าคลุมสีแดง' }))),
      head('PERSONALITY', 'นิสัยใจคอ'), h('div.card.details',
        field('traits', 'Personality Traits — นิสัยที่คนอื่นเห็นชัด ๆ', { rows: 2 }),
        field('ideals', 'Ideals — สิ่งที่เชื่อและยึดถือ', { rows: 2 }),
        field('bonds', 'Bonds — คน สถานที่ หรือสิ่งที่ผูกพัน', { rows: 2 }),
        field('flaws', 'Flaws — จุดอ่อนหรือนิสัยเสีย', { rows: 2 })),
      head('BACKSTORY', 'ประวัติความเป็นมา'), h('div.card.details', field('backstory', '', { rows: 6, ph: 'เกิดที่ไหน ทำไมถึงออกผจญภัย…' })),
      built(x));
    return out;
  }

  // ตัวละครนี้สร้างมายังไง (สรุปทุกอย่างที่เลือกในวิซาร์ด)
  function built(x) {
    const A = c.abilities || {}, rows = [];
    const row = (k, v) => v && rows.push(h('dt', k), h('dd', v));
    const join = a => a.filter(Boolean).join(' · ');
    const names = (ids, f) => (ids || []).map(f).filter(Boolean).join(', ');
    const METH = { standard: 'ชุดมาตรฐาน', pointbuy: 'ซื้อแต้ม', roll: 'ทอยเต๋า' };
    row('ค่าพลังตั้งต้น', `${METH[A.method || 'standard']}: ` + ABIL.map(a => `${ABIL_SHORT[a]} ${A.base?.[a] ?? 10}`).join(' '));
    row(`โบนัส ${x.bg?.name || 'Background'}`, Object.entries(A.bonus || {}).filter(([, n]) => n).map(([a, n]) => `${ABIL_SHORT[a]} +${n}`).join(' '));
    row('ASI / Feat', levelInfo(c).filter(li => (li.asi || li.boon) && li.e.feat).map(li => `Lv ${li.lv} ${D.feat[li.e.feat]?.name || li.e.feat}` +
      Object.entries(li.e.asi || {}).filter(([, n]) => n).map(([a, n]) => ` ${ABIL_SHORT[a]}+${n}`).join('')).join(' · '));
    row('ค่าพลังตอนนี้', ABIL.map(a => `${ABIL_SHORT[a]} ${x.score[a]}`).join(' '));
    for (const [id, n] of Object.entries(x.CLs)) {
      const k = D.cls[id], ch = chOf(c, id), primary = id === c.classId;
      const sub = primary ? x.sub : x.mcFeats.find(m => m.cls.id === id)?.sub;
      const opt = (key, list) => names(ch[key], o => D.cls[id].options?.[list]?.items.find(i => i.id === o)?.name);
      row(`${k?.name} ${n}`, join([
        n >= 3 && sub ? `ซับคลาส ${sub.name}` : null,
        (primary ? c.skills : c.mc?.[id]?.skills)?.length ? 'สกิล ' + (primary ? c.skills : c.mc[id].skills).join(', ') : null,
        ch.fightingStyle ? 'Fighting Style ' + (D.feat[ch.fightingStyle]?.name || ch.fightingStyle) : null,
        ch.divineOrder || ch.primalOrder ? 'บทบาท ' + (ch.divineOrder || ch.primalOrder) : null,
        ch.mastery?.length ? 'Mastery ' + names(ch.mastery, w => D.weapon[w]?.name) : null,
        ch.expertise?.length ? 'Expertise ' + ch.expertise.join(', ') : null,
        ch.primalSkill ? 'Primal Knowledge ' + ch.primalSkill : null,
        ch.loreSkills?.length ? 'Bonus Proficiencies ' + ch.loreSkills.join(', ') : null,
        ch.land ? 'ดินแดน ' + ch.land : null,
        ch.huntersPrey ? "Hunter's Prey " + ch.huntersPrey : null,
        ch.metamagic?.length ? 'Metamagic ' + opt('metamagic', 'metamagic-options') : null,
        ch.invocations?.length ? 'Invocations ' + opt('invocations', 'eldritch-invocation-options') : null,
        ...Object.values(ch.packOpt || {}).map(v => 'เลือก ' + v)]));
    }
    if (x.bg) row(x.bg.name, join([`สกิล ${x.bg.skills.join(', ')}`, x.bg.tool ? 'เครื่องมือ ' + x.bg.tool.replace(/\s*\(see.*?\)/g, '') : null, 'Origin Feat ' + x.bg.feat]));
    if (x.sp) row(x.sp.name, join(Object.entries(c.speciesOpt || {}).map(([k2, v]) => (k2 === 'feat' ? 'Origin Feat ' + (D.feat[v]?.name || v) : k2 === 'skill' ? 'สกิล ' + v : typeof v === 'string' ? v : null))));
    row('ภาษา', x.langs.join(', '));
    return h('details.orig.built', h('summary', '🧾 ตัวละครนี้สร้างมายังไง'), h('dl.kv', rows),
      h('button.btn.ghost.small', { onclick: () => nav(`#/edit/${c.id}/basic`) }, '✏️ แก้ไขตัวเลือก'));
  }

  // ---------- NOTES ----------
  function notes() {
    return [
      head('ADVENTURE NOTES', 'โน้ตการผจญภัย'),
      h('textarea.inp', { rows: 10, placeholder: 'ชื่อ NPC เควสที่รับมา ของที่ได้ เบาะแสที่เจอ…', oninput: e => { c.notes = e.target.value; save(); } }, c.notes || ''),
      head('ORGANIZATIONS', 'องค์กร / กลุ่มที่สังกัด'), field('orgs', '', { rows: 3 }),
      head('ALLIES', 'พันธมิตร'), field('allies', '', { rows: 3 }),
      head('ENEMIES', 'ศัตรู'), field('enemies', '', { rows: 3 }),
      head('OTHER', 'อื่น ๆ'), field('other', '', { rows: 3 }),
    ];
  }

  draw();
}
