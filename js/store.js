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
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function pipe(bytes, stream) {
  return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer();
}

export async function encodeChar(c) {
  const { id, createdAt, updatedAt, ...rest } = c;
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
