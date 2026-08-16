import { useState, useEffect } from 'react';
import { optimizedImageUrl } from '../../utils/mediaPerf';

const FALLBACK_SRC =
  'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=480&q=70&auto=format&fit=crop';

/**
 * Vehicle promo images — centered crop, hides heavy bottom marketing bar when possible.
 */
export default function VehicleImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  hoverZoom = false,
  width = 480,
  priority = false,
}) {
  const resolved = optimizedImageUrl(src, width, 70) || FALLBACK_SRC;
  const [imgSrc, setImgSrc] = useState(resolved);

  useEffect(() => {
    setImgSrc(resolved);
  }, [resolved]);

  if (!src && !imgSrc) return null;

  return (
    <div className={`relative overflow-hidden bg-[#EDEFF2]/40 ${className}`}>
      <img
        src={imgSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        width={width}
        height={Math.round(width * 0.72)}
        sizes="(max-width: 767px) 85vw, (max-width: 1279px) 33vw, 280px"
        onError={() => {
          if (imgSrc !== FALLBACK_SRC) setImgSrc(FALLBACK_SRC);
        }}
        className={[
          'absolute inset-0 w-full h-full object-cover object-[center_42%]',
          hoverZoom && 'group-hover:scale-[1.03] transition-transform duration-500',
          imgClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </div>
  );
}
