'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const PROVIDERS = [
  { value: 'anthropic', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini (Google)' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'custom', label: 'Custom (OpenAI-compatible)' },
];

const PROVIDER_PREFIX: Record<string, string> = {
  anthropic: 'anthropic/',
  openai: 'openai/',
  gemini: 'google/',
  openrouter: '',
  custom: '__none__',
};

let cachedModels: string[] | null = null;

async function fetchModelList(): Promise<string[]> {
  if (cachedModels) return cachedModels;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) throw new Error('Failed to fetch');
    const body = await res.json();
    const models: string[] = (body.data || []).map((m: any) => m.id).filter(Boolean);
    models.sort();
    cachedModels = models;
    return models;
  } catch {
    return [];
  }
}

interface Provider {
  id: string;
  provider: string;
  label?: string | null;
  model: string;
  api_key: string;
  base_url?: string | null;
  is_default: boolean;
  is_active: boolean;
}

const card: React.CSSProperties = { background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 16, padding: 24 };
const input: React.CSSProperties = { width: '100%', padding: '11px 14px', borderRadius: 12, background: '#16161c', border: '1px solid #2a2a38', color: '#f0f0f5', fontSize: 14, boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#9090a8', marginBottom: 6, display: 'block' };


const SK_CSS = `
@keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
.sk{background:linear-gradient(90deg,#16161c 25%,#1e1e28 50%,#16161c 75%);background-size:600px 100%;animation:shimmer 1.6s ease-in-out infinite;border-radius:10px}
`;

function Sk({ w = '100%', h = 16, r = 10, mb = 0 }: { w?: string|number; h?: number; r?: number; mb?: number }) {
  return <div className="sk" style={{ width: w, height: h, borderRadius: r, marginBottom: mb, flexShrink: 0 }} />;
}

function ProviderRowSkeleton() {
  return (
    <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 16, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <Sk w={120} h={16} r={8} />
          <Sk w={60} h={16} r={100} />
        </div>
        <Sk w={220} h={13} r={6} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Sk w={90} h={36} r={10} />
        <Sk w={70} h={36} r={10} />
        <Sk w={64} h={36} r={10} />
      </div>
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div style={{ background: '#060608', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{SK_CSS}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '3px solid #1f1f28', borderTop: '3px solid #c8f53d', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: '#5a5a72', fontSize: 14 }}>Checking access…</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ provider: 'anthropic', label: '', model: '', api_key: '', base_url: '', is_default: false });
  const [saving, setSaving] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [modelOpen, setModelOpen] = useState(false);
  const [allModels, setAllModels] = useState<string[]>([]);
  const modelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { fetchModelList().then(setAllModels); }, []);

  useEffect(() => {
    setModelSearch('');
    setForm(prev => ({ ...prev, model: '' }));
  }, [form.provider]);

  const filteredModels = allModels.filter(m => {
    const prefix = PROVIDER_PREFIX[form.provider];
    if (prefix === '__none__') return false;
    if (prefix && !m.startsWith(prefix)) return false;
    return !modelSearch || m.toLowerCase().includes(modelSearch.toLowerCase());
  });

  function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms)),
    ]);
  }

  const getToken = useCallback(async (c: any) => {
    const { data } = await c.auth.getSession();
    return data.session?.access_token || '';
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await withTimeout(fetch(window.location.origin + '/api/config'), 8000);
        const cfg = await res.json();
        if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) { setAuthChecked(true); return; }
        const lib = await import('@supabase/supabase-js');
        const sb = lib.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true } });
        setClient(sb);
        const { data } = await withTimeout(sb.auth.getSession(), 8000);
        if (!data.session) { router.push('/login'); return; }
        const token = data.session.access_token;
        const meRes = await withTimeout(fetch('/api/admin/me', { headers: { Authorization: 'Bearer ' + token } }), 8000);
        const me = await meRes.json().catch(() => ({ is_superadmin: false }));
        setAllowed(!!me.is_superadmin);
      } catch (e) {
        console.error('Admin init failed:', e);
        setError('Could not connect to server. Please check your connection and try again.');
      } finally {
        setAuthChecked(true);
      }
    };
    init();
  }, [router]);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      const token = await getToken(client);
      const res = await withTimeout(fetch('/api/admin/providers', { headers: { Authorization: 'Bearer ' + token } }), 8000);
      if (res.ok) setProviders(await res.json());
      else setError('Failed to load providers');
    } catch (e) {
      console.error('Failed to load providers:', e);
      setError('Failed to load providers. Check your connection.');
    } finally { setLoading(false); }
  }, [client, getToken]);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  const addProvider = async () => {
    setError('');
    if (!form.model.trim() || !form.api_key.trim()) { setError('Model and API key are required.'); return; }
    if (form.provider === 'custom' && !form.base_url.trim()) { setError('Custom provider requires a base URL.'); return; }
    setSaving(true);
    try {
      const token = await getToken(client);
      const res = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to add provider'); return; }
      setForm({ provider: 'anthropic', label: '', model: '', api_key: '', base_url: '', is_default: false });
      setModelSearch('');
      await load();
    } finally { setSaving(false); }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const token = await getToken(client);
    await fetch('/api/admin/providers/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(body),
    });
    await load();
  };

  const remove = async (id: string) => {
    const token = await getToken(client);
    await fetch('/api/admin/providers/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
    await load();
  };

  if (!authChecked) {
    return error ? (
      <div style={{ background: '#060608', color: '#9090a8', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ color: '#ff7a7a', fontSize: 14 }}>{error}</div>
        <button onClick={() => router.push('/app')} style={{ padding: '10px 22px', borderRadius: 100, background: '#c8f53d', color: '#000', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>Back to app</button>
      </div>
    ) : <FullPageSpinner />;
  }


  if (!allowed) {
    return (
      <div style={{ background: '#060608', color: '#f0f0f5', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
        {error && <div style={{ color: '#ff7a7a', fontSize: 14, marginBottom: 8 }}>{error}</div>}
        <div style={{ fontSize: 48 }}>🔒</div>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Superadmin only</h1>
        <p style={{ color: '#9090a8' }}>You do not have access to this page.</p>
            <button onClick={() => router.push('/app')} style={{ padding: '10px 22px', borderRadius: 100, background: '#c8f53d', color: '#000', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Back to app</button>
      </div>
    );
  }

  return (
    <div style={{ background: '#060608', color: '#f0f0f5', minHeight: '100vh', fontFamily: "'Cabinet Grotesk', sans-serif", padding: '40px 5%' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900 }}>AI Providers</h1>
            <button onClick={() => router.push('/app')} style={{ padding: '9px 18px', borderRadius: 100, background: 'transparent', color: '#9090a8', border: '1px solid #2a2a38', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>← App</button>
        </div>
        <p style={{ color: '#9090a8', marginBottom: 32, fontSize: 15 }}>Configure the AI providers the whole site uses. Set one as the default.</p>

        {/* Add form */}
        <div style={{ ...card, marginBottom: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 18 }}>Add provider</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Provider</label>
              <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} style={input as any}>
                {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Label (optional)</label>
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Primary" style={input} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Model</label>
            <div ref={modelRef} style={{ position: 'relative' }}>
              <input
                value={modelOpen ? modelSearch : form.model}
                onChange={(e) => { setModelSearch(e.target.value); setForm({ ...form, model: e.target.value }); setModelOpen(true); }}
                onFocus={() => { setModelSearch(form.model); setModelOpen(true); }}
                placeholder={form.provider === 'custom' ? 'your-model-id' : 'Type to search or enter custom model…'}
                style={input}
              />
              {modelOpen && filteredModels.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a24', border: '1px solid #2a2a38', borderRadius: 12, marginTop: 4, maxHeight: 220, overflow: 'auto', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
                  {filteredModels.map(m => (
                    <div key={m} onClick={() => { setForm({ ...form, model: m }); setModelSearch(m); setModelOpen(false); }}
                      style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: '#f0f0f5', borderBottom: '1px solid #1f1f28',
                        background: form.model === m ? 'rgba(200,245,61,.1)' : 'transparent' }}>
                      {m}
                    </div>
                  ))}
                </div>
              )}
              {modelOpen && !filteredModels.length && modelSearch && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a24', border: '1px solid #2a2a38', borderRadius: 12, marginTop: 4, zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
                  <div style={{ padding: '10px 14px', fontSize: 13, color: '#5a5a72' }}>No match — using &quot;{modelSearch}&quot; as custom</div>
                </div>
              )}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>API Key</label>
            <input value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder="sk-..." type="password" style={input} />
          </div>
          {form.provider === 'custom' && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Base URL (OpenAI-compatible)</label>
              <input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://your-endpoint/v1" style={input} />
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, fontSize: 14, color: '#c8c8d8', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
            Set as default provider for the whole site
          </label>
          {error && <div style={{ color: '#ff7a7a', fontSize: 13, marginBottom: 14 }}>{error}</div>}
          <button onClick={addProvider} disabled={saving} style={{ padding: '12px 28px', borderRadius: 100, background: '#c8f53d', color: '#000', border: 'none', fontWeight: 800, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Add provider'}
          </button>
        </div>

        {/* List */}
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Configured providers</div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <style>{SK_CSS}</style>
            {[0, 1, 2].map(i => <ProviderRowSkeleton key={i} />)}
          </div>
        ) : providers.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: '#9090a8' }}>No providers yet. Add one above.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {providers.map((p) => (
              <div key={p.id} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, textTransform: 'capitalize' }}>{p.label || p.provider}</span>
                    {p.is_default && <span style={{ fontSize: 11, fontWeight: 800, color: '#000', background: '#c8f53d', padding: '2px 8px', borderRadius: 100 }}>DEFAULT</span>}
                    {!p.is_active && <span style={{ fontSize: 11, fontWeight: 700, color: '#9090a8', border: '1px solid #2a2a38', padding: '2px 8px', borderRadius: 100 }}>INACTIVE</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#9090a8' }}>{p.provider} · {p.model} · key {p.api_key}</div>
                  {p.base_url && <div style={{ fontSize: 12, color: '#5a5a72' }}>{p.base_url}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!p.is_default && (
                    <button onClick={() => patch(p.id, { is_default: true })} style={{ padding: '8px 14px', borderRadius: 10, background: 'transparent', color: '#c8f53d', border: '1px solid #2a2a38', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Set default</button>
                  )}
                  <button onClick={() => patch(p.id, { is_active: !p.is_active })} style={{ padding: '8px 14px', borderRadius: 10, background: 'transparent', color: '#9090a8', border: '1px solid #2a2a38', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>{p.is_active ? 'Disable' : 'Enable'}</button>
                  <button onClick={() => remove(p.id)} style={{ padding: '8px 14px', borderRadius: 10, background: 'transparent', color: '#ff7a7a', border: '1px solid #2a2a38', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
