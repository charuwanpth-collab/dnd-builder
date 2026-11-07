// คลังไอคอนเต็ม game-icons.net (4,134 รูป, CC BY 3.0) — โหลดครั้งแรกตอนเปิดหน้าต่างเลือก
// ไอคอนที่เลือกเก็บเป็น {n: ชื่อ, d: path} ไว้ในตัวละคร/ไอเทม → แสดงได้ทันทีโดยไม่ต้องโหลดคลัง
import { h, iconSvg, sheet, toast } from './util.js';

let LIB = null;
export function loadIconLib() {
  return (LIB ||= fetch('data/icons-all.json').then(r => { if (!r.ok) throw new Error('โหลดคลังไอคอนไม่ได้'); return r.json(); })
    .then(o => ({ names: Object.keys(o), d: o })).catch(e => { LIB = null; throw e; }));
}

/** คำค้นภาษาไทย → คำในชื่อไอคอน (อังกฤษ) */
const TH = {
  'ดาบ': ['sword', 'sabre', 'blade', 'katana', 'rapier', 'scimitar'], 'มีด': ['knife', 'dagger'], 'กริช': ['dagger'],
  'ขวาน': ['axe'], 'ค้อน': ['hammer', 'mace'], 'กระบอง': ['mace', 'club', 'flail'], 'หอก': ['spear', 'trident', 'pike', 'halberd'],
  'ธนู': ['bow', 'arrow'], 'ลูกศร': ['arrow'], 'หน้าไม้': ['crossbow'], 'ปืน': ['gun', 'pistol', 'musket', 'rifle'],
  'โล่': ['shield'], 'เกราะ': ['armor', 'breastplate', 'chainmail', 'mail'], 'หมวก': ['helm', 'hat', 'hood'], 'ถุงมือ': ['gauntlet', 'glove'],
  'รองเท้า': ['boot', 'shoe'], 'เสื้อ': ['shirt', 'robe', 'tunic', 'cloak'], 'ผ้าคลุม': ['cloak', 'cape', 'hood'],
  'คทา': ['staff', 'wand', 'sceptre', 'scepter'], 'ไม้เท้า': ['staff', 'cane'], 'มงกุฎ': ['crown', 'tiara'],
  'แหวน': ['ring'], 'สร้อย': ['necklace', 'pendant', 'amulet'], 'เครื่องราง': ['amulet', 'charm', 'totem', 'talisman'],
  'อัญมณี': ['gem', 'crystal', 'diamond', 'emerald', 'ruby'], 'คริสตัล': ['crystal'], 'เหรียญ': ['coin', 'medal'], 'เงิน': ['coin', 'money', 'cash'],
  'ทอง': ['gold', 'coin'], 'สมบัติ': ['treasure', 'chest', 'loot'], 'หีบ': ['chest', 'crate'], 'กระเป๋า': ['bag', 'backpack', 'pouch', 'satchel'],
  'ยา': ['potion', 'flask', 'pill', 'vial'], 'ขวด': ['bottle', 'flask', 'vial', 'potion'], 'คัมภีร์': ['scroll', 'book', 'tome'],
  'หนังสือ': ['book', 'tome', 'spellbook'], 'ม้วน': ['scroll'], 'แผนที่': ['map', 'compass'], 'กุญแจ': ['key', 'lock'],
  'คบเพลิง': ['torch'], 'ตะเกียง': ['lantern', 'lamp'], 'เชือก': ['rope'], 'เต็นท์': ['tent', 'camp'], 'อาหาร': ['meat', 'bread', 'food', 'apple', 'cheese'],
  'เครื่องดนตรี': ['lute', 'harp', 'drum', 'flute', 'horn', 'violin'], 'พิณ': ['lute', 'harp', 'lyre'], 'กลอง': ['drum'], 'เต๋า': ['dice', 'die', 'd10', 'd12', 'd4'],
  'ไฟ': ['fire', 'flame', 'burn', 'torch'], 'น้ำ': ['water', 'wave', 'drop'], 'น้ำแข็ง': ['ice', 'frost', 'snow', 'frozen'], 'สายฟ้า': ['lightning', 'thunder', 'bolt'],
  'ลม': ['wind', 'tornado', 'whirlwind'], 'ดิน': ['earth', 'rock', 'stone'], 'หิน': ['rock', 'stone', 'boulder'], 'พิษ': ['poison', 'toxic', 'venom'],
  'แสง': ['light', 'sun', 'shine', 'glow', 'aura'], 'ความมืด': ['dark', 'shadow', 'night'], 'เงา': ['shadow'], 'ดวงอาทิตย์': ['sun'], 'ดวงจันทร์': ['moon'],
  'ดาว': ['star'], 'เวท': ['magic', 'spell', 'rune', 'wand', 'sparkles'], 'เวทมนตร์': ['magic', 'spell', 'rune'], 'รูน': ['rune'], 'คาถา': ['spell', 'scroll'],
  'มังกร': ['dragon', 'wyvern'], 'ปีศาจ': ['demon', 'devil', 'imp', 'fiend'], 'นางฟ้า': ['angel', 'fairy'], 'ผี': ['ghost', 'spirit', 'specter'],
  'ซอมบี้': ['zombie', 'undead'], 'โครงกระดูก': ['skeleton', 'skull', 'bone'], 'กะโหลก': ['skull'], 'กระดูก': ['bone'],
  'หมาป่า': ['wolf'], 'หมา': ['dog', 'hound', 'wolf'], 'แมว': ['cat', 'lion', 'tiger'], 'สิงโต': ['lion'], 'เสือ': ['tiger', 'panther'],
  'หมี': ['bear'], 'นก': ['bird', 'raven', 'eagle', 'owl', 'crow', 'hawk'], 'นกฮูก': ['owl'], 'อีกา': ['raven', 'crow'], 'อินทรี': ['eagle', 'hawk'],
  'ม้า': ['horse', 'unicorn', 'pegasus'], 'งู': ['snake', 'serpent', 'cobra'], 'แมงมุม': ['spider'], 'ปลา': ['fish', 'shark'], 'ค้างคาว': ['bat'],
  'กวาง': ['deer', 'stag'], 'ต้นไม้': ['tree', 'oak', 'pine'], 'ใบไม้': ['leaf', 'leaves'], 'ดอกไม้': ['flower', 'rose', 'lotus'], 'เห็ด': ['mushroom'],
  'ภูเขา': ['mountain'], 'ปราสาท': ['castle', 'tower', 'fort'], 'บ้าน': ['house', 'cabin', 'home'], 'โบสถ์': ['church', 'temple', 'shrine'],
  'เรือ': ['ship', 'boat'], 'หัวใจ': ['heart'], 'โล่หัวใจ': ['heart-shield'], 'ตา': ['eye'], 'มือ': ['hand', 'fist'], 'หมัด': ['fist', 'punch'],
  'ปีก': ['wing'], 'เขา': ['horn', 'antler'], 'หน้ากาก': ['mask'], 'คน': ['person', 'man', 'woman', 'character'], 'นักรบ': ['warrior', 'knight', 'viking', 'barbarian'],
  'อัศวิน': ['knight', 'paladin'], 'พ่อมด': ['wizard', 'mage', 'witch'], 'แม่มด': ['witch'], 'นักบวช': ['priest', 'monk', 'cleric'], 'โจร': ['thief', 'rogue', 'hood', 'bandit'],
  'นักล่า': ['hunter', 'archer', 'trap'], 'กับดัก': ['trap'], 'ระเบิด': ['bomb', 'explosion', 'blast'], 'เลือด': ['blood', 'bleed'], 'ความตาย': ['death', 'skull', 'grave', 'tomb'],
  'ป้องกัน': ['shield', 'guard', 'protect'], 'โจมตี': ['strike', 'slash', 'attack', 'hit'], 'วิ่ง': ['run', 'sprint'], 'กระโดด': ['jump', 'leap'], 'ซ่อน': ['hidden', 'sneak', 'invisible'],
  'รักษา': ['heal', 'health', 'cure', 'bandage'], 'นอน': ['sleep', 'bed', 'night'], 'ดนตรี': ['music', 'note', 'lute'], 'ทะเล': ['sea', 'wave', 'anchor'], 'สมอ': ['anchor'],
};
const isThai = s => /[฀-๿]/.test(s);

function search(lib, q) {
  q = q.trim().toLowerCase();
  if (!q) return lib.names;
  let terms;
  if (isThai(q)) {
    terms = [...new Set(Object.entries(TH).filter(([k]) => k.includes(q) || q.includes(k)).flatMap(([, v]) => v))];
    if (!terms.length) return [];
    return lib.names.filter(n => terms.some(t => n.split('-').includes(t) || n.includes(t)))
      .sort((a, b) => rank(a, terms) - rank(b, terms));
  }
  const words = q.split(/[\s,]+/).filter(Boolean);
  return lib.names.filter(n => words.every(w => n.includes(w))).sort((a, b) => rank(a, words) - rank(b, words));
}
// ชื่อที่ตรงทั้งคำมาก่อน ชื่อสั้นมาก่อน
const rank = (n, terms) => (terms.some(t => n === t) ? 0 : terms.some(t => n.split('-').includes(t)) ? 1 : 2) * 1000 + n.length;

const RECENT = 'hh.iconRecent';
const recent = () => { try { return JSON.parse(localStorage.getItem(RECENT)) || []; } catch { return []; } };
function pushRecent(v) {
  try { localStorage.setItem(RECENT, JSON.stringify([v, ...recent().filter(x => x.n !== v.n)].slice(0, 16))); } catch { /* ไม่เป็นไร */ }
}

/** หน้าต่างเลือกไอคอน — onPick({n, d}) หรือ onPick(null) = กลับเป็นค่าเริ่มต้น */
export function openIconPicker({ title = 'เลือกไอคอน', current, fallback, onPick }) {
  const PAGE = 120;
  let lib = null, list = [], shown = 0;
  const grid = h('div.ico-grid'), more = h('button.btn.ico-more', { onclick: () => draw(false) }, 'ดูเพิ่ม');
  const info = h('p.muted.small.ico-info', 'กำลังโหลดคลังไอคอน…');
  const q = h('input.inp', { type: 'search', placeholder: 'ค้นหา เช่น ดาบ, มังกร, fire, skull', 'aria-label': 'ค้นหาไอคอน', disabled: true,
    oninput: () => { clearTimeout(q.t); q.t = setTimeout(() => { list = search(lib, q.value); draw(true); }, 150); } });
  const pick = v => { if (v) pushRecent(v); onPick(v); close(); };
  const cell = v => h('button.ico-cell' + (current?.n === v.n ? '.on' : ''), { type: 'button', title: v.n, 'aria-label': v.n, onclick: () => pick(v),
    html: iconSvg(v) });
  function draw(reset) {
    if (reset) { grid.replaceChildren(); shown = 0; }
    const part = list.slice(shown, shown + PAGE);
    grid.append(...part.map(n => cell({ n, d: lib.d[n] })));
    shown += part.length;
    info.textContent = list.length ? `${list.length.toLocaleString()} รูป` : (isThai(q.value) ? 'ไม่เจอ ลองพิมพ์ภาษาอังกฤษดู เช่น sword' : 'ไม่เจอไอคอนชื่อนี้');
    more.hidden = shown >= list.length;
  }
  const rec = recent();
  const close = sheet(title, h('div.ico-picker',
    h('div.ico-cur',
      h('span.ico-preview', { html: iconSvg(current || fallback) }),
      h('small', current ? current.n : 'ค่าเริ่มต้น'),
      current ? h('button.btn.small', { onclick: () => pick(null) }, 'กลับเป็นค่าเริ่มต้น') : null),
    rec.length ? [h('p.small.ico-label', 'ใช้ล่าสุด'), h('div.ico-grid.ico-recent', rec.map(cell))] : null,
    q, info, grid, more,
    h('p.muted.small', 'ไอคอนจาก game-icons.net (CC BY 3.0)')));
  more.hidden = true;
  loadIconLib().then(l => {
    lib = l; list = l.names; q.disabled = false; draw(true);
  }).catch(e => { info.textContent = (e.message || 'โหลดไม่ได้') + ' — ต้องต่อเน็ตครั้งแรก'; toast('โหลดคลังไอคอนไม่ได้'); });
}

/** ปุ่มแสดงไอคอนปัจจุบัน + กดเพื่อเปลี่ยน */
export function iconButton(value, fallback, onChange, { label = 'เปลี่ยนไอคอน', title } = {}) {
  let cur = value || null;
  const btn = h('button.ico-btn', { type: 'button', 'aria-label': label, onclick: e => {
    e.preventDefault(); e.stopPropagation();
    openIconPicker({ title, current: cur, fallback, onPick: v => { cur = v; paint(); onChange(v); } });
  } });
  const paint = () => btn.replaceChildren(h('span.ico-preview', { html: iconSvg(cur || fallback) }), h('small', cur ? 'เปลี่ยน' : label));
  paint();
  return btn;
}
