'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const spinStyle = `
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeoutMs)),
  ]);
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [client, setClient] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const base = window.location.origin;
      try {
        const res = await withTimeout(fetch(base + '/api/config'), 5000);
        if (!res.ok) throw new Error('Config request failed');
        const cfg = await res.json();
        if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
          setError('Auth not configured. Check your Supabase credentials in .env');
          return;
        }
        const supabaseLib = await import('@supabase/supabase-js');
        const sb = supabaseLib.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true } });
        setClient(sb);

        const { data } = await sb.auth.getSession();
        if (data.session) {
          router.push('/app');
        }
      } catch (e) {
        setError('Auth not configured. Check your Supabase credentials.');
      } finally {
        setInitLoading(false);
      }
    };
    init();
  }, [router]);

  const handleSubmit = async () => {
    if (!client) { setError('Auth not configured'); return; }
    if (!email || !password) { setError('Please enter email and password.'); return; }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isSignUp) {
        const { error: signUpErr } = await client.auth.signUp({ email, password });
        if (signUpErr) throw signUpErr;
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setIsSignUp(false);
      } else {
        const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        setSuccess('Signed in! Redirecting...');
        setTimeout(() => router.push('/app'), 800);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#060608', color: '#f0f0f5', fontFamily: "'Cabinet Grotesk', sans-serif", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{spinStyle}</style>
      <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 24, padding: '40px 36px', width: '100%', maxWidth: 420 }}>
        <Link href="/" style={{ color: '#9090a8', textDecoration: 'none', fontSize: 13, marginBottom: 20, display: 'inline-block' }}>← Back to home</Link>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#c8f53d', display: 'inline-block' }}></span>
          PostMint
        </div>
        <div style={{ color: '#9090a8', fontSize: 14, marginBottom: 28 }}>{isSignUp ? 'Create your account' : 'Sign in to your account'}</div>

        {error && <div style={{ background: 'rgba(255,107,107,.1)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}
        {success && <div style={{ background: 'rgba(200,245,61,.1)', color: '#c8f53d', border: '1px solid rgba(200,245,61,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{success}</div>}

        {initLoading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9090a8', fontSize: 14 }}>
            <div style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid #1f1f28', borderTop: '3px solid #c8f53d', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }}></div>
            <div>Loading...</div>
          </div>
        )}

        {!initLoading && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 6, textTransform: 'uppercase' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" disabled={loading} style={{ width: '100%', background: '#16161c', border: '1px solid #1f1f28', borderRadius: 12, padding: '12px 14px', color: '#f0f0f5', fontSize: 14, outline: 'none', opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'text' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 6, textTransform: 'uppercase' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()} disabled={loading} style={{ width: '100%', background: '#16161c', border: '1px solid #1f1f28', borderRadius: 12, padding: '12px 14px', color: '#f0f0f5', fontSize: 14, outline: 'none', opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'text' }} />
            </div>

            <button onClick={handleSubmit} disabled={loading || !client} style={{
              width: '100%',
              background: loading || !client ? '#8aa830' : '#c8f53d',
              color: '#000',
              border: 'none',
              borderRadius: 12,
              padding: 13,
              fontSize: 14,
              fontWeight: 800,
              cursor: loading || !client ? 'not-allowed' : 'pointer',
              opacity: loading || !client ? 0.6 : 1,
              transition: 'opacity .2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
              {loading && (
                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(0,0,0,.3)', borderTop: '2px solid #000', borderRadius: '50%', animation: 'spin .8s linear infinite' }}></span>
              )}
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#1f1f28' }}></div>
              <span style={{ fontSize: 12, color: '#5a5a72' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#1f1f28' }}></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => client?.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/auth/callback' } })} disabled={!client} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #2a2a38', background: '#16161c', color: '#f0f0f5', fontSize: 14, fontWeight: 600, cursor: client ? 'pointer' : 'not-allowed', opacity: client ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
                Continue with Google
              </button>
              <button onClick={() => client?.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: window.location.origin + '/auth/callback' } })} disabled={!client} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #2a2a38', background: '#16161c', color: '#f0f0f5', fontSize: 14, fontWeight: 600, cursor: client ? 'pointer' : 'not-allowed', opacity: client ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 16 16"><path fill="#f0f0f5" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8"/></svg>
                Continue with GitHub
              </button>
            </div>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#9090a8' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <a onClick={() => { if (!loading) { setIsSignUp(!isSignUp); setError(''); setSuccess(''); } }} style={{ color: loading ? '#5a5a72' : '#c8f53d', textDecoration: 'none', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {isSignUp ? 'Sign in' : 'Sign up'}
          </a>
        </div>
      </div>
    </div>
  );
}
