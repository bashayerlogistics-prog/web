/** Built-in form behaviors — UI branches on `mode`, not on option `id`. */
export const BOOKING_TRIP_TYPE_MODES = [
  'between_cities',
  'one_way',
  'round_trip',
  'hourly',
  'custom_price',
];

/** Top hero booking + instant price share the same trip tabs. */
export const PRIMARY_TRIP_TYPE_FORMS = ['booking', 'instantPrice'];

export const BOOKING_TRIP_TYPE_FORMS = [...PRIMARY_TRIP_TYPE_FORMS, 'religiousTours'];

export const MAX_TRIP_TYPE_OPTIONS = 10;

/** Fields that can be shown/hidden + renamed per homepage form. */
export const BOOKING_FORM_FIELD_KEYS = [
  'from',
  'to',
  'pickupTime',
  'passengers',
  'car',
  'location',
  'hours',
  'price',
];

const FIELD_LABEL_DEFAULTS = {
  from: { labelEn: 'From', labelAr: 'من' },
  to: { labelEn: 'To', labelAr: 'إلى' },
  pickupTime: { labelEn: 'Pickup Time', labelAr: 'وقت الاستلام' },
  passengers: { labelEn: 'Passengers', labelAr: 'الركاب' },
  car: { labelEn: 'Car', labelAr: 'السيارة' },
  location: { labelEn: 'Location', labelAr: 'الموقع' },
  hours: { labelEn: 'Hours', labelAr: 'الساعات' },
  price: { labelEn: 'Price', labelAr: 'السعر' },
};

function makeField(key, show = true) {
  return {
    show,
    labelEn: FIELD_LABEL_DEFAULTS[key].labelEn,
    labelAr: FIELD_LABEL_DEFAULTS[key].labelAr,
  };
}

function makeFormFields(overrides = {}) {
  const fields = {};
  BOOKING_FORM_FIELD_KEYS.forEach((key) => {
    const base = makeField(key, overrides[key]?.show ?? true);
    fields[key] = { ...base, ...overrides[key], show: overrides[key]?.show ?? base.show };
  });
  return fields;
}

/** Default field visibility / labels for each of the 3 homepage forms. */
export const DEFAULT_FORM_FIELDS = {
  booking: makeFormFields(),
  instantPrice: makeFormFields({ location: { show: false } }),
  religiousTours: makeFormFields({
    from: { show: false },
    to: { show: false },
    location: { show: true },
    hours: { show: true },
    pickupTime: { show: true },
    price: { show: true },
  }),
};

const DEFAULT_FORMS_PRIMARY = { booking: true, instantPrice: true, religiousTours: false };

export const DEFAULT_BOOKING_TRIP_TYPE_OPTIONS = [
  {
    id: 'between_cities',
    mode: 'between_cities',
    labelEn: 'Moving Between Cities',
    labelAr: 'التنقل بين المدن',
    order: 0,
    active: true,
    builtin: true,
    forms: { ...DEFAULT_FORMS_PRIMARY },
  },
  {
    id: 'one_way',
    mode: 'one_way',
    labelEn: 'One Way',
    labelAr: 'اتجاه واحد',
    order: 1,
    active: true,
    builtin: true,
    forms: { booking: false, instantPrice: false, religiousTours: false },
  },
  {
    id: 'round_trip',
    mode: 'round_trip',
    labelEn: 'Round Trip',
    labelAr: 'ذهاب وعودة',
    order: 2,
    active: true,
    builtin: true,
    forms: { ...DEFAULT_FORMS_PRIMARY },
  },
  {
    id: 'hourly',
    mode: 'hourly',
    labelEn: 'Hourly',
    labelAr: 'بالساعة',
    order: 3,
    active: true,
    builtin: true,
    forms: { booking: true, instantPrice: true, religiousTours: true },
  },
  {
    id: 'custom_price',
    mode: 'custom_price',
    labelEn: 'Your Price',
    labelAr: 'رحلتك بسعرك',
    order: 4,
    active: true,
    builtin: true,
    forms: { ...DEFAULT_FORMS_PRIMARY },
  },
];

/** Public card headings for Form 1 (Forms 2–3 keep their own CMS docs). */
export const DEFAULT_FORM_HEADINGS = {
  booking: {
    titleEn: 'Book Airport · Train · Cities · Hourly',
    titleAr: 'احجز مطار · قطار · مدن · بالساعة',
    subtitleEn: 'Quick Booking',
    subtitleAr: 'حجز سريع',
  },
};

export const DEFAULT_BOOKING_TRIP_TYPES = {
  options: DEFAULT_BOOKING_TRIP_TYPE_OPTIONS.map((o) => ({
    ...o,
    forms: { ...o.forms },
  })),
  formFields: {
    booking: makeFormFields(DEFAULT_FORM_FIELDS.booking),
    instantPrice: makeFormFields(DEFAULT_FORM_FIELDS.instantPrice),
    religiousTours: makeFormFields(DEFAULT_FORM_FIELDS.religiousTours),
  },
  formHeadings: {
    booking: { ...DEFAULT_FORM_HEADINGS.booking },
  },
};

function sanitizeMode(mode) {
  return BOOKING_TRIP_TYPE_MODES.includes(mode) ? mode : 'between_cities';
}

function sanitizeForms(forms, fallback) {
  return {
    booking: forms?.booking ?? fallback?.booking ?? true,
    instantPrice: forms?.instantPrice ?? fallback?.instantPrice ?? true,
    religiousTours: forms?.religiousTours ?? fallback?.religiousTours ?? false,
  };
}

function sanitizeField(raw, fallback) {
  return {
    show: raw?.show ?? fallback?.show ?? true,
    labelEn: String(raw?.labelEn ?? fallback?.labelEn ?? '').trim() || fallback?.labelEn || '',
    labelAr: String(raw?.labelAr ?? fallback?.labelAr ?? '').trim() || fallback?.labelAr || '',
  };
}

export function sanitizeFormFields(rawFields) {
  const result = {};
  BOOKING_TRIP_TYPE_FORMS.forEach((formId) => {
    const defaults = DEFAULT_FORM_FIELDS[formId];
    const incoming = rawFields?.[formId] || {};
    result[formId] = {};
    BOOKING_FORM_FIELD_KEYS.forEach((key) => {
      const field = sanitizeField(incoming[key], defaults[key]);
      // Old default hid Price on Form 1; show it unless the admin renamed the field.
      if (
        key === 'price'
        && field.show === false
        && (!field.labelEn || field.labelEn === FIELD_LABEL_DEFAULTS.price.labelEn)
        && (!field.labelAr || field.labelAr === FIELD_LABEL_DEFAULTS.price.labelAr)
      ) {
        field.show = true;
      }
      result[formId][key] = field;
    });
  });
  return result;
}

function sanitizeHeading(raw, fallback) {
  return {
    titleEn: String(raw?.titleEn ?? fallback.titleEn ?? '').trim() || fallback.titleEn,
    titleAr: String(raw?.titleAr ?? fallback.titleAr ?? '').trim() || fallback.titleAr,
    subtitleEn: String(raw?.subtitleEn ?? fallback.subtitleEn ?? '').trim() || fallback.subtitleEn,
    subtitleAr: String(raw?.subtitleAr ?? fallback.subtitleAr ?? '').trim() || fallback.subtitleAr,
  };
}

export function sanitizeFormHeadings(raw) {
  return {
    booking: sanitizeHeading(raw?.booking, DEFAULT_FORM_HEADINGS.booking),
  };
}

export function getFormHeading(tripTypes, lang = 'en') {
  const heading = buildBookingTripTypesFromFirestore(tripTypes).formHeadings?.booking
    || DEFAULT_FORM_HEADINGS.booking;
  if (lang === 'ar') {
    return {
      title: heading.titleAr || heading.titleEn,
      subtitle: heading.subtitleAr || heading.subtitleEn,
    };
  }
  return {
    title: heading.titleEn || heading.titleAr,
    subtitle: heading.subtitleEn || heading.subtitleAr,
  };
}

export function isPrimaryFormActive(forms) {
  return forms?.booking !== false && forms?.instantPrice !== false;
}

export function setPrimaryForms(forms, active) {
  return {
    ...forms,
    booking: active,
    instantPrice: active,
  };
}

function normalizeOption(raw, index, fallbackById) {
  const id = String(raw?.id || '').trim() || `trip_${index + 1}`;
  const fallback = fallbackById.get(id);
  const mode = sanitizeMode(raw?.mode || fallback?.mode || id);
  return {
    id,
    mode,
    labelEn: String(raw?.labelEn ?? fallback?.labelEn ?? mode).trim() || mode,
    labelAr: String(raw?.labelAr ?? fallback?.labelAr ?? mode).trim() || mode,
    order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : index,
    active: raw?.active !== false,
    builtin: Boolean(fallback?.builtin || raw?.builtin),
    forms: sanitizeForms(raw?.forms, fallback?.forms),
    extraFields: Array.isArray(raw?.extraFields)
      ? raw.extraFields.filter((key) => BOOKING_FORM_FIELD_KEYS.includes(key))
      : [],
  };
}

/** Merge Firestore doc with defaults — keeps all 5 builtins, allows extras. */
export function buildBookingTripTypesFromFirestore(data) {
  const fallbackById = new Map(
    DEFAULT_BOOKING_TRIP_TYPE_OPTIONS.map((o) => [o.id, o]),
  );
  const incoming = Array.isArray(data?.options) ? data.options : [];
  const formFields = sanitizeFormFields(data?.formFields);
  const formHeadings = sanitizeFormHeadings(data?.formHeadings);

  if (!incoming.length) {
    return {
      options: DEFAULT_BOOKING_TRIP_TYPE_OPTIONS.map((o) => ({
        ...o,
        forms: { ...o.forms },
        extraFields: [],
      })),
      formFields,
      formHeadings,
    };
  }

  const seen = new Set();
  const normalized = incoming.slice(0, MAX_TRIP_TYPE_OPTIONS).map((raw, index) => {
    const opt = normalizeOption(raw, index, fallbackById);
    seen.add(opt.id);
    return opt;
  });

  DEFAULT_BOOKING_TRIP_TYPE_OPTIONS.forEach((builtin) => {
    if (!seen.has(builtin.id) && normalized.length < MAX_TRIP_TYPE_OPTIONS) {
      normalized.push({ ...builtin, forms: { ...builtin.forms }, extraFields: [] });
    }
  });

  normalized.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return {
    options: normalized.slice(0, MAX_TRIP_TYPE_OPTIONS),
    formFields,
    formHeadings,
  };
}

/** Active options for a public form (`booking` | `instantPrice` | `religiousTours`). */
export function getActiveTripTypesForForm(tripTypes, formId, lang = 'en') {
  const options = buildBookingTripTypesFromFirestore(tripTypes).options;
  return options
    .filter((o) => o.active && o.forms?.[formId] !== false)
    .sort((a, b) => a.order - b.order)
    .map((o) => ({
      value: o.mode,
      id: o.id,
      label: lang === 'ar' ? (o.labelAr || o.labelEn) : (o.labelEn || o.labelAr),
      labelEn: o.labelEn,
      labelAr: o.labelAr,
    }));
}

/** Field config for one public form — show flags + localized labels. */
export function getFormFieldsForForm(tripTypes, formId, lang = 'en') {
  const fields = buildBookingTripTypesFromFirestore(tripTypes).formFields[formId]
    || DEFAULT_FORM_FIELDS[formId]
    || makeFormFields();

  const mapped = {};
  BOOKING_FORM_FIELD_KEYS.forEach((key) => {
    const field = fields[key] || makeField(key);
    mapped[key] = {
      show: field.show !== false,
      label: lang === 'ar'
        ? (field.labelAr || field.labelEn)
        : (field.labelEn || field.labelAr),
      labelEn: field.labelEn,
      labelAr: field.labelAr,
    };
  });
  return mapped;
}

export function createTripTypeOption(partial = {}) {
  const mode = sanitizeMode(partial.mode || 'between_cities');
  const stamp = Date.now().toString(36);
  return {
    id: String(partial.id || `custom_${mode}_${stamp}`),
    mode,
    labelEn: partial.labelEn || mode,
    labelAr: partial.labelAr || mode,
    order: Number.isFinite(Number(partial.order)) ? Number(partial.order) : 99,
    active: partial.active !== false,
    builtin: false,
    forms: sanitizeForms(partial.forms),
    extraFields: Array.isArray(partial.extraFields) ? partial.extraFields : [],
  };
}

/** Persist pending trip tab when a lower form sends users to the hero booking form. */
export const PENDING_TRIP_TYPE_KEY = 'pendingTripType';

export function stashPendingTripType(mode) {
  try {
    sessionStorage.setItem(PENDING_TRIP_TYPE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function consumePendingTripType() {
  try {
    const value = sessionStorage.getItem(PENDING_TRIP_TYPE_KEY);
    if (value) sessionStorage.removeItem(PENDING_TRIP_TYPE_KEY);
    return value;
  } catch {
    return null;
  }
}
