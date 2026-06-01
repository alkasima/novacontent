'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const base = window.location.origin;
      try {
        const res = await fetch(base + '/api/config');
        const cfg = await res.json();
        if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
          const supabaseLib = await import('@supabase/supabase-js');
          const sb = supabaseLib.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true } });
          const { data } = await sb.auth.getSession();
          if (data.session) {
            router.push('/app');
          }
        }
      } catch (e) { /* ignore */ }
    };
    init();
  }, [router]);

  return (
    <main style={{ background: '#060608', color: '#f0f0f5', fontFamily: "'Cabinet Grotesk', sans-serif", minHeight: '100vh' }}>
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '0 5%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72, borderBottom: '1px solid transparent' }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#c8f53d', display: 'inline-block' }}></span>
          PostMint
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          <a href="#how" style={{ fontSize: 14, color: '#9090a8', textDecoration: 'none', fontWeight: 500 }}>How it works</a>
          <a href="#features" style={{ fontSize: 14, color: '#9090a8', textDecoration: 'none', fontWeight: 500 }}>Features</a>
          <a href="#pricing" style={{ fontSize: 14, color: '#9090a8', textDecoration: 'none', fontWeight: 500 }}>Pricing</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href="/login" style={{ color: '#9090a8', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Log in</Link>
          <Link href="/login" style={{ background: '#c8f53d', color: '#000', fontSize: 13.5, fontWeight: 800, padding: '10px 22px', borderRadius: 100, textDecoration: 'none' }}>Start Free →</Link>
        </div>
      </nav>

      <section style={{ paddingTop: 160, textAlign: 'center', maxWidth: 800, margin: '0 auto', paddingBottom: 80 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 72, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
          Turn any video into <span style={{ color: '#c8f53d' }}>original</span> social posts
        </h1>
        <p style={{ fontSize: 18, color: '#9090a8', maxWidth: 540, margin: '32px auto 40px', lineHeight: 1.7 }}>
          Paste a YouTube or TikTok URL. PostMint extracts the core idea and writes first-person posts that sound like you.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <Link href="/login" style={{ background: '#c8f53d', color: '#000', padding: '14px 32px', borderRadius: 100, textDecoration: 'none', fontWeight: 800 }}>Start for free →</Link>
          <a href="#how" style={{ border: '1px solid #2a2a38', color: '#f0f0f5', padding: '14px 32px', borderRadius: 100, textDecoration: 'none', fontWeight: 500 }}>See how it works</a>
        </div>
      </section>

      <section id="how" style={{ padding: '80px 5%', textAlign: 'center' }}>
        <h2 style={{ fontSize: 42, fontWeight: 800 }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1000, margin: '48px auto 0' }}>
          {[
            { step: '01', title: 'Paste a URL', desc: 'Drop any YouTube or TikTok link into PostMint.' },
            { step: '02', title: 'AI Extracts Ideas', desc: 'Our AI reads the transcript and extracts key ideas.' },
            { step: '03', title: 'Get Your Posts', desc: 'Receive platform-optimized posts in seconds.' },
          ].map((item) => (
            <div key={item.step} style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 20, padding: 36 }}>
              <div style={{ fontSize: 14, color: '#c8f53d', fontWeight: 800, marginBottom: 16 }}>{item.step}</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{item.title}</h3>
              <p style={{ color: '#9090a8', fontSize: 14, lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" style={{ padding: '80px 5%' }}>
        <h2 style={{ fontSize: 42, fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>Pricing</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, maxWidth: 1000, margin: '0 auto' }}>
          {[
            { name: 'Free', price: '$0', features: ['10 generations/mo', '3 platforms', '3 languages'] },
            { name: 'Pro', price: '$19/mo', features: ['Unlimited generations', 'All platforms', 'All languages', 'Cloud history', 'Export'] },
            { name: 'Agency', price: '$49/mo', features: ['Everything in Pro', '5 team members', 'API access', 'White-label'] },
          ].map((plan) => (
            <div key={plan.name} style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 20, padding: 36 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{plan.name}</div>
              <div style={{ fontSize: 40, fontWeight: 900 }}>{plan.price}</div>
              <div style={{ marginTop: 24 }}>
                {plan.features.map((f) => (
                  <div key={f} style={{ fontSize: 14, padding: '8px 0', color: '#9090a8' }}>✓ {f}</div>
                ))}
              </div>
              <Link href="/login" style={{ display: 'block', textAlign: 'center', marginTop: 24, padding: '13px', borderRadius: 12, background: plan.name === 'Pro' ? '#c8f53d' : 'transparent', color: plan.name === 'Pro' ? '#000' : '#f0f0f5', border: plan.name === 'Pro' ? 'none' : '1px solid #2a2a38', textDecoration: 'none', fontWeight: 800 }}>
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ padding: '40px 5%', borderTop: '1px solid #1f1f28', textAlign: 'center', color: '#5a5a72' }}>
        © 2025 PostMint. All rights reserved.
      </footer>
    </main>
  );
}
