const PLATFORM_PATHS = {
  twitter:
    'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  facebook:
    'M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12',
  youtube:
    'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814M9.545 15.568V8.432L15.818 12z',
  instagram:
    'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069M12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0m0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8m6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881',
  whatsapp:
    'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413',
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065m1.782 13.019H3.555V9h3.564zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  snapchat:
    'M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.504 0 .112.03.378.27.504.19.099.413.068.594.047.177-.021.36-.05.55-.05.146 0 .295.012.44.036.323.053.63.16.792.333.199.212.168.58.084.86-.073.243-.274.536-.58.744a3.9 3.9 0 0 1-.463.252c-.308.139-.697.317-.697.58 0 .21.34.394.707.566a7.8 7.8 0 0 0 1.486.497c.52.14 1.022.273 1.22.598.12.2.147.433.075.67-.123.41-.64.626-1.155.792-.075.024-.15.047-.226.07-.4.12-.84.25-1.02.5-.14.19-.12.47-.06.66.08.26.27.47.56.64.12.07.25.13.39.18 1.15.4 1.93 1.13 1.93 1.82 0 .9-1.21 1.68-3.32 1.68-.38 0-.78-.04-1.19-.12-.26-.05-.53-.07-.8-.07-.44 0-.87.08-1.26.22a4.3 4.3 0 0 1-1.15.2c-.4 0-.78-.07-1.15-.2-.39-.14-.82-.22-1.26-.22-.27 0-.54.02-.8.07-.41.08-.81.12-1.19.12-2.11 0-3.32-.78-3.32-1.68 0-.69.78-1.42 1.93-1.82.14-.05.27-.11.39-.18.29-.17.48-.38.56-.64.06-.19.08-.47-.06-.66-.18-.25-.62-.38-1.02-.5-.076-.023-.151-.046-.226-.07-.515-.166-1.032-.382-1.155-.792-.072-.237-.045-.47.075-.67.198-.325.7-.458 1.22-.598.49-.132 1.02-.295 1.486-.497.367-.172.707-.356.707-.566 0-.263-.389-.441-.697-.58a3.9 3.9 0 0 1-.463-.252c-.306-.208-.507-.501-.58-.744-.084-.28-.115-.648.084-.86.162-.173.469-.28.792-.333.145-.024.294-.036.44-.036.19 0 .373.029.55.05.181.021.404.052.594-.047.24-.126.27-.392.27-.504-.008-.159-.018-.324-.03-.504l-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.447 1.069 10.804.793 12.206.793',
  tiktok:
    'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.1a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.76a8.2 8.2 0 0 0 4.76 1.52V6.84a4.85 4.85 0 0 1-1-.15z',
};

export const SOCIAL_PLATFORM_META = {
  facebook: {
    label: 'Facebook',
    nameEn: 'Facebook',
    nameAr: 'فيسبوك',
    url: 'https://www.facebook.com/',
    bg: '#1877F2',
    color: '#fff',
  },
  youtube: {
    label: 'YouTube',
    nameEn: 'YouTube',
    nameAr: 'يوتيوب',
    url: 'https://www.youtube.com/',
    bg: '#FF0000',
    color: '#fff',
  },
  tiktok: {
    label: 'TikTok',
    nameEn: 'TikTok',
    nameAr: 'تيك توك',
    url: 'https://www.tiktok.com/@',
    bg: '#010101',
    color: '#fff',
  },
  snapchat: {
    label: 'Snapchat',
    nameEn: 'Snapchat',
    nameAr: 'سناب شات',
    url: 'https://www.snapchat.com/add/',
    bg: '#FFFC00',
    color: '#000',
  },
  instagram: {
    label: 'Instagram',
    nameEn: 'Instagram',
    nameAr: 'إنستغرام',
    url: 'https://www.instagram.com/',
    bg: 'linear-gradient(45deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%)',
    color: '#fff',
  },
  twitter: {
    label: 'X / Twitter',
    nameEn: 'Twitter',
    nameAr: 'تويتر',
    url: 'https://x.com/',
    bg: '#000000',
    color: '#fff',
  },
  whatsapp: {
    label: 'WhatsApp',
    nameEn: 'WhatsApp',
    nameAr: 'واتساب',
    url: 'https://wa.me/',
    bg: '#25D366',
    color: '#fff',
  },
  linkedin: {
    label: 'LinkedIn',
    nameEn: 'LinkedIn',
    nameAr: 'لينكدإن',
    url: 'https://www.linkedin.com/company/',
    bg: '#0A66C2',
    color: '#fff',
  },
  custom: {
    label: 'Custom',
    nameEn: '',
    nameAr: '',
    url: 'https://',
    bg: '#4B5563',
    color: '#fff',
  },
};

export const SOCIAL_PLATFORMS = Object.keys(SOCIAL_PLATFORM_META);

export function getSocialBrand(platform) {
  const key = String(platform || '').toLowerCase();
  if (key === 'x') return SOCIAL_PLATFORM_META.twitter;
  return SOCIAL_PLATFORM_META[key] || SOCIAL_PLATFORM_META.custom;
}

const SIZE_WRAP = { sm: 'w-7 h-7', md: 'w-10 h-10', lg: 'w-12 h-12' };
const SIZE_ICON = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' };

function SvgIcon({ path, className, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden>
      <path d={path} />
    </svg>
  );
}

function TikTokMark({ className }) {
  return (
    <span className={`relative inline-flex ${className}`} aria-hidden>
      <svg viewBox="0 0 24 24" fill="#25F4EE" className="absolute inset-0 w-full h-full -translate-x-[1.5px] translate-y-[0.5px]">
        <path d={PLATFORM_PATHS.tiktok} />
      </svg>
      <svg viewBox="0 0 24 24" fill="#FE2C55" className="absolute inset-0 w-full h-full translate-x-[1.5px] -translate-y-[0.5px]">
        <path d={PLATFORM_PATHS.tiktok} />
      </svg>
      <svg viewBox="0 0 24 24" fill="#fff" className="relative w-full h-full">
        <path d={PLATFORM_PATHS.tiktok} />
      </svg>
    </span>
  );
}

export default function SocialIcon({ platform, iconUrl, className = 'w-5 h-5' }) {
  if (iconUrl) {
    return <img src={iconUrl} alt="" className={`${className} object-contain`} />;
  }

  const key = String(platform || '').toLowerCase() === 'x' ? 'twitter' : String(platform || '').toLowerCase();
  if (key === 'tiktok') return <TikTokMark className={className} />;

  const path = PLATFORM_PATHS[key];
  if (path) return <SvgIcon path={path} className={className} />;

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  );
}

export function SocialBrandBadge({ platform, iconUrl, size = 'md', className = '' }) {
  const brand = getSocialBrand(platform);
  const wrap = SIZE_WRAP[size] || SIZE_WRAP.md;
  const icon = SIZE_ICON[size] || SIZE_ICON.md;

  if (iconUrl) {
    return (
      <span className={`${wrap} rounded-full bg-white overflow-hidden inline-flex items-center justify-center shadow-sm ${className}`}>
        <img src={iconUrl} alt="" className="w-full h-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className={`${wrap} rounded-full inline-flex items-center justify-center shadow-sm ${className}`}
      style={{ background: brand.bg, color: brand.color }}
    >
      <SocialIcon platform={platform} className={icon} />
    </span>
  );
}

export function SocialBrandLink({
  platform,
  iconUrl,
  href,
  label,
  size = 'md',
  className = '',
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className={`hover:scale-110 hover:brightness-110 transition-all ${className}`}
    >
      <SocialBrandBadge platform={platform} iconUrl={iconUrl} size={size} />
    </a>
  );
}
