// อภิธานศัพท์ (#/glossary) + แตะคำในคำอธิบายเพื่อดูความหมาย
import { D, loadFull } from '../data.js';
import { h, sheet } from '../util.js';
import { original, fullTh } from './parts.js';

const TAG_TH = { '': 'ทั้งหมด', Condition: 'Condition', Action: 'Action', 'Area of Effect': 'พื้นที่ผล', Hazard: 'ภัย', Attitude: 'ท่าที' };

/** การ์ดคำศัพท์ — hasFull บอกว่ามีคำแปลเต็มไหม (ไม่รู้ = แสดงกล่องไว้ก่อน) */
function termCard(g, hasFull = true) {
  const th = D.th.glossary?.[g.id] || {};
  return h('article.feat.gl-card', { id: 'gl-' + g.id },
    h('header', h('div.feat-title', h('b', g.name), h('small', [th.n, g.tag].filter(Boolean).join(' · ')))),
    th.s ? h('p.th', th.s) : null,
    hasFull ? fullTh('glossary', g.id) : null,
    original(g.text));
}

/** หน้าต่างล่างตอนแตะคำ */
export function showTerm(id) {
  const g = D.glossaryById?.[id];
  if (!g) return;
  sheet(g.name, termCard(g), [{ label: 'ดูในอภิธานศัพท์', onClick: () => { location.hash = '#/glossary/' + id; } }]);
}

export async function renderGlossary(root, focus) {
  const full = await loadFull('glossary');
  let q = '', tag = '';
  const list = h('div.gl-list');
  const count = h('p.muted.small');
  const draw = () => {
    const s = q.trim().toLowerCase();
    const items = D.glossary.filter(g => (!tag || g.tag === tag) && (!s ||
      g.name.toLowerCase().includes(s) || (D.th.glossary?.[g.id]?.n || '').includes(s) || (D.th.glossary?.[g.id]?.s || '').toLowerCase().includes(s)));
    count.textContent = `${items.length} คำ` + (Object.keys(full).length ? ` · แปลเต็มแล้ว ${Object.keys(full).length} คำ` : '');
    list.replaceChildren(...items.map(g => termCard(g, !!full[g.id])));
  };
  const tags = Object.keys(TAG_TH);
  const tagRow = h('div.chips', tags.map(t => h('button.chip' + (t === tag ? '.on' : ''), {
    type: 'button', onclick: e => { tag = t; tagRow.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === e.currentTarget)); draw(); },
  }, TAG_TH[t])));
  root.replaceChildren(h('section.prose.glossary',
    h('h1', 'อภิธานศัพท์'),
    h('p.muted', 'ศัพท์กฎจาก SRD 5.2.1 — พิมพ์ค้นได้ทั้งไทยและอังกฤษ ในหน้าอื่นแตะคำที่มีเส้นประใต้เพื่อดูความหมายได้'),
    h('input.gl-search', { type: 'search', placeholder: 'ค้นหา เช่น Advantage, ได้เปรียบ, สมาธิ', oninput: e => { q = e.target.value; draw(); } }),
    tagRow, count, list));
  draw();
  if (focus) {
    const el = document.getElementById('gl-' + focus);
    if (el) { el.classList.add('hl'); el.scrollIntoView({ block: 'center' }); el.querySelector('details.full')?.setAttribute('open', ''); }
  }
}

// ---------------- แตะคำเพื่อดูความหมาย ----------------
// คำที่ลิงก์ (ใช้ชื่ออังกฤษตัวพิมพ์ใหญ่ตามกฎ) — ไม่เอาคำกว้าง ๆ อย่าง Action, Damage, Spell
const LINK_IDS = ['advantage', 'disadvantage', 'd20-test', 'saving-throw', 'proficiency', 'expertise', 'concentration', 'bonus-action',
  'reaction', 'opportunity-attacks', 'cover', 'difficult-terrain', 'temporary-hit-points', 'resistance', 'vulnerability', 'immunity',
  'critical-hit', 'attunement', 'ritual', 'emanation', 'sphere', 'cone', 'cube', 'cylinder', 'line', 'heavily-obscured', 'lightly-obscured',
  'dim-light', 'bright-light', 'darkvision', 'blindsight', 'truesight', 'tremorsense', 'short-rest', 'long-rest', 'heroic-inspiration',
  'unarmed-strike', 'death-saving-throw', 'stable', 'bloodied', 'initiative', 'hit-point-dice', 'spellcasting-focus', 'cantrip',
  'difficulty-class', 'passive-perception', 'grappling', 'teleportation', 'burning', 'falling', 'suffocation'];
const ACTION_IDS = ['attack', 'dash', 'disengage', 'dodge', 'help', 'hide', 'influence', 'magic', 'ready', 'search', 'study', 'utilize'];
// รูปแบบอื่นของคำ (พหูพจน์/ชื่อย่อ)
const ALIAS = {
  'saving-throw': ['Saving Throws', 'saving throws', 'saving throw'], 'opportunity-attacks': ['Opportunity Attack'],
  'cover': ['Half Cover', 'Three-Quarters Cover', 'Total Cover'], 'temporary-hit-points': ['Temporary Hit Point'],
  'critical-hit': ['Critical Hits'], 'hit-point-dice': ['Hit Point Die', 'Hit Dice', 'Hit Die'], 'death-saving-throw': ['Death Saving Throws', 'Death Save'],
  'd20-test': ['D20 Tests'], 'cantrip': ['cantrips', 'cantrip'], 'difficulty-class': ['DC'], 'spellcasting-focus': ['Spellcasting Focus'],
  'resistance': ['Resistances'], 'immunity': ['Immunities'], 'vulnerability': ['Vulnerabilities'], 'falling': ['Falling'],
};

let RX = null, MAP = null;
function build() {
  MAP = new Map();
  const add = (word, id) => { if (!MAP.has(word)) MAP.set(word, id); };
  for (const id of LINK_IDS) { const g = D.glossaryById[id]; if (!g) continue; add(g.name, id); (ALIAS[id] || []).forEach(a => add(a, id)); }
  for (const g of D.glossary) if (g.tag === 'Condition') add(g.name, g.id);
  for (const id of ACTION_IDS) { const g = D.glossaryById[id]; if (g) add(g.name + ' action', id); }
  const words = [...MAP.keys()].sort((a, b) => b.length - a.length).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  RX = new RegExp(`(?<![A-Za-z-])(${words.join('|')})(?![A-Za-z])`, 'g');
}

const SKIP = 'summary, button, a, .gl, h1, h2, h3, h5, .feat-title, .gl-card header, input, textarea';

/** ใส่เส้นประใต้คำศัพท์ในกล่องข้อความ (ครั้งแรกต่อคำในแต่ละกล่อง) */
export function linkTerms(el) {
  if (!D.glossaryById || el.dataset.gl) return;
  if (!RX) build();
  el.dataset.gl = '1';
  const seen = new Set();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (n.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    const t = n.nodeValue;
    RX.lastIndex = 0;
    let m, last = 0, frag = null;
    while ((m = RX.exec(t))) {
      const id = MAP.get(m[1]);
      if (seen.has(id)) continue;
      seen.add(id);
      frag ||= document.createDocumentFragment();
      frag.append(t.slice(last, m.index), h('span.gl', { role: 'button', tabindex: '0', 'data-gl': id }, m[1]));
      last = m.index + m[1].length;
    }
    if (frag) { frag.append(t.slice(last)); n.replaceWith(frag); }
  }
}

const TARGETS = '.md, p.th, p.tip, .opt p, .mastery-list li';
/** เฝ้าดู DOM แล้วลิงก์คำให้อัตโนมัติ + จับการแตะ */
export function initGlossaryLinks() {
  let queued = false;
  const run = () => { queued = false; document.querySelectorAll(TARGETS).forEach(el => { if (!el.closest('.gl-card')) linkTerms(el); }); };
  new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(run); } })
    .observe(document.body, { childList: true, subtree: true });
  run();
  const open = e => {
    const t = e.target.closest?.('.gl');
    if (!t) return;
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault(); e.stopPropagation();
    showTerm(t.dataset.gl);
  };
  document.addEventListener('click', open, true);
  document.addEventListener('keydown', open, true);
}

