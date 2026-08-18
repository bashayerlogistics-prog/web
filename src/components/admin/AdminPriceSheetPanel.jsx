import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, Upload, Download, Loader2 } from 'lucide-react';
import {
  getProductsByTripType,
  applyBulkFleetPrices,
} from '../../firebase/admin';
import { usePublishSiteContent } from '../../hooks/usePublishSiteContent';
import { useToast } from '../../context/ToastContext';
import { clearAdminDataCache } from '../../utils/adminDataCache';
import {
  downloadFleetPriceWorkbook,
  parseFleetPriceWorkbook,
  diffFleetPriceRows,
} from '../../utils/fleetPriceSheet';

export default function AdminPriceSheetPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const publishSite = usePublishSiteContent();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState('');

  const loadProducts = async () => {
    const [oneWay, roundTrip, hourly] = await Promise.all([
      getProductsByTripType('one_way'),
      getProductsByTripType('round_trip'),
      getProductsByTripType('hourly'),
    ]);
    return [...(oneWay || []), ...(roundTrip || []), ...(hourly || [])];
  };

  const handleDownload = async () => {
    setBusy('download');
    try {
      const products = await loadProducts();
      const count = await downloadFleetPriceWorkbook(products);
      toast.success(t('admin.bookingForms.excelDownloaded', { count }));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setBusy('');
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setBusy('upload');
    try {
      const [rows, products] = await Promise.all([
        parseFleetPriceWorkbook(file),
        loadProducts(),
      ]);
      const diff = diffFleetPriceRows(rows, products);
      if (!diff.updates.length && !diff.creates.length) {
        toast.info(t('admin.bookingForms.excelNoChanges', {
          skipped: diff.skipped,
          unchanged: diff.unchanged,
        }));
        return;
      }
      const { updated, created } = await applyBulkFleetPrices(diff);
      clearAdminDataCache('admin:home-fleet');
      await publishSite();
      toast.success(t('admin.bookingForms.excelImported', { updated, created }));
    } catch {
      toast.error(t('admin.bookingForms.excelImportFailed'));
    } finally {
      setBusy('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 dark:bg-emerald-950/20 dark:border-emerald-800 px-4 py-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-brand dark:text-white">
              {t('admin.bookingForms.excelTitle')}
            </p>
            <p className="text-[12px] text-gray-600 dark:text-white/65 leading-relaxed mt-0.5">
              {t('admin.bookingForms.excelHint')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-bold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
          >
            {busy === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {t('admin.bookingForms.excelDownload')}
          </button>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy === 'upload' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {t('admin.bookingForms.excelUpload')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
        </div>
      </div>
    </div>
  );
}
