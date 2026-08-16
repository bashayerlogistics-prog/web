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

const MODULE_ORDER = ALL_MODULE_IDS;

export default function AdminBackup() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const { refresh: refreshBranding } = useBranding();
  const fileRef = useRef(null);

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

  const busy = exporting || restoring;

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

      <GlassCard className="p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <DatabaseBackup size={20} />
          </div>
          <div>
            <h2 className="font-black text-dark-800 dark:text-white">{t('admin.backup.modulesTitle')}</h2>
            <p className="text-xs text-gray-500 mt-1">{t('admin.backup.modulesDesc')}</p>
          </div>
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
      </GlassCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <GlassCard className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Download size={18} className="text-brand" />
            <h2 className="font-black text-dark-800 dark:text-white">{t('admin.backup.exportTitle')}</h2>
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
        </GlassCard>

        <GlassCard className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-brand" />
            <h2 className="font-black text-dark-800 dark:text-white">{t('admin.backup.restoreTitle')}</h2>
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
        </GlassCard>
      </div>

      {progress && (
        <GlassCard className="p-4">
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
        </GlassCard>
      )}
    </div>
  );
}
