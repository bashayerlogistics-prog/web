import { FONT_OPTIONS } from '../data/brandingDefaults';

export function loadGoogleFont(fontName, linkId) {
  const opt = FONT_OPTIONS.find((f) => f.value === fontName);
  if (!opt) return;

  const encoded = fontName.replace(/ /g, '+');
  const href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@${opt.weights}&display=swap`;

  let link = document.getElementById(linkId);
  if (!link) {
    link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.dataset.font !== fontName) {
    link.href = href;
    link.dataset.font = fontName;
  }
}
