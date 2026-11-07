// สร้าง data/icons-all.json จาก @iconify-json/game-icons (4,134 รูป, CC BY 3.0)
// ใช้: npm i @iconify-json/game-icons (ที่ไหนก็ได้) แล้ว node tools/build_icons.mjs <path ไปที่ icons.json ของแพ็กเกจ>
import fs from 'fs';
const src = process.argv[2];
if (!src) { console.error('ใส่ path ของ @iconify-json/game-icons/icons.json'); process.exit(1); }
const j = JSON.parse(fs.readFileSync(src));
const out = {};
for (const [n, v] of Object.entries(j.icons).sort(([a], [b]) => a.localeCompare(b))) {
  const m = v.body.match(/^<path fill="currentColor" d="([^"]+)"\/>$/);
  if (!m) { console.warn('ข้าม', n); continue; }
  out[n] = m[1];
}
fs.writeFileSync('data/icons-all.json', JSON.stringify(out));
console.log('icons', Object.keys(out).length, 'bytes', fs.statSync('data/icons-all.json').size);
