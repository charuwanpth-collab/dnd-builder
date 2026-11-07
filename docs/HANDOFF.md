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

## งานถัดไปทันที: แปลไทยแบบละเอียด (พี่จ๋าสั่งแล้ว — ทำ A → B → C)
เว็บขึ้นแล้วที่ https://charuwanpth-collab.github.io/dnd-builder/ (push ได้แล้ว, Pages = main /root)

**รูปแบบการ์ด**: สรุปสั้น (ของเดิม) → **แปลเต็ม (ไทย)** แบบเปิดพับได้ → ต้นฉบับ EN พับไว้
- เก็บคำแปลเต็มใน `data/th/full/<กลุ่ม>.json` คีย์ด้วย id เดิม ค่าเป็น markdown (ตารางแปลด้วย) โหลดแบบ lazy ตอนกดเปิดครั้งแรก
- แก้ `js/views/parts.js` → `featureCard`/`spellDetail`/`optionList` ให้แสดงบล็อก "แปลเต็ม"

**สไตล์แปล**: แปลครบทุกประโยค ตัวเลขตรงต้นฉบับ คงคำเฉพาะเป็นอังกฤษ (Action, Bonus Action, Reaction, Magic action, Advantage/Disadvantage, Saving Throw, ชื่อค่าพลัง STR/DEX…, ชนิดดาเมจ, Conditions, ชื่อสเปล/ฟีเจอร์, Short/Long Rest, Proficiency, Spell Slot, Concentration, Attunement) ส่วนอื่นเป็นไทยพูดง่าย

**ลำดับ (แบ่งแชต)**
- ✅ **A เสร็จแล้ว (2026-11-07)** — 73 อัน: Invocations 28 (รวม Lv5+), Metamagic 10 → `full/options.json` · Feats 17 → `full/feats.json` · Mastery 8 + Weapon Properties 10 (คีย์แบบแบน ไม่ชนกัน) → `full/mastery.json`
  - โค้ด: `loadFull(g)` ใน `js/data.js` (แคช promise), `fullTh(g,id)` ใน `parts.js` (กล่อง `details.full` โหลดตอนเปิดครั้งแรก), `featureCard({..., full:[กลุ่ม,id]})`
  - จุดที่แสดง: wizard → optionList (Invocation/Metamagic), รายการ Mastery, Origin Feat ของ background · sheet → ตัวเลือกที่เลือกไว้, feats, และกล่องใหม่ "ความหมาย Mastery / คุณสมบัติอาวุธ" ใต้ตารางโจมตี
  - `sw.js` → `hh-v2` + เพิ่มไฟล์ full ลงแคชออฟไลน์ (B/C ต้องเพิ่มชื่อกลุ่มในลิสต์นี้ด้วย)
  - เช็คความครบ: `python3 tools/check_full.py` (B/C ให้เพิ่มกลุ่มในสคริปต์นี้)
  - ข้อสังเกต SRD: Careful Spell ต้นฉบับถูกตัดท้ายประโยค (แปลเติมให้ครบ+หมายเหตุ), Vex มีหัวข้อ Improvised Weapons ติดมา (แปลเฉพาะ Vex)
- ✅ **B เสร็จแล้ว (2026-11-07)** — 125 อัน: ฟีเจอร์คลาส+ซับคลาส Lv1–3 = 92 → `full/classes.json` (`{classId:{f:{},sub:{}}}`) · trait species 33 → `full/species.json` (`{speciesId:{traitId}}`)
  - `fullTh(g, id)` รับ id เป็น path ได้ เช่น `['wizard','f','scholar']`; `classFeatureCard` ส่ง full อัตโนมัติ, Divine/Primal Order block, trait species ใน wizard+sheet
  - Background: SRD ไม่มีข้อความบรรยาย (มีแค่ช่องข้อมูล) → ไม่มีอะไรต้องแปลเต็ม; Origin Feat ของ background ใช้ full/feats แล้ว
  - ข้อสังเกต SRD ที่แก้ในคำแปล: Rage (bullet list เพี้ยน), Pact Magic (ชื่อเวทแนะนำหาย+ย่อหน้าขาด → เติม Charm Person/Hex), Wizard Subclass (ขาดท้าย), Breath Weapon/Relentless Endurance (ขึ้นบรรทัดเพี้ยน), ตาราง Fiendish Legacies ติดไปอยู่ใน Otherworldly Presence → ย้ายไปไว้ใน Fiendish Legacy
  - `sw.js` → `hh-v3`
- ✅ **C เสร็จแล้ว (2026-11-07)** — สเปล 141 อัน (Cantrip 27, Lv1 57, Lv2 57) → `full/spells.json` แสดงใน `spellDetail` (หน้าต่างรายละเอียดสเปล)
  - แก้บัค `js/md.js`: รองรับ blockquote (`>`) แล้ว — ค่าสถานะ Otherworldly Steed ทั้ง EN และไทยแสดงตารางถูก
  - แก้บัค SRD: ข้อความ Suggestion มีบล็อก Summon Dragon (Lv5) ติดมา → ตัดออกใน `data/srd/spells.json` แล้ว (⚠️ ถ้ารัน `tools/build_srd.py` ใหม่ บัคจะกลับมา ต้องแก้ตัวแปลงด้วย)
  - เติมข้อความที่ SRD ตัดขาด: Shield (Magic Missile), Find Traps (Alarm/Glyph of Warding)
  - `sw.js` → `hh-v4`
- **แปลไทยเต็ม A+B+C ครบหมดแล้ว** (เช็ค: `python3 tools/check_full.py` → ทุกกลุ่มครบ)

**ของแถม (เสนอแล้ว)**: หน้าอภิธานศัพท์ `#/glossary` + คำในคำอธิบายแตะดูความหมายได้ (Attunement, Advantage, Concentration, Proficiency, Saving Throw, Cover ฯลฯ) — ข้อมูลอยู่ใน SRD `08_Rules_Glossary`

ทุกเฟสย่อย: เขียนสคริปต์เช็คว่าครบทุก id → ทดสอบด้วย headless Chrome (`/usr/bin/google-chrome` + puppeteer-core 22.15.0, เปิด http.server ด้วย run_in_background) → commit + push → อัปเดต handoff

## เฟสถัดไป
- **เฟส 2**: Content Pack (ฟอร์มเพิ่มซับคลาส/background/feat/สเปลเอง + export/import แชร์ในกลุ่ม), รายชื่อซับคลาสทั้งหมดพร้อมป้าย "ต้องเติมข้อมูล", คลังไอคอนเต็ม 4,134 รูปให้เลือก (`@iconify-json/game-icons`)
- **เฟส 3**: เลเวล 4–20 (ASI/feat, Extra Attack, ฟีเจอร์ทุกเลเวล), แปลไทยสเปล Lv3–9, Epic Boon, Pact of the Tome อัตโนมัติ, หน้า print แบบเต็มใบ

## จุดที่ควรรู้ในโค้ด
- `MAX_LEVEL = 3` อยู่ใน `js/rules.js`
- คำแปลไทยอ้างอิงด้วย id (slug ชื่ออังกฤษ) — เช็คความครบด้วยสคริปต์ coverage ในแชตเฟส 1 (ไอดีไม่ตรง = ขึ้น "ยังไม่มีคำอธิบายภาษาไทย")
- สเปลจาก species อยู่ใน `SPECIES_SPELLS` (rules.js) ส่วนสเปลซับคลาสอ่านจากตารางใน SRD อัตโนมัติ
- ทดสอบการคำนวณ: `node tools/test_rules.mjs`
