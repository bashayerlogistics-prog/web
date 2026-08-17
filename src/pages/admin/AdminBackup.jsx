import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Upload,
  DatabaseBackup,
  ShieldAlert,
  CheckSquare,
  Square,
  FileJson,
  RefreshCw,
  Archive,
  HardDriveDownload,
  Server,
  Database,
  Image,
  Settings2,
  LayoutTemplate,
  ChevronDown,
} from 'lucide-react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import GlassCard from '../../components/ui/GlassCard';
import AlertBanner from '../../components/ui/AlertBanner';
import { useToast } from '../../context/ToastContext';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useBranding } from '../../context/BrandingContext';
import {
  ALL_MODULE_IDS,
  BACKUP_MODULES,
  createBackupPayload,
  downloadBackupJson,
  getBackupCollectionCounts,
  parseBackupFile,
  restoreBackupPayload,
} from '../../firebase/backup';
import {
  exportFullBackup,
  importFullBackup,
  MAX_FULL_BACKUP_BYTES,
} from '../../firebase/fullBackup';

const MODULE_ORDER = ALL_MODULE_IDS;

const COVERAGE = [
  { id: 'database', icon: Database },
  { id: 'content', icon: LayoutTemplate },
  { id: 'settings', icon: Settings2 },
  { id: 'images', icon: Image },
];

export default function AdminBackup() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const { refresh: refreshBranding } = useBranding();
  const fileRef = useRef(null);
  const fullFileRef = useRef(null);

  const [selected, setSelected] = useState(() => new Set(MODULE_ORDER));
  const [counts, setCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState('merge');
  const [confirmReplace, setConfirmReplace] = useState('');
  const [error, setError] = useState('');
  const [fullExporting, setFullExporting] = useState(false);
  const [fullImporting, setFullImporting] = useState(false);
  const [fullProgress, setFullProgress] = useState(null);
  const [fullFile, setFullFile] = useState(null);
  const [fullMode, setFullMode] = useState('merge');
  const [fullConfirm, setFullConfirm] = useState('');

  const loadCounts = async () => {
    setLoadingCounts(true);
    try {
      setCounts(await getBackupCollectionCounts());
    } catch {
      setCounts({});
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => {
    loadCounts();
  }, []);

  const selectedList = useMemo(() => MODULE_ORDER.filter((id) => selected.has(id)), [selected]);
  const totalDocs = useMemo(
    () => Object.values(counts).reduce((sum, value) => sum + (Number(value) || 0), 0),
    [counts],
  );

  const toggleModule = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(MODULE_ORDER));
  const selectUiOnly = () => setSelected(new Set(['ui']));
  const clearAll = () => setSelected(new Set());

  const handleExport = async () => {
    if (!selectedList.length) {
      toast.error(t('admin.backup.selectModules'));
      return;
    }
    setError('');
    setExporting(true);
    setProgress({ current: 0, total: 1, step: '…' });
    try {
      const payload = await createBackupPayload(selectedList, (p) => setProgress(p));
      const name = downloadBackupJson(payload);
      toast.success(t('admin.backup.exportDone', { name, docs: Object.values(payload.counts || {}).reduce((a, b) => a + b, 0) }));
      await loadCounts();
    } catch (err) {
      console.error(err);
      setError(t('admin.backup.exportFailed'));
      toast.error(t('admin.backup.exportFailed'));
    } finally {
      setExporting(false);
      setProgress(null);
    }
  };

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setConfirmReplace('');
    try {
      const text = await file.text();
      const data = parseBackupFile(text);
      setParsed(data);
      setFileName(file.name);
      if (Array.isArray(data.modules) && data.modules.length) {
        setSelected(new Set(data.modules.filter((id) => BACKUP_MODULES[id])));
      }
      toast.success(t('admin.backup.fileLoaded', { name: file.name }));
    } catch (err) {
      setParsed(null);
      setFileName('');
      const key =
        err.message === 'wrong-app'
          ? 'admin.backup.wrongApp'
          : err.message === 'empty-backup'
            ? 'admin.backup.emptyBackup'
            : 'admin.backup.invalidJson';
      setError(t(key));
      toast.error(t(key));
    }
  };

  const handleRestore = async () => {
    if (!parsed) {
      toast.error(t('admin.backup.pickFileFirst'));
      return;
    }
    if (!selectedList.length) {
      toast.error(t('admin.backup.selectModules'));
      return;
    }
    if (mode === 'replace' && confirmReplace !== 'RESTORE') {
      toast.error(t('admin.backup.typeRestore'));
      return;
    }

    setError('');
    setRestoring(true);
    setProgress({ current: 0, total: 1, step: '…' });
    try {
      const result = await restoreBackupPayload(parsed, {
        moduleIds: selectedList,
        mode,
        onProgress: (p) => setProgress(p),
      });
      await publishSite('full');
      await refreshBranding();
      await loadCounts();
      const written = Object.values(result.written || {}).reduce((a, b) => a + b, 0);
      toast.success(t('admin.backup.restoreDone', { count: written, mode: t(`admin.backup.mode.${mode}`) }));
      setConfirmReplace('');
    } catch (err) {
      console.error(err);
      setError(t('admin.backup.restoreFailed'));
      toast.error(t('admin.backup.restoreFailed'));
    } finally {
      setRestoring(false);
      setProgress(null);
    }
  };

  const handleFullExport = async () => {
    setError('');
    setFullExporting(true);
    setFullProgress({ phase: 'creating', percent: 5 });
    try {
      const result = await exportFullBackup(setFullProgress);
      toast.success(t('admin.backup.full.exportDone', {
        docs: result.summary?.documents || 0,
        files: result.summary?.files || 0,
      }));
    } catch (err) {
      console.error(err);
      setError(t('admin.backup.full.exportFailed'));
      toast.error(t('admin.backup.full.exportFailed'));
    } finally {
      setFullExporting(false);
      setFullProgress(null);
    }
  };

  const handleFullFilePick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error(t('admin.backup.full.invalidArchive'));
      return;
    }
    if (file.size > MAX_FULL_BACKUP_BYTES) {
      toast.error(t('admin.backup.full.tooLarge'));
      return;
    }
    setFullFile(file);
    setFullConfirm('');
  };

  const handleFullImport = async () => {
    if (!fullFile) {
      toast.error(t('admin.backup.full.chooseFirst'));
      return;
    }
    if (fullMode === 'replace' && fullConfirm !== 'RESTORE') {
      toast.error(t('admin.backup.typeRestore'));
      return;
    }
    setError('');
    setFullImporting(true);
    setFullProgress({ phase: 'uploading', percent: 0 });
    try {
      const result = await importFullBackup(fullFile, {
        mode: fullMode,
        confirmation: fullConfirm,
        onProgress: setFullProgress,
      });
      await publishSite('full');
      await refreshBranding();
      await loadCounts();
      toast.success(t('admin.backup.full.importDone', {
        docs: result.documents || 0,
        files: result.files || 0,
      }));
      setFullFile(null);
      setFullConfirm('');
    } catch (err) {
      console.error(err);
      setError(t('admin.backup.full.importFailed'));
      toast.error(t('admin.backup.full.importFailed'));
    } finally {
      setFullImporting(false);
      setFullProgress(null);
    }
  };

  const busy = exporting || restoring || fullExporting || fullImporting;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('admin.backup.title')}
        subtitle={t('admin.backup.subtitle')}
      >
        <button
          type="button"
          onClick={loadCounts}
          disabled={loadingCounts || busy}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-brand/20 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loadingCounts ? 'animate-spin' : ''} />
          {t('admin.backup.refreshCounts')}
        </button>
      </AdminPageHeader>

      {error && <AlertBanner type="error" message={error} onClose={() => setError('')} />}

      <GlassCard className="p-5 sm:p-6 space-y-5 border border-brand/20">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand text-white flex items-center justify-center shrink-0">
              <Archive size={22} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-black text-lg text-dark-800 dark:text-white">
                  {t('admin.backup.full.title')}
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wide rounded-full bg-gold/20 text-amber-800 dark:text-gold px-2 py-1">
                  {t('admin.backup.full.recommended')}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 max-w-3xl">
                {t('admin.backup.full.description')}
              </p>
              <p className="text-[11px] font-semibold text-brand mt-2">
                {loadingCounts
                  ? '…'
                  : t('admin.backup.full.liveDocs', { count: totalDocs })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <Server size={16} className="text-brand" />
            {t('admin.backup.full.serverProcessed')}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {COVERAGE.map(({ id, icon: Icon }) => (
            <div
              key={id}
              className="rounded-2xl border border-brand/15 bg-brand/[0.04] dark:bg-brand/10 p-3.5"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={16} className="text-brand" />
                <span className="text-sm font-black text-dark-800 dark:text-white">
                  {t(`admin.backup.full.coverage.${id}.title`)}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                {t(`admin.backup.full.coverage.${id}.hint`)}
              </p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200 dark:border-brand/15 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <HardDriveDownload size={18} className="text-brand" />
              <h3 className="font-black text-dark-800 dark:text-white">
                {t('admin.backup.full.exportTitle')}
              </h3>
            </div>
            <p className="text-xs text-gray-500">{t('admin.backup.full.exportDescription')}</p>
            <button
              type="button"
              onClick={handleFullExport}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-brand text-white font-bold text-sm hover:opacity-95 disabled:opacity-50"
            >
              <Download size={18} />
              {fullExporting ? t('admin.backup.full.preparing') : t('admin.backup.full.downloadZip')}
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-brand/15 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Upload size={18} className="text-brand" />
              <h3 className="font-black text-dark-800 dark:text-white">
                {t('admin.backup.full.importTitle')}
              </h3>
            </div>
            <p className="text-xs text-gray-500">{t('admin.backup.full.importDescription')}</p>
            <input
              ref={fullFileRef}
              type="file"
              accept="application/zip,.zip"
              className="hidden"
              onChange={handleFullFilePick}
            />
            <button
              type="button"
              onClick={() => fullFileRef.current?.click()}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-brand/40 text-brand font-bold text-sm hover:bg-brand/5 disabled:opacity-50"
            >
              <Archive size={18} />
              {fullFile?.name || t('admin.backup.full.chooseZip')}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFullMode('merge')}
                disabled={busy}
                className={`rounded-xl border p-3 text-start text-xs ${
                  fullMode === 'merge'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                    : 'border-gray-200 dark:border-brand/15'
                }`}
              >
                <strong className="block">{t('admin.backup.mode.merge')}</strong>
                <span className="text-gray-500">{t('admin.backup.full.mergeHint')}</span>
              </button>
              <button
                type="button"
                onClick={() => setFullMode('replace')}
                disabled={busy}
                className={`rounded-xl border p-3 text-start text-xs ${
                  fullMode === 'replace'
                    ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                    : 'border-gray-200 dark:border-brand/15'
                }`}
              >
                <strong className="block text-red-600">{t('admin.backup.mode.replace')}</strong>
                <span className="text-gray-500">{t('admin.backup.full.replaceHint')}</span>
              </button>
            </div>

            {fullMode === 'replace' && (
              <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50/80 dark:bg-red-500/10 p-3 space-y-2">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-xs font-bold">
                  <ShieldAlert size={16} />
                  {t('admin.backup.full.replaceWarning')}
                </div>
                <input
                  type="text"
                  value={fullConfirm}
                  onChange={(event) => setFullConfirm(event.target.value)}
                  placeholder={t('admin.backup.typeRestorePlaceholder')}
                  disabled={busy}
                  className="w-full px-3 py-2 rounded-lg border border-red-200 dark:border-red-500/30 bg-white dark:admin-input text-sm outline-none"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleFullImport}
              disabled={busy || !fullFile}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-50 ${
                fullMode === 'replace' ? 'bg-red-600' : 'bg-emerald-600'
              }`}
            >
              <Upload size={18} />
              {fullImporting ? t('admin.backup.full.importing') : t('admin.backup.full.importNow')}
            </button>
          </div>
        </div>

        {fullProgress && (
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
            <div className="flex justify-between gap-3 text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
              <span>{t(`admin.backup.full.phases.${fullProgress.phase}`)}</span>
              <span>{fullProgress.percent}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-brand transition-all duration-300"
                style={{ width: `${fullProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3 text-xs text-emerald-900 dark:text-emerald-100">
          {t('admin.backup.full.includes')}
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 text-xs text-amber-900 dark:text-amber-200">
          {t('admin.backup.full.exclusions')}
        </div>
      </GlassCard>

      <details className="group rounded-2xl border border-gray-200 dark:border-brand/15 overflow-hidden">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-5 py-4 bg-white/70 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
              <DatabaseBackup size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-dark-800 dark:text-white">
                {t('admin.backup.advancedTitle')}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {t('admin.backup.advancedDesc')}
              </p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform shrink-0" />
        </summary>

        <div className="p-5 sm:p-6 space-y-6 border-t border-gray-200 dark:border-brand/15">
          <div className="space-y-4">
            <div>
              <h3 className="font-black text-dark-800 dark:text-white">{t('admin.backup.modulesTitle')}</h3>
              <p className="text-xs text-gray-500 mt-1">{t('admin.backup.modulesDesc')}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={selectAll} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-brand/10 text-brand">
                {t('admin.backup.selectAll')}
              </button>
              <button type="button" onClick={selectUiOnly} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gold/15 text-amber-800 dark:text-gold">
                {t('admin.backup.uiOnly')}
              </button>
              <button type="button" onClick={clearAll} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-brand/20">
                {t('admin.backup.clear')}
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {MODULE_ORDER.map((id) => {
                const mod = BACKUP_MODULES[id];
                const on = selected.has(id);
                const docCount = mod.collections.reduce((sum, c) => sum + (counts[c] || 0), 0)
                  + (mod.includeSiteSettings ? (counts.siteSettings || 0) : 0);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleModule(id)}
                    disabled={busy}
                    className={`text-start p-4 rounded-2xl border transition ${
                      on
                        ? 'border-brand/40 bg-brand/[0.06] dark:bg-brand/10'
                        : 'border-gray-200 dark:border-brand/15 bg-white/50 dark:bg-white/[0.02]'
                    } disabled:opacity-50`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {on ? <CheckSquare size={16} className="text-brand" /> : <Square size={16} className="text-gray-400" />}
                      <span className="font-bold text-sm text-dark-800 dark:text-white">
                        {t(`admin.backup.modules.${id}`)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      {t(`admin.backup.moduleHints.${id}`)}
                    </p>
                    <p className="text-[11px] font-semibold text-brand mt-2">
                      {loadingCounts ? '…' : t('admin.backup.docCount', { count: docCount })}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-200 dark:border-brand/15 p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Download size={18} className="text-brand" />
                <h3 className="font-black text-dark-800 dark:text-white">{t('admin.backup.exportTitle')}</h3>
              </div>
              <p className="text-xs text-gray-500">{t('admin.backup.exportDesc')}</p>
              <button
                type="button"
                onClick={handleExport}
                disabled={busy || !selectedList.length}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand text-white font-bold text-sm hover:opacity-95 disabled:opacity-50"
              >
                <FileJson size={18} />
                {exporting ? t('admin.backup.exporting') : t('admin.backup.downloadJson')}
              </button>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-brand/15 p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-brand" />
                <h3 className="font-black text-dark-800 dark:text-white">{t('admin.backup.restoreTitle')}</h3>
              </div>
              <p className="text-xs text-gray-500">{t('admin.backup.restoreDesc')}</p>

              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleFilePick}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-brand/40 text-brand font-bold text-sm hover:bg-brand/5 disabled:opacity-50"
              >
                <Upload size={18} />
                {fileName || t('admin.backup.chooseJson')}
              </button>

              {parsed && (
                <div className="text-xs rounded-xl bg-gray-50 dark:bg-white/5 p-3 space-y-1">
                  <p><span className="font-semibold">{t('admin.backup.exportedAt')}:</span> {parsed.exportedAt || '—'}</p>
                  <p><span className="font-semibold">{t('admin.backup.fileModules')}:</span> {(parsed.modules || []).join(', ') || '—'}</p>
                  <p>
                    <span className="font-semibold">{t('admin.backup.fileDocs')}:</span>{' '}
                    {Object.values(parsed.counts || {}).reduce((a, b) => a + b, 0)
                      || Object.values(parsed.collections || {}).reduce((a, docs) => a + (docs?.length || 0), 0)
                      + (parsed.siteSettings ? Object.keys(parsed.siteSettings).length : 0)}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-bold text-dark-800 dark:text-white">{t('admin.backup.restoreMode')}</p>
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="restore-mode"
                    checked={mode === 'merge'}
                    onChange={() => setMode('merge')}
                    disabled={busy}
                    className="mt-0.5"
                  />
                  <span>
                    <strong>{t('admin.backup.mode.merge')}</strong>
                    <span className="block text-gray-500">{t('admin.backup.mode.mergeHint')}</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="restore-mode"
                    checked={mode === 'replace'}
                    onChange={() => setMode('replace')}
                    disabled={busy}
                    className="mt-0.5"
                  />
                  <span>
                    <strong className="text-red-600">{t('admin.backup.mode.replace')}</strong>
                    <span className="block text-gray-500">{t('admin.backup.mode.replaceHint')}</span>
                  </span>
                </label>
              </div>

              {mode === 'replace' && (
                <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50/80 dark:bg-red-500/10 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-xs font-bold">
                    <ShieldAlert size={16} />
                    {t('admin.backup.replaceWarning')}
                  </div>
                  <input
                    type="text"
                    value={confirmReplace}
                    onChange={(e) => setConfirmReplace(e.target.value)}
                    placeholder={t('admin.backup.typeRestorePlaceholder')}
                    disabled={busy}
                    className="w-full px-3 py-2 rounded-lg border border-red-200 dark:border-red-500/30 bg-white dark:admin-input text-sm outline-none"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleRestore}
                disabled={busy || !parsed || !selectedList.length}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50 ${
                  mode === 'replace' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Upload size={18} />
                {restoring ? t('admin.backup.restoring') : t('admin.backup.restoreNow')}
              </button>
            </div>
          </div>

          {progress && (
            <div className="rounded-xl border border-gray-200 dark:border-brand/15 p-4">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                {t('admin.backup.progress', {
                  step: progress.step,
                  current: progress.current,
                  total: progress.total,
                })}
              </p>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-brand transition-all duration-300"
                  style={{
                    width: `${progress.total ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
