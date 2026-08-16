# Within-City Trips — Pricing (English)

**Service (EN):** Within-city trips  
**Service (AR):** مشاوير داخل المدينة  
**Trip type in app:** Hourly · destination **Internal** (`internal`)  
**Cars:** Ford Taurus 2026 · Toyota Camry 2026 · Hyundai Staria 2026 · GMC 2026 · Toyota Hiace 2026  
**Currency:** SAR  
**Cities:** Taif · Makkah · Jeddah · Madinah  

**Notes**
- Package price = **total for the selected hours** (from trip start), not only rate × hours.
- Same **Internal** matrix powers Ziyarat tours (see `religious-sites-tours-prices-en.md`).
- **4 Hours** = sheet جولات مزارات دينية; **8 / 12** scaled from that base.
- Full cross-city hourly packages: `hourly-rental-prices-en.md`.

---

## Hourly rates (SAR / hour) — legacy reference for cross-city packages

| Car | 4 Hours | 8 Hours | 12 Hours |
|-----|--------:|--------:|---------:|
| Ford Taurus 2026 | 80 | 70 | 65 |
| Toyota Camry 2026 | 70 | 60 | 55 |
| Hyundai Staria 2026 | 95 | 85 | 80 |
| GMC 2026 | 115 | 105 | 100 |
| Toyota Hiace 2026 | 110 | 100 | 95 |

---

## Internal package totals by city (SAR)

### 4 Hours

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

## How to book in the app

1. Select **Hourly**
2. **From** = city (Taif / Makkah / Jeddah / Madinah)
3. **Destination** = trips within the city (Internal)
4. Choose **4 / 8 / 12 hours** + car → Search

**Superadmin:** `/admin/within-city` · `/admin/ziyarat`  
**Data:** `src/data/hourlyPricing.js` → `ZIYARAT_INTERNAL_PRICES` / `HOURLY_PRICE_MATRIX[*][*].internal`

---

*Source: مشاوير داخل المدينة / جولات مزارات دينية (Internal)*  
*File: `docs/within-city-trips-prices-en.md`*
