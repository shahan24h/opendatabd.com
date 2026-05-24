/**
 * OpenDataBD — browser auth module
 * Uses Supabase JS v2 (CDN ESM build).
 * Config is fetched from /api/config so no secrets live in static files.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

let supabase;
let _session = null;

// ── Boot ──────────────────────────────────────────────────────────────────────

export async function initAuth() {
  const cfg = await fetch('/api/config').then(r => r.json());
  supabase = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  // Restore existing session (e.g. after page refresh)
  const { data: { session } } = await supabase.auth.getSession();
  _session = session;
  _updateUI(session?.user ?? null);

  // React to sign-in / sign-out events
  supabase.auth.onAuthStateChange((_event, session) => {
    _session = session;
    _updateUI(session?.user ?? null);
  });
}

// ── Auth actions ─────────────────────────────────────────────────────────────

export async function signUp(email, password, fullName = '') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (!error && data.session) {
    // Send welcome email via our server (fire-and-forget — no await)
    fetch('/api/auth/signup-complete', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({ fullName }),
    }).catch(() => {});
  }

  return { data, error };
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithMagicLink(email) {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
}

export async function resetPassword(email) {
  const res = await fetch('/api/auth/reset-password', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email }),
  });
  return res.json();
}

export async function signOut() {
  return supabase.auth.signOut();
}

export const getSession = () => _session;
export const getUser    = () => _session?.user ?? null;
export const getToken   = () => _session?.access_token ?? null;

// ── Authenticated fetch helper ────────────────────────────────────────────────
// Use this for any API call that needs auth:
//   await authFetch('/api/datasets', { method: 'POST', body: JSON.stringify(data) })

export async function authFetch(url, options = {}) {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ── Internal UI sync ──────────────────────────────────────────────────────────

function _updateUI(user) {
  const signInBtn = document.getElementById('auth-signin-btn');
  const userMenu  = document.getElementById('auth-user-menu');
  const userName  = document.getElementById('auth-user-name');
  const avatar    = document.getElementById('auth-user-avatar');

  if (user) {
    signInBtn?.classList.add('hidden');
    if (userMenu) {
      userMenu.classList.remove('hidden');
      userMenu.classList.add('flex');
    }
    const displayName = user.user_metadata?.full_name || user.email;
    if (userName) userName.textContent = displayName.split(' ')[0]; // first name only
    if (avatar)   avatar.textContent   = displayName.charAt(0).toUpperCase();
  } else {
    signInBtn?.classList.remove('hidden');
    if (userMenu) {
      userMenu.classList.add('hidden');
      userMenu.classList.remove('flex');
    }
  }
}
