# Mini Roguelike Survival — Room-Based Edition (v2)

## Game Development Specification

> เกม Auto-Attack Roguelike แบบ Vampire Survivors ผสมโครงสร้างการเดินทางแบบ Hades / Dead Cells
> เดินผ่านห้องต่อห้องแบบสุ่ม เคลียร์ศัตรู เก็บของ เลือกอาวุธ/ไอเทมตอนเลเวลอัพ จนถึงห้องบอส
> ตายแล้วได้ Meta Progression กลับไปแข็งแกร่งขึ้นในรอบถัดไป

---

# 1. Game Concept

เกมแนว **Room-based Roguelike / Auto-Attack Survival**

ผู้เล่นควบคุมตัวละครหนึ่งตัว เดินทางผ่านห้องต่างๆ ที่ถูกสุ่มขึ้นมาในแต่ละ Run (คล้าย Hades / Dead Cells)
ในแต่ละห้อง ตัวละครจะต้องเคลียร์ศัตรูโดยใช้อาวุธที่ **โจมตีอัตโนมัติ** ผู้เล่นมีหน้าที่:

* เคลื่อนที่ / หลบ
* เดินเลือกประตูเพื่อไปห้องถัดไป
* เก็บ EXP และไอเทมภายในห้อง
* Level Up แล้วเลือก Weapon/Upgrade
* สร้าง Build ที่ต่อยอดกันภายใน Run เดียว
* เคลียร์ห้อง Elite และห้อง Boss
* ไปให้ลึกที่สุดเท่าที่จะทำได้ในแต่ละ Floor
* เมื่อตาย ได้รับ Meta EXP เพื่อพัฒนาตัวละครถาวร

Core feeling ที่ต้องการ:

> "ถึงจะตายกลางดัน แต่รอบหน้าฉันจะแข็งแกร่งขึ้น และไปได้ลึกกว่าเดิม"

---

# 2. Core Gameplay Loop

```text
Main Menu
    ↓
Start Run
    ↓
Starting Room (Safe Room)
    ↓
เลือกประตู → เดินเข้าห้องถัดไป
    ↓
ประตูล็อค → เคลียร์ศัตรูในห้อง (Auto-Attack)
    ↓
เก็บ EXP / ไอเทมที่ดรอป
    ↓
Level Up → เลือก 1 ใน 3 (อาวุธใหม่ / อัปเกรดอาวุธเดิม / Passive)
    ↓
ประตูปลดล็อค → เลือกประตูถัดไป
    ↓
(ทำซ้ำ 8–12 ห้องต่อ Floor: Combat / Elite / Treasure / Shop / Rest / Mystery)
    ↓
Boss Room (ปิดท้าย Floor)
    ↓
ชนะ Boss → Floor ถัดไป (ยากขึ้น) หรือ จบ Run (MVP: จบที่ Floor เดียว)
    ↓
Win / Die (ตายห้องไหนก็ได้)
    ↓
คำนวณ Run Reward → Meta Progression
    ↓
กลับ Main Menu → Start Another Run
```

---

# 3. Two-Level Progression System

## 3.1 Run Level
Level ของตัวละคร **เฉพาะ Run ปัจจุบัน** — Reset ทุกครั้งที่เริ่ม Run ใหม่
เมื่อ Run จบ: Run Level, EXP, Weapons/Passives ที่ได้ใน Run, Temporary Stats — หายทั้งหมด

## 3.2 Meta Level
Level ถาวรของผู้เล่น ไม่ Reset เมื่อตาย
แสดงใน Main Menu:

```text
PLAYER LEVEL
LEVEL 06

[ PLAY ]
```

---

# 4. Meta Progression

เมื่อ Run จบ คำนวณ Meta EXP จาก:

* จำนวนห้องที่ผ่าน (Rooms Cleared)
* Elite ที่กำจัด
* Boss ที่กำจัด (หรือสร้างความเสียหายได้เท่าไหร่ถ้าแพ้ Boss)
* EXP ที่เก็บได้ใน Run
* Floor ที่ไปถึง

ตัวอย่าง Reward Table (10–20 Meta Level สำหรับ MVP):

| Meta Level | Reward |
|---|---|
| 1 | Starting Level |
| 2 | +5 Max HP |
| 3 | +5% EXP Gain |
| 4 | +2% Damage |
| 5 | New Weapon Unlock (เพิ่มเข้า Pool ที่สุ่มได้) |
| 6 | +5% Move Speed |
| 7 | +5 Max HP |
| 8 | +5% Pickup Range |
| 9 | +3% Attack Speed |
| 10 | Character Unlock (playstyle ต่างจากเดิม) |
| 11 | +1 เลือกไอเทมเริ่มต้นก่อนเข้า Run (Starting Boon) |
| 12 | Rest Room ฟื้น HP % เพิ่มขึ้น |
| 13 | +5% Damage |
| 14 | Shop Room ราคาถูกลง |
| 15 | New Weapon Unlock |
| 16 | +5% Move Speed |
| 17 | +1 Reroll ตอนเลือก Upgrade (ต่อ Run) |
| 18 | +5% All Stats (small) |
| 19 | Second Wind แบบถาวร (ฟื้นครั้งแรกที่จะตาย — ติดตัวทุก Run โดยไม่ต้องเก็บ Passive) |
| 20 | Character Unlock ที่ 2 |

> **หมายเหตุ Second Wind:** Permanent Second Wind (Meta Level 19) กับ Passive "Second Wind"
> ที่สุ่มเจอได้ใน Run (Section 8.2) เป็น**ชาร์จแยกกันคนละก้อน** ถ้าผู้เล่นมีทั้งสองอย่างพร้อมกัน
> จะฟื้นได้สูงสุด **2 ครั้งต่อ Run** (permanent ใช้ก่อน 1 ครั้ง แล้วค่อยใช้ของ Passive ในรันอีก 1 ครั้ง)

---

# 5. Player

## Controls
* WASD / Arrow Keys — Movement 2D
* ไม่มี Manual Attack — อาวุธทำงานอัตโนมัติทั้งหมด

## Player Stats
```text
HP / Max HP
Move Speed
Damage (multiplier รวม)
Attack Speed (multiplier รวม)
Projectile Count
Pickup Range
EXP Gain
```

---

# 6. Room & Map System (หัวใจใหม่ของเกม)

## 6.1 โครงสร้าง Floor
Floor หนึ่งประกอบด้วยห้องประมาณ **8–12 ห้อง** เรียงเป็น Node Graph (แบบ Hades / Slay the Spire)
แสดงเป็นแผนที่ mini-map มุมจอ หรือหน้าจอ "เลือกประตู" ก่อนเข้าห้องถัดไป

```text
[Start] → [Combat] → [Combat] → [Treasure] → [Combat] → [Shop] → [Combat/Elite (เลือก)] → [Rest] → [Combat] → [Boss]
```
> ตัวอย่างนี้แสดงแค่ "ความหลากหลายของประเภทห้อง" เท่านั้น ตำแหน่งจริงของ Elite Room
> ต้องเป็นไปตามกฎ Difficulty Scaling ใน 6.4 เสมอ (ไม่ปรากฏในช่วงต้น Floor)

* แต่ละห้องมี 2–3 ประตูให้เลือกเดินต่อ
* ประตูแต่ละบานโชว์ **icon ห้องปลายทาง** ให้ผู้เล่นเดาได้ล่วงหน้า (ผู้เล่นรู้ว่ากำลังจะเจออะไร แต่ไม่รู้รายละเอียด)
* Layout สุ่มใหม่ทุก Run โดยจำนวนห้องทั้งหมดต่อ Floor สุ่มระหว่าง **8–12 ห้อง** (ดูวิธีคำนวณ scaling
  ที่รองรับจำนวนห้องไม่คงที่ใน 6.4)

## 6.2 ประเภทห้อง

| ห้อง | Icon แนะนำ | รายละเอียด |
|---|---|---|
| ⚔️ Combat Room | ดาบไขว้ | ห้องหลัก ศัตรูสุ่ม spawn ต้องเคลียร์หมดถึงเปิดประตู |
| 👑 Elite Room | มงกุฎ | ศัตรูตัวใหญ่ 1–2 ตัว แรงกว่าปกติ แลกกับรางวัลดีกว่า: ดรอป EXP มากกว่า Combat Room ปกติ 2 เท่า + การันตีเปิด Level Up Choice ทันที 1 ครั้งโดยไม่ต้องรอ EXP ถึง threshold |
| 💰 Treasure Room | หีบทอง | ไม่มีศัตรู (หรือมีน้อย) เปิดหีบได้ไอเทม/Passive พิเศษ |
| 🎲 Shop Room | ถุงเงิน | เลือกซื้อ/แลกไอเทมจากตัวเลือกที่มี ใช้ currency ที่เก็บใน Run |
| 🩹 Rest Room | หัวใจ | เลือก 1 ใน 2: ฟื้น HP % หรือรับ buff ถาวรใน Run นี้ (trade-off) |
| 💀 Boss Room | กะโหลก | ปิดท้าย Floor เสมอ ไม่มีทางเลือกอื่น |
| ❓ Mystery Room | เครื่องหมายคำถาม | สุ่มได้ทั้งดี/ร้าย เช่น cursed chest (ของแรงแต่มี debuff), mini event |

## 6.3 กติกาห้อง Combat
```text
เดินเข้าห้อง
    ↓
ประตูล็อคทันที
    ↓
Enemy spawn ตาม Floor difficulty
    ↓
Auto-Attack เคลียร์ศัตรูทั้งหมด
    ↓
ประตูปลดล็อค + แสดงไอเทม/EXP ที่ดรอป
    ↓
ผู้เล่นเดินไปเก็บ แล้วเลือกประตูถัดไป
```

## 6.4 Difficulty Scaling
Difficulty ไม่ scale ตามเวลาแบบเดิม แต่ **scale ตาม % ความคืบหน้าของ Floor** (Room Index ÷ จำนวนห้องทั้งหมดใน Floor นั้น)
เพื่อให้ใช้ได้ไม่ว่า Floor จะสุ่มมา 8 หรือ 12 ห้อง (ตาม Section 6.1)

```text
0%   - 25%  ของ Floor : Enemy พื้นฐาน จำนวนน้อย
25%  - 50%  ของ Floor : เพิ่ม Fast Enemy, จำนวนมากขึ้น
50%  - 75%  ของ Floor : Elite Room เริ่มมีโอกาสปรากฏได้ (ก่อนหน้านี้ห้าม)
75%  - 90%  ของ Floor : ความหนาแน่นสูงสุดก่อน Boss
90%  - 100% ของ Floor : Boss Room (ห้องสุดท้ายของ Floor เสมอ)
```

ตัวอย่าง: Floor สุ่มมาได้ 10 ห้อง → Elite Room ปรากฏได้ตั้งแต่ห้องที่ 5 เป็นต้นไป (50% ของ 10)
ถ้า Floor สุ่มมา 8 ห้อง → Elite Room ปรากฏได้ตั้งแต่ห้องที่ 4 เป็นต้นไป (50% ของ 8)

---

# 7. Combat System

Auto-Attack: ตัวละครค้นหา Enemy ในระยะ แล้วโจมตีอัตโนมัติ

```text
Player → Find Nearest Enemy → Fire/Trigger Weapon → Hit Enemy
       → Enemy HP ลด → Enemy ตาย → Drop EXP/Item
```

Combat ต้องเรียบง่ายและตอบสนองเร็ว มี **Game Feel (Juice)** ประกอบ:

* Hit-stop สั้นๆ (1–3 frame) เวลาโจมตีโดน
* Screen shake เบาๆ ตอนโดน hit หนัก/boss ตาย
* Damage number popup
* Particle burst ตอน enemy ตาย
* Sound feedback แยกตาม event (hit, level up, pickup, room clear)

---

# 8. Weapon & Passive Item System

อาวุธคือของที่ลอย/ทำงานอยู่รอบตัวผู้เล่น **ทำงานอัตโนมัติทั้งหมด** ไม่ต้องกดโจมตี
ตอน Level Up จะสุ่มตัวเลือก 3 อย่างจาก Pool ด้านล่าง — อาจเป็นอาวุธใหม่ อัปเกรดอาวุธเดิม (level ของอาวุธนั้นเพิ่ม) หรือ Passive ใหม่

**Starting Pool vs Unlockable Pool:** จากอาวุธทั้งหมด 10 ชิ้นใน 8.1 ให้แบ่งเป็น
**8 ชิ้นแรกใช้ได้ตั้งแต่เริ่มเกม** (สุ่มได้ทันทีในทุก Run) ส่วนอีก **2 ชิ้นสุดท้าย
(Turret Drone, Poison Cloud) ล็อคไว้ก่อน** และปลดล็อคผ่าน Meta Level 5 และ 15
ตามลำดับ (Section 4) — เพื่อให้ "New Weapon Unlock" ใน Meta Reward Table มีความหมายจริง
ไม่ใช่ของที่มีอยู่แล้วตั้งแต่ต้น

**Weapon Max Level:** อาวุธและ Passive ทุกชิ้นมี **Max Level = 5** ต่อชิ้น (เลือกซ้ำได้สูงสุด 5 ครั้ง
ต่อ 1 Run) เมื่อถึง Level 5 จะไม่ปรากฏเป็นตัวเลือก "อัปเกรด" อีกในการสุ่มครั้งถัดไป และถือว่า
"Max" แล้วสำหรับเงื่อนไข Evolution ใน 8.3

## 8.1 อาวุธ (Active — โจมตีเอง)

| อาวุธ | พฤติกรรม |
|---|---|
| **Spinning Blade** | หมุนวนรอบตัวตลอดเวลา อัปเกรดเพิ่มจำนวนดาบ/วงกว้าง |
| **Homing Orb** | ลอยไปหาศัตรูใกล้สุดเอง ชนแล้วเด้งไปเป้าถัดไปได้ |
| **Lightning Chain** | ฟาดศัตรูสุ่มในระยะทุก 2–3 วิ กระโดดใส่ตัวใกล้เคียงต่อเป็นทอด |
| **Ghost Companion** | ผีลอยตามหลัง พุ่งชนศัตรูที่เข้าใกล้แบบ hit-and-run |
| **Thorn Aura** | รัศมีหนามรอบตัว ดาเมจต่อเนื่องกับของที่เข้าใกล้ |
| **Boomerang Axe** | ปาไกลแล้วเหวี่ยงกลับ โดนศัตรู 2 รอบ (ไป-กลับ) |
| **Meteor Call** | สุ่มตกเป็นจุด มีเงาเตือนก่อนตก ระเบิดวงกว้าง |
| **Whip Crack** | ฟาดแนวยาวไปทางที่ผู้เล่นเดินล่าสุด |
| **Turret Drone** | ลอยตามตัว ยิงศัตรูใกล้สุดเองแบบต่อเนื่อง |
| **Poison Cloud** | ปล่อยเมฆพิษค้างพื้น ดาเมจสะสมตามเวลา |

## 8.2 Passive Item (เสริม ไม่โจมตีเอง)

| Passive | ผลลัพธ์ |
|---|---|
| **Magnet Core** | เพิ่มระยะเก็บ EXP/ไอเทม |
| **Blood Pact** | Max HP เพิ่ม แต่ Move Speed ลดเล็กน้อย |
| **Adrenaline** | HP ต่ำกว่า 30% → Attack Speed โบนัสชั่วคราว |
| **Lucky Coin** | เพิ่มโอกาส drop ของหายาก/Currency |
| **Mirror Shard** | โอกาสสุ่มยิงซ้ำ (duplicate) จากอาวุธที่มี |
| **Second Wind** | ตายครั้งแรกใน Run จะฟื้น HP กลับมาครึ่งนึง (ใช้ได้ 1 ครั้ง/Run — นับรวมกับ Second Wind ถาวรจาก Meta Level 19 ถ้ามี ดูหมายเหตุด้านล่าง) |

## 8.3 Evolution (Synergy — อาวุธ+Passive รวมกันเมื่อ max ทั้งคู่)

| อาวุธ (Max) | + Passive (Max) | = Evolution |
|---|---|---|
| Spinning Blade | Thorn Aura | **Blade Storm** — วงดาบขยายเต็มพื้นที่ชั่วคราวเป็นระยะ |
| Homing Orb | Magnet Core | **Void Pull** — ดูดศัตรูเข้ามาหาก่อนระเบิด |

## 8.4 Build Identity (ทิศทางการเล่น แนะนำให้ UI สื่อสารด้วยสี/ไอคอน)

* **Glass Cannon**: Damage / Attack Speed / Projectile Count สูง, HP ต่ำ
* **Tank**: HP / Thorn Aura / Move Speed
* **Swarm**: Projectile Count/Size + อาวุธหลายชิ้นพร้อมกัน

---

# 9. Enemy System

## Basic Enemy
เดินเข้าหาผู้เล่น, HP ปานกลาง, ความเร็วปานกลาง, Contact Damage

## Fast Enemy
HP ต่ำ, เคลื่อนที่เร็ว, บังคับให้ผู้เล่นระวังตัว

## Elite Enemy (ปรากฏใน Elite Room)
ร่างใหญ่กว่าปกติ มี aura พิเศษ, HP/Damage สูงขึ้นชัดเจน, drop reward ดีกว่า Combat Room ปกติ

## Boss
ปรากฏในห้อง Boss Room (ปิดท้าย Floor) มี pattern การโจมตีเฉพาะตัว, HP สูง, ใช้เวลาต่อสู้นานกว่าห้องปกติ

---

# 10. EXP & Item Drop System

```text
Enemy Death → EXP Crystal / Item Drop → Player Collect
    → EXP Bar increases → ถึง Threshold → Level Up
```

* EXP Bar แสดงด้านบนหน้าจอ
* Currency สำหรับ Shop Room ดรอปแยกจาก EXP (เก็บเฉพาะใน Run เดียว หมดเมื่อ Run จบ)

---

# 11. Level Up System

Level Up → Pause เกมชั่วคราว → แสดง 3 ตัวเลือก (อาวุธใหม่ / อัปเกรดอาวุธเดิม / Passive) → เลือก 1 → Resume

```text
LEVEL UP

┌───────────────────┐
│ 🗡️ Spinning Blade │  (อาวุธใหม่)
└───────────────────┘

┌───────────────────┐
│ 🔥 Lightning Lv.2 │  (อัปเกรดอาวุธที่มีอยู่)
└───────────────────┘

┌───────────────────┐
│ 💎 Magnet Core     │  (Passive ใหม่)
└───────────────────┘
```

---

# 12. Game States

```text
MAIN_MENU
    ↓
RUN_START
    ↓
ROOM_ENTER (Combat/Elite/Treasure/Shop/Rest/Mystery/Boss)
    ↓
IN_ROOM (Combat resolving / Level Up popups)
    ↓
ROOM_CLEARED → DOOR_SELECT
    ↓
(loop จนถึง Boss Room)
    ↓
GAME_OVER หรือ FLOOR_CLEAR
    ↓
META_PROGRESS
    ↓
MAIN_MENU
```

เพิ่มเติม: `PAUSED`, `VICTORY`

---

# 13. Main Menu

```text
GAME TITLE

Meta Level
Meta EXP

Permanent Upgrades (list)

[ PLAY ]
[ UPGRADES ]
[ SETTINGS ]
```

ไม่ต้องมีระบบ Login/Account

---

# 14. Game HUD

```text
┌────────────────────────────────────┐
│ HP ████████████████                │
│ EXP ███████░░░░░░░     LV. 8       │
│                Room 6 / [Total]    │  ← Total = จำนวนห้องจริงของ Floor นี้ (8-12)
│                                    │
│             PLAYER                 │
│                                    │
│       Enemy      Enemy             │
│                                    │
│  [Mini-map: node graph มุมจอ]      │
└────────────────────────────────────┘
```

HUD ต้องไม่บัง Gameplay — Mini-map แสดงห้องที่ผ่านมาแล้ว + ทางเลือกถัดไป

---

# 15. Game Over

```text
GAME OVER

Rooms Cleared
Enemies Defeated
Elites Defeated
Floor Reached
Boss Defeated (Y/N)

Meta EXP Earned

[ CONTINUE ]
```

หลังกด Continue:
```text
Meta EXP → Meta Level Calculation → Permanent Reward → Main Menu
```

Bonus (แนะนำเพื่อ retention): แสดง Best Run ที่เคยทำได้ เช่น "Best: Floor 2, Room 9" เพื่อกระตุ้นให้เล่นต่อทันที

---

# 16. Save System

ใช้กลไก Save ตามที่ระบุใน Section 19 (**PlayerPrefs หรือ JSON ผ่าน `Application.persistentDataPath`**
— ห้ามใช้ `localStorage` เพราะนี่คือ Unity ไม่ใช่เว็บแอป) บันทึกเฉพาะ:
```text
Meta Level
Meta EXP
Permanent Upgrades (list ของที่ปลดล็อคแล้ว)
Unlocked Weapons (2 ชิ้นที่ล็อคไว้ตอนแรก ตาม Section 8.1)
Unlocked Characters
Best Run Stats
```

ไม่ Save Run กลางคัน — ปิดเกมระหว่าง Run = Run หาย (ต้องเริ่ม Run ใหม่ทุกครั้งที่เปิดเกม)

---

# 17. UI/UX Principles

* UI น้อย, อ่านง่าย, ไม่มีเมนูซับซ้อน
* ผู้เล่นต้องเข้าใจตัวเลือกห้อง/ไอเทมภายในไม่กี่วินาที
* Combat และการเดินสำรวจห้องต้องเป็นจุดสนใจหลัก
* Feedback ตอนโจมตี/เคลียร์ห้องต้องชัดเจน (juice)
* Level Up และ Room Clear ต้องรู้สึก Rewarding
* Game Over ต้องแสดง Progression ที่ได้รับอย่างชัดเจน

---

# 18. Visual Direction

**Dark Fantasy / Pixel Art / Minimal 2D**

* Dark background, ห้องแต่ละห้องแยกด้วยขอบเขต/ผนังชัดเจน
* Bright projectiles, Clear enemy silhouettes
* Simple particles, Strong contrast, Minimal UI
* ไม่ต้องใช้ 3D, ไม่ต้อง animation ซับซ้อน

---

# 19. Technical Direction

**Engine: Unity (2D URP หรือ Built-in 2D template)**

```text
Unity 2022 LTS หรือใหม่กว่า
C# (.NET Standard 2.1)
2D Physics (Rigidbody2D, Collider2D)
Input System (New Input System package แนะนำ)
TextMeshPro (สำหรับ UI ทั้งหมด)
PlayerPrefs หรือ JSON file (Application.persistentDataPath) สำหรับ Save
Build Target: WebGL (สำหรับ deploy ขึ้น itch.io)
```

ไม่จำเป็นต้องมี Backend, Database, Authentication, Multiplayer, Cloud Save

**ข้อจำกัดของ WebGL Build ที่ต้องคำนึงถึงตั้งแต่ต้น:**
* ไม่รองรับ multi-threading เต็มรูปแบบ — หลีกเลี่ยง Job System/Burst แบบหนักๆ ถ้าไม่จำเป็น
* คุมขนาด asset (Texture, Audio) ให้เบา เพราะโหลดผ่านเบราว์เซอร์
* PlayerPrefs ใช้งานได้ปกติใน WebGL (เก็บลง browser storage ให้อัตโนมัติ)
* หลีกเลี่ยง `System.IO` การเขียนไฟล์ตรงๆ ที่ไม่รองรับใน WebGL — ใช้ PlayerPrefs หรือ Unity's persistentDataPath ผ่าน UnityWebRequest ถ้าจำเป็นต้องใช้ไฟล์จริง

---

# 20. Recommended Project Structure (Unity)

```text
/UnityProject
│
├── Assets/
│   │
│   ├── Scenes/
│   │   ├── MainMenu.unity
│   │   └── Game.unity              # scene หลักที่ run ทั้งเกม (โหลด room แบบ additive หรือจัดการภายใน)
│   │
│   ├── Scripts/
│   │   ├── Core/
│   │   │   ├── GameManager.cs      # จัดการ Game State (Section 12)
│   │   │   ├── SaveSystem.cs       # PlayerPrefs / JSON save-load
│   │   │   └── GameEvents.cs       # Event/Action กลาง ใช้สื่อสารข้าม system
│   │   │
│   │   ├── Player/
│   │   │   ├── PlayerController.cs # Movement (Section 5)
│   │   │   ├── PlayerStats.cs      # HP, Damage, Speed ฯลฯ
│   │   │   └── PlayerHealth.cs
│   │   │
│   │   ├── Enemy/
│   │   │   ├── EnemyBase.cs
│   │   │   ├── EnemyBasic.cs
│   │   │   ├── EnemyFast.cs
│   │   │   ├── EnemyElite.cs
│   │   │   └── BossController.cs
│   │   │
│   │   ├── Weapons/
│   │   │   ├── WeaponBase.cs       # abstract class ให้อาวุธทุกชนิด inherit
│   │   │   ├── SpinningBlade.cs
│   │   │   ├── HomingOrb.cs
│   │   │   ├── LightningChain.cs
│   │   │   ├── ... (อาวุธอื่นตาม Section 8.1)
│   │   │   └── WeaponEvolutionManager.cs
│   │   │
│   │   ├── Passives/
│   │   │   └── PassiveItemBase.cs  # + ไฟล์ passive แต่ละตัว (Section 8.2)
│   │   │
│   │   ├── Rooms/
│   │   │   ├── RoomGenerator.cs    # สุ่ม node graph (Section 6.1)
│   │   │   ├── RoomController.cs   # จัดการ state ของห้องปัจจุบัน (lock/unlock door)
│   │   │   ├── DoorTrigger.cs
│   │   │   └── MapUI.cs            # mini-map rendering (Section 14)
│   │   │
│   │   ├── Progression/
│   │   │   ├── LevelUpManager.cs   # สุ่ม 3 ตัวเลือก (Section 11)
│   │   │   └── MetaProgression.cs  # Meta EXP/Level (Section 4)
│   │   │
│   │   └── UI/
│   │       ├── MainMenuUI.cs
│   │       ├── HUDController.cs
│   │       ├── LevelUpPanel.cs
│   │       └── GameOverPanel.cs
│   │
│   ├── Prefabs/
│   │   ├── Player.prefab
│   │   ├── Enemies/
│   │   ├── Weapons/
│   │   ├── Rooms/                  # room template prefabs แต่ละประเภท
│   │   └── UI/
│   │
│   ├── Art/
│   │   ├── Sprites/
│   │   ├── Animations/
│   │   └── Particles/
│   │
│   └── Audio/
│       ├── SFX/
│       └── Music/
│
├── Packages/                        # Unity Package Manager dependencies
└── ProjectSettings/
```

---

# 21. MVP Scope

* [ ] Main Menu
* [ ] Player Movement
* [ ] Room Node Graph Generation (สุ่ม layout ต่อ Floor)
* [ ] Door Selection UI (icon ห้องปลายทาง)
* [ ] Room Types: Combat / Elite / Treasure / Shop / Rest / Boss (Mystery เป็น optional)
* [ ] Enemy Spawn ต่อห้อง
* [ ] Enemy Follow AI
* [ ] Auto Attack (อย่างน้อย 3 อาวุธจาก Pool)
* [ ] Projectile System
* [ ] Enemy HP/Death, EXP Drop
* [ ] EXP Collection, Run Level, Level Up
* [ ] 3 Upgrade Choices (อาวุธใหม่/อัปเกรด/Passive)
* [ ] Difficulty Scaling ตาม Room/Floor
* [ ] Boss Room + Boss Fight
* [ ] Game Over Screen
* [ ] Meta EXP → Meta Level → Permanent Upgrade
* [ ] Save System (PlayerPrefs/JSON ตาม Section 16)
* [ ] Restart / New Run

---

# 22. Explicitly Out of Scope (MVP)

* Multiplayer, Online Account, Cloud Save
* Inventory/Crafting แบบซับซ้อน
* Quest System, NPC (นอกจาก Shop keeper แบบง่าย), Dialogue System
* Skill Tree ขนาดใหญ่, Character Creator
* Procedural 3D Map, Complex Enemy AI
* Large Item Database (เริ่มจาก 8 อาวุธเปิดตั้งแต่ต้น + 2 อาวุธปลดล็อคผ่าน Meta Level + 6 Passive ก็พอ ตาม Section 8)
* Multiple Floor ที่ซับซ้อน (MVP ทำ 1 Floor ให้จบสมบูรณ์ก่อน ค่อยขยาย)

---

# 23. Build & Deployment (itch.io)

```text
Unity Editor
    ↓
File → Build Settings → เพิ่ม Platform: WebGL
    ↓
Player Settings → ตั้งค่า Resolution/Compression (Brotli แนะนำ, เบาสุด)
    ↓
Build → ได้ output เป็นโฟลเดอร์ (index.html, Build/, TemplateData/)
    ↓
บีบอัดทั้งโฟลเดอร์เป็น .zip
    ↓
อัปโหลดขึ้น itch.io: New Project → Kind of project: HTML
    → Upload ไฟล์ .zip → ติ๊ก "This file will be played in the browser"
    → ตั้งค่า viewport width/height ให้ตรงกับที่ build มา
    ↓
เผยแพร่ (Publish)
```

**ข้อควรระวังตอน Build WebGL:**
* Compression Format เลือก **Gzip** ถ้า itch.io แสดงปัญหาเรื่อง server ไม่รองรับ Brotli (itch.io serve ไฟล์ static ธรรมดา ไม่ได้ตั้งค่า header บางอย่างให้เอง)
* ปิด "Decompression Fallback" ใน Player Settings ถ้าเจอปัญหาโหลดไม่ขึ้นบน itch.io
* เทสในเบราว์เซอร์จริงก่อน publish เสมอ (บาง feature ที่ทำงานใน Editor อาจพังใน WebGL เช่น multi-thread, file I/O)

---

# 24. Definition of Done

```text
เปิดเกม (ใน Unity Editor หรือ Build ที่รันแล้ว) → เห็น Main Menu (Meta Level) → กด PLAY
    → เข้าห้องเริ่มต้น → เลือกประตู → เดินเข้าห้อง Combat
    → Auto-Attack เคลียร์ศัตรู → เก็บ EXP → Level Up → เลือกอาวุธ/ไอเทม
    → ประตูเปิด → เดินต่อไปเรื่อยๆ ผ่าน Elite/Treasure/Shop/Rest
    → ศัตรูแข็งแกร่งขึ้นตาม Room/Floor
    → เข้าห้อง Boss → ต่อสู้ → ตาย (หรือชนะ)
    → ได้รับ Meta EXP → Meta Level เพิ่ม → ได้รับ Permanent Upgrade
    → กลับ Main Menu → กด PLAY อีกครั้ง → รู้สึกได้ว่าตัวละครแข็งแกร่งขึ้น
    → และรอบนี้ห้องที่เจอก็สุ่มมาไม่เหมือนเดิม
    → Build WebGL สำเร็จ → อัปโหลดขึ้น itch.io → เล่นผ่านเบราว์เซอร์ได้จริงเหมือนใน Editor
```

**Core Experience:**

> Enter Room → Auto-Fight → Loot → Choose Door → Build Up → Boss → Die/Win → Progress → Play Again
