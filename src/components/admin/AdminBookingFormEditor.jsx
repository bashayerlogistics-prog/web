import { useState } from 'react';
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';
import {
  CITY_FORM_KEYS,
  ROUTE_FORM_KEYS,
} from '../../data/bookingLocations';
import { BOOKING_FORM_FIELD_KEYS } from '../../data/bookingTripTypes';

export const inputClass = 'admin-input w-full text-sm py-2.5';

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

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-2">
        <span className="text-xs font-bold text-brand min-w-0 flex-1">{label}</span>
        <button
          type="button"
          onClick={() => onUpdate({ show: field.show === false })}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border ${
            field.show !== false ? chipOn : chipOff
          }`}
        >
          {field.show !== false ? (
            <>
              <Eye className="w-3 h-3" />
              {t('admin.bookingForms.show')}
            </>
          ) : (
            <>
              <EyeOff className="w-3 h-3" />
              {t('admin.bookingForms.hide')}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border border-gray-200 text-gray-600"
        >
          <Pencil className="w-3 h-3" />
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-gray-100 px-2 py-2 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">
              {t('admin.bookingForms.labelEn')}
            </label>
            <input
              value={field.labelEn || ''}
              onChange={(e) => onUpdate({ labelEn: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">
              {t('admin.bookingForms.labelAr')}
            </label>
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
  formFields,
  t,
  chipOn,
  chipOff,
  updateField,
}) {
  const keys = FIELDS_BY_TRIP_MODE[mode] || [];
  if (!keys.length) return null;

  return (
    <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <SlidersHorizontal className="w-3.5 h-3.5 text-brand" />
        <p className="text-[11px] font-black uppercase tracking-wide text-brand">
          {t('admin.bookingForms.fieldsBlock')}
        </p>
      </div>
      <div className="space-y-1.5">
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

  return (
    <div className={`rounded-xl border bg-white ${city.active === false ? 'opacity-60 border-gray-100' : 'border-gray-200'}`}>
      <div className="flex flex-wrap items-center gap-2 p-2.5">
        <span className="text-[10px] font-black text-gray-400 shrink-0">#{city.id}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-brand truncate">{label}</p>
        </div>
        <button
          type="button"
          onClick={() => toggleLocationForm('city', city.id, formKey)}
          disabled={city.active === false}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border disabled:cursor-not-allowed ${
            on && city.active !== false ? chipOn : chipOff
          }`}
        >
          {on && city.active !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {on && city.active !== false ? t('admin.bookingForms.show') : t('admin.bookingForms.hide')}
        </button>
        <button
          type="button"
          onClick={() => setExpandedId(open ? null : `city:${city.id}:${formKey}`)}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold border border-gray-200 text-gray-600"
        >
          <Pencil className="w-3 h-3" />
        </button>
        {!city.builtin && (
          <button
            type="button"
            onClick={() => removeCity(city.id)}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-600 bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      {open && (
        <div className="border-t border-gray-100 px-2.5 py-2.5 space-y-2 bg-gray-50/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={city.en || ''}
              onChange={(e) => updateCity(city.id, { en: e.target.value })}
              className={inputClass}
              placeholder={t('admin.bookingForms.labelEn')}
            />
            <input
              value={city.ar || ''}
              onChange={(e) => updateCity(city.id, { ar: e.target.value })}
              className={inputClass}
              dir="rtl"
              placeholder={t('admin.bookingForms.labelAr')}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CITY_FORM_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleLocationForm('city', city.id, key)}
                className={`px-2 py-1 rounded text-[10px] font-bold border ${
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

  return (
    <div className={`rounded-xl border bg-white ${route.active === false ? 'opacity-60 border-gray-100' : 'border-gray-200'}`}>
      <div className="flex flex-wrap items-center gap-2 p-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-brand truncate">{label}</p>
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
            on && route.active !== false ? chipOn : chipOff
          }`}
        >
          {on && route.active !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
        <button
          type="button"
          onClick={() => setExpandedId(open ? null : `route:${route.id}:${formKey}`)}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold border border-gray-200 text-gray-600"
        >
          <Pencil className="w-3 h-3" />
        </button>
        {!route.builtin && (
          <button
            type="button"
            onClick={() => removeRoute(route.id)}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-600 bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      {open && (
        <div className="border-t border-gray-100 px-2.5 py-2.5 space-y-2 bg-gray-50/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={route.pickupLabelEn || ''}
              onChange={(e) => updateRoute(route.id, { pickupLabelEn: e.target.value })}
              className={inputClass}
              placeholder={t('admin.bookingForms.pickupEn')}
            />
            <input
              value={route.pickupLabelAr || ''}
              onChange={(e) => updateRoute(route.id, { pickupLabelAr: e.target.value })}
              className={inputClass}
              dir="rtl"
              placeholder={t('admin.bookingForms.pickupAr')}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ROUTE_FORM_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleLocationForm('route', route.id, key)}
                className={`px-2 py-1 rounded text-[10px] font-bold border ${
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
}) {
  const { mode, locationKey, dataType } = section;
  const [tabOpen, setTabOpen] = useState(false);
  const tabOn = tripOption ? isFormOn(tripOption.forms, formId) : false;
  const tabDisabled = tripOption?.active === false;

  const dataCount = dataType === 'cities'
    ? cities.filter((c) => c.active !== false && isOn(c.forms, locationKey)).length
    : dataType === 'routes'
      ? routes.filter((r) => r.active !== false && isOn(r.forms, locationKey)).length
      : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Tab name row */}
      <div className="px-4 py-3 bg-gradient-to-r from-brand/5 to-transparent border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-black text-brand flex-1 min-w-0">
            {tripOption ? optionLabel(tripOption, lang) : t(`admin.bookingForms.modes.${mode}`)}
          </h4>
          {tripOption && (
            <>
              <button
                type="button"
                onClick={() => toggleTripOnForm(tripOption.id, formId)}
                disabled={tabDisabled}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border disabled:cursor-not-allowed ${
                  tabOn && !tabDisabled ? chipOn : chipOff
                }`}
              >
                {tabOn && !tabDisabled ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    {t('admin.bookingForms.tabShow')}
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    {t('admin.bookingForms.tabHide')}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setTabOpen((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600"
              >
                <Pencil className="w-3.5 h-3.5" />
                {t('admin.bookingForms.renameTab')}
              </button>
            </>
          )}
        </div>
        {tabOpen && tripOption && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={tripOption.labelEn || ''}
              onChange={(e) => updateOption(tripOption.id, { labelEn: e.target.value })}
              className={inputClass}
              placeholder={t('admin.bookingForms.labelEn')}
            />
            <input
              value={tripOption.labelAr || ''}
              onChange={(e) => updateOption(tripOption.id, { labelAr: e.target.value })}
              className={inputClass}
              dir="rtl"
              placeholder={t('admin.bookingForms.labelAr')}
            />
          </div>
        )}
      </div>

      {/* Cities / routes data */}
      {dataType && (
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">
              {dataType === 'cities'
                ? t('admin.bookingForms.citiesData')
                : t('admin.bookingForms.routesData')}
              {' '}
              <span className="text-brand">({dataCount})</span>
            </p>
            <button
              type="button"
              onClick={() => (dataType === 'cities' ? onAddCity(locationKey) : onAddRoute(locationKey))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-brand/20 text-brand hover:bg-brand/5"
            >
              <Plus className="w-3 h-3" />
              {dataType === 'cities'
                ? t('admin.bookingForms.addCity')
                : t('admin.bookingForms.addRoute')}
            </button>
          </div>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
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

      {/* Form field labels */}
      <div className="px-4 py-3">
        <FieldsBlock
          formId={formId}
          mode={mode}
          formFields={formFields}
          t={t}
          chipOn={chipOn}
          chipOff={chipOff}
          updateField={updateField}
        />
      </div>
    </div>
  );
}

/** Form 3 — no trip sections, flat cities + fields */
export function ZiyaratFormPanel({
  formId,
  options,
  cities,
  formFields,
  lang,
  t,
  chipOn,
  chipOff,
  expandedId,
  setExpandedId,
  toggleTripOnForm,
  toggleLocationForm,
  updateCity,
  removeCity,
  onAddCity,
  updateField,
}) {
  const hourlyOpt = options.find((o) => o.mode === 'hourly');
  const ziyaratCities = cities;

  return (
    <div className="space-y-4">
      {hourlyOpt && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-brand flex-1">
            {optionLabel(hourlyOpt, lang)}
          </span>
          <button
            type="button"
            onClick={() => toggleTripOnForm(hourlyOpt.id, formId)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${
              isFormOn(hourlyOpt.forms, formId) ? chipOn : chipOff
            }`}
          >
            {isFormOn(hourlyOpt.forms, formId) ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                {t('admin.bookingForms.tabShow')}
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                {t('admin.bookingForms.tabHide')}
              </>
            )}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-black text-brand">{t('admin.bookingForms.ziyaratCities')}</p>
          <button
            type="button"
            onClick={() => onAddCity('ziyarat')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-brand/20 text-brand"
          >
            <Plus className="w-3 h-3" />
            {t('admin.bookingForms.addCity')}
          </button>
        </div>
        <div className="p-3 space-y-1.5 max-h-[320px] overflow-y-auto">
          {ziyaratCities.map((city) => (
            <CityRow
              key={`ziyarat-${city.id}`}
              city={city}
              formKey="ziyarat"
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
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
        <p className="text-[11px] font-black uppercase tracking-wide text-brand mb-2">
          {t('admin.bookingForms.fieldsBlock')}
        </p>
        <div className="space-y-1.5">
          {BOOKING_FORM_FIELD_KEYS.map((key) => (
            <FieldRow
              key={`ziyarat-field-${key}`}
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
    </div>
  );
}
