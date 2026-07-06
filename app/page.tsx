'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
export const dynamic = 'force-dynamic';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Fraunces:wght@700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes pulse-glow{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:.8;transform:scale(1.05)}}
@keyframes slide-up{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.animate-up{animation:slide-up .7s ease forwards}
.d1{animation-delay:.1s;opacity:0}
.d2{animation-delay:.25s;opacity:0}
.d3{animation-delay:.4s;opacity:0}
.float{animation:float 4s ease-in-out infinite}
.shimmer-text{background:linear-gradient(90deg,#c8f53d 0%,#34d399 30%,#60a5fa 60%,#c8f53d 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 4s linear infinite}
.nav-link{color:#9090a8;text-decoration:none;font-size:14px;font-weight:500;transition:color .2s}
.nav-link:hover{color:#f0f0f5}
.btn-primary{background:#c8f53d;color:#000;font-weight:800;border-radius:100px;text-decoration:none;transition:all .2s;display:inline-block}
.btn-primary:hover{background:#d4f74a;transform:translateY(-1px);box-shadow:0 8px 24px rgba(200,245,61,.25)}
.btn-ghost{border:1px solid #2a2a38;color:#f0f0f5;border-radius:100px;text-decoration:none;transition:all .2s;display:inline-block}
.btn-ghost:hover{border-color:#c8f53d;color:#c8f53d}
.card{background:#0e0e12;border:1px solid #1f1f28;border-radius:20px;transition:all .25s}
.card:hover{border-color:#2a2a3a;transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,.4)}
.feat-card{background:linear-gradient(135deg,#0e0e12,#12121a);border:1px solid #1f1f28;border-radius:24px;padding:32px;transition:all .3s;cursor:default}
.feat-card:hover{border-color:rgba(200,245,61,.25);box-shadow:0 0 40px rgba(200,245,61,.06);transform:translateY(-4px)}
.step-line{width:1px;height:40px;background:linear-gradient(to bottom,#c8f53d22,transparent);margin:0 auto}
.badge{background:rgba(200,245,61,.1);border:1px solid rgba(200,245,61,.2);color:#c8f53d;border-radius:100px;font-size:12px;font-weight:700;padding:6px 14px;display:inline-block}
.ticker{display:flex;gap:48px;animation:marquee 18s linear infinite;white-space:nowrap}
.glow-orb{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none}
.plan-card{border-radius:24px;padding:36px;border:1px solid #1f1f28;transition:all .3s}
.plan-card:hover{transform:translateY(-4px)}
.plan-card.pro{border-color:rgba(200,245,61,.3);background:linear-gradient(135deg,rgba(200,245,61,.06),rgba(52,211,153,.04))}
.check{color:#c8f53d;font-size:13px;margin-right:8px}
.star{color:#f5a623}
.testimonial{background:#0e0e12;border:1px solid #1f1f28;border-radius:20px;padding:28px;transition:all .3s}
.testimonial:hover{border-color:#2a2a3a;transform:translateY(-2px)}
@media(max-width:768px){
  .hero-h1{font-size:42px!important}
  .grid-3{grid-template-columns:1fr!important}
  .grid-2{grid-template-columns:1fr!important}
  .hide-mobile{display:none!important}
  .nav-links{display:none!important}
  .hero-btns{flex-direction:column;align-items:center}
}
`;

const FEATURES = [
  {icon:'⚡',title:'Lightning Fast AI',desc:'Generate platform-ready posts from any video in under 10 seconds using the world\'s fastest AI inference.'},
  {icon:'🎯',title:'7 Platforms at Once',desc:'X/Twitter, LinkedIn, Instagram, Facebook, TikTok, Threads, and YouTube Shorts — all in one click.'},
  {icon:'🎨',title:'Your Brand Voice',desc:'Train the AI on your writing style. Every post sounds like you, not a generic robot.'},
  {icon:'🖼️',title:'AI Image Generator',desc:'Create scroll-stopping visuals for Instagram and YouTube Shorts, sized perfectly for each format.'},
  {icon:'📦',title:'Batch Processing',desc:'Drop 10 URLs and get 70+ posts in minutes. Perfect for agencies and high-volume creators.'},
  {icon:'📅',title:'Content Calendar',desc:'Schedule posts ahead of time and visualize your content pipeline with a built-in calendar.'},
];

const STEPS = [
  {n:'01',title:'Paste Any URL',desc:'YouTube, TikTok, Instagram Reels — just drop the link. Or paste text/transcript directly.'},
  {n:'02',title:'AI Reads the Content',desc:'Our AI extracts the core idea and key insights from the transcript or description.'},
  {n:'03',title:'Posts Generated Instantly',desc:'Get original, first-person posts for every platform you select. No "in this video" filler.'},
];

const TESTIMONIALS = [
  {name:'Alex Rivera',handle:'@alex_builds',role:'Indie Hacker',text:'PostMint 10x\'d my Twitter presence. I repurpose every podcast episode into a week of content in minutes.',stars:5},
  {name:'Sarah Chen',handle:'@sarahcreates',role:'Content Strategist',text:'The brand voice cloning is insane. My LinkedIn posts now sound exactly like me — clients can\'t believe it\'s AI.',stars:5},
  {name:'Marcus J.',handle:'@marcusgrowth',role:'Marketing Agency Owner',text:'Batch mode is a game changer. We process 50 client videos per week. PostMint pays for itself 10x over.',stars:5},
  {name:'Priya K.',handle:'@priyaai',role:'Tech Creator',text:'Finally an AI tool that doesn\'t make my posts sound like ChatGPT wrote them. Absolutely worth it.',stars:5},
  {name:'Jake Wilson',handle:'@jakewils',role:'Fitness Coach',text:'I\'ve tried 6 other tools. PostMint is the only one that actually captures the energy of my videos.',stars:5},
  {name:'Lena Schmidt',handle:'@lenaschm',role:'Startup Founder',text:'From one 30-minute podcast I get: 3 tweets, 2 LinkedIn posts, an Instagram caption, a TikTok script. Wild.',stars:5},
];

const PLATFORMS = ['𝕏 Twitter','LinkedIn','Instagram','TikTok','Facebook','Threads','▶ Shorts'];

export default function Home() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(()=>{
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  },[]);

  useEffect(()=>{
    const init = async () => {
      try{
        const res = await fetch(window.location.origin+'/api/config');
        const cfg = await res.json();
        if(cfg.supabaseUrl && cfg.supabaseAnonKey){
          const {createClient} = await import('@supabase/supabase-js');
          const sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey,{auth:{persistSession:true}});
          const {data} = await sb.auth.getSession();
          if(data.session) router.push('/app');
        }
      }catch(e){}
    };
    init();
  },[router]);

  return (
    <>
      <style>{CSS}</style>
      <div style={{background:'#060608',color:'#f0f0f5',minHeight:'100vh',overflowX:'hidden'}}>

        {/* NAV */}
        <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,padding:'0 6%',display:'flex',alignItems:'center',justifyContent:'space-between',height:68,backdropFilter:'blur(16px)',background:scrolled?'rgba(6,6,8,.85)':'transparent',borderBottom:scrolled?'1px solid #1a1a24':'1px solid transparent',transition:'all .3s'}}>
          <div style={{fontFamily:'Fraunces,serif',fontSize:21,fontWeight:900,display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'#c8f53d',display:'inline-block',boxShadow:'0 0 12px #c8f53d'}}/>
            PostMint
          </div>
          <div className="nav-links" style={{display:'flex',gap:32}}>
            {['How it works','Features','Pricing'].map(l=>(
              <a key={l} href={'#'+l.toLowerCase().replace(/\s+/g,'-')} className="nav-link">{l}</a>
            ))}
          </div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <Link href="/login" className="nav-link hide-mobile">Log in</Link>
            <Link href="/login" className="btn-primary" style={{padding:'9px 20px',fontSize:13}}>Start Free →</Link>
          </div>
        </nav>

        {/* HERO */}
        <section style={{paddingTop:160,paddingBottom:100,textAlign:'center',position:'relative',overflow:'hidden'}}>
          <div className="glow-orb" style={{width:600,height:600,top:-200,left:'50%',transform:'translateX(-50%)',background:'radial-gradient(circle,rgba(200,245,61,.12) 0%,transparent 70%)'}}/>
          <div className="glow-orb" style={{width:400,height:400,top:100,left:'10%',background:'radial-gradient(circle,rgba(52,211,153,.07) 0%,transparent 70%)'}}/>
          <div className="glow-orb" style={{width:300,height:300,top:200,right:'8%',background:'radial-gradient(circle,rgba(96,165,250,.07) 0%,transparent 70%)'}}/>

          <div className="animate-up d1" style={{marginBottom:20}}>
            <span className="badge">✨ Powered by the fastest AI on earth</span>
          </div>

          <h1 className="animate-up d2 hero-h1" style={{fontSize:76,fontWeight:900,lineHeight:1.05,letterSpacing:'-0.03em',marginBottom:28,fontFamily:'Fraunces,serif',maxWidth:900,margin:'0 auto 28px'}}>
            Turn any video into<br/>
            <span className="shimmer-text">original social posts</span>
          </h1>

          <p className="animate-up d3" style={{fontSize:18,color:'#9090a8',maxWidth:520,margin:'0 auto 40px',lineHeight:1.75}}>
            Paste a YouTube or TikTok URL. PostMint extracts the core idea and writes first-person posts that sound exactly like <em style={{color:'#f0f0f5',fontStyle:'normal',fontWeight:600}}>you</em> — not a recap.
          </p>

          <div className="animate-up d3 hero-btns" style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap',marginBottom:60}}>
            <Link href="/login" className="btn-primary" style={{padding:'15px 34px',fontSize:15}}>Start for free →</Link>
            <a href="#how-it-works" className="btn-ghost" style={{padding:'15px 34px',fontSize:15}}>See how it works</a>
          </div>

          {/* Platform ticker */}
          <div style={{overflow:'hidden',maxWidth:700,margin:'0 auto',maskImage:'linear-gradient(to right,transparent,black 20%,black 80%,transparent)'}}>
            <div className="ticker">
              {[...PLATFORMS,...PLATFORMS].map((p,i)=>(
                <span key={i} style={{fontSize:13,fontWeight:600,color:'#5a5a72',flexShrink:0}}>{p}</span>
              ))}
            </div>
          </div>

          {/* Fake UI preview */}
          <div className="float animate-up d3" style={{maxWidth:800,margin:'60px auto 0',position:'relative'}}>
            <div style={{background:'linear-gradient(135deg,#0e0e12,#12121a)',border:'1px solid #1f1f28',borderRadius:24,padding:28,textAlign:'left',boxShadow:'0 40px 120px rgba(0,0,0,.5)'}}>
              <div style={{display:'flex',gap:6,marginBottom:20}}>
                {['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:10,height:10,borderRadius:'50%',background:c}}/>)}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:20}}>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {['⚡ Generate','📦 Batch Mode','🕒 History','📅 Schedule','⚙️ Settings'].map((l,i)=>(
                    <div key={l} style={{padding:'9px 12px',borderRadius:10,background:i===0?'rgba(200,245,61,.1)':'transparent',color:i===0?'#c8f53d':'#5a5a72',fontSize:13,fontWeight:600}}>{l}</div>
                  ))}
                </div>
                <div>
                  <div style={{fontSize:11,color:'#c8f53d',fontWeight:700,marginBottom:6}}>● POWERED BY GROQ</div>
                  <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>Turn Videos Into</div>
                  <div style={{fontSize:20,fontWeight:800,marginBottom:16}}>Your Own Original Posts</div>
                  <div style={{background:'#16161c',border:'1px solid #1f1f28',borderRadius:12,padding:'10px 14px',fontSize:12,color:'#9090a8',marginBottom:10}}>
                    🔗 https://youtube.com/watch?v=example...
                  </div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
                    {['𝕏 X','LinkedIn','Instagram','YouTube Shorts'].map((p,i)=>(
                      <div key={p} style={{padding:'5px 11px',borderRadius:100,border:`1px solid ${i<3?'#c8f53d':'#1f1f28'}`,background:i<3?'rgba(200,245,61,.1)':'transparent',color:i<3?'#c8f53d':'#5a5a72',fontSize:11,fontWeight:600}}>{p}</div>
                    ))}
                  </div>
                  <div style={{background:'#c8f53d',borderRadius:10,padding:'10px',fontSize:13,fontWeight:800,color:'#000',textAlign:'center'}}>⚡ Generate Posts</div>
                </div>
              </div>
            </div>
            <div style={{position:'absolute',inset:0,borderRadius:24,background:'linear-gradient(to bottom,transparent 60%,#060608)',pointerEvents:'none'}}/>
          </div>
        </section>

        {/* SOCIAL PROOF NUMBERS */}
        <section style={{padding:'0 6% 80px'}}>
          <div style={{maxWidth:900,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:1,background:'#1f1f28',borderRadius:24,overflow:'hidden'}} className="grid-2" >
            {[['10K+','Creators'],['2M+','Posts Generated'],['7','Platforms'],['< 10s','Per Generation']].map(([n,l])=>(
              <div key={l} style={{background:'#0e0e12',padding:'32px 24px',textAlign:'center'}}>
                <div style={{fontSize:36,fontWeight:900,color:'#c8f53d',letterSpacing:'-0.02em'}}>{n}</div>
                <div style={{fontSize:13,color:'#5a5a72',marginTop:4,fontWeight:500}}>{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" style={{padding:'80px 6%',maxWidth:1100,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:60}}>
            <div className="badge" style={{marginBottom:16}}>How it works</div>
            <h2 style={{fontSize:48,fontWeight:900,fontFamily:'Fraunces,serif',letterSpacing:'-0.02em'}}>From URL to viral post<br/>in three steps</h2>
          </div>
          <div style={{maxWidth:680,margin:'0 auto'}}>
            {STEPS.map((s,i)=>(
              <div key={s.n}>
                <div style={{display:'flex',gap:24,alignItems:'flex-start'}}>
                  <div style={{flexShrink:0,width:56,height:56,borderRadius:16,background:'rgba(200,245,61,.1)',border:'1px solid rgba(200,245,61,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:'#c8f53d'}}>{s.n}</div>
                  <div style={{paddingTop:8}}>
                    <div style={{fontSize:20,fontWeight:800,marginBottom:6}}>{s.title}</div>
                    <div style={{fontSize:15,color:'#9090a8',lineHeight:1.6}}>{s.desc}</div>
                  </div>
                </div>
                {i < STEPS.length-1 && <div className="step-line" style={{marginLeft:28,marginTop:0,marginBottom:0}}/>}
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" style={{padding:'80px 6%',background:'linear-gradient(180deg,#060608,#080810,#060608)'}}>
          <div style={{maxWidth:1100,margin:'0 auto'}}>
            <div style={{textAlign:'center',marginBottom:60}}>
              <div className="badge" style={{marginBottom:16}}>Features</div>
              <h2 style={{fontSize:48,fontWeight:900,fontFamily:'Fraunces,serif',letterSpacing:'-0.02em'}}>Everything you need to<br/>dominate social media</h2>
            </div>
            <div className="grid-3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
              {FEATURES.map(f=>(
                <div key={f.title} className="feat-card">
                  <div style={{fontSize:36,marginBottom:16}}>{f.icon}</div>
                  <div style={{fontSize:17,fontWeight:800,marginBottom:10}}>{f.title}</div>
                  <div style={{fontSize:14,color:'#9090a8',lineHeight:1.65}}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section style={{padding:'80px 6%'}}>
          <div style={{maxWidth:1100,margin:'0 auto'}}>
            <div style={{textAlign:'center',marginBottom:60}}>
              <div className="badge" style={{marginBottom:16}}>Social Proof</div>
              <h2 style={{fontSize:48,fontWeight:900,fontFamily:'Fraunces,serif',letterSpacing:'-0.02em'}}>Creators love PostMint</h2>
              <p style={{color:'#9090a8',marginTop:12,fontSize:15}}>Join thousands of creators already saving hours every week</p>
            </div>
            <div className="grid-3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
              {TESTIMONIALS.map(t=>(
                <div key={t.handle} className="testimonial">
                  <div style={{display:'flex',gap:2,marginBottom:12}}>
                    {Array(t.stars).fill(0).map((_,i)=><span key={i} className="star">★</span>)}
                  </div>
                  <p style={{fontSize:14,lineHeight:1.65,color:'#d0d0e0',marginBottom:16}}>"{t.text}"</p>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#c8f53d,#34d399)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#000'}}>{t.name[0]}</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:700}}>{t.name}</div>
                      <div style={{fontSize:12,color:'#5a5a72'}}>{t.handle} · {t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" style={{padding:'80px 6%',background:'linear-gradient(180deg,#060608,#080810,#060608)'}}>
          <div style={{maxWidth:900,margin:'0 auto'}}>
            <div style={{textAlign:'center',marginBottom:60}}>
              <div className="badge" style={{marginBottom:16}}>Pricing</div>
              <h2 style={{fontSize:48,fontWeight:900,fontFamily:'Fraunces,serif',letterSpacing:'-0.02em'}}>Simple, honest pricing</h2>
              <p style={{color:'#9090a8',marginTop:12,fontSize:15}}>Start free. Upgrade when you're ready.</p>
            </div>
            <div className="grid-3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,alignItems:'start'}}>
              {[
                {name:'Free',price:'$0',sub:'Forever free',features:['15 generations / month','3 platforms','3 languages','Basic history'],cta:'Get started',highlight:false},
                {name:'Pro',price:'$19',sub:'per month',features:['500 generations / month','All 7 platforms','All 8 languages','Cloud history & export','AI image generation','Priority support'],cta:'Start Pro',highlight:true},
                {name:'Agency',price:'$49',sub:'per month',features:['Unlimited generations','Everything in Pro','5 team members','API access','White-label option','Dedicated support'],cta:'Go Agency',highlight:false},
              ].map(p=>(
                <div key={p.name} className={`plan-card${p.highlight?' pro':''}`} style={{background:p.highlight?undefined:'#0e0e12'}}>
                  {p.highlight && <div style={{fontSize:11,fontWeight:800,color:'#000',background:'#c8f53d',borderRadius:100,padding:'4px 12px',display:'inline-block',marginBottom:14}}>MOST POPULAR</div>}
                  <div style={{fontSize:14,fontWeight:700,color:'#9090a8',marginBottom:6}}>{p.name}</div>
                  <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:4}}>
                    <span style={{fontSize:48,fontWeight:900,letterSpacing:'-0.03em'}}>{p.price}</span>
                    <span style={{fontSize:14,color:'#5a5a72'}}>/{p.sub.split(' ')[1]||''}</span>
                  </div>
                  <div style={{fontSize:13,color:'#5a5a72',marginBottom:24}}>{p.sub}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:28}}>
                    {p.features.map(f=><div key={f} style={{fontSize:13,color:'#d0d0e0'}}><span className="check">✓</span>{f}</div>)}
                  </div>
                  <Link href="/login" className={p.highlight?'btn-primary':'btn-ghost'} style={{display:'block',textAlign:'center',padding:'13px',fontSize:14,borderRadius:14}}>
                    {p.cta} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA BANNER */}
        <section style={{padding:'80px 6%'}}>
          <div style={{maxWidth:800,margin:'0 auto',textAlign:'center',background:'linear-gradient(135deg,rgba(200,245,61,.08),rgba(52,211,153,.06))',border:'1px solid rgba(200,245,61,.15)',borderRadius:32,padding:'72px 48px',position:'relative',overflow:'hidden'}}>
            <div className="glow-orb" style={{width:400,height:400,top:-100,left:'50%',transform:'translateX(-50%)',background:'radial-gradient(circle,rgba(200,245,61,.1) 0%,transparent 70%)'}}/>
            <div style={{fontSize:56,marginBottom:20}}>⚡</div>
            <h2 style={{fontSize:44,fontWeight:900,fontFamily:'Fraunces,serif',letterSpacing:'-0.02em',marginBottom:16}}>Ready to go viral?</h2>
            <p style={{fontSize:16,color:'#9090a8',marginBottom:36,lineHeight:1.65,maxWidth:460,margin:'0 auto 36px'}}>Join 10,000+ creators turning videos into weeks of content. Free to start, no credit card required.</p>
            <Link href="/login" className="btn-primary" style={{padding:'16px 40px',fontSize:16}}>Create your free account →</Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{padding:'40px 6%',borderTop:'1px solid #1a1a24',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
          <div style={{fontFamily:'Fraunces,serif',fontSize:18,fontWeight:900,display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'#c8f53d',display:'inline-block'}}/>PostMint
          </div>
          <div style={{fontSize:13,color:'#5a5a72'}}>© 2025 PostMint. All rights reserved.</div>
          <div style={{display:'flex',gap:20}}>
            {['Privacy','Terms','Contact'].map(l=><a key={l} href="#" style={{fontSize:13,color:'#5a5a72',textDecoration:'none'}}>{l}</a>)}
          </div>
        </footer>

      </div>
    </>
  );
}
