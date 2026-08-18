import { useEffect, useState } from 'react';
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  MapPin,
  Route,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import {
  CITY_FORM_KEYS,
  ROUTE_FORM_KEYS,
} from '../../data/bookingLocations';
import {
  BOOKING_FORM_FIELD_KEYS,
  BOOKING_TRIP_TYPE_MODES,
} from '../../data/bookingTripTypes';
import { useArabicAlertSound } from '../../hooks/useArabicAlertSound';

export const inputClass = 'admin-input w-full text-sm py-2.5 px-3 rounded-xl';

export function isOn(forms, key) {
  return forms?.[key] !== false;
}

export function isFormOn(forms, formId) {
  return forms?.[formId] !== false;
}

export function optionLabel(opt, lang) {
  if (lang === 'ar') return opt.labelAr || opt.labelEn || opt.mode;
  return opt.labelEn || opt.labelAr || opt.mode;
}

/** Fields shown under each trip section on the public form */
export const FIELDS_BY_TRIP_MODE = {
  between_cities: ['from', 'to', 'pickupTime', 'passengers', 'car'],
  one_way: ['from', 'pickupTime', 'passengers', 'car'],
  round_trip: ['from', 'to', 'pickupTime', 'passengers', 'car'],
  hourly: ['from', 'hours', 'location', 'passengers', 'car'],
  custom_price: ['passengers', 'car', 'price'],
};

export const PRIMARY_TRIP_SECTIONS = [
  { mode: 'between_cities', locationKey: 'betweenCities', dataType: 'cities' },
  { mode: 'one_way', locationKey: 'oneWay', dataType: 'routes' },
  { mode: 'round_trip', locationKey: 'roundTrip', dataType: 'routes' },
  { mode: 'hourly', locationKey: 'hourly', dataType: 'cities' },
  { mode: 'custom_price', locationKey: null, dataType: null },
];

const LOCATION_BY_MODE = Object.fromEntries(
  PRIMARY_TRIP_SECTIONS.map((section) => [section.mode, section]),
);

/** Cities/routes source for a trip section — Form 3 hourly uses Ziyarat cities. */
export function getSectionMeta(formId, mode) {
  if (formId === 'religiousTours' && mode === 'hourly') {
    return { mode, locationKey: 'ziyarat', dataType: 'cities' };
  }
  const found = LOCATION_BY_MODE[mode];
  return found
    ? { mode: found.mode, locationKey: found.locationKey, dataType: found.dataType }
    : { mode, locationKey: null, dataType: null };
}

export function fieldKeysForSection(mode, extraFields = []) {
  const base = FIELDS_BY_TRIP_MODE[mode] || [];
  const extra = (Array.isArray(extraFields) ? extraFields : []).filter(
    (key) => BOOKING_FORM_FIELD_KEYS.includes(key) && !base.includes(key),
  );
  return [...base, ...extra];
}

const ALERT_THEME = {
  success: {
    icon: CheckCircle2,
    ring: 'from-emerald-500 to-teal-500',
    iconBg: 'bg-emerald-500/15 text-emerald-600',
    btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  info: {
    icon: Info,
    ring: 'from-sky-500 to-indigo-500',
    iconBg: 'bg-sky-500/15 text-sky-600',
    btn: 'bg-brand hover:bg-brand/90 text-white',
  },
  warning: {
    icon: AlertTriangle,
    ring: 'from-amber-500 to-orange-500',
    iconBg: 'bg-amber-500/15 text-amber-600',
    btn: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  danger: {
    icon: AlertTriangle,
    ring: 'from-red-500 to-rose-600',
    iconBg: 'bg-red-500/15 text-red-600',
    btn: 'bg-red-600 hover:bg-red-700 text-white',
  },
};

/** Success / info / confirm popup used across the booking-forms page. */
export function AdminAlertModal({
  open,
  type = 'info',
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}) {
  const theme = ALERT_THEME[type] || ALERT_THEME.info;
  const Icon = theme.icon;
  useArabicAlertSound(open, type === 'danger' ? 'warning' : type === 'success' ? 'success' : 'info');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-dark-900/55 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-alert-title"
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white dark:bg-dark-800 shadow-2xl animate-modal-in"
      >
        <div className={`h-1.5 bg-gradient-to-r ${theme.ring}`} />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 end-3 p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="px-6 pt-7 pb-6 text-center">
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${theme.iconBg}`}>
            <Icon className="h-7 w-7" />
          </div>
          <h3 id="admin-alert-title" className="text-lg font-black text-brand dark:text-white">
            {title}
          </h3>
          {body ? (
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-white/70">{body}</p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {cancelLabel ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/15 text-sm font-bold text-gray-600 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                {cancelLabel}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onConfirm || onClose}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg ${theme.btn}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LangLabel({ children, dir }) {
  return (
    <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-gray-500 dark:text-white/50">
      <span className={`rounded-md px-1.5 py-0.5 ${dir === 'rtl' ? 'bg-gold/15 text-gold-dark' : 'bg-brand/10 text-brand'}`}>
        {dir === 'rtl' ? 'AR' : 'EN'}
      </span>
      {children}
    </label>
  );
}

export function FieldRow({
  fieldKey,
  field,
  t,
  chipOn,
  chipOff,
  onUpdate,
}) {
  const [open, setOpen] = useState(false);
  const label = t(`admin.tripTypes.fieldNames.${fieldKey}`);
  const visible = field.show !== false;

  return (
    <div className={`rounded-xl border overflow-hidden transition-colors ${
      visible ? 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5' : 'border-dashed border-gray-200 bg-gray-50/80 dark:bg-white/[0.03] opacity-70'
    }`}>
      <div className="flex flex-wrap items-center gap-2 p-2.5">
        <span className="text-sm font-bold text-brand dark:text-white min-w-0 flex-1">{label}</span>
        <button
          type="button"
          onClick={() => onUpdate({ show: field.show === false })}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${
            visible ? chipOn : chipOff
          }`}
        >
          {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {visible ? t('admin.bookingForms.show') : t('admin.bookingForms.hide')}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-gray-200 dark:border-white/15 text-gray-600 dark:text-white/70 hover:bg-brand/5"
        >
          <Pencil className="w-3.5 h-3.5" />
          {t('admin.bookingForms.edit')}
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-gray-100 dark:border-white/10 px-3 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/70 dark:bg-black/20">
          <div>
            <LangLabel>{t('admin.bookingForms.labelEn')}</LangLabel>
            <input
              value={field.labelEn || ''}
              onChange={(e) => onUpdate({ labelEn: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <LangLabel dir="rtl">{t('admin.bookingForms.labelAr')}</LangLabel>
            <input
              value={field.labelAr || ''}
              onChange={(e) => onUpdate({ labelAr: e.target.value })}
              className={inputClass}
              dir="rtl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function FieldsBlock({
  formId,
  mode,
  extraFields = [],
  formFields,
  t,
  chipOn,
  chipOff,
  updateField,
  onAddField,
}) {
  const keys = fieldKeysForSection(mode, extraFields);
  const remaining = BOOKING_FORM_FIELD_KEYS.filter((key) => !keys.includes(key));
  if (!keys.length && !remaining.length) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </span>
          <div>
            <p className="text-xs font-black text-brand dark:text-white">
              {t('admin.bookingForms.fieldsBlock')}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-white/50">
              {t('admin.bookingForms.fieldsHint')}
            </p>
          </div>
        </div>
        {remaining.length > 0 && typeof onAddField === 'function' && (
          <select
            defaultValue=""
            onChange={(e) => {
              const key = e.target.value;
              if (key) {
                onAddField(key);
                e.target.value = '';
              }
            }}
            className="text-[11px] font-bold border border-brand/20 rounded-xl px-2.5 py-2 text-brand bg-white dark:bg-dark-800"
          >
            <option value="">{t('admin.bookingForms.addField')}</option>
            {remaining.map((key) => (
              <option key={key} value={key}>
                {t(`admin.tripTypes.fieldNames.${key}`)}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="space-y-2">
        {keys.map((key) => (
          <FieldRow
            key={`${formId}-${mode}-${key}`}
            fieldKey={key}
            field={formFields?.[formId]?.[key] || { show: true }}
            t={t}
            chipOn={chipOn}
            chipOff={chipOff}
            onUpdate={(patch) => updateField(formId, key, patch)}
          />
        ))}
      </div>
    </div>
  );
}

export function AddSectionBar({ t, disabled, newMode, setNewMode, onAdd }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-dashed border-brand/30 bg-gradient-to-r from-brand/[0.06] to-gold/[0.08] px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-brand dark:text-white">{t('admin.bookingForms.addSection')}</p>
        <p className="text-[11px] text-gray-500 dark:text-white/50 mt-0.5">{t('admin.bookingForms.addSectionHint')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={newMode}
          onChange={(e) => setNewMode(e.target.value)}
          className="admin-input text-sm py-2.5 px-3 min-w-[11rem] rounded-xl"
        >
          {BOOKING_TRIP_TYPE_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`admin.bookingForms.modes.${mode}`)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={disabled}
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-brand text-white shadow-lg shadow-brand/20 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        >
          <Plus className="w-4 h-4" />
          {t('admin.bookingForms.addSection')}
        </button>
      </div>
    </div>
  );
}

export function CityRow({
  city,
  formKey,
  lang,
  t,
  chipOn,
  chipOff,
  expandedId,
  setExpandedId,
  toggleLocationForm,
  updateCity,
  removeCity,
}) {
  const on = isOn(city.forms, formKey);
  const open = expandedId === `city:${city.id}:${formKey}`;
  const label = lang === 'ar' ? (city.ar || city.en) : (city.en || city.ar);
  const visible = on && city.active !== false;

  return (
    <div className={`rounded-xl border transition-colors ${
      city.active === false
        ? 'opacity-60 border-gray-100'
        : visible
          ? 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5'
          : 'border-dashed border-gray-200 bg-gray-50/70'
    }`}>
      <div className="flex flex-wrap items-center gap-2 p-2.5">
        <span className="text-[10px] font-black text-gray-400 shrink-0">#{city.id}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-brand dark:text-white truncate">{label}</p>
        </div>
        <button
          type="button"
          onClick={() => toggleLocationForm('city', city.id, formKey)}
          disabled={city.active === false}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border disabled:cursor-not-allowed ${
            visible ? chipOn : chipOff
          }`}
        >
          {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {visible ? t('admin.bookingForms.show') : t('admin.bookingForms.hide')}
        </button>
        <button
          type="button"
          onClick={() => setExpandedId(open ? null : `city:${city.id}:${formKey}`)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-gray-200 dark:border-white/15 text-gray-600 dark:text-white/70"
        >
          <Pencil className="w-3 h-3" />
          {t('admin.bookingForms.edit')}
        </button>
        {!city.builtin && (
          <button
            type="button"
            onClick={() => removeCity(city.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-600 bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      {open && (
        <div className="border-t border-gray-100 dark:border-white/10 px-3 py-3 space-y-3 bg-gray-50/70 dark:bg-black/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <LangLabel>{t('admin.bookingForms.labelEn')}</LangLabel>
              <input
                value={city.en || ''}
                onChange={(e) => updateCity(city.id, { en: e.target.value })}
                className={inputClass}
                placeholder={t('admin.bookingForms.labelEn')}
              />
            </div>
            <div>
              <LangLabel dir="rtl">{t('admin.bookingForms.labelAr')}</LangLabel>
              <input
                value={city.ar || ''}
                onChange={(e) => updateCity(city.id, { ar: e.target.value })}
                className={inputClass}
                dir="rtl"
                placeholder={t('admin.bookingForms.labelAr')}
              />
            </div>
          </div>
          <p className="text-[11px] font-bold text-gray-500">{t('admin.bookingForms.alsoShowIn')}</p>
          <div className="flex flex-wrap gap-1.5">
            {CITY_FORM_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleLocationForm('city', city.id, key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                  isOn(city.forms, key) ? chipOn : chipOff
                }`}
              >
                {t(`admin.bookingForms.sectionKeys.${key}`)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RouteRow({
  route,
  formKey,
  lang,
  t,
  chipOn,
  chipOff,
  expandedId,
  setExpandedId,
  toggleLocationForm,
  updateRoute,
  removeRoute,
}) {
  const on = isOn(route.forms, formKey);
  const open = expandedId === `route:${route.id}:${formKey}`;
  const label = lang === 'ar'
    ? (route.pickupLabelAr || route.pickupLabelEn)
    : (route.pickupLabelEn || route.pickupLabelAr);
  const visible = on && route.active !== false;

  return (
    <div className={`rounded-xl border transition-colors ${
      route.active === false
        ? 'opacity-60 border-gray-100'
        : visible
          ? 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5'
          : 'border-dashed border-gray-200 bg-gray-50/70'
    }`}>
      <div className="flex flex-wrap items-center gap-2 p-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-brand dark:text-white truncate">{label}</p>
          <p className="text-[10px] text-gray-500">
            {route.category === 'airport'
              ? t('admin.bookingForms.airport')
              : t('admin.bookingForms.train')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggleLocationForm('route', route.id, formKey)}
          disabled={route.active === false}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border disabled:cursor-not-allowed ${
            visible ? chipOn : chipOff
          }`}
        >
          {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
        <button
          type="button"
          onClick={() => setExpandedId(open ? null : `route:${route.id}:${formKey}`)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-gray-200 dark:border-white/15 text-gray-600"
        >
          <Pencil className="w-3 h-3" />
          {t('admin.bookingForms.edit')}
        </button>
        {!route.builtin && (
          <button
            type="button"
            onClick={() => removeRoute(route.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-600 bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      {open && (
        <div className="border-t border-gray-100 dark:border-white/10 px-3 py-3 space-y-3 bg-gray-50/70 dark:bg-black/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <LangLabel>{t('admin.bookingForms.pickupEn')}</LangLabel>
              <input
                value={route.pickupLabelEn || ''}
                onChange={(e) => updateRoute(route.id, { pickupLabelEn: e.target.value })}
                className={inputClass}
                placeholder={t('admin.bookingForms.pickupEn')}
              />
            </div>
            <div>
              <LangLabel dir="rtl">{t('admin.bookingForms.pickupAr')}</LangLabel>
              <input
                value={route.pickupLabelAr || ''}
                onChange={(e) => updateRoute(route.id, { pickupLabelAr: e.target.value })}
                className={inputClass}
                dir="rtl"
                placeholder={t('admin.bookingForms.pickupAr')}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ROUTE_FORM_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleLocationForm('route', route.id, key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                  isOn(route.forms, key) ? chipOn : chipOff
                }`}
              >
                {t(`admin.bookingForms.sectionKeys.${key}`)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TripSectionPanel({
  section,
  formId,
  tripOption,
  cities,
  routes,
  formFields,
  lang,
  t,
  chipOn,
  chipOff,
  expandedId,
  setExpandedId,
  toggleTripOnForm,
  updateOption,
  toggleLocationForm,
  updateCity,
  updateRoute,
  removeCity,
  removeRoute,
  onAddCity,
  onAddRoute,
  updateField,
  onDeleteSection,
  expanded = true,
  onToggle,
  index = 0,
}) {
  const { mode, locationKey, dataType } = section;
  const [tabOpen, setTabOpen] = useState(false);
  const tabOn = tripOption ? isFormOn(tripOption.forms, formId) : false;
  const tabDisabled = tripOption?.active === false;
  const canDelete = Boolean(onDeleteSection && tripOption && !tripOption.builtin);
  const visible = tabOn && !tabDisabled;

  const dataCount = dataType === 'cities'
    ? cities.filter((c) => c.active !== false && isOn(c.forms, locationKey)).length
    : dataType === 'routes'
      ? routes.filter((r) => r.active !== false && isOn(r.forms, locationKey)).length
      : 0;

  const addExtraField = (key) => {
    if (!tripOption || !key) return;
    const current = Array.isArray(tripOption.extraFields) ? tripOption.extraFields : [];
    if (current.includes(key) || (FIELDS_BY_TRIP_MODE[mode] || []).includes(key)) return;
    updateOption(tripOption.id, { extraFields: [...current, key] });
  };

  const DataIcon = dataType === 'routes' ? Route : MapPin;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-shadow ${
      expanded
        ? 'border-brand/25 shadow-lg shadow-brand/5 bg-white dark:bg-dark-800'
        : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-brand/30'
    }`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3.5 flex flex-wrap items-center gap-3 text-start bg-gradient-to-r from-brand/[0.04] to-transparent"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white text-xs font-black shrink-0">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black text-brand dark:text-white truncate">
            {tripOption ? optionLabel(tripOption, lang) : t(`admin.bookingForms.modes.${mode}`)}
          </h4>
          <p className="text-[11px] text-gray-500 dark:text-white/50 mt-0.5">
            {t(`admin.bookingForms.modes.${mode}`)}
            {dataType ? ` · ${dataCount} ${dataType === 'cities' ? t('admin.bookingForms.citiesShort') : t('admin.bookingForms.routesShort')}` : ''}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
          visible ? 'bg-emerald-500/15 text-emerald-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {visible ? t('admin.bookingForms.tabShow') : t('admin.bookingForms.tabHide')}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-white/10">
          {tripOption && (
            <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.03]">
              <button
                type="button"
                onClick={() => toggleTripOnForm(tripOption.id, formId)}
                disabled={tabDisabled}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border disabled:cursor-not-allowed ${
                  visible ? chipOn : chipOff
                }`}
              >
                {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {visible ? t('admin.bookingForms.tabShow') : t('admin.bookingForms.tabHide')}
              </button>
              <button
                type="button"
                onClick={() => setTabOpen((v) => !v)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-white/15 text-gray-600 dark:text-white/70 hover:bg-white"
              >
                <Pencil className="w-3.5 h-3.5" />
                {t('admin.bookingForms.renameTab')}
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDeleteSection(tripOption.id)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-red-200 text-red-600 bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('admin.bookingForms.deleteSection')}
                </button>
              )}
            </div>
          )}

          {tabOpen && tripOption && (
            <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-dark-800">
              <div>
                <LangLabel>{t('admin.bookingForms.labelEn')}</LangLabel>
                <input
                  value={tripOption.labelEn || ''}
                  onChange={(e) => updateOption(tripOption.id, { labelEn: e.target.value })}
                  className={inputClass}
                  placeholder={t('admin.bookingForms.labelEn')}
                />
              </div>
              <div>
                <LangLabel dir="rtl">{t('admin.bookingForms.labelAr')}</LangLabel>
                <input
                  value={tripOption.labelAr || ''}
                  onChange={(e) => updateOption(tripOption.id, { labelAr: e.target.value })}
                  className={inputClass}
                  dir="rtl"
                  placeholder={t('admin.bookingForms.labelAr')}
                />
              </div>
              {!tripOption.builtin && (
                <div className="sm:col-span-2">
                  <LangLabel>{t('admin.tripTypes.mode')}</LangLabel>
                  <select
                    value={tripOption.mode}
                    onChange={(e) => updateOption(tripOption.id, { mode: e.target.value })}
                    className={inputClass}
                  >
                    {BOOKING_TRIP_TYPE_MODES.map((item) => (
                      <option key={item} value={item}>
                        {t(`admin.bookingForms.modes.${item}`)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {dataType && (
            <div className="px-4 py-4 border-b border-gray-100 dark:border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15 text-gold-dark">
                    <DataIcon className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-black text-brand dark:text-white">
                      {dataType === 'cities'
                        ? t('admin.bookingForms.citiesData')
                        : t('admin.bookingForms.routesData')}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {t('admin.bookingForms.visibleCount', { count: dataCount })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => (dataType === 'cities' ? onAddCity(locationKey) : onAddRoute(locationKey))}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-bold bg-brand/10 text-brand hover:bg-brand/15"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {dataType === 'cities'
                    ? t('admin.bookingForms.addCity')
                    : t('admin.bookingForms.addRoute')}
                </button>
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pe-1">
                {dataType === 'cities' ? (
                  cities.map((city) => (
                    <CityRow
                      key={`${mode}-${city.id}`}
                      city={city}
                      formKey={locationKey}
                      lang={lang}
                      t={t}
                      chipOn={chipOn}
                      chipOff={chipOff}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                      toggleLocationForm={toggleLocationForm}
                      updateCity={updateCity}
                      removeCity={removeCity}
                    />
                  ))
                ) : (
                  routes.map((route) => (
                    <RouteRow
                      key={`${mode}-${route.id}`}
                      route={route}
                      formKey={locationKey}
                      lang={lang}
                      t={t}
                      chipOn={chipOn}
                      chipOff={chipOff}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                      toggleLocationForm={toggleLocationForm}
                      updateRoute={updateRoute}
                      removeRoute={removeRoute}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          <div className="px-4 py-4">
            <FieldsBlock
              formId={formId}
              mode={mode}
              extraFields={tripOption?.extraFields}
              formFields={formFields}
              t={t}
              chipOn={chipOn}
              chipOff={chipOff}
              updateField={updateField}
              onAddField={tripOption ? addExtraField : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}
