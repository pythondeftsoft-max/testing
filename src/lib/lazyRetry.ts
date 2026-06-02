import { lazy, ComponentType } from 'react';

/**
 * Wraps a dynamic import with retry logic to handle transient 503 errors.
 * Retries up to `maxRetries` times with exponential backoff.
 * On final failure for module-fetch errors, triggers a one-time hard reload (per module).
 *
 * @param importFn  – dynamic import factory
 * @param moduleKey – unique key for this module (used for per-module reload guard)
 * @param maxRetries – number of retry attempts before giving up
 * @param baseDelayMs – initial backoff delay in ms
 */
export function lazyRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  moduleKey = 'default',
  maxRetries = 3,
  baseDelayMs = 1000
) {
  return lazy(() => retryImport(importFn, moduleKey, maxRetries, baseDelayMs));
}

function isModuleFetchError(error: any): boolean {
  const msg = String(error?.message || '');
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('NetworkError') ||
    msg.includes('fetch') // broad fallback for generic fetch failures on modules
  );
}

function getStorageKey(moduleKey: string) {
  return `lazyRetry-reload:${moduleKey}`;
}

function getSessionFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function setSessionFlag(key: string): void {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    // storage unavailable – skip
  }
}

function removeSessionFlag(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // storage unavailable – skip
  }
}

async function retryImport<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  moduleKey: string,
  retriesLeft: number,
  delayMs: number
): Promise<{ default: T }> {
  try {
    const mod = await importFn();
    // Success – clear any reload marker for this module
    removeSessionFlag(getStorageKey(moduleKey));
    return mod;
  } catch (error: any) {
    if (retriesLeft > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
      return retryImport(importFn, moduleKey, retriesLeft - 1, delayMs * 2);
    }

    // All retries exhausted – try one guarded reload if it's a module fetch error
    if (isModuleFetchError(error)) {
      const key = getStorageKey(moduleKey);
      if (!getSessionFlag(key)) {
        setSessionFlag(key);
        window.location.reload();
        // Return a never-resolving promise so React doesn't render an error before reload
        return new Promise(() => {});
      }
      // Already tried reload once for this module – clear flag and throw
      removeSessionFlag(key);
    }

    throw error;
  }
}
