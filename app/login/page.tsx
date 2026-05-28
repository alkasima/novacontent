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
          router.push('/dashboard');
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
        setTimeout(() => router.push('/dashboard'), 800);
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
