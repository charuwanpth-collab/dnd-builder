# สรุปงาน + Handoff — เฟส 1 (2026-11-07)

## สถานะ
- Repo: `charuwanpth-collab/dnd-builder` (Public) — โค้ดเฟส 1 commit ไว้ในเครื่องของ session แล้ว
- **ยัง push ไม่ได้**: ต้องติดตั้ง Claude GitHub App ให้ repo นี้ก่อน (ดูหัวข้อ "ค้างอยู่")
- ทดสอบด้วย headless Chrome ที่ความกว้าง 400px: ทุกหน้าไม่มี error, ไม่ล้นจอ, ลิงก์แชร์ยาว ~600 ตัวอักษร

## เฟส 1 ทำอะไรไปแล้ว
- **ข้อมูล**: แปลง SRD 5.2.1 (markdown จาก oldmanumby/dnd.srd.5.2) เป็น JSON — 12 คลาส (ตาราง+สเปลสลอตครบ 20 เลเวล), 9 species, 4 background, 17 feat, 338 สเปล, อาวุธ/เกราะ/mastery/gear
- **ภาษาไทย 100%** สำหรับ: ฟีเจอร์คลาส+ซับคลาส Lv1–3, trait ของทุก species, feat ทั้งหมด, Metamagic, Invocation Lv≤2, Weapon Mastery, สกิล, Conditions, สเปล Cantrip–Lv2 (141 อัน) + ทิปมือใหม่รายคลาส
- **วิซาร์ด 8 ขั้น**: เริ่ม → Class → Background → Species → ค่าพลัง (มาตรฐาน/ซื้อแต้ม/ทอย) → ของ → เวท → สรุป
- **ตัวเลือกที่คำนวณอัตโนมัติ**: Divine/Primal Order, Fighting Style (+Blessed/Druidic Warrior), Weapon Mastery, Expertise, Primal Knowledge, Lore skills, Land, Hunter's Prey, Metamagic, Invocations, species ทุกแบบ (lineage/legacy/ancestry, Human feat+skill, Elf Keen Senses), Magic Initiate, ภาษา
- **ใบตัวละคร 6 แท็บ**: HP/temp/death saves, พักสั้น (ทอย Hit Die)/พักยาว, ทรัพยากรแบบจุด, สเปลสลอต, conditions, ทอยเต๋าโดยแตะ, ของ+เงิน, โน้ต
- **เก็บข้อมูล**: localStorage อัตโนมัติ, ลิงก์แชร์ (deflate+base64url ใน hash), ไฟล์สำรอง JSON, เตือนสำรองทุก 7 วัน, service worker เปิดออฟไลน์ได้
- **ไอคอน**: game-icons.net 70 รูป (CC BY 3.0), หน้าเครดิตครบตาม CC-BY

## ค้างอยู่ (ต้องให้พี่จ๋าทำ)
1. ติดตั้ง Claude GitHub App: https://github.com/apps/claude/installations/select_target → เลือกบัญชี `charuwanpth-collab` → repo `dnd-builder`
   (หรือ claude.ai → Settings → Connectors → GitHub เชื่อมใหม่)
2. หลัง push แล้ว เปิด GitHub Pages: repo → Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save
   ลิงก์จะเป็น `https://charuwanpth-collab.github.io/dnd-builder/`

## เฟสถัดไป
- **เฟส 2**: Content Pack (ฟอร์มเพิ่มซับคลาส/background/feat/สเปลเอง + export/import แชร์ในกลุ่ม), รายชื่อซับคลาสทั้งหมดพร้อมป้าย "ต้องเติมข้อมูล", คลังไอคอนเต็ม 4,134 รูปให้เลือก (`@iconify-json/game-icons`)
- **เฟส 3**: เลเวล 4–20 (ASI/feat, Extra Attack, ฟีเจอร์ทุกเลเวล), แปลไทยสเปล Lv3–9, Epic Boon, Pact of the Tome อัตโนมัติ, หน้า print แบบเต็มใบ

## จุดที่ควรรู้ในโค้ด
- `MAX_LEVEL = 3` อยู่ใน `js/rules.js`
- คำแปลไทยอ้างอิงด้วย id (slug ชื่ออังกฤษ) — เช็คความครบด้วยสคริปต์ coverage ในแชตเฟส 1 (ไอดีไม่ตรง = ขึ้น "ยังไม่มีคำอธิบายภาษาไทย")
- สเปลจาก species อยู่ใน `SPECIES_SPELLS` (rules.js) ส่วนสเปลซับคลาสอ่านจากตารางใน SRD อัตโนมัติ
- ทดสอบการคำนวณ: `node tools/test_rules.mjs`
