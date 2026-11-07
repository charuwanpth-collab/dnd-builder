# ห้องสร้างฮีโร่ (Hero Hall)

เว็บสร้างตัวละครและใบตัวละครภาษาไทย สำหรับเกมที่ใช้กฎ 5E ฉบับ 2024 (SRD 5.2.1)
ใช้บนมือถือตอนเล่นออฟไลน์ได้ เซฟในเครื่องอัตโนมัติ ไม่ต้องล็อกอิน

## ใช้งาน
- เปิดเว็บ → **+ สร้างตัวละครใหม่** → ทำตามขั้นตอน (Class → Background → Species → ค่าพลัง → ของ → เวท)
- ใบตัวละคร: ติดตาม HP / Spell Slot / Rage ฯลฯ, ปุ่มพักสั้น/พักยาว, แตะค่าพลังหรือสกิลเพื่อทอยเต๋า
- **แชร์ลิงก์**: เมนู ⋯ → แชร์ลิงก์ตัวละคร (ข้อมูลอัดอยู่ในลิงก์ ส่งเข้า LINE ได้)
- **สำรอง**: เมนู ⋯ → ดาวน์โหลดไฟล์สำรอง / หน้าแรก → นำเข้าไฟล์

## โครงสร้าง
```
index.html, css/app.css, sw.js (ออฟไลน์), manifest.webmanifest
js/main.js        เราเตอร์ (#/, #/edit/:id/:step, #/c/:id/:tab, #/import/:data, #/credits)
js/rules.js       กฎและการคำนวณทั้งหมด (AC, HP, สกิล, เวท, ทรัพยากร)
js/store.js       localStorage + ลิงก์แชร์ (deflate) + ไฟล์สำรอง
js/views/         wizard.js, sheet.js, home.js, parts.js
data/srd/*.json   ข้อมูลอังกฤษจาก SRD 5.2.1 (สร้างด้วย tools/build_srd.py)
data/th/*.json    คำอธิบายภาษาไทย (เขียนเอง)
data/icons.json   ไอคอนจาก game-icons.net (tools/build_icons.py)
tools/            สคริปต์สร้างข้อมูล + test_rules.mjs
```

## สร้างข้อมูลใหม่
```
git clone --depth 1 https://github.com/oldmanumby/dnd.srd.5.2 /tmp/srd
python3 tools/build_srd.py /tmp/srd data/srd
node tools/test_rules.mjs
```

## เครดิต
This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Icons from [game-icons.net](https://game-icons.net) by Lorc, Delapouite and contributors, licensed under CC BY 3.0.

งานแฟนเมด ใช้ได้กับกฎ 5E (5E compatible) ไม่ได้เกี่ยวข้องกับ Wizards of the Coast
