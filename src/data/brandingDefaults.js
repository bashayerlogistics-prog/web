export const DEFAULT_BRANDING = {
  primaryColor: '#3e0f77',
  secondaryColor: '#d5a027',
  userFontAr: 'Tajawal',
  userFontEn: 'Inter',
  userFont: 'Tajawal',
  adminFont: 'Inter',
  logoUrl: '',
};

export function resolveUserFont(branding, lang) {
  const isEn = lang === 'en';
  if (isEn) return branding.userFontEn || branding.userFont || 'Inter';
  return branding.userFontAr || branding.userFont || 'Tajawal';
}

export const FONT_OPTIONS = [
  { value: 'Tajawal', label: 'Tajawal', family: '"Tajawal", sans-serif', weights: '400;700' },
  { value: 'Inter', label: 'Inter', family: '"Inter", sans-serif', weights: '400;600;700' },
  { value: 'Cairo', label: 'Cairo', family: '"Cairo", sans-serif', weights: '400;600;700' },
  { value: 'Poppins', label: 'Poppins', family: '"Poppins", sans-serif', weights: '400;600;700' },
  { value: 'Roboto', label: 'Roboto', family: '"Roboto", sans-serif', weights: '400;500;700' },
  { value: 'Open Sans', label: 'Open Sans', family: '"Open Sans", sans-serif', weights: '400;600;700' },
  { value: 'Nunito', label: 'Nunito', family: '"Nunito", sans-serif', weights: '400;600;700' },
  { value: 'Montserrat', label: 'Montserrat', family: '"Montserrat", sans-serif', weights: '400;600;700' },
];

export function getFontFamily(fontName) {
  const opt = FONT_OPTIONS.find((f) => f.value === fontName);
  return opt?.family ?? '"Tajawal", sans-serif';
}
