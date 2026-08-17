import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Upload, Eye, X, AlertCircle } from 'lucide-react';
import {
  uploadMedia,
  isVideoFile,
  DEFAULT_IMAGE_MAX_KB,
  SOURCE_IMAGE_MAX_MB,
} from '../../firebase/storage';

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isVideoUrl(url) {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url || '');
}

export default function MediaUpload({
  value = '',
  onChange,
  accept = 'image/*',
  folder = 'uploads',
  maxSizeKB = DEFAULT_IMAGE_MAX_KB,
  allowUrl = false,
  urlPlaceholder = 'https://...',
  label,
  previewClassName = 'w-full max-h-48 object-cover rounded-xl',
  className = '',
  videoMode = false,
}) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(videoMode);
  const [fileInfo, setFileInfo] = useState(null);

  const sourceMaxBytes = SOURCE_IMAGE_MAX_MB * 1024 * 1024;
  const isVideo = isVideoUrl(value);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (videoMode || isVideoFile(file)) {
      window.alert(t('admin.media.videoUrlOnly'));
      e.target.value = '';
      return;
    }

    if (!file.type?.startsWith('image/') && !/\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(file.name || '')) {
      window.alert(t('admin.media.uploadFailed', { error: 'Image files only' }));
      e.target.value = '';
      return;
    }

    if (file.size > sourceMaxBytes) {
      window.alert(
        t('admin.media.sourceTooLarge', {
          max: SOURCE_IMAGE_MAX_MB,
          size: formatFileSize(file.size),
        }),
      );
      e.target.value = '';
      return;
    }

    setFileInfo({ name: file.name, size: file.size, type: file.type });
    setUploading(true);
    try {
      const url = await uploadMedia(file, folder, { maxSizeKB });
      onChange(url);
    } catch (err) {
      if (err?.code === 'STILL_TOO_LARGE' || String(err?.message || '').startsWith('STILL_TOO_LARGE')) {
        const optimized = err.optimizedBytes
          || Number(String(err.message).split(':')[2])
          || 0;
        window.alert(
          t('admin.media.stillTooLarge', {
            max: maxSizeKB,
            size: formatFileSize(optimized || file.size),
          }),
        );
      } else if (err?.code === 'SOURCE_TOO_LARGE' || String(err?.message || '').startsWith('SOURCE_TOO_LARGE')) {
        window.alert(
          t('admin.media.sourceTooLarge', {
            max: SOURCE_IMAGE_MAX_MB,
            size: formatFileSize(file.size),
          }),
        );
      } else {
        const message = err.message || t('common.error');
        window.alert(t('admin.media.uploadFailed', { error: message }));
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleUrlApply = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setUrlInput('');
    setShowUrlInput(false);
  };

  const handleRemove = () => {
    onChange('');
    setFileInfo(null);
  };

  const uploadLabel = uploading ? t('admin.media.optimizing') : t('admin.uploadImage');

  return (
    <div className={`space-y-3 ${className}`}>
      {label && <p className="text-sm font-bold text-gray-600 dark:text-gold-light">{label}</p>}

      <div className="flex flex-wrap gap-2">
        {!videoMode && (
          <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-primary-300 cursor-pointer hover:bg-primary-50/50 transition-colors flex-1 min-w-[140px]">
            <ImageIcon className="w-5 h-5 text-primary-500" />
            <Upload className="w-4 h-4 text-primary-400" />
            <span className="text-sm font-semibold">{uploadLabel}</span>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              onChange={handleFile}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}

        {(allowUrl || videoMode) && (
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="admin-input text-sm font-semibold hover:bg-brand/5"
          >
            {videoMode ? t('admin.media.pasteVideoUrl') : t('admin.media.pasteUrl')}
          </button>
        )}

        {value && (
          <>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-primary-50 text-primary-600 text-sm font-bold"
            >
              <Eye className="w-4 h-4" />
              {t('admin.media.preview')}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-red-50 text-red-500 text-sm font-bold"
            >
              <X className="w-4 h-4" />
              {t('admin.media.remove')}
            </button>
          </>
        )}
      </div>

      {showUrlInput && (allowUrl || videoMode) && (
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={urlPlaceholder}
            className="admin-input flex-1 text-sm py-2.5"
          />
          <button type="button" onClick={handleUrlApply} className="px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-bold">
            {t('admin.media.applyUrl')}
          </button>
        </div>
      )}

      <p className="text-xs text-amber-700 dark:text-gold-light flex items-start gap-1.5 leading-relaxed">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          {videoMode
            ? t('admin.media.videoUrlOnly')
            : t('admin.media.maxSize', { max: maxSizeKB, sourceMax: SOURCE_IMAGE_MAX_MB })}
          {fileInfo && ` · ${fileInfo.name} (${formatFileSize(fileInfo.size)})`}
        </span>
      </p>

      {value && !previewOpen && (
        <div className="relative rounded-xl overflow-hidden ring-2 ring-primary-500/20">
          {isVideo ? (
            <video src={value} className={previewClassName} muted playsInline />
          ) : (
            <img src={value} alt="" className={previewClassName} />
          )}
        </div>
      )}

      {previewOpen && value && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="absolute -top-12 end-0 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X className="w-6 h-6" />
            </button>
            {isVideo ? (
              <video src={value} controls autoPlay className="max-w-full max-h-[80vh] rounded-xl shadow-2xl" />
            ) : (
              <img src={value} alt="" className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
            )}
            <p className="mt-3 text-white/70 text-xs truncate max-w-full">{value}</p>
          </div>
        </div>
      )}
    </div>
  );
}
