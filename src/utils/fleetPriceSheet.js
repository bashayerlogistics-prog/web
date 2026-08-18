import {
  FLEET_SERVICES,
  FLEET_CARS,
  carKeyOf,
  hoursFromRouteId,
  buildNewFleetProduct,
} from '../data/adminFleetServices';
import { getCarDisplayName } from '../data/staticData';

/** Five Excel sheets = five booking sections. Same SAR feeds all 3 homepage forms. */
export const PRICE_SHEET_SECTIONS = [
  {
    sheet: '1_Between_Cities',
    services: ['cityToCity'],
    sectionEn: 'Between Cities',
    sectionAr: 'التنقل بين المدن',
    forms: 'Form 1 + 2 — Moving Between Cities',
  },
  {
    sheet: '2_One_Way',
    services: ['airport'],
    sectionEn: 'One Way',
    sectionAr: 'اتجاه واحد',
    forms: 'Form 1 + 2 — One Way (airport pickup)',
  },
  {
    sheet: '3_Round_Trip',
    services: ['train'],
    sectionEn: 'Round Trip',
    sectionAr: 'ذهاب وعودة',
    forms: 'Form 1 + 2 — Round Trip (train). Airport round-trip is sheet 2.',
  },
  {
    sheet: '4_Hourly',
    services: ['hourly', 'withinCity'],
    sectionEn: 'Hourly',
    sectionAr: 'بالساعة',
    forms: 'Form 1 + 2 — Hourly / within city',
  },
  {
    sheet: '5_Ziyarat',
    services: ['ziyarat'],
    sectionEn: 'Ziyarat',
    sectionAr: 'الزيارات',
    forms: 'Form 3 — Religious tours',
  },
];

export const PRICE_SHEET_HEADERS = [
  'productId',
  'service',
  'routeId',
  'routeEn',
  'routeAr',
  'car',
  'carEn',
  'hours',
  'price',
  'originalPrice',
  'pickupPrice',
  'dropoffPrice',
  'hidePrice',
  'active',
];

const README_ROWS = [
  ['Bashayer Logistics — bulk SAR prices'],
  ['One file updates all 3 homepage booking forms (Booking, Instant Price, Ziyarat).'],
  ['Edit only: price, originalPrice, pickupPrice, dropoffPrice, hidePrice, active.'],
  ['Do not change productId, service, routeId, or car.'],
  ['hidePrice / active: yes or no'],
  ['After Excel: save this .xlsx, then Upload on Super Admin → Booking forms.'],
  ['Custom Price (Your Price) has no fleet SAR — customers type their own quote.'],
  [],
  ['Sheet', 'Section', 'Forms'],
  ...PRICE_SHEET_SECTIONS.map((s) => [s.sheet, `${s.sectionEn} / ${s.sectionAr}`, s.forms]),
];

function yesNo(value) {
  return value === false || value === 'no' || value === 'NO' || value === 0 || value === '0'
    ? 'no'
    : 'yes';
}

function parseYesNo(value, fallback = true) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  if (['no', 'n', 'false', '0', 'off', 'hidden'].includes(raw)) return false;
  if (['yes', 'y', 'true', '1', 'on', 'visible'].includes(raw)) return true;
  return fallback;
}

function num(value, fallback = 0) {
  if (value === '' || value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function productMatchKey(serviceId, routeId, car, hours) {
  const hr = hours ? String(hours) : '';
  return `${serviceId}::${routeId}::${car}::${hr}`;
}

function liveKey(product, serviceId) {
  const car = carKeyOf(product);
  const hours = product.hours || hoursFromRouteId(product.routeId, '');
  return productMatchKey(serviceId, product.routeId, car, hours || '');
}

function rowFromProduct(product, service, route) {
  const car = carKeyOf(product) || service.defaultCar;
  const hours = service.layout === 'hourly'
    ? (Number(product.hours) || hoursFromRouteId(product.routeId, 4))
    : '';
  return {
    productId: product.id || '',
    service: service.id,
    routeId: product.routeId || route?.id || '',
    routeEn: route?.label?.en || product.nameEn || product.routeId || '',
    routeAr: route?.label?.ar || product.nameAr || '',
    car,
    carEn: getCarDisplayName(car, 'en'),
    hours,
    price: Number(product.price) || 0,
    originalPrice: Number(product.originalPrice) || Number(product.price) || 0,
    pickupPrice: Number(product.pickupPrice) || 0,
    dropoffPrice: Number(product.dropoffPrice) || 0,
    hidePrice: product.hidePrice ? 'yes' : 'no',
    active: product.active === false ? 'no' : 'yes',
  };
}

function emptyRow(service, route, car, hours) {
  return {
    productId: '',
    service: service.id,
    routeId: route.id,
    routeEn: route.label?.en || route.id,
    routeAr: route.label?.ar || '',
    car,
    carEn: getCarDisplayName(car, 'en'),
    hours: hours || '',
    price: '',
    originalPrice: '',
    pickupPrice: '',
    dropoffPrice: '',
    hidePrice: 'no',
    active: 'yes',
  };
}

export function buildPriceSheetData(products = []) {
  const byService = {};
  for (const product of products) {
    for (const service of Object.values(FLEET_SERVICES)) {
      if (!service.matchProduct(product)) continue;
      const list = byService[service.id] || (byService[service.id] = []);
      list.push(product);
      break;
    }
  }

  const sheets = PRICE_SHEET_SECTIONS.map((section) => {
    const rows = [];
    const seen = new Set();
    for (const serviceId of section.services) {
      const service = FLEET_SERVICES[serviceId];
      if (!service) continue;
      const routes = service.getRoutes() || [];
      const live = byService[serviceId] || [];
      const liveByKey = new Map(live.map((p) => [liveKey(p, serviceId), p]));

      for (const route of routes) {
        const hours = service.layout === 'hourly' ? hoursFromRouteId(route.id, 4) : '';
        for (const car of service.cars || FLEET_CARS) {
          const key = productMatchKey(serviceId, route.id, car, hours || '');
          if (seen.has(key)) continue;
          seen.add(key);
          const hit = liveByKey.get(key)
            || live.find((p) => p.routeId === route.id && carKeyOf(p) === car);
          rows.push(hit ? rowFromProduct(hit, service, route) : emptyRow(service, route, car, hours));
        }
      }

      for (const product of live) {
        const car = carKeyOf(product);
        const hours = product.hours || hoursFromRouteId(product.routeId, '');
        const key = productMatchKey(serviceId, product.routeId, car, hours || '');
        if (seen.has(key)) continue;
        seen.add(key);
        const route = routes.find((r) => r.id === product.routeId);
        rows.push(rowFromProduct(product, service, route));
      }
    }
    return { ...section, rows };
  });

  return sheets;
}

function rowToAoA(row) {
  return PRICE_SHEET_HEADERS.map((key) => row[key] ?? '');
}

export async function downloadFleetPriceWorkbook(products, filename = 'bashayer-booking-prices.xlsx') {
  const mod = await import('xlsx');
  const XLSX = mod.default || mod;
  const wb = XLSX.utils.book_new();
  const readme = XLSX.utils.aoa_to_sheet(README_ROWS);
  readme['!cols'] = [{ wch: 22 }, { wch: 36 }, { wch: 52 }];
  XLSX.utils.book_append_sheet(wb, readme, 'README');

  const sheets = buildPriceSheetData(products);
  for (const sheet of sheets) {
    const aoa = [PRICE_SHEET_HEADERS, ...sheet.rows.map(rowToAoA)];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = PRICE_SHEET_HEADERS.map((h) => ({
      wch: h === 'routeEn' || h === 'routeAr' ? 36 : h === 'productId' ? 22 : 14,
    }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.sheet);
  }

  XLSX.writeFile(wb, filename);
  return sheets.reduce((n, s) => n + s.rows.length, 0);
}

function normalizeHeader(value) {
  return String(value || '').trim().replace(/\s+/g, '').toLowerCase();
}

const HEADER_ALIASES = {
  productid: 'productId',
  service: 'service',
  routeid: 'routeId',
  routeen: 'routeEn',
  routear: 'routeAr',
  car: 'car',
  caren: 'carEn',
  hours: 'hours',
  price: 'price',
  originalprice: 'originalPrice',
  pickupprice: 'pickupPrice',
  dropoffprice: 'dropoffPrice',
  hideprice: 'hidePrice',
  active: 'active',
};

function objectsFromSheet(XLSX, ws) {
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
  if (!aoa.length) return [];
  const headerIndex = aoa.findIndex((line) => (
    Array.isArray(line)
    && line.some((cell) => HEADER_ALIASES[normalizeHeader(cell)])
  ));
  if (headerIndex < 0) return [];
  const headers = aoa[headerIndex].map((cell) => HEADER_ALIASES[normalizeHeader(cell)] || '');
  const rows = [];
  for (const line of aoa.slice(headerIndex + 1)) {
    if (!Array.isArray(line) || !line.some((cell) => String(cell ?? '').trim())) continue;
    const row = {};
    headers.forEach((key, i) => {
      if (key) row[key] = line[i];
    });
    if (row.routeId || row.productId) rows.push(row);
  }
  return rows;
}

export async function parseFleetPriceWorkbook(file) {
  const mod = await import('xlsx');
  const XLSX = mod.default || mod;
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const rows = [];
  for (const name of wb.SheetNames) {
    if (String(name).toUpperCase() === 'README') continue;
    rows.push(...objectsFromSheet(XLSX, wb.Sheets[name]));
  }
  return rows;
}

function sameNumber(a, b) {
  return Number(a || 0) === Number(b || 0);
}

export function diffFleetPriceRows(incomingRows, liveProducts) {
  const liveById = new Map((liveProducts || []).map((p) => [p.id, p]));
  const liveByKey = new Map();
  for (const product of liveProducts || []) {
    for (const service of Object.values(FLEET_SERVICES)) {
      if (!service.matchProduct(product)) continue;
      liveByKey.set(liveKey(product, service.id), product);
      break;
    }
  }

  const updates = [];
  const creates = [];
  let unchanged = 0;
  let skipped = 0;

  for (const raw of incomingRows) {
    const serviceId = String(raw.service || '').trim();
    const service = FLEET_SERVICES[serviceId];
    const routeId = String(raw.routeId || '').trim();
    const car = String(raw.car || '').split('-')[0].trim();
    if (!service || !routeId || !car) {
      skipped += 1;
      continue;
    }
    const hours = service.layout === 'hourly'
      ? (num(raw.hours, hoursFromRouteId(routeId, 4)))
      : '';
    const price = num(raw.price, 0);
    if (!price && raw.price !== 0 && raw.price !== '0') {
      skipped += 1;
      continue;
    }

    const patch = {
      price,
      originalPrice: num(raw.originalPrice, price),
      hidePrice: parseYesNo(raw.hidePrice, false),
      active: parseYesNo(raw.active, true),
    };
    if (service.layout === 'round_trip') {
      patch.pickupPrice = num(raw.pickupPrice, 0);
      patch.dropoffPrice = num(raw.dropoffPrice, 0);
      if (!patch.price && (patch.pickupPrice || patch.dropoffPrice)) {
        patch.price = patch.pickupPrice + patch.dropoffPrice;
        patch.originalPrice = patch.price;
      }
    }
    if (service.layout === 'hourly') {
      patch.hours = hours || 4;
      patch.hourlyRate = patch.hours ? Math.round(patch.price / patch.hours) : 0;
    }

    const existing = (raw.productId && liveById.get(String(raw.productId).trim()))
      || liveByKey.get(productMatchKey(serviceId, routeId, car, hours || ''));

    if (existing) {
      const unchangedRow = sameNumber(existing.price, patch.price)
        && sameNumber(existing.originalPrice, patch.originalPrice)
        && Boolean(existing.hidePrice) === patch.hidePrice
        && (existing.active !== false) === patch.active
        && (service.layout !== 'round_trip'
          || (sameNumber(existing.pickupPrice, patch.pickupPrice)
            && sameNumber(existing.dropoffPrice, patch.dropoffPrice)))
        && (service.layout !== 'hourly' || sameNumber(existing.hours, patch.hours));
      if (unchangedRow) {
        unchanged += 1;
        continue;
      }
      updates.push({ id: existing.id, patch });
    } else {
      const payload = {
        ...buildNewFleetProduct(service, {
          car,
          routeId,
          price: patch.price,
          originalPrice: patch.originalPrice,
          hours: patch.hours,
        }),
        hidePrice: patch.hidePrice,
        active: patch.active,
      };
      if (service.layout === 'round_trip') {
        payload.pickupPrice = patch.pickupPrice;
        payload.dropoffPrice = patch.dropoffPrice;
      }
      creates.push(payload);
    }
  }

  return { updates, creates, unchanged, skipped };
}
