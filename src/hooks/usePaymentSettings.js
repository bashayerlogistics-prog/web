import { useState, useEffect, useCallback } from 'react';
import { getPaymentSettings } from '../firebase/payment';
import { DEFAULT_PAYMENT_SETTINGS } from '../data/paymentDefaults';

const LS_KEY = 'bashayer-payment-settings-v1';
const CACHE_MS = 10 * 60_000;
const FETCH_TIMEOUT_MS = 2500;

let cachedSettings = null;
let cacheTime = 0;

function readPersistedSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || !parsed?.at) return null;
    if (Date.now() - parsed.at > CACHE_MS * 6) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function persistSettings(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ data, at: Date.now() }));
  } catch {
    // ignore
  }
}

function bootSettings() {
  if (cachedSettings) return cachedSettings;
  const fromLs = readPersistedSettings();
  if (fromLs) {
    cachedSettings = fromLs;
    cacheTime = Date.now();
    return fromLs;
  }
  return DEFAULT_PAYMENT_SETTINGS;
}

async function getPaymentSettingsWithTimeout() {
  return Promise.race([
    getPaymentSettings(),
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error('payment-settings-timeout')), FETCH_TIMEOUT_MS);
    }),
  ]);
}

export function usePaymentSettings() {
  const [settings, setSettings] = useState(bootSettings);
  const [loading, setLoading] = useState(() => !cachedSettings && !readPersistedSettings());

  const refresh = useCallback(async () => {
    // Never block UI — we already painted defaults / last known settings.
    try {
      const data = await getPaymentSettingsWithTimeout();
      cachedSettings = data;
      cacheTime = Date.now();
      persistSettings(data);
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
    void refresh();
  }, [refresh]);

  return { settings, loading, refresh };
}

export function invalidatePaymentSettingsCache() {
  cachedSettings = null;
  cacheTime = 0;
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}
