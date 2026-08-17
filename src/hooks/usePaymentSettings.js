import { useState, useEffect, useCallback } from 'react';
import { getPaymentSettings } from '../firebase/payment';
import { DEFAULT_PAYMENT_SETTINGS } from '../data/paymentDefaults';

let cachedSettings = null;
let cacheTime = 0;
const CACHE_MS = 5 * 60_000;
const FETCH_TIMEOUT_MS = 8000;

async function getPaymentSettingsWithTimeout() {
  return Promise.race([
    getPaymentSettings(),
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error('payment-settings-timeout')), FETCH_TIMEOUT_MS);
    }),
  ]);
}

export function usePaymentSettings() {
  const [settings, setSettings] = useState(cachedSettings || DEFAULT_PAYMENT_SETTINGS);
  const [loading, setLoading] = useState(!cachedSettings);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPaymentSettingsWithTimeout();
      cachedSettings = data;
      cacheTime = Date.now();
      setSettings(data);
    } catch {
      setSettings(cachedSettings || DEFAULT_PAYMENT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cachedSettings && Date.now() - cacheTime < CACHE_MS) {
      setSettings(cachedSettings);
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh]);

  return { settings, loading, refresh };
}

export function invalidatePaymentSettingsCache() {
  cachedSettings = null;
  cacheTime = 0;
}
