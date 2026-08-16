import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { playAlertSound } from '../utils/alertSound';

/** Play alert sound when a popup opens in Arabic */
export function useArabicAlertSound(open, type = 'info') {
  const { i18n } = useTranslation();
  const playedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      playedRef.current = false;
      return;
    }
    if (playedRef.current) return;
    if (i18n.language !== 'ar') return;

    playedRef.current = true;
    playAlertSound(type, 'ar');
  }, [open, type, i18n.language]);
}
