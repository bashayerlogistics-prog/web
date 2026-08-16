# Tours of Religious Sites (Ziyarat) — Pricing (English)

**Service (EN):** Tours of religious sites / Ziyarat  
**Service (AR):** جولات المواقع الدينية / جولات مزارات دينية  
**Booking type:** Hourly · destination **Internal** (within city)  
**Cars:** Ford Taurus 2026 · Toyota Camry 2026 · Hyundai Staria 2026 · GMC 2026 · Toyota Hiace 2026  
**Currency:** SAR  
**Cities:** Taif · Makkah · Jeddah · Madinah  

**Notes**
- Ziyarat uses the same **Internal** hourly totals as within-city trips (per city).
- **4 Hours** = live sheet totals; **8 / 12 Hours** scaled from that base with prior package ratios.
- Homepage packages pre-fill city + hours; live prices come from Internal hourly packages.
- Full hourly matrix (including cross-city): [hourly-rental-prices-en.md](./hourly-rental-prices-en.md)
- Within-city tables (all 4 cities): [within-city-trips-prices-en.md](./within-city-trips-prices-en.md)

---

## Clickable tour packages

| Package ID | City | Hours | Sites (EN) | From price (Camry, SAR) |
|------------|------|------:|------------|------------------------:|
| `makkah-ziyarat-4h` | Makkah | 4 | Hira Cave, Arafat, Mina, Jannat al-Mualla | 230 |
| `makkah-ziyarat-8h` | Makkah | 8 | Hira, Arafat, Muzdalifah, Mina, Masjid Aisha | 390 |
| `madinah-ziyarat-4h` | Madinah | 4 | Quba, Uhud, Qiblatain, Seven Mosques | 230 |
| `madinah-ziyarat-8h` | Madinah | 8 | Full Madinah circuit | 390 |
| `makkah-madinah-day-12h` | Makkah | 12 | Extended Makkah holy sites day | 540 |

*“From price” = Internal Camry total for that duration. Final quote depends on selected car.*

---

## All cars — Internal totals for Ziyarat (SAR)

### 4 Hours (sheet: جولات مزارات دينية)

| Car | Taif | Makkah | Jeddah | Madinah |
|-----|-----:|-------:|-------:|--------:|
| Ford Taurus 2026 | 550 | 250 | 250 | 250 |
| Toyota Camry 2026 | 500 | 230 | 230 | 230 |
| Hyundai Staria 2026 | 600 | 330 | 330 | 330 |
| GMC 2026 | 780 | 450 | 450 | 450 |
| Toyota Hiace 2026 | 800 | 450 | 450 | 450 |

### 8 Hours

| Car | Taif | Makkah | Jeddah | Madinah |
|-----|-----:|-------:|-------:|--------:|
| Ford Taurus 2026 | 960 | 440 | 440 | 440 |
| Toyota Camry 2026 | 860 | 390 | 390 | 390 |
| Hyundai Staria 2026 | 1070 | 590 | 590 | 590 |
| GMC 2026 | 1420 | 820 | 820 | 820 |
| Toyota Hiace 2026 | 1450 | 820 | 820 | 820 |

### 12 Hours

| Car | Taif | Makkah | Jeddah | Madinah |
|-----|-----:|-------:|-------:|--------:|
| Ford Taurus 2026 | 1340 | 610 | 610 | 610 |
| Toyota Camry 2026 | 1180 | 540 | 540 | 540 |
| Hyundai Staria 2026 | 1520 | 830 | 830 | 830 |
| GMC 2026 | 2040 | 1170 | 1170 | 1170 |
| Toyota Hiace 2026 | 2070 | 1170 | 1170 | 1170 |

---

## Form fields (homepage Religious Tours section)

| Field | Purpose |
|-------|---------|
| Tour package chips | Sets city + hours |
| City | Taif / Makkah / Jeddah / Madinah |
| Duration | 4 / 8 / 12 hours |
| Date / Time | Tour schedule |
| Passengers | Passenger count |
| Car | Fleet filter |
| Price quote | Live Internal hourly prices |

---

## Superadmin

1. `/admin/religious-tours` — section copy, background, package titles  
2. `/admin/ziyarat` — SAR prices (Makkah / Madinah Internal)  
3. `/admin/within-city` — SAR prices (Taif / Jeddah Internal)  
4. `/admin/sections` — toggle Religious Tours on/off  

**Data:** `src/data/religiousTours.js` (packages) + `src/data/hourlyPricing.js` (`ZIYARAT_INTERNAL_PRICES`)

---

*Source: جولات مزارات دينية*  
*Index: [README.md](./README.md)*
