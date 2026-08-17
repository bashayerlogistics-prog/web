import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  Landmark,
  Calculator,
  Zap,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';
import {
  getBookingTripTypesSettings,
  updateBookingTripTypesSettings,
} from '../../firebase/admin';
import {
  DEFAULT_BOOKING_TRIP_TYPES,
  BOOKING_TRIP_TYPE_MODES,
  BOOKING_FORM_FIELD_KEYS,
  MAX_TRIP_TYPE_OPTIONS,
  buildBookingTripTypesFromFirestore,
  createTripTypeOption,
  sanitizeFormFields,
} from '../../data/bookingTripTypes';
import { useToast } from '../../context/ToastContext';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminApplyButton from '../../components/admin/AdminApplyButton';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const inputClass = 'admin-input w-full text-sm py-2.5';

const MODE_LABEL_KEYS = {
  between_cities: 'booking.betweenCities',
  one_way: 'booking.oneWay',
  round_trip: 'booking.roundTrip',
  hourly: 'booking.hourly',
  custom_price: 'booking.customPrice',
};

const FORM_META = [
  {
    id: 'booking',
    number: 1,
    Icon: Calculator,
    ring: 'ring-brand/30 border-brand/25 bg-brand/5',
    chipOn: 'bg-brand text-white border-brand',
    chipOff: 'bg-white text-gray-500 border-gray-200',
    headerBg: 'from-brand/10 dark:from-brand/30 to-transparent',
  },
  {
    id: 'instantPrice',
    number: 2,
    Icon: Zap,
    ring: 'ring-violet-200 border-violet-200 bg-violet-50/50 dark:ring-violet-400/25 dark:border-violet-400/25',
    chipOn: 'bg-violet-700 text-white border-violet-700',
    chipOff: 'bg-white text-gray-500 border-gray-200',
    headerBg: 'from-violet-100/80 dark:from-violet-900/45 to-transparent',
  },
  {
    id: 'religiousTours',
    number: 3,
    Icon: Landmark,
    ring: 'ring-gold/30 border-gold/30 bg-gold/5',
    chipOn: 'bg-amber-700 text-white border-amber-700',
    chipOff: 'bg-white text-gray-500 border-gray-200',
    headerBg: 'from-amber-50 dark:from-amber-950/55 to-transparent',
  },
];

function isFormOn(forms, formId) {
  return forms?.[formId] !== false;
}

function optionLabel(opt, lang) {
  if (lang === 'ar') return opt.labelAr || opt.labelEn || opt.mode;
  return opt.labelEn || opt.labelAr || opt.mode;
}

function FormFieldsPanel({
  formId,
  fields,
  t,
  updateField,
  chipOn,
  chipOff,
}) {
  const [openKey, setOpenKey] = useState(null);

  return (
    <div className="mt-4 pt-4 border-t border-black/5">
      <div className="flex items-center gap-2 mb-3">
        <SlidersHorizontal className="w-4 h-4 text-brand" />
        <h4 className="text-xs font-black uppercase tracking-wide text-brand">
          {t('admin.tripTypes.fieldsTitle')}
        </h4>
      </div>
      <p className="text-xs text-gray-500 mb-3">{t('admin.tripTypes.fieldsHint')}</p>
      <div className="space-y-2">
        {BOOKING_FORM_FIELD_KEYS.map((key) => {
          const field = fields?.[key] || { show: true, labelEn: key, labelAr: key };
          const open = openKey === key;
          const label = t(`admin.tripTypes.fieldNames.${key}`);
          return (
            <div key={key} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 p-2.5">
                <span className="text-xs font-bold text-brand min-w-0 flex-1">{label}</span>
                <button
                  type="button"
                  onClick={() => updateField(formId, key, { show: !field.show })}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${
                    field.show !== false ? chipOn : chipOff
                  }`}
                >
                  {field.show !== false ? (
                    <>
                      <Eye className="w-3 h-3" />
                      {t('admin.tripTypes.show')}
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3" />
                      {t('admin.tripTypes.hide')}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOpenKey(open ? null : key)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-gray-200 text-gray-600"
                >
                  <Pencil className="w-3 h-3" />
                  {t('admin.edit')}
                  {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
              {open && (
                <div className="border-t border-gray-100 px-2.5 py-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50/70">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">
                      {t('admin.tripTypes.labelEn')}
                    </label>
                    <input
                      value={field.labelEn || ''}
                      onChange={(e) => updateField(formId, key, { labelEn: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">
                      {t('admin.tripTypes.labelAr')}
                    </label>
                    <input
                      value={field.labelAr || ''}
                      onChange={(e) => updateField(formId, key, { labelAr: e.target.value })}
                      className={inputClass}
                      dir="rtl"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FormSection({
  meta,
  options,
  formFields,
  lang,
  t,
  expandedId,
  setExpandedId,
  toggleForm,
  updateOption,
  removeOption,
  addOptionForForm,
  updateField,
  canAdd,
}) {
  const { id, number, Icon, ring, chipOn, chipOff, headerBg } = meta;
  const visibleCount = options.filter((o) => o.active && isFormOn(o.forms, id)).length;
  const formName = t(`admin.tripTypes.forms.${id}`);

  return (
    <GlassCard hover={false} className={`border ${ring} overflow-hidden`}>
      <div className={`-mx-1 -mt-1 mb-4 rounded-xl bg-gradient-to-r ${headerBg} px-3 py-3`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-black/5 shadow-sm dark:border-white/10">
                <Icon className="w-4 h-4 text-brand" />
              </span>
              <h3 className="text-base font-black text-brand">
                {t('admin.tripTypes.formLabel', { number, name: formName })}
              </h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-white/75 leading-relaxed pl-9">
              {t(`admin.tripTypes.formDesc.${id}`)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
              {t('admin.tripTypes.visibleCount', { count: visibleCount })}
            </span>
            <button
              type="button"
              onClick={() => addOptionForForm(id)}
              disabled={!canAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-brand/20 bg-white text-brand hover:bg-brand/5 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('admin.tripTypes.addHere')}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {options.map((opt, index) => {
          const on = isFormOn(opt.forms, id);
          const disabledGlobally = !opt.active;
          const open = expandedId === `${id}:${opt.id}`;

          return (
            <div
              key={opt.id}
              className={`rounded-xl border bg-white ${
                disabledGlobally ? 'opacity-60 border-gray-100' : 'border-gray-200'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 p-3">
                <span className="text-[11px] font-black text-gray-400 w-6 shrink-0">
                  #{index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-brand truncate">
                    {optionLabel(opt, lang)}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {t(MODE_LABEL_KEYS[opt.mode] || opt.mode)}
                    {opt.builtin ? ` · ${t('admin.tripTypes.builtin')}` : ''}
                    {disabledGlobally ? ` · ${t('admin.tripTypes.offEverywhere')}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleForm(opt.id, id)}
                  disabled={disabledGlobally}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors disabled:cursor-not-allowed ${
                    on && !disabledGlobally ? chipOn : chipOff
                  }`}
                >
                  {on && !disabledGlobally ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      {t('admin.tripTypes.show')}
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      {t('admin.tripTypes.hide')}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : `${id}:${opt.id}`)}
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t('admin.edit')}
                  {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {!opt.builtin && (
                  <button
                    type="button"
                    onClick={() => removeOption(opt.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-bold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t('admin.tripTypes.delete')}
                  </button>
                )}
              </div>

              {open && (
                <div className="border-t border-gray-100 px-3 py-3 space-y-3 bg-gray-50/60">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wide">
                        {t('admin.tripTypes.labelEn')}
                      </label>
                      <input
                        value={opt.labelEn}
                        onChange={(e) => updateOption(opt.id, { labelEn: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wide">
                        {t('admin.tripTypes.labelAr')}
                      </label>
                      <input
                        value={opt.labelAr}
                        onChange={(e) => updateOption(opt.id, { labelAr: e.target.value })}
                        className={inputClass}
                        dir="rtl"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wide">
                        {t('admin.tripTypes.mode')}
                      </label>
                      <select
                        value={opt.mode}
                        disabled={opt.builtin}
                        onChange={(e) => updateOption(opt.id, { mode: e.target.value })}
                        className={inputClass}
                      >
                        {BOOKING_TRIP_TYPE_MODES.map((mode) => (
                          <option key={mode} value={mode}>
                            {t(MODE_LABEL_KEYS[mode] || mode)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => updateOption(opt.id, { active: !opt.active })}
                        className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold border ${
                          opt.active
                            ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                            : 'border-gray-200 text-gray-600 bg-white'
                        }`}
                      >
                        {opt.active ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        {opt.active
                          ? t('admin.tripTypes.enabledGlobal')
                          : t('admin.tripTypes.disabledGlobal')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <FormFieldsPanel
        formId={id}
        fields={formFields?.[id]}
        t={t}
        updateField={updateField}
        chipOn={chipOn}
        chipOff={chipOff}
      />
    </GlassCard>
  );
}

export default function AdminBookingTripTypes() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const initial = buildBookingTripTypesFromFirestore(null);
  const [options, setOptions] = useState(initial.options);
  const [formFields, setFormFields] = useState(initial.formFields);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [focusForm, setFocusForm] = useState('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getBookingTripTypesSettings();
        const built = buildBookingTripTypesFromFirestore(data);
        setOptions(built.options);
        setFormFields(built.formFields);
      } catch {
        toast.error(t('common.error'));
        const built = buildBookingTripTypesFromFirestore(null);
        setOptions(built.options);
        setFormFields(built.formFields);
      } finally {
        setLoading(false);
      }
    })();
  }, [t, toast]);

  const updateOption = (id, patch) => {
    setOptions((list) =>
      list.map((opt) => (opt.id === id ? { ...opt, ...patch } : opt)),
    );
  };

  const toggleForm = (optionId, formId) => {
    setOptions((list) =>
      list.map((opt) => {
        if (opt.id !== optionId) return opt;
        const on = isFormOn(opt.forms, formId);
        return {
          ...opt,
          forms: { ...opt.forms, [formId]: !on },
        };
      }),
    );
  };

  const updateField = (formId, fieldKey, patch) => {
    setFormFields((prev) => ({
      ...prev,
      [formId]: {
        ...prev[formId],
        [fieldKey]: {
          ...prev[formId]?.[fieldKey],
          ...patch,
        },
      },
    }));
  };

  const addOptionForForm = (formId) => {
    if (options.length >= MAX_TRIP_TYPE_OPTIONS) {
      toast.warning(t('admin.tripTypes.maxReached', { max: MAX_TRIP_TYPE_OPTIONS }));
      return;
    }
    const forms = {
      booking: formId === 'booking',
      instantPrice: formId === 'instantPrice',
      religiousTours: formId === 'religiousTours',
    };
    setOptions((list) => [
      ...list,
      createTripTypeOption({
        mode: 'between_cities',
        labelEn: 'New option',
        labelAr: 'خيار جديد',
        order: list.length,
        forms,
      }),
    ]);
    toast.success(t('admin.tripTypes.addedForForm', {
      name: t(`admin.tripTypes.forms.${formId}`),
    }));
  };

  const removeOption = (id) => {
    setOptions((list) => list.filter((opt) => opt.id !== id || opt.builtin));
    setExpandedId(null);
  };

  const resetDefaults = () => {
    const built = buildBookingTripTypesFromFirestore(DEFAULT_BOOKING_TRIP_TYPES);
    setOptions(built.options);
    setFormFields(built.formFields);
    setExpandedId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        options: options.slice(0, MAX_TRIP_TYPE_OPTIONS).map((opt, index) => ({
          id: opt.id,
          mode: opt.mode,
          labelEn: opt.labelEn,
          labelAr: opt.labelAr,
          order: index,
          active: opt.active !== false,
          builtin: Boolean(opt.builtin),
          forms: {
            booking: opt.forms?.booking !== false,
            instantPrice: opt.forms?.instantPrice !== false,
            religiousTours: opt.forms?.religiousTours !== false,
          },
        })),
        formFields: sanitizeFormFields(formFields),
      };
      await updateBookingTripTypesSettings(payload);
      await publishSite();
      toast.success(t('admin.tripTypes.saved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const canAdd = options.length < MAX_TRIP_TYPE_OPTIONS;
  const sections = focusForm === 'all'
    ? FORM_META
    : FORM_META.filter((f) => f.id === focusForm);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('admin.nav.tripTypes')}
        subtitle={t('admin.tripTypes.subtitle')}
      />

      <GlassCard hover={false} className="bg-brand/5 border border-brand/10">
        <p className="text-sm text-gray-700 leading-relaxed">
          <strong className="text-brand">{t('admin.tripTypes.howTitle')}</strong>
          {' '}
          {t('admin.tripTypes.howDesc')}
        </p>
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-semibold text-gray-600">
          <li className="rounded-lg bg-white border border-gray-100 px-3 py-2">
            {t('admin.tripTypes.howShow')}
          </li>
          <li className="rounded-lg bg-white border border-gray-100 px-3 py-2">
            {t('admin.tripTypes.howEdit')}
          </li>
          <li className="rounded-lg bg-white border border-gray-100 px-3 py-2">
            {t('admin.tripTypes.howAdd')}
          </li>
        </ul>
      </GlassCard>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFocusForm('all')}
          className={`px-3 py-2 rounded-xl text-xs font-bold border ${
            focusForm === 'all'
              ? 'bg-brand text-white border-brand'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {t('admin.tripTypes.viewAll')}
        </button>
        {FORM_META.map(({ id, number, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFocusForm(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border ${
              focusForm === id
                ? 'bg-brand text-white border-brand'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {t('admin.tripTypes.formShort', {
              number,
              name: t(`admin.tripTypes.forms.${id}`),
            })}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {sections.map((meta) => (
          <FormSection
            key={meta.id}
            meta={meta}
            options={options}
            formFields={formFields}
            lang={lang}
            t={t}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            toggleForm={toggleForm}
            updateOption={updateOption}
            removeOption={removeOption}
            addOptionForForm={addOptionForForm}
            updateField={updateField}
            canAdd={canAdd}
          />
        ))}

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-brand/15 bg-white/95 backdrop-blur px-4 py-3 shadow-lg">
          <AdminApplyButton type="submit" loading={saving} label={t('common.save')} />
          <button
            type="button"
            onClick={resetDefaults}
            className="px-4 py-2.5 rounded-xl border border-gray-200 font-bold text-sm text-gray-600 hover:bg-gray-50"
          >
            {t('admin.tripTypes.reset')}
          </button>
          <span className="text-xs text-gray-400">
            {t('admin.tripTypes.optionCount', { count: options.length, max: MAX_TRIP_TYPE_OPTIONS })}
          </span>
        </div>
      </form>
    </div>
  );
}
