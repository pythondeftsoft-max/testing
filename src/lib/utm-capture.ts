// UTM + referrer capture helpers for marketing attribution.
// Stores parameters in sessionStorage so they survive across the lead form.

const STORAGE_KEY = 'openkey_utm_v1';

export interface UtmData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer_url?: string;
  landing_page?: string;
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

export function captureUtmFromUrl(): UtmData {
  if (typeof window === 'undefined') return {};
  try {
    const url = new URL(window.location.href);
    const captured: UtmData = {};
    let hasAny = false;
    for (const k of UTM_KEYS) {
      const v = url.searchParams.get(k);
      if (v) {
        captured[k] = v.slice(0, 200);
        hasAny = true;
      }
    }
    if (hasAny || !sessionStorage.getItem(STORAGE_KEY)) {
      captured.referrer_url = document.referrer ? document.referrer.slice(0, 500) : undefined;
      captured.landing_page = window.location.href.slice(0, 500);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(captured));
    }
    return getStoredUtm();
  } catch {
    return {};
  }
}

export function getStoredUtm(): UtmData {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UtmData) : {};
  } catch {
    return {};
  }
}
