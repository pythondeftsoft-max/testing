import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const APP_VERSION = '2.0.1';
const STORED_VERSION = localStorage.getItem('app_version');
const SUPABASE_TOKEN_KEY = 'sb-kixsdhnfzjnxikmnbipi-auth-token';

// ============================================
// TOKEN AGE CHECK - Runs on EVERY app load
// ============================================
// Prevents SDK from attempting to refresh very stale tokens (causes hangs)
const MAX_TOKEN_AGE_HOURS = 24;

try {
  const tokenData = localStorage.getItem(SUPABASE_TOKEN_KEY);
  if (tokenData) {
    const parsed = JSON.parse(tokenData);
    const expiresAt = parsed?.expires_at;
    
    if (expiresAt) {
      const tokenAgeHours = (Date.now() / 1000 - expiresAt) / 3600;
      
      if (tokenAgeHours > MAX_TOKEN_AGE_HOURS) {
        console.log('[App] Clearing stale auth token (expired', Math.round(tokenAgeHours), 'hours ago)');
        localStorage.removeItem(SUPABASE_TOKEN_KEY);
      }
    }
  }
} catch (e) {
  console.log('[App] Clearing corrupted auth token');
  localStorage.removeItem(SUPABASE_TOKEN_KEY);
}

// Purge any legacy raw-JWT impersonation backup from older builds
try { localStorage.removeItem('admin_session_backup'); } catch {}

// ============================================
// VERSION-BASED CLEANUP - Runs on version change
// ============================================
if (STORED_VERSION !== APP_VERSION) {
  console.log('[App] Version mismatch detected, clearing stale cache...');
  
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sec_')) {
      localStorage.removeItem(key);
    }
  });
  
  localStorage.removeItem(SUPABASE_TOKEN_KEY);
  sessionStorage.clear();
  localStorage.setItem('app_version', APP_VERSION);
  console.log('[App] Stale cache cleared for version', APP_VERSION);
}

createRoot(document.getElementById("root")!).render(<App />);

// ============================================
// INSPECTOR PWA - Service Worker Registration
// ============================================
// Strict guards: never register inside iframes or on Lovable preview hosts
// (per Lovable PWA rules — SW caching breaks the editor preview).
(() => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes('id-preview--') ||
    host.includes('lovableproject.com') ||
    host === 'localhost' ||
    host === '127.0.0.1';

  // In preview/iframe contexts: unregister any stale SWs and bail out.
  if (isInIframe || isPreviewHost) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => {});
    return;
  }

  // Only register on inspector routes, or for users who've used inspector before.
  const path = window.location.pathname;
  const hasUsedInspector = localStorage.getItem('inspector_visited') === '1';
  const onInspector = path.startsWith('/inspector');

  if (onInspector) {
    try { localStorage.setItem('inspector_visited', '1'); } catch {}
  }

  if (!onInspector && !hasUsedInspector) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/inspector-sw.js', { scope: '/inspector/' })
      .catch((err) => console.warn('[Inspector SW] Registration failed:', err));
  });
})();
