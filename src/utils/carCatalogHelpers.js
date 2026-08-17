import { BOOKING_CAR_TYPES } from '../data/staticData';

export const CAR_FORM_IDS = ['booking', 'instantPrice', 'religiousTours'];

export const DEFAULT_CAR_FORMS = {
  booking: true,
  instantPrice: true,
  religiousTours: true,
};

export function normalizeCarForms(forms) {
  return {
    booking: forms?.booking !== false,
    instantPrice: forms?.instantPrice !== false,
    religiousTours: forms?.religiousTours !== false,
  };
}

export function isCarOnForm(car, formId) {
  if (!car?.id || car.active === false) return false;
  return normalizeCarForms(car.forms)[formId] !== false;
}

/** Active car type ids for a booking form (booking | instantPrice | religiousTours). */
export function getCarTypesForForm(carCatalog, formId, fallbackTypes = BOOKING_CAR_TYPES) {
  const catalog = Array.isArray(carCatalog) ? carCatalog : [];
  const live = catalog
    .filter((c) => isCarOnForm(c, formId))
    .map((c) => String(c.id));
  if (!live.length) return [...fallbackTypes];
  const ordered = fallbackTypes.filter((id) => live.includes(id));
  const extras = live.filter((id) => !fallbackTypes.includes(id));
  return ordered.length ? [...ordered, ...extras] : live;
}

export function slugifyCarId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
