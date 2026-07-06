'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const SKELETON_CSS = `
@keyframes shimmer {
  0% { background-position: -600px 0; }
  100% { background-position: 600px 0; }
}
.sk {
  background: linear-gradient(90deg, #16161c 25%, #1e1e28 50%, #16161c 75%);
  background-size: 600px 100%;
  animation: shimmer 1.6s ease-in-out infinite;
  border-radius: 10px;
}
`;

function Sk({ w = '100%', h = 16, r = 10, style = {} }: { w?: string | number; h?: number; r?: number; style?: React.CSSProperties }) {
  return <div className="sk" style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />;
}

function DashboardSkeleton() {
  return (
    <>
      <style>{SKELETON_CSS}</style>
      {/* Title */}
      <div style={{ marginBottom: 32 }}>
        <Sk w={280} h={36} r={12} style={{ marginBottom: 12 }} />
        <Sk w={180} h={16} />
      </div>

      {/* 3 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 20, padding: 28 }}>
            <Sk w={60} h={11} r={6} style={{ marginBottom: 14 }} />
            <Sk w={90} h={30} r={10} style={{ marginBottom: 12 }} />
            <Sk w={130} h={13} />
          </div>
        ))}
      </div>

      {/* Usage bar */}
      <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 20, padding: 28, marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Sk w={120} h={16} />
          <Sk w={60} h={16} />
        </div>
        <Sk w="100%" h={8} r={8} style={{ marginBottom: 12 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Sk w={70} h={12} />
          <Sk w={90} h={12} />
        </div>
      </div>

      {/* CTA banner */}
      <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 24, padding: 48, textAlign: 'center', marginBottom: 32 }}>
        <Sk w={64} h={48} r={16} style={{ margin: '0 auto 20px' }} />
        <Sk w={220} h={28} r={10} style={{ margin: '0 auto 12px' }} />
        <Sk w={340} h={16} r={8} style={{ margin: '0 auto 8px' }} />
        <Sk w={260} h={16} r={8} style={{ margin: '0 auto 28px' }} />
        <Sk w={160} h={44} r={100} style={{ margin: '0 auto' }} />
      </div>

      {/* Recent history rows */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Sk w={160} h={20} />
        <Sk w={70} h={16} />
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 16, padding: 20, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Sk w={200} h={14} />
            <Sk w={80} h={12} />
          </div>
          <Sk w={140} h={12} />
        </div>
      ))}
    </>
  );
}



function getAPIBase() {
  return window.location.origin;
}

function getAuthToken(client: any) {
  return client.auth.getSession().then((d: any) => d.data.session?.access_token || '');
}

export default function DashboardHome() {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [usage, setUsage] = useState({ tier: 'free', used: 0, limit: 15, remaining: 15 });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const init = async () => {
      const base = getAPIBase();
      const res = await fetch(base + '/api/config');
      const cfg = await res.json();
      if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;

      const supabaseLib = await import('@supabase/supabase-js');
      const sb = supabaseLib.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true } });
      setClient(sb);

      const { data } = await sb.auth.getSession();
      if (!data.session) { router.push('/login'); return; }
      setUser(data.session.user);
    };
    init();
  }, [router]);

  useEffect(() => {
    if (!client || !user) return;
    loadData();
  }, [client, user]);

  const loadData = async () => {
    try {
      const token = await getAuthToken(client);
      const base = getAPIBase();
      const [usageRes, historyRes] = await Promise.all([
        fetch(base + '/api/usage/limits', { headers: { Authorization: 'Bearer ' + token } }),
        fetch(base + '/api/generations', { headers: { Authorization: 'Bearer ' + token } }),
      ]);
      if (usageRes.ok) {
        const u = await usageRes.json();
        setUsage(u);
      }
      if (historyRes.ok) {
        const h = await historyRes.json();
        setHistory(h.slice(0, 5));
      }
      try {
        const meRes = await fetch(base + '/api/admin/me', { headers: { Authorization: 'Bearer ' + token } });
        if (meRes.ok) { const me = await meRes.json(); setIsAdmin(!!me.is_superadmin); }
      } catch (e) { /* ignore */ }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const logout = async () => {
    await client?.auth.signOut();
    router.push('/');
  };

  const percent = usage.limit > 0 ? Math.round((usage.used / usage.limit) * 100) : 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#060608', color: '#f0f0f5', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
      <aside style={{ width: 240, borderRight: '1px solid #1f1f28', padding: 24, display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#c8f53d' }}>●</span> PostMint
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#5a5a72', textTransform: 'uppercase', letterSpacing: 1, padding: '8px 14px' }}>Dashboard</div>
        <Link href="/dashboard" style={{
          textAlign: 'left', padding: '10px 14px', borderRadius: 12, border: 'none',
          background: '#16161c', color: '#c8f53d', cursor: 'pointer', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'block'
        }}>🏠 Dashboard</Link>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#5a5a72', textTransform: 'uppercase', letterSpacing: 1, padding: '8px 14px', marginTop: 8 }}>Create</div>
        <Link href="/app" style={{
          textAlign: 'left', padding: '10px 14px', borderRadius: 12, border: 'none',
          background: 'transparent', color: '#9090a8', cursor: 'pointer', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'block'
        }}>⚡ Generate</Link>
        <Link href="/app?tab=batch" style={{
          textAlign: 'left', padding: '10px 14px', borderRadius: 12, border: 'none',
          background: 'transparent', color: '#9090a8', cursor: 'pointer', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'block'
        }}>📦 Batch Mode</Link>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#5a5a72', textTransform: 'uppercase', letterSpacing: 1, padding: '8px 14px', marginTop: 8 }}>Manage</div>
        <Link href="/app?tab=history" style={{
          textAlign: 'left', padding: '10px 14px', borderRadius: 12, border: 'none',
          background: 'transparent', color: '#9090a8', cursor: 'pointer', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'block'
        }}>🕒 History</Link>
        <Link href="/app?tab=schedule" style={{
          textAlign: 'left', padding: '10px 14px', borderRadius: 12, border: 'none',
          background: 'transparent', color: '#9090a8', cursor: 'pointer', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'block'
        }}>📅 Schedule</Link>
        <Link href="/app?tab=settings" style={{
          textAlign: 'left', padding: '10px 14px', borderRadius: 12, border: 'none',
          background: 'transparent', color: '#9090a8', cursor: 'pointer', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'block'
        }}>⚙️ Settings</Link>
        {isAdmin && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#5a5a72', textTransform: 'uppercase', letterSpacing: 1, padding: '8px 14px', marginTop: 8 }}>Admin</div>
            <Link href="/admin" style={{
              textAlign: 'left', padding: '10px 14px', borderRadius: 12, border: 'none',
              background: 'transparent', color: '#c8f53d', cursor: 'pointer', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'block'
            }}>🛡️ AI Providers</Link>
          </>
        )}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: 12, color: '#5a5a72', marginBottom: 8, padding: '0 14px' }}>{user?.email}</div>
          <button onClick={logout} style={{ width: '100%', padding: '10px', borderRadius: 12, border: '1px solid #1f1f28', background: 'transparent', color: '#9090a8', cursor: 'pointer', fontSize: 13 }}>
            Sign Out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: 40, overflow: 'auto' }}>
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 6 }}>Welcome back{user?.email ? ', ' + user.email.split('@')[0] : ''}</h1>
              <p style={{ color: '#9090a8', fontSize: 15 }}>Here is everything at a glance.</p>
            </div>

            {/* Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
              <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 20, padding: 28 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#5a5a72', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Plan</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#c8f53d', textTransform: 'capitalize' }}>{usage.tier}</div>
                <div style={{ fontSize: 13, color: '#9090a8', marginTop: 8 }}>{usage.tier === 'free' ? '15 generations/mo' : usage.tier === 'pro' ? '500 generations/mo' : 'Unlimited'}</div>
              </div>
              <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 20, padding: 28 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#5a5a72', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Used / Limit</div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{usage.used} <span style={{ color: '#5a5a72', fontSize: 18 }}>/ {usage.limit}</span></div>
                <div style={{ fontSize: 13, color: '#9090a8', marginTop: 8 }}>{usage.remaining} remaining this month</div>
              </div>
              <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 20, padding: 28 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#5a5a72', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Saved Posts</div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{history.length}</div>
                <div style={{ fontSize: 13, color: '#9090a8', marginTop: 8 }}>In your history</div>
              </div>
            </div>

            {/* Usage bar */}
            <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 20, padding: 28, marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Monthly Usage</div>
                <div style={{ fontSize: 13, color: '#9090a8' }}>{percent}% used</div>
              </div>
              <div style={{ background: '#16161c', borderRadius: 8, height: 8, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ background: 'linear-gradient(90deg,#c8f53d,#34d399)', height: '100%', width: `${percent}%`, borderRadius: 8, transition: 'width .3s' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#5a5a72' }}>
                <span>{usage.used} used</span>
                <span>{usage.remaining} remaining</span>
              </div>
            </div>

            {/* Big Generate CTA */}
            <div style={{ background: 'linear-gradient(135deg, rgba(200,245,61,.08), rgba(52,211,153,.06))', border: '1px solid rgba(200,245,61,.2)', borderRadius: 24, padding: 48, textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
              <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Ready to create?</h2>
              <p style={{ color: '#9090a8', fontSize: 15, maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.6 }}>
                Turn any video or text into platform-ready social posts in seconds. Your brand voice, your style.
              </p>
              <Link href="/app" style={{
                display: 'inline-block', background: '#c8f53d', color: '#000', padding: '14px 36px', borderRadius: 100,
                textDecoration: 'none', fontWeight: 800, fontSize: 15
              }}>
                Generate Posts →
              </Link>
            </div>

            {/* Recent History */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Recent Generations</div>
                <Link href="/app?tab=history" style={{ fontSize: 13, color: '#c8f53d', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
              </div>
              {history.length === 0 ? (
                <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 16, padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
                  <p style={{ color: '#9090a8', fontSize: 14 }}>No generations yet. Click <strong>Generate Posts</strong> to get started.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {history.map((item) => (
                    <Link key={item.id} href="/app" style={{
                      background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 16, padding: 20,
                      textDecoration: 'none', color: 'inherit', display: 'block'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#c8f53d' }}>{item.title || item.url || 'Text input'}</div>
                        <div style={{ fontSize: 12, color: '#5a5a72' }}>{new Date(item.created_at).toLocaleDateString()}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#5a5a72' }}>{new Date(item.created_at).toLocaleString()}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <Link href="/app?tab=settings" style={{
                background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 16, padding: 24,
                textDecoration: 'none', color: 'inherit', display: 'block'
              }}>
                <div style={{ fontSize: 24, marginBottom: 12 }}>⚙️</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Settings</div>
                <div style={{ fontSize: 13, color: '#9090a8' }}>API key, brand voice, preferences</div>
              </Link>
              <Link href="/app?tab=batch" style={{
                background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 16, padding: 24,
                textDecoration: 'none', color: 'inherit', display: 'block'
              }}>
                <div style={{ fontSize: 24, marginBottom: 12 }}>📦</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Batch Mode</div>
                <div style={{ fontSize: 13, color: '#9090a8' }}>Process multiple URLs at once</div>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
