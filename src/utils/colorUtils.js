function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

function mix(hex1, hex2, weight) {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  const w = weight / 100;
  return rgbToHex(
    a.r * (1 - w) + b.r * w,
    a.g * (1 - w) + b.g * w,
    a.b * (1 - w) + b.b * w,
  );
}

function darken(hex, amount) {
  return mix(hex, '#000000', amount);
}

function lighten(hex, amount) {
  return mix(hex, '#ffffff', amount);
}

/** Generate primary/secondary shade scales from two base colors */
export function generateColorScale(baseHex) {
  return {
    50: lighten(baseHex, 92),
    100: lighten(baseHex, 84),
    200: lighten(baseHex, 68),
    300: lighten(baseHex, 48),
    400: lighten(baseHex, 24),
    500: baseHex,
    600: darken(baseHex, 12),
    700: darken(baseHex, 24),
    800: darken(baseHex, 38),
    900: darken(baseHex, 52),
  };
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG contrast ratio between two hex colors. */
export function getContrastRatio(colorA, colorB) {
  const lighter = Math.max(relativeLuminance(colorA), relativeLuminance(colorB));
  const darker = Math.min(relativeLuminance(colorA), relativeLuminance(colorB));
  return (lighter + 0.05) / (darker + 0.05);
}

/** Pick the most readable near-black or white foreground for a background. */
export function getReadableTextColor(backgroundColor) {
  const dark = '#111827';
  const light = '#ffffff';
  return getContrastRatio(backgroundColor, dark) >= getContrastRatio(backgroundColor, light) ? dark : light;
}

/**
 * Move a background toward black/white only when needed to meet WCAG AA.
 * Existing accessible colors are returned unchanged.
 */
export function ensureContrast(backgroundColor, foregroundColor, targetRatio = 4.5) {
  if (getContrastRatio(backgroundColor, foregroundColor) >= targetRatio) return backgroundColor;

  const target = relativeLuminance(foregroundColor) > 0.5 ? '#000000' : '#ffffff';
  for (let amount = 2; amount <= 100; amount += 2) {
    const candidate = mix(backgroundColor, target, amount);
    if (getContrastRatio(candidate, foregroundColor) >= targetRatio) return candidate;
  }
  return target;
}

function toRgbChannels(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

export function buildBrandingCssVars(primaryColor, secondaryColor) {
  const primary = generateColorScale(primaryColor);
  const secondary = generateColorScale(secondaryColor);
  const vars = {};

  vars['--color-brand'] = primaryColor;
  vars['--color-brand-dark'] = primary[700];
  vars['--color-brand-light'] = primary[400];
  vars['--color-brand-deep'] = primary[900];
  vars['--color-brand-rgb'] = toRgbChannels(primaryColor);
  vars['--color-brand-dark-rgb'] = toRgbChannels(primary[700]);
  vars['--color-brand-deep-rgb'] = toRgbChannels(primary[900]);
  vars['--color-gold'] = secondaryColor;
  vars['--color-gold-dark'] = secondary[700];
  vars['--color-gold-light'] = secondary[400];
  vars['--color-gold-rgb'] = toRgbChannels(secondaryColor);
  vars['--color-gold-dark-rgb'] = toRgbChannels(secondary[700]);
  vars['--color-gold-light-rgb'] = toRgbChannels(secondary[400]);

  for (const [shade, val] of Object.entries(primary)) {
    vars[`--color-primary-${shade}`] = val;
  }
  for (const [shade, val] of Object.entries(secondary)) {
    vars[`--color-secondary-${shade}`] = val;
    vars[`--color-gold-${shade}`] = val;
  }

  return vars;
}
