// ContentForge Auth & API Module
const API_BASE = (window.location.origin.includes('localhost') ? 'http://localhost:3001' : window.location.origin) + '/api';
const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';

let sb = null;
let currentUser = null;
let _token = null;

function initSupabase() {
  if (!window.supabase) {
    console.warn('Supabase library not loaded');
    return false;
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase not configured — fill SUPABASE_URL and SUPABASE_ANON_KEY in js/auth.js');
    return false;
  }
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return true;
}

async function refreshSession() {
  if (!sb) return null;
  const { data, error } = await sb.auth.getSession();
  if (error || !data.session) {
    currentUser = null;
    _token = null;
    return null;
  }
  _token = data.session.access_token;
  currentUser = data.session.user;
  return data.session;
}

async function getToken() {
  if (_token) return _token;
  const s = await refreshSession();
  return s ? s.access_token : '';
}

async function signUp(email, password) {
  if (!sb) throw new Error('Auth not configured');
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  _token = data.session?.access_token || null;
  currentUser = data.session?.user || null;
  return data;
}

async function signIn(email, password) {
  if (!sb) throw new Error('Auth not configured');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  _token = data.session.access_token;
  currentUser = data.session.user;
  return data;
}

async function signOut() {
  if (!sb) return;
  await sb.auth.signOut();
  currentUser = null;
  _token = null;
}

async function apiFetch(path, opts = {}) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, {
    ...opts,
    headers
  });

  if (res.status === 401) {
    currentUser = null;
    _token = null;
    openAuthModal();
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'API error ' + res.status);
  }
  return res.json();
}

async function apiGet(path)   { return apiFetch(path, { method: 'GET' }); }
async function apiPost(path, body) { return apiFetch(path, { method: 'POST', body: JSON.stringify(body) }); }
async function apiPatch(path, body){ return apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }); }
async function apiDelete(path) { return apiFetch(path, { method: 'DELETE' }); }

// ---- Data API ----
async function loadUserProfile() {
  if (!currentUser) return null;
  try { return await apiGet('/profile'); } catch (e) { console.error(e); return null; }
}

async function updateProfile(updates) {
  if (!currentUser) return null;
  return apiPatch('/profile', updates);
}

async function loadHistory() {
  if (!currentUser) return JSON.parse(localStorage.getItem('cf_history') || '[]');
  try { return await apiGet('/generations'); } catch (e) { console.error(e); return []; }
}

async function saveGenerationToCloud(entry) {
  if (!currentUser) return false;
  try {
    await apiPost('/generations', entry);
    return true;
  } catch (e) { console.error(e); return false; }
}

async function deleteGenerationCloud(id) {
  if (!currentUser) return false;
  try { await apiDelete('/generations/' + id); return true; } catch (e) { console.error(e); return false; }
}

async function loadScheduled() {
  if (!currentUser) return JSON.parse(localStorage.getItem('cf_scheduled') || '[]');
  try { return await apiGet('/scheduled'); } catch (e) { console.error(e); return []; }
}

async function saveScheduledCloud(entry) {
  if (!currentUser) return false;
  try { await apiPost('/scheduled', entry); return true; } catch (e) { console.error(e); return false; }
}

async function deleteScheduledCloud(id) {
  if (!currentUser) return false;
  try { await apiDelete('/scheduled/' + id); return true; } catch (e) { console.error(e); return false; }
}

async function getUsageLimits() {
  if (!currentUser) return { tier: 'free', limits: { generationsPerMonth: 15 }, used: 0, remaining: 15 };
  try { return await apiGet('/usage/limits'); } catch (e) { console.error(e); return { tier: 'free', limits: { generationsPerMonth: 15 }, used: 0, remaining: 15 }; }
}

async function logUsage(actionType, count = 1) {
  if (!currentUser) return { success: true };
  try { return await apiPost('/usage/log', { action_type: actionType, count }); } catch (e) { return { success: false, error: e.message }; }
}

// ---- Billing ----
async function getBillingConfig() {
  return fetch(API_BASE + '/billing/config').then(r => r.json());
}

async function createCheckout(priceId) {
  return apiPost('/billing/checkout', { priceId });
}

async function createPortal() {
  return apiPost('/billing/portal', {});
}
