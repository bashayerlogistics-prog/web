# Pricing Docs Index (English)

**Cars (5):** Ford Taurus 2026 · Toyota Camry 2026 · Hyundai Staria 2026 · GMC 2026 · Toyota Hiace 2026  
**Currency:** SAR  
**Booking types (4):** Moving Between Cities · Round Trip · Hourly · Your Price  

---

## Service → Booking type → Doc

| # | Service (EN) | Service (AR) | Booking type | English data tables |
|---|--------------|--------------|--------------|---------------------|
| 1 | Airport pickup & drop-off | الاستقبال والتوديع بالمطارات | **Round Trip** | [airport-pickup-dropoff-prices-en.md](./airport-pickup-dropoff-prices-en.md) |
| 2 | Train station pickup & drop-off | الاستقبال والتوديع بمحطات القطار | **Round Trip** | [round-trip-train-station-prices-en.md](./round-trip-train-station-prices-en.md) |
| 3 | Moving between cities | التنقل بين المدن | **One Way** | [between-cities-prices-en.md](./between-cities-prices-en.md) |
| 4 | Within-city trips | مشاوير داخل المدينة | **Hourly** (Internal) | [within-city-trips-prices-en.md](./within-city-trips-prices-en.md) |
| 5 | Religious sites / Ziyarat | جولات مزارات دينية | **Hourly** (Internal) | [religious-sites-tours-prices-en.md](./religious-sites-tours-prices-en.md) |
| 6 | Hourly rental with driver (4 / 8 / 12) | استئجار سيارة بالسائق | **Hourly** | [hourly-rental-prices-en.md](./hourly-rental-prices-en.md) |

---

## Superadmin pages

| Booking type | Admin path |
|--------------|------------|
| One Way (city → city) | `/admin/products` |
| Round Trip (airport + train) | `/admin/round-trip` |
| Hourly (within city + Ziyarat + packages) | `/admin/hourly` |
| Religious Tours (section copy / packages) | `/admin/religious-tours` |
| Your Price (client quotes) | `/admin/price-requests` |

---

## Data source files

| Doc | Code |
|-----|------|
| Airport | `src/data/airportPricing.js` |
| Train + Round Trip fleet | `src/data/staticData.js` |
| Between cities | `src/data/betweenCitiesPricing.js` |
| Hourly / within city / Ziyarat prices | `src/data/hourlyPricing.js` |
| Ziyarat packages (CMS) | `src/data/religiousTours.js` |

---

## Quick totals

| Item | Count |
|------|------:|
| Cars | **5** |
| Booking form types | **4** |
| Airport routes | **6** |
| Train station routes | **5** |
| Between-cities directed legs | **10** |
| Hourly durations | **3** (4 / 8 / 12) |
| Base cities (hourly) | **4** (Taif · Makkah · Jeddah · Madinah) |

---

*All English price tables below match the live sheet data used in Superadmin + Booking + Instant Price forms.*

**Arabic version (كامل بالعربية):** [README-ar.md](./README-ar.md)
