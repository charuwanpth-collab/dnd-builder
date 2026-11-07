// เก็บตัวละครในเครื่อง (localStorage) + ลิงก์แชร์ + ไฟล์สำรอง
import { uid } from './util.js';
import { usedPackItems, mergeEmbedded } from './packs.js';

const KEY = 'hh.chars.v1';
const META = 'hh.meta.v1';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function writeAll(all) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch { return false; }
}
export function meta(patch) {
  let m = {};
  try { m = JSON.parse(localStorage.getItem(META)) || {}; } catch {}
  if (patch) { m = { ...m, ...patch }; try { localStorage.setItem(META, JSON.stringify(m)); } catch {} }
  return m;
}

export const list = () => Object.values(readAll()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
export const get = id => readAll()[id] || null;

export function save(c) {
  if (c.packs) { mergeEmbedded(c.packs); delete c.packs; }
  const all = readAll();
  if (!c.id) { c.id = uid(); c.createdAt = Date.now(); }
  c.updatedAt = Date.now();
  all[c.id] = c;
  return writeAll(all);
}
export function remove(id) {
  const all = readAll();
  delete all[id];
  writeAll(all);
}

let t;
export function autosave(c, cb) {
  clearTimeout(t);
  t = setTimeout(() => { const ok = save(c); cb?.(ok); }, 250);
}

// ขอให้เบราว์เซอร์ไม่ลบข้อมูลเองเวลาที่เก็บเต็ม
export function askPersist() {
  navigator.storage?.persist?.().catch(() => {});
}

// ---------- ลิงก์ตัวละคร (บีบอัดไว้ในลิงก์) ----------
const b64u = buf => {
  const u = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); // แบ่งก้อน กันข้อมูลใหญ่ (รูปตัวละคร) ทำ stack ล้น
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function pipe(bytes, stream) {
  return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer();
}

export async function encodeChar(c) {
  const { id, createdAt, updatedAt, portrait, ...rest } = c; // รูปไม่ใส่ในลิงก์ (ยาวเกิน) — ไปกับไฟล์สำรองแทน
  const packs = usedPackItems([c]);
  if (packs.length) rest.packs = packs;
  const bytes = new TextEncoder().encode(JSON.stringify(rest));
  if (typeof CompressionStream === 'undefined') return 'j' + b64u(bytes);
  return 'z' + b64u(await pipe(bytes, new CompressionStream('deflate-raw')));
}

export async function decodeChar(s) {
  const kind = s[0], bytes = unb64u(s.slice(1));
  const raw = kind === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
  return JSON.parse(new TextDecoder().decode(raw));
}

// ---------- ย้ายเว็บ (เฟส 5): ยกตัวละคร + แพ็กทั้งหมดไปโดเมนใหม่ผ่าน hash ----------
export const NEW_SITE = 'https://dnd-builder.github.io/';
export async function migrateUrl() {
  const raw = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } };
  const bytes = new TextEncoder().encode(JSON.stringify({ chars: raw(KEY), packs: raw('hh.packs.v1') }));
  const code = typeof CompressionStream === 'undefined' ? 'j' + b64u(bytes) : 'z' + b64u(await pipe(bytes, new CompressionStream('deflate-raw')));
  return `${NEW_SITE}#/migrate/${code}`;
}
/** รับของจากเว็บเก่า: ตัวละคร id ซ้ำไม่ทับ · แพ็ก id ซ้ำไม่ทับ → คืนจำนวนที่เพิ่ม */
export async function receiveMigration(code) {
  const { chars = {}, packs = {} } = await decodeChar(code);
  const all = readAll();
  let n = 0;
  for (const [id, c] of Object.entries(chars)) if (!all[id]) { all[id] = c; n++; }
  writeAll(all);
  let p = {};
  try { p = JSON.parse(localStorage.getItem('hh.packs.v1')) || {}; } catch { /* ว่าง */ }
  let k = 0;
  for (const [id, pk] of Object.entries(packs)) if (!p[id]) { p[id] = pk; k++; }
  try { localStorage.setItem('hh.packs.v1', JSON.stringify(p)); } catch { /* เต็ม */ }
  return { n, k, total: Object.keys(chars).length };
}

export async function shareUrl(c) {
  const base = location.href.split('#')[0];
  return `${base}#/import/${await encodeChar(c)}`;
}

// ---------- ไฟล์สำรอง ----------
export function exportFile(chars) {
  const data = { app: 'hero-hall', v: 1, at: new Date().toISOString(), chars };
  const packs = usedPackItems(chars);
  if (packs.length) data.packs = packs;
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  const name = chars.length === 1 ? (chars[0].name || 'character') : 'all-characters';
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  meta({ lastBackup: Date.now() });
}

export async function importFile(file) {
  const data = JSON.parse(await file.text());
  if (data.kind === 'pack') throw new Error('pack');
  const chars = data.chars || (data.classId ? [data] : []);
  mergeEmbedded(data.packs);
  for (const c of chars) {
    delete c.id;
    save(c);
  }
  return chars.length;
}
