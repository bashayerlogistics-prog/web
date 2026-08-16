import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useBranding } from '../../context/BrandingContext';
import LogoMark from './LogoMark';

/**
 * @param {'full' | 'badge'} variant
 * @param {'auto' | 'light' | 'dark'} tone
 */
export default function BrandLogo({
  variant = 'full',
  tone = 'auto',
  compact = false,
  className = '',
  alt = '',
  loading: _loading,
  decoding: _decoding,
  width: _width,
  height: _height,
  ...props
}) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { branding } = useBranding();

  const useLightTone =
    tone === 'light' || (tone === 'auto' && isDark);

  const markTone = useLightTone ? 'light' : 'dark';
  const label = alt || t('brand.name');
  const customLogo = branding?.logoUrl?.trim();

  if (variant === 'badge') {
    if (customLogo) {
      return (
        <img
          src={customLogo}
          alt={label}
          className={className}
          {...props}
        />
      );
    }
    return (
      <LogoMark
        tone={markTone}
        className={className}
        role="img"
        aria-label={label}
        {...props}
      />
    );
  }

  const mainTextStyle = { color: useLightTone ? '#ffffff' : 'var(--color-brand)' };
  const subTextStyle = {
    color: useLightTone ? 'var(--color-gold-light)' : 'var(--color-gold-dark)',
  };
  const ruleStyle = {
    backgroundColor: useLightTone ? 'var(--color-gold-light)' : 'var(--color-gold)',
    opacity: useLightTone ? 0.7 : 0.55,
  };

  return (
    <div
      className={`flex items-center min-w-0 ${compact ? 'gap-1.5' : 'gap-2 sm:gap-2.5'} ${className}`}
      role="img"
      aria-label={label}
      {...props}
    >
      {customLogo ? (
        <img
          src={customLogo}
          alt=""
          className={`w-auto aspect-square shrink-0 self-center rounded-xl object-contain ${compact ? 'h-full max-h-8' : 'h-[88%]'}`}
        />
      ) : (
        <LogoMark
          tone={markTone}
          className={`w-auto aspect-square shrink-0 self-center rounded-xl ${compact ? 'h-full max-h-8' : 'h-[88%]'}`}
        />
      )}
      <div className="flex flex-col min-w-0 leading-none overflow-hidden">
        <span
          className={`font-extrabold tracking-tight truncate ${
            compact
              ? 'text-[0.8rem] sm:text-[0.85rem]'
              : 'text-[0.95rem] sm:text-[1.05rem] md:text-[1.12rem]'
          }`}
          style={mainTextStyle}
        >
          {t('brand.shortName')}
        </span>
        <span
          className={`font-bold truncate mt-0.5 ${
            compact
              ? 'text-[0.58rem] sm:text-[0.62rem]'
              : 'text-[0.62rem] sm:text-[0.7rem] md:text-xs'
          }`}
          style={subTextStyle}
        >
          {t('brand.tagline')}
        </span>
        {!compact && (
          <span
            className="h-[2px] w-14 sm:w-16 md:w-[4.5rem] rounded-full mt-1"
            style={ruleStyle}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
