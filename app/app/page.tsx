'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const spinnerKeyframes = `
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;

const PLATS: Record<string, { name: string; max: number; icon: string }> = {
  x: { name: 'X / Twitter', max: 280, icon: '𝕏' },
  fb: { name: 'Facebook', max: 2200, icon: 'f' },
  li: { name: 'LinkedIn', max: 3000, icon: 'in' },
  ig: { name: 'Instagram', max: 2200, icon: '📷' },
  tt: { name: 'TikTok', max: 2200, icon: '🎵' },
  th: { name: 'Threads', max: 500, icon: '🧵' },
  yt: { name: 'YouTube Shorts', max: 100, icon: '▶️' },
};

const NICHE = ['General', 'Marketing', 'Tech & AI', 'Finance', 'Fitness & Health', 'Entrepreneurship', 'Personal Development', 'Education'];
const HOOKS = ['Bold Claim', 'Shocking Stat', 'Story Opener', 'Question', 'Contrarian', 'Lesson Learned'];
const TONES = ['Raw & Honest', 'Inspiring', 'Insightful', 'Bold', 'Practical'];
const LANGS = ['English', 'Spanish', 'French', 'Portuguese', 'Arabic', 'Hindi', 'German', 'Pidgin English'];
const BRAND_TONES = ['Professional', 'Casual', 'Witty', 'Inspirational', 'Direct', 'Educational'];

function getAPIBase() {
  return window.location.origin;
}

function getAuthToken(client: any) {
  return client.auth.getSession().then((d: any) => d.data.session?.access_token || '');
}

export default function DashboardPage() {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState('generate');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    const validTabs = ['generate', 'batch', 'history', 'schedule', 'settings'];
    if (t && validTabs.includes(t)) setTab(t);
  }, []);

  // --- Generate state ---
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [source, setSource] = useState('url');
  const [url, setUrl] = useState('');
  const [transcriptInput, setTranscriptInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [extractedIdea, setExtractedIdea] = useState('');
  const [editingIdea, setEditingIdea] = useState(false);
  const [selectedPlats, setSelectedPlats] = useState<string[]>(['x', 'fb', 'li']);
  const [niche, setNiche] = useState('General');
  const [hook, setHook] = useState('Bold Claim');
  const [tone, setTone] = useState('Raw & Honest');
  const [lang, setLang] = useState('English');
  const [cta, setCta] = useState('');
  const [postLength, setPostLength] = useState(2);
  const [variations, setVariations] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [posts, setPosts] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [showHashtags, setShowHashtags] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const [previewId, setPreviewId] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [schedulePlats, setSchedulePlats] = useState<string[]>([]);
  const [scheduleText, setScheduleText] = useState('');
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<string | null>(null);

  // --- Batch state ---
  const [batchUrls, setBatchUrls] = useState('');
  const [batchPlats, setBatchPlats] = useState<string[]>(['x', 'fb', 'li']);
  const [batchApiKey, setBatchApiKey] = useState('');
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [batchError, setBatchError] = useState('');

  // --- History state ---
  const [history, setHistory] = useState<any[]>([]);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [exportOpen, setExportOpen] = useState(false);

  // --- Settings state ---
  const [settingsKey, setSettingsKey] = useState('');
  const [defaultNiche, setDefaultNiche] = useState('General');
  const [defaultLang, setDefaultLang] = useState('English');
  const [brandName, setBrandName] = useState('');
  const [brandTone, setBrandTone] = useState('Professional');
  const [brandAudience, setBrandAudience] = useState('');
  const [brandExamples, setBrandExamples] = useState('');
  const [brandAvoid, setBrandAvoid] = useState('');
  const [usage, setUsage] = useState({ tier: 'free', used: 0, limit: 15, remaining: 15 });
  const [settingsMsg, setSettingsMsg] = useState('');

  // --- Auth init ---
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
    if (tab === 'schedule') loadScheduled();
  }, [tab]);

  // --- Load local storage ---
  useEffect(() => {
    setApiKey(localStorage.getItem('cf_apiKey') || '');
    setBatchApiKey(localStorage.getItem('cf_apiKey') || '');
    setSettingsKey(localStorage.getItem('cf_apiKey') || '');
    setDefaultNiche(localStorage.getItem('cf_niche') || 'General');
    setDefaultLang(localStorage.getItem('cf_lang') || 'English');
    setNiche(localStorage.getItem('cf_niche') || 'General');
    setLang(localStorage.getItem('cf_lang') || 'English');

    const bv = localStorage.getItem('cf_brandVoice');
    if (bv) {
      const b = JSON.parse(bv);
      setBrandName(b.name || '');
      setBrandTone(b.tone || 'Professional');
      setBrandAudience(b.audience || '');
      setBrandExamples(b.examples || '');
      setBrandAvoid(b.avoid || '');
    }

    const hist = JSON.parse(localStorage.getItem('cf_history') || '[]');
    setHistory(hist);
  }, []);

  // --- Load cloud data when logged in ---
  useEffect(() => {
    if (!client || !user) return;
    loadCloudData();
    loadUsage();
  }, [client, user]);

  const loadCloudData = async () => {
    try {
      const token = await getAuthToken(client);
      const base = getAPIBase();
      const [profileRes, historyRes] = await Promise.all([
        fetch(base + '/api/profile', { headers: { Authorization: 'Bearer ' + token } }),
        fetch(base + '/api/generations', { headers: { Authorization: 'Bearer ' + token } }),
      ]);
      if (profileRes.ok) {
        const p = await profileRes.json();
        if (p.groq_api_key) {
          setApiKey(p.groq_api_key);
          setBatchApiKey(p.groq_api_key);
          setSettingsKey(p.groq_api_key);
          localStorage.setItem('cf_apiKey', p.groq_api_key);
        }
        if (p.brand_voice) {
          const b = typeof p.brand_voice === 'string' ? JSON.parse(p.brand_voice) : p.brand_voice;
          setBrandName(b.name || '');
          setBrandTone(b.tone || 'Professional');
          setBrandAudience(b.audience || '');
          setBrandExamples(b.examples || '');
          setBrandAvoid(b.avoid || '');
        }
      }
      if (historyRes.ok) {
        const h = await historyRes.json();
        if (h.length > 0) setHistory(h);
      }
    } catch (e) { console.error(e); }
  };

  const loadUsage = async () => {
    try {
      const token = await getAuthToken(client);
      const base = getAPIBase();
      const res = await fetch(base + '/api/usage/limits', { headers: { Authorization: 'Bearer ' + token } });
      if (res.ok) {
        const d = await res.json();
        setUsage(d);
      }
    } catch (e) { console.error(e); }
  };

  // --- Helpers ---
  const togglePlat = (key: string, isBatch = false) => {
    const setter = isBatch ? setBatchPlats : setSelectedPlats;
    setter(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  };

  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 100, border: '1px solid ' + (active ? '#c8f53d' : '#1f1f28'),
      background: active ? 'rgba(200,245,61,.1)' : '#16161c',
      color: active ? '#c8f53d' : '#9090a8',
      cursor: 'pointer', fontSize: 12, fontWeight: 500,
    }}>{label}</button>
  );

  const card = (title: React.ReactNode, children: React.ReactNode, badge?: string) => (
    <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 20, padding: 28, marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        {title}
        {badge && <span style={{ fontSize: 10, fontWeight: 700, color: '#5a5a72', background: '#16161c', padding: '3px 8px', borderRadius: 6 }}>{badge}</span>}
      </div>
      {children}
    </div>
  );

  const buildPrompt = (ideaText: string, platKey: string) => {
    const b = { name: brandName, tone: brandTone, audience: brandAudience, examples: brandExamples, avoid: brandAvoid };
    const lengthLabels = ['Short', 'Medium', 'Long'];
    return `You are an expert social media copywriter. Transform the following content into an original, engaging ${PLATS[platKey].name} post.

${b.name ? `Brand: ${b.name}` : ''}
${b.tone ? `Tone: ${b.tone}` : ''}
${b.audience ? `Audience: ${b.audience}` : ''}
${b.examples ? `Example phrases: ${b.examples}` : ''}
${b.avoid ? `AVOID: ${b.avoid}` : ''}

Niche: ${niche}
Hook style: ${hook}
Writing tone: ${tone}
Language: ${lang}
Post length: ${lengthLabels[postLength - 1]}
${cta ? `Custom CTA: ${cta}` : ''}

Write in first person as if YOU discovered these insights. Do NOT mention the video, transcript, or say "in this video". The post should sound like original content, not a recap.

Content to repurpose:\n${ideaText}`;
  };

  const callGroq = async (prompt: string, userApiKey: string) => {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + userApiKey },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Groq API error: ${res.status}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || 'Generation failed';
  };

  const extractIdea = async () => {
    console.log('[Extract] clicked');
    return extractIdeaFromSource();
  };

  const extractIdeaFromSource = async () => {
    if (!url && !transcriptInput) { setError('Please enter a URL or paste a transcript'); return ''; }
    if (!apiKey) { setError('Please enter your Groq API key in Settings'); return ''; }
    setGenerating(true);
    setError('');
    let text = transcriptInput;
    try {
      if (url) {
        const token = await getAuthToken(client);
        const base = getAPIBase();
        const extractRes = await fetch(base + '/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ url }),
        });
        if (!extractRes.ok) {
          const errData = await extractRes.json().catch(() => ({}));
          console.warn('Extract API failed:', errData.error || extractRes.status);
          if (!transcriptInput) {
            setError('Could not fetch video details. Please paste the transcript manually below.');
            setGenerating(false);
            return '';
          }
        } else {
          const data = await extractRes.json();
          if (data.transcript) {
            text = data.transcript;
          } else {
            text = [data.title, data.description].filter(Boolean).join('\n\n');
            if (!text && !transcriptInput) {
              setError('No captions or video details found. Please paste the transcript manually below.');
              setGenerating(false);
              return '';
            }
          }
        }
      }
      const contentToUse = text || url;
      const prompt = `Extract the single most compelling core idea from this content. Write it as one concise, tweetable insight (under 280 characters).\n\n${contentToUse}`;
      const idea = await callGroq(prompt, apiKey);
      setExtractedIdea(idea);
      return idea;
    } catch (e: any) {
      setError(e.message || 'Extraction failed');
      return '';
    }
    finally { setGenerating(false); }
  };

  const generatePosts = async () => {
    console.log('[Generate] clicked');
    let ideaText = source === 'url' ? (extractedIdea || transcriptInput) : textInput;
    if (source === 'url' && !ideaText && url) {
      try {
        ideaText = await extractIdeaFromSource();
      } catch (e: any) {
        console.error('[Generate] extractIdeaFromSource threw:', e);
        setError(e.message || 'Extraction failed unexpectedly');
        return;
      }
    }
    if (!ideaText) {
      if (source === 'url' && !url) {
        setError('Please enter a video URL or paste a transcript below.');
      } else if (source !== 'url') {
        setError('Please provide content to generate from');
      } else {
        setError('Could not extract content. Please paste a transcript manually below.');
      }
      return;
    }
    if (!apiKey) { setError('Please enter your Groq API key'); return; }
    if (selectedPlats.length === 0) { setError('Select at least one platform'); return; }

    setGenerating(true);
    setError('');
    setPosts({});
    setHashtags('');

    try {
      const results: Record<string, string[]> = {};
      for (const plat of selectedPlats) {
        const texts: string[] = [];
        for (let i = 0; i < variations; i++) {
          const prompt = buildPrompt(ideaText, plat);
          const text = await callGroq(prompt + `\n\nVariation ${i + 1} - make it different from the others.`, apiKey);
          texts.push(text);
        }
        results[plat] = texts;
      }
      setPosts(results);

      // Generate hashtags
      const htPrompt = `Generate 10 relevant hashtags (no sentences, just hashtags separated by spaces) for this content:\n${ideaText}`;
      const ht = await callGroq(htPrompt, apiKey);
      setHashtags(ht);

      // Auto-save to history
      const entry = { id: Date.now().toString(), posts: results, url: url || textInput.slice(0, 50), created_at: new Date().toISOString() };
      const newHist = [entry, ...history];
      setHistory(newHist);
      localStorage.setItem('cf_history', JSON.stringify(newHist));
      if (user) {
        try {
          const token = await getAuthToken(client);
          await fetch(getAPIBase() + '/api/generations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ posts: results, source_url: url || textInput.slice(0, 50), platforms: selectedPlats }),
          });
        } catch (e) { console.error('Auto-save failed:', e); }
      }
    } catch (err: any) { setError(err.message || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const saveToHistory = async () => {
    setSaving(true);
    const entry = { id: Date.now().toString(), posts, url: url || textInput.slice(0, 50), created_at: new Date().toISOString() };
    const newHist = [entry, ...history];
    setHistory(newHist);
    localStorage.setItem('cf_history', JSON.stringify(newHist));

    if (user) {
      try {
        const token = await getAuthToken(client);
        await fetch(getAPIBase() + '/api/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ content: JSON.stringify(posts), url: entry.url, title: entry.url }),
        });
      } catch (e) { console.error(e); }
    }
    setSaving(false);
    setSettingsMsg('Saved to history!');
    setTimeout(() => setSettingsMsg(''), 2000);
  };

  const clearHistory = () => {
    if (!confirm('Clear all history?')) return;
    setHistory([]);
    localStorage.removeItem('cf_history');
  };

  const deleteHistoryItem = (id: string) => {
    const newHist = history.filter(h => h.id !== id);
    setHistory(newHist);
    localStorage.setItem('cf_history', JSON.stringify(newHist));
  };

  const loadScheduled = async () => {
    if (!client) return;
    try {
      const token = await getAuthToken(client);
      const res = await fetch(getAPIBase() + '/api/scheduled', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) throw new Error('Failed to load scheduled posts');
      const data = await res.json();
      setScheduled(data || []);
    } catch (e) { console.error(e); }
  };

  const createScheduledPost = async (postData: { title: string; posts: any; platforms: string[]; scheduled_date: string }) => {
    if (!client) return;
    try {
      const token = await getAuthToken(client);
      const res = await fetch(getAPIBase() + '/api/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(postData),
      });
      if (!res.ok) throw new Error('Failed to schedule post');
      await loadScheduled();
    } catch (e: any) { setError(e.message || 'Schedule failed'); }
  };

  const deleteScheduledPost = async (id: string) => {
    if (!client) return;
    if (!confirm('Cancel this scheduled post?')) return;
    try {
      const token = await getAuthToken(client);
      const res = await fetch(getAPIBase() + '/api/scheduled/' + id, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) throw new Error('Failed to cancel');
      await loadScheduled();
    } catch (e: any) { setError(e.message || 'Cancel failed'); }
  };

  const openScheduleModal = (plat: string, text: string) => {
    setSchedulePlats([plat]);
    setScheduleText(text);
    setScheduleTitle(url || textInput.slice(0, 50) || 'Scheduled post');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setMinutes(0);
    setScheduleDate(tomorrow.toISOString().slice(0, 16));
    setScheduleOpen(true);
  };

  const doExport = (format: 'txt' | 'md') => {
    let content = '';
    if (format === 'txt') {
      Object.entries(posts).forEach(([plat, texts]) => {
        content += `${PLATS[plat].name}:\n${texts.join('\n---\n')}\n\n`;
      });
    } else {
      content = '# Generated Posts\n\n';
      Object.entries(posts).forEach(([plat, texts]) => {
        content += `## ${PLATS[plat].name}\n\n${texts.map(t => t).join('\n\n---\n\n')}\n\n`;
      });
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `posts.${format}`;
    a.click();
  };

  const copyAll = () => {
    const text = Object.entries(posts).map(([plat, texts]) => `${PLATS[plat].name}:\n${texts.join('\n')}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setSettingsMsg('Copied all posts!');
    setTimeout(() => setSettingsMsg(''), 2000);
  };

  const runBatch = async () => {
    if (!batchUrls) { setBatchError('Please enter at least one URL'); return; }
    if (!batchApiKey) { setBatchError('Please enter your Groq API key'); return; }
    if (batchPlats.length === 0) { setBatchError('Select at least one platform'); return; }

    setBatchGenerating(true);
    setBatchError('');
    setBatchResults([]);
    const urls = batchUrls.split('\n').filter(u => u.trim());

    try {
      const token = await getAuthToken(client);
      const base = getAPIBase();
      const results: any[] = [];

      for (const u of urls) {
        try {
          const extractRes = await fetch(base + '/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ url: u.trim() }),
          });
          if (!extractRes.ok) {
            const errData = await extractRes.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to extract video');
          }
          const data = await extractRes.json();
          const content = data.transcript || [data.title, data.description].filter(Boolean).join('\n\n');
          if (!content) throw new Error('No captions, transcript, title, or description found');
          const prompt = `Transform this content into original social posts. Write in first person. Do NOT mention the video.\n\n${content}`;
          const posts: Record<string, string> = {};
          for (const plat of batchPlats) {
            const text = await callGroq(prompt + `\n\nWrite a ${PLATS[plat].name} post under ${PLATS[plat].max} chars.`, batchApiKey);
            posts[plat] = text;
          }
          results.push({ url: u.trim(), posts });
        } catch (e: any) { results.push({ url: u.trim(), error: e.message || 'Failed' }); }
      }
      setBatchResults(results);
    } catch (e: any) { setBatchError(e.message); }
    finally { setBatchGenerating(false); }
  };

  const saveSettings = async () => {
    localStorage.setItem('cf_apiKey', settingsKey);
    localStorage.setItem('cf_niche', defaultNiche);
    localStorage.setItem('cf_lang', defaultLang);
    setApiKey(settingsKey);
    setBatchApiKey(settingsKey);
    if (user) {
      try {
        const token = await getAuthToken(client);
        await fetch(getAPIBase() + '/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ groq_api_key: settingsKey }),
        });
      } catch (e) { console.error(e); }
    }
    setSettingsMsg('Settings saved!');
    setTimeout(() => setSettingsMsg(''), 2000);
  };

  const saveBrandVoice = async () => {
    const voice = { name: brandName, tone: brandTone, audience: brandAudience, examples: brandExamples, avoid: brandAvoid };
    localStorage.setItem('cf_brandVoice', JSON.stringify(voice));
    if (user) {
      try {
        const token = await getAuthToken(client);
        await fetch(getAPIBase() + '/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ brand_voice: voice }),
        });
      } catch (e) { console.error(e); }
    }
    setSettingsMsg('Brand voice saved!');
    setTimeout(() => setSettingsMsg(''), 2000);
  };

  const upgrade = async (priceId: string) => {
    try {
      const token = await getAuthToken(client);
      const res = await fetch(getAPIBase() + '/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ priceId }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e) { setSettingsMsg('Billing not configured'); }
  };

  const manageSub = async () => {
    try {
      const token = await getAuthToken(client);
      const res = await fetch(getAPIBase() + '/api/billing/portal', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e) { setSettingsMsg('Billing not configured'); }
  };

  const logout = async () => {
    await client?.auth.signOut();
    router.push('/');
  };

  const renderPlatformPreview = (plat: string, text: string) => {
    const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'You';
    const handle = '@' + (displayName.toLowerCase().replace(/\s+/g, ''));
    const avatar = (
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#c8f53d', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
        {displayName.charAt(0).toUpperCase()}
      </div>
    );

    if (plat === 'x') {
      return (
        <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 12, padding: 16, marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
            {avatar}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f5' }}>{displayName}</div>
              <div style={{ fontSize: 13, color: '#5a5a72' }}>{handle} · Just now</div>
            </div>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: '#f0f0f5', whiteSpace: 'pre-wrap', marginBottom: 12 }}>{text}</div>
          <div style={{ display: 'flex', gap: 24, color: '#5a5a72', fontSize: 13 }}>
            <span>💬</span><span>🔁</span><span>❤️</span><span>📤</span>
          </div>
        </div>
      );
    }

    if (plat === 'li') {
      return (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            {avatar}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#000' }}>{displayName}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{handle} · 1st · Just now</div>
            </div>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: '#333', whiteSpace: 'pre-wrap', marginBottom: 12 }}>{text}</div>
          <div style={{ display: 'flex', gap: 20, color: '#666', fontSize: 13, borderTop: '1px solid #eee', paddingTop: 10 }}>
            <span>👍 Like</span><span>💬 Comment</span><span>🔄 Repost</span><span>📤 Send</span>
          </div>
        </div>
      );
    }

    if (plat === 'ig' || plat === 'th') {
      return (
        <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 12, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
            {avatar}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f5' }}>{handle}</div>
          </div>
          <div style={{ background: '#16161c', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a5a72', fontSize: 13 }}>
            📷 Image / Video
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: 16, color: '#f0f0f5', fontSize: 18, marginBottom: 8 }}>
              <span>♡</span><span>💬</span><span>📤</span><span style={{ marginLeft: 'auto' }}>🔖</span>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: '#f0f0f5', whiteSpace: 'pre-wrap' }}>
              <strong style={{ color: '#f0f0f5' }}>{handle}</strong> {text}
            </div>
          </div>
        </div>
      );
    }

    if (plat === 'tt') {
      return (
        <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 12, marginTop: 10, overflow: 'hidden', maxWidth: 300, margin: '10px auto 0' }}>
          <div style={{ background: '#16161c', aspectRatio: '9/16', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a5a72', fontSize: 13, position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: 60, left: 14, right: 14, fontSize: 14, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.8)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{text}</div>
            <div style={{ position: 'absolute', bottom: 14, left: 14, fontSize: 13, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.8)' }}>♡ 0  💬 0  📤 0</div>
          </div>
        </div>
      );
    }

    if (plat === 'yt') {
      return (
        <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 12, marginTop: 10, overflow: 'hidden', maxWidth: 280, margin: '10px auto 0' }}>
          <div style={{ background: '#16161c', aspectRatio: '9/16', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a5a72', fontSize: 13, position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: 50, left: 10, right: 10, fontSize: 14, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.8)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{text}</div>
          </div>
          <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {avatar}
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f0f5' }}>{displayName} — Shorts</div>
          </div>
        </div>
      );
    }

    // Fallback for fb and others
    return (
      <div style={{ background: '#242526', border: '1px solid #3a3b3c', borderRadius: 12, padding: 16, marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          {avatar}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e4e6eb' }}>{displayName}</div>
            <div style={{ fontSize: 12, color: '#b0b3b8' }}>Just now · 🌎</div>
          </div>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: '#e4e6eb', whiteSpace: 'pre-wrap', marginBottom: 12 }}>{text}</div>
        <div style={{ display: 'flex', gap: 20, color: '#b0b3b8', fontSize: 13, borderTop: '1px solid #3a3b3c', paddingTop: 10 }}>
          <span>👍 Like</span><span>💬 Comment</span><span>🔄 Share</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#060608', color: '#f0f0f5', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
      <aside style={{ width: 240, borderRight: '1px solid #1f1f28', padding: 24, display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#c8f53d' }}>●</span> PostMint
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#5a5a72', textTransform: 'uppercase', letterSpacing: 1, padding: '8px 14px' }}>Dashboard</div>
        <Link href="/dashboard" style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 12, border: 'none', background: 'transparent', color: '#9090a8', cursor: 'pointer', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'block' }}>🏠 Dashboard</Link>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#5a5a72', textTransform: 'uppercase', letterSpacing: 1, padding: '8px 14px', marginTop: 8 }}>Create</div>
        {[
          { key: 'generate', label: '⚡ Generate' },
          { key: 'batch', label: '📦 Batch Mode' },
        ].map(item => (
          <button key={item.key} onClick={() => setTab(item.key)} style={{
            textAlign: 'left', padding: '10px 14px', borderRadius: 12, border: 'none',
            background: tab === item.key ? '#16161c' : 'transparent', color: tab === item.key ? '#c8f53d' : '#9090a8',
            cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}>{item.label}</button>
        ))}
        <div style={{ fontSize: 10, fontWeight: 700, color: '#5a5a72', textTransform: 'uppercase', letterSpacing: 1, padding: '8px 14px', marginTop: 8 }}>Manage</div>
        {[
          { key: 'history', label: '🕒 History' },
          { key: 'schedule', label: '📅 Schedule' },
          { key: 'settings', label: '⚙️ Settings' },
        ].map(item => (
          <button key={item.key} onClick={() => setTab(item.key)} style={{
            textAlign: 'left', padding: '10px 14px', borderRadius: 12, border: 'none',
            background: tab === item.key ? '#16161c' : 'transparent', color: tab === item.key ? '#c8f53d' : '#9090a8',
            cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}>{item.label}</button>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: 12, color: '#5a5a72', marginBottom: 8, padding: '0 14px' }}>{user?.email}</div>
          <button onClick={logout} style={{ width: '100%', padding: '10px', borderRadius: 12, border: '1px solid #1f1f28', background: 'transparent', color: '#9090a8', cursor: 'pointer', fontSize: 13 }}>
            Sign Out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: 40, overflow: 'auto' }}>
        {settingsMsg && (
          <div style={{ position: 'fixed', top: 20, right: 20, background: 'rgba(200,245,61,.1)', color: '#c8f53d', border: '1px solid rgba(200,245,61,.2)', borderRadius: 10, padding: '10px 18px', fontSize: 13, zIndex: 1000 }}>
            {settingsMsg}
          </div>
        )}

        {/* ====== GENERATE TAB ====== */}
        {tab === 'generate' && (
          <>
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c8f53d' }}></span>
              <span style={{ fontSize: 12, color: '#c8f53d', fontWeight: 700 }}>Powered by Groq</span>
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8, lineHeight: 1.1 }}>Turn Videos Into<br />Your Own Original Posts</h1>
            <p style={{ color: '#9090a8', marginBottom: 32, maxWidth: 500 }}>Extract the idea. Write first-person content that sounds like you — not a recap.</p>

            {usage.limit > 0 && (
              <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#9090a8' }}>Plan: <strong style={{ color: '#c8f53d' }}>{usage.tier}</strong></span>
                  <span style={{ color: '#9090a8' }}>Remaining: <strong style={{ color: '#c8f53d' }}>{usage.remaining}</strong></span>
                </div>
                <div style={{ background: '#16161c', borderRadius: 6, height: 6, overflow: 'hidden' }}>
                  <div style={{ background: 'linear-gradient(90deg,#c8f53d,#34d399)', height: '100%', width: `${(usage.used / usage.limit) * 100}%`, borderRadius: 6, transition: 'width .3s' }}></div>
                </div>
              </div>
            )}

            {!apiKey && (
              <div style={{ background: 'rgba(200,245,61,.05)', border: '1px solid rgba(200,245,61,.15)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#c8f53d' }}>
                ⚡ <strong>Groq API key missing.</strong> Add your key in <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => setTab('settings')}>Settings</span> — get yours at <a href="https://console.groq.com/keys" target="_blank" style={{ color: '#c8f53d', textDecoration: 'underline' }}>console.groq.com/keys</a>.
              </div>
            )}

            {card(<>Content Source <span style={{ fontSize: 10, fontWeight: 700, color: '#5a5a72', background: '#16161c', padding: '3px 8px', borderRadius: 6 }}>Step 1</span></>, (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {[{ key: 'url', label: '🔗 Video URL' }, { key: 'text', label: '📝 Paste Text' }].map(s => (
                    <button key={s.key} onClick={() => setSource(s.key)} style={{
                      padding: '8px 16px', borderRadius: 10, border: '1px solid ' + (source === s.key ? '#c8f53d' : '#1f1f28'),
                      background: source === s.key ? 'rgba(200,245,61,.1)' : '#16161c',
                      color: source === s.key ? '#c8f53d' : '#9090a8', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    }}>{s.label}</button>
                  ))}
                </div>
                {source === 'url' ? (
                  <>
                    <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=... or https://tiktok.com/..." style={{ width: '100%', background: '#16161c', border: '1px solid #1f1f28', borderRadius: 12, padding: '12px 14px', color: '#f0f0f5', fontSize: 14, outline: 'none', marginBottom: 8 }} />
                    <div style={{ background: 'rgba(144,144,168,.06)', border: '1px solid #1f1f28', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                      <p style={{ fontSize: 12, color: '#9090a8', margin: 0, lineHeight: 1.5 }}>
                        <strong style={{ color: '#c8f53d' }}>How it works:</strong> The app reads the video's captions/subtitles when available. If captions are missing, it falls back to the video title and description. You can paste the transcript manually below for better results.
                      </p>
                    </div>
                    <textarea value={transcriptInput} onChange={e => setTranscriptInput(e.target.value)} rows={4} placeholder="Paste the video transcript here. If captions are unavailable, this is REQUIRED for accurate results." style={{ width: '100%', background: '#16161c', border: '1px solid #1f1f28', borderRadius: 12, padding: '12px 14px', color: '#f0f0f5', fontSize: 14, outline: 'none', resize: 'vertical' }} />
                  </>
                ) : (
                  <textarea value={textInput} onChange={e => setTextInput(e.target.value)} rows={6} placeholder="Paste any text — blog post, tweet, article, transcript, notes — to repurpose into social posts..." style={{ width: '100%', background: '#16161c', border: '1px solid #1f1f28', borderRadius: 12, padding: '12px 14px', color: '#f0f0f5', fontSize: 14, outline: 'none', resize: 'vertical' }} />
                )}

                {extractedIdea && !editingIdea && (
                  <div style={{ background: 'rgba(200,245,61,.05)', border: '1px solid rgba(200,245,61,.15)', borderRadius: 12, padding: 16, marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#c8f53d', marginBottom: 6 }}>📌 Extracted Core Idea</div>
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>{extractedIdea}</div>
                    <span onClick={() => setEditingIdea(true)} style={{ color: '#c8f53d', fontSize: 12, cursor: 'pointer', marginTop: 6, display: 'inline-block' }}>✏️ Edit this idea</span>
                  </div>
                )}
                {editingIdea && (
                  <textarea value={extractedIdea} onChange={e => setExtractedIdea(e.target.value)} rows={2} placeholder="Edit the core idea here..." style={{ width: '100%', background: '#16161c', border: '1px solid #1f1f28', borderRadius: 12, padding: '12px 14px', color: '#f0f0f5', fontSize: 14, outline: 'none', marginTop: 8, resize: 'vertical' }} />
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => { console.log('INLINE Extract click'); extractIdea(); }} onMouseDown={() => console.log('MOUSEDOWN Extract')} style={{
                    background: '#16161c', color: '#f0f0f5', border: '1px solid #1f1f28',
                    borderRadius: 12, padding: '10px 18px', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', pointerEvents: 'auto', position: 'relative', zIndex: 10,
                  }}>🔍 Extract Core Idea</button>
                  <button type="button" onClick={() => { console.log('INLINE Generate click'); generatePosts(); }} onMouseDown={() => console.log('MOUSEDOWN Generate')} style={{
                    background: '#c8f53d', color: '#000', border: 'none',
                    borderRadius: 12, padding: '10px 22px', fontSize: 13, fontWeight: 800,
                    cursor: 'pointer', pointerEvents: 'auto', position: 'relative', zIndex: 10,
                  }}>⚡ Generate Posts</button>
                </div>
                {error && <div style={{ background: 'rgba(255,107,107,.1)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginTop: 12 }}>{error}</div>}
                {generating && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#c8f53d', fontSize: 15, marginTop: 14, fontWeight: 600 }}>
                    <style>{spinnerKeyframes}</style>
                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 20 }}>⏳</span>
                    Generating...
                  </div>
                )}
              </>
            ))}

            {card(<>Output Settings <span style={{ fontSize: 10, fontWeight: 700, color: '#5a5a72', background: '#16161c', padding: '3px 8px', borderRadius: 6 }}>Step 2</span></>, (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 10, textTransform: 'uppercase' }}>Platforms</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(PLATS).map(([key, p]) => chip(`${p.icon} ${p.name}`, selectedPlats.includes(key), () => togglePlat(key)))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 10, textTransform: 'uppercase' }}>Your Niche</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {NICHE.map(n => chip(n, niche === n, () => setNiche(n)))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 10, textTransform: 'uppercase' }}>Hook Style</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {HOOKS.map(h => chip(h, hook === h, () => setHook(h)))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 10, textTransform: 'uppercase' }}>Writing Tone</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {TONES.map(t => chip(t, tone === t, () => setTone(t)))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 10, textTransform: 'uppercase' }}>Output Language</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {LANGS.map(l => chip(l, lang === l, () => setLang(l)))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 10, textTransform: 'uppercase' }}>Custom CTA (optional)</div>
                  <input type="text" value={cta} onChange={e => setCta(e.target.value)} placeholder="e.g. Follow me for daily tips..." style={{ width: '100%', maxWidth: 500, background: '#16161c', border: '1px solid #1f1f28', borderRadius: 12, padding: '12px 14px', color: '#f0f0f5', fontSize: 14, outline: 'none' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 10, textTransform: 'uppercase' }}>Post Length</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, color: '#5a5a72' }}>Short</span>
                      <input type="range" min={1} max={3} value={postLength} onChange={e => setPostLength(Number(e.target.value))} style={{ flex: 1 }} />
                      <span style={{ fontSize: 12, color: '#5a5a72' }}>Long</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#c8f53d', minWidth: 50 }}>{['Short', 'Medium', 'Long'][postLength - 1]}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 10, textTransform: 'uppercase' }}>Variations per platform</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, color: '#5a5a72' }}>1</span>
                      <input type="range" min={1} max={3} value={variations} onChange={e => setVariations(Number(e.target.value))} style={{ flex: 1 }} />
                      <span style={{ fontSize: 12, color: '#5a5a72' }}>3</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#c8f53d', minWidth: 20 }}>{variations}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {Object.keys(posts).length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Your Posts</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowHashtags(!showHashtags)} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #1f1f28', background: '#16161c', color: '#9090a8', cursor: 'pointer', fontSize: 12 }}>#️⃣ Hashtags</button>
                    <button onClick={saveToHistory} disabled={saving} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #1f1f28', background: '#16161c', color: saving ? '#5a5a72' : '#9090a8', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 12, opacity: saving ? 0.5 : 1, transition: 'opacity .2s' }}>{saving ? '⏳ Saving...' : '💾 Save'}</button>
                    <button onClick={() => setExportOpen(true)} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #1f1f28', background: '#16161c', color: '#9090a8', cursor: 'pointer', fontSize: 12 }}>📤 Export</button>
                  </div>
                </div>

                {showHashtags && hashtags && (
                  <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 16, padding: 20, marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Suggested Hashtags</div>
                    <div style={{ fontSize: 13, color: '#9090a8', lineHeight: 1.6 }}>{hashtags}</div>
                    <button onClick={() => navigator.clipboard.writeText(hashtags)} style={{ marginTop: 10, padding: '8px 14px', borderRadius: 8, border: '1px solid #1f1f28', background: '#16161c', color: '#9090a8', cursor: 'pointer', fontSize: 12 }}>📋 Copy All Hashtags</button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {Object.entries(posts).map(([plat, texts]) => (
                    <div key={plat} style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 18, padding: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(200,245,61,.14)', color: '#c8f53d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{plat.toUpperCase()}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{PLATS[plat].name}</div>
                          <div style={{ fontSize: 11, color: '#9090a8' }}>{texts.length} variation{texts.length > 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      {texts.map((text, i) => {
                        const len = text.length;
                        const max = PLATS[plat].max;
                        const pct = len / max;
                        const countColor = len > max ? '#ff6b6b' : pct > 0.9 ? '#f5a623' : '#34d399';
                        const countBg = len > max ? 'rgba(255,107,107,.08)' : pct > 0.9 ? 'rgba(245,166,35,.08)' : 'rgba(52,211,153,.08)';
                        const copyKey = `${plat}-${i}`;
                        const justCopied = copiedId === copyKey;
                        return (
                          <div key={i} style={{ marginBottom: i < texts.length - 1 ? 12 : 0, paddingBottom: i < texts.length - 1 ? 12 : 0, borderBottom: i < texts.length - 1 ? '1px solid #1f1f28' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#5a5a72', textTransform: 'uppercase' }}>Variation {i + 1}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: countColor, background: countBg, padding: '3px 10px', borderRadius: 6, transition: 'all .2s' }}>
                                  {len} / {max}
                                  {len > max && <span style={{ marginLeft: 4 }}>OVER</span>}
                                  {len <= max && pct > 0.9 && <span style={{ marginLeft: 4 }}>NEAR LIMIT</span>}
                                </div>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(text); setCopiedId(copyKey); setTimeout(() => setCopiedId(''), 1500); }}
                                  style={{
                                    padding: '6px 14px', borderRadius: 8, border: '1px solid #1f1f28',
                                    background: justCopied ? 'rgba(200,245,61,.14)' : '#16161c',
                                    color: justCopied ? '#c8f53d' : '#9090a8',
                                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                    transition: 'all .2s', minWidth: 70,
                                  }}
                                >
                                  {justCopied ? 'Copied!' : '📋 Copy'}
                                </button>
                                <button
                                  onClick={() => setPreviewId(previewId === copyKey ? '' : copyKey)}
                                  style={{
                                    padding: '6px 14px', borderRadius: 8, border: '1px solid #1f1f28',
                                    background: previewId === copyKey ? 'rgba(200,245,61,.14)' : '#16161c',
                                    color: previewId === copyKey ? '#c8f53d' : '#9090a8',
                                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                    transition: 'all .2s',
                                  }}
                                >
                                  {previewId === copyKey ? '👁️ Hide Preview' : '👁️ Preview'}
                                </button>
                                <button
                                  onClick={() => openScheduleModal(plat, text)}
                                  style={{
                                    padding: '6px 14px', borderRadius: 8, border: '1px solid #1f1f28',
                                    background: '#16161c', color: '#9090a8',
                                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                    transition: 'all .2s',
                                  }}
                                >
                                  📅 Schedule
                                </button>
                              </div>
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, background: '#16161c', borderRadius: 12, padding: '14px 16px', border: '1px solid #1f1f28' }}>{text}</div>
                            {previewId === copyKey && renderPlatformPreview(plat, text)}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ====== BATCH TAB ====== */}
        {tab === 'batch' && (
          <>
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c8f53d' }}></span>
              <span style={{ fontSize: 12, color: '#c8f53d', fontWeight: 700 }}>Batch Mode</span>
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8, lineHeight: 1.1 }}>Process Multiple<br />Videos at Once</h1>
            <p style={{ color: '#9090a8', marginBottom: 32 }}>Paste up to 10 URLs — generate posts for all of them in one click.</p>

            {card('Groq API Key', (
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="password" value={batchApiKey} onChange={e => setBatchApiKey(e.target.value)} placeholder="gsk_..." style={{ flex: 1, background: '#16161c', border: '1px solid #1f1f28', borderRadius: 12, padding: '12px 14px', color: '#f0f0f5', fontSize: 14, outline: 'none' }} />
              </div>
            ))}

            {card(<>YouTube / TikTok URLs <span style={{ fontSize: 10, fontWeight: 700, color: '#5a5a72', background: '#16161c', padding: '3px 8px', borderRadius: 6 }}>One per line</span></>, (
              <>
                <textarea value={batchUrls} onChange={e => setBatchUrls(e.target.value)} rows={6} placeholder={`https://youtube.com/watch?v=abc\nhttps://youtube.com/watch?v=def\nhttps://tiktok.com/...`} style={{ width: '100%', background: '#16161c', border: '1px solid #1f1f28', borderRadius: 12, padding: '12px 14px', color: '#f0f0f5', fontSize: 14, outline: 'none', resize: 'vertical', marginBottom: 12 }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 10, textTransform: 'uppercase' }}>Platforms</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(PLATS).map(([key, p]) => chip(`${p.icon} ${p.name}`, batchPlats.includes(key), () => togglePlat(key, true)))}
                </div>
                <button onClick={runBatch} disabled={batchGenerating} style={{ width: '100%', marginTop: 14, background: '#c8f53d', color: '#000', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>{batchGenerating ? 'Processing...' : '📦 Generate All Posts'}</button>
              </>
            ))}

            {batchError && <div style={{ background: 'rgba(255,107,107,.1)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{batchError}</div>}
            {batchGenerating && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c8f53d', fontSize: 13, marginBottom: 16 }}><span>⏳</span> Processing...</div>}

            {batchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {batchResults.map((res, i) => (
                  <div key={i} style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 18, padding: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#c8f53d', marginBottom: 12 }}>{res.url}</div>
                    {res.error ? (
                      <div style={{ color: '#ff6b6b', fontSize: 13 }}>{res.error}</div>
                    ) : (
                      Object.entries(res.posts).map(([plat, text]: [string, any]) => (
                        <div key={plat} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #1f1f28' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#9090a8', marginBottom: 4 }}>{PLATS[plat].name}</div>
                          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{text}</div>
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ====== HISTORY TAB ====== */}
        {tab === 'history' && (
          <>
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c8f53d' }}></span>
              <span style={{ fontSize: 12, color: '#c8f53d', fontWeight: 700 }}>Saved Posts</span>
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Your History</h1>
            <p style={{ color: '#9090a8', marginBottom: 24 }}>All your saved generations — click to load and copy.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={clearHistory} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #ff6b6b', background: 'transparent', color: '#ff6b6b', cursor: 'pointer', fontSize: 12 }}>🗑 Clear All History</button>
            </div>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🕒</div>
                <p style={{ color: '#9090a8' }}>No saved posts yet.<br/>Generate some content and it will appear here automatically.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {history.map((item) => (
                  <div key={item.id} style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 16, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#c8f53d' }}>{item.url || item.source_url || 'Text input'}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setPosts(item.posts); setTab('generate'); }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #1f1f28', background: '#16161c', color: '#9090a8', cursor: 'pointer', fontSize: 12 }}>Load</button>
                        <button onClick={() => deleteHistoryItem(item.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ff6b6b', background: 'transparent', color: '#ff6b6b', cursor: 'pointer', fontSize: 12 }}>Delete</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#5a5a72' }}>{new Date(item.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ====== SCHEDULE TAB ====== */}
        {tab === 'schedule' && (
          <>
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c8f53d' }}></span>
              <span style={{ fontSize: 12, color: '#c8f53d', fontWeight: 700 }}>Content Calendar</span>
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Your Schedule</h1>
            <p style={{ color: '#9090a8', marginBottom: 32 }}>Plan and view your upcoming social posts.</p>

            {(() => {
              const today = new Date();
              const year = today.getFullYear();
              const month = today.getMonth();
              const firstDay = new Date(year, month, 1);
              const lastDay = new Date(year, month + 1, 0);
              const startOffset = firstDay.getDay();
              const daysInMonth = lastDay.getDate();
              const scheduledDates = new Set(scheduled.map(s => s.scheduled_date?.slice(0, 10)));
              const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
              const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
              return (
                <>
                  {/* Mini Calendar */}
                  <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 20, padding: 24, marginBottom: 28 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{monthNames[month]} {year}</div>
                      <div style={{ fontSize: 12, color: '#9090a8' }}>{scheduled.length} scheduled</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, textAlign: 'center' }}>
                      {dayNames.map(d => <div key={d} style={{ fontSize: 11, fontWeight: 700, color: '#5a5a72', padding: '6px 0' }}>{d}</div>)}
                      {Array.from({ length: startOffset }).map((_, i) => <div key={'pad-' + i} />)}
                      {Array.from({ length: daysInMonth }).map((_, d) => {
                        const dayNum = d + 1;
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                        const hasPost = scheduledDates.has(dateStr);
                        const isToday = dayNum === today.getDate();
                        const isSelected = selectedScheduleDate === dateStr;
                        return (
                          <button
                            key={dayNum}
                            onClick={() => hasPost ? setSelectedScheduleDate(isSelected ? null : dateStr) : null}
                            style={{
                              padding: '8px 0', borderRadius: 10, border: 'none',
                              background: isSelected ? 'rgba(200,245,61,.3)' : isToday ? 'rgba(200,245,61,.14)' : 'transparent',
                              color: isSelected || isToday ? '#c8f53d' : hasPost ? '#f0f0f5' : '#5a5a72',
                              fontSize: 13, fontWeight: isSelected || isToday ? 800 : hasPost ? 600 : 400,
                              position: 'relative', cursor: hasPost ? 'pointer' : 'default',
                              width: '100%', outline: 'none',
                            }}
                          >
                            {dayNum}
                            {hasPost && <span style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: '#c8f53d' }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Timeline */}
                  {scheduled.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
                      <p style={{ color: '#9090a8' }}>No scheduled posts yet.<br/>Generate content and click <strong>📅 Schedule</strong> on any post.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {selectedScheduleDate && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ fontSize: 13, color: '#9090a8' }}>Showing posts for <strong style={{ color: '#c8f53d' }}>{new Date(selectedScheduleDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</strong></div>
                          <button onClick={() => setSelectedScheduleDate(null)} style={{ fontSize: 12, color: '#c8f53d', background: 'none', border: '1px solid #c8f53d', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}>Show All</button>
                        </div>
                      )}
                      {Array.from(new Set(scheduled.map(s => s.scheduled_date?.slice(0, 10)))).sort().filter(date => !selectedScheduleDate || date === selectedScheduleDate).map(date => (
                        <div key={date}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#c8f53d' }}>{new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                            <div style={{ flex: 1, height: 1, background: '#1f1f28' }} />
                            <div style={{ fontSize: 11, color: '#5a5a72' }}>{scheduled.filter(s => s.scheduled_date?.startsWith(date)).length} posts</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {scheduled.filter(s => s.scheduled_date?.startsWith(date)).map(item => (
                              <div key={item.id} style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 16, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 12, color: '#5a5a72', fontWeight: 600 }}>{new Date(item.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      {item.platforms?.map((p: string) => (
                                        <span key={p} style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(200,245,61,.1)', color: '#c8f53d' }}>{PLATS[p]?.icon || p} {PLATS[p]?.name || p}</span>
                                      ))}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: 14, color: '#f0f0f5', lineHeight: 1.5, fontWeight: 600, marginBottom: 6 }}>{item.title || 'Scheduled post'}</div>
                                  <div style={{ fontSize: 12, color: '#9090a8', whiteSpace: 'pre-wrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{typeof item.posts === 'string' ? item.posts.slice(0, 100) : JSON.stringify(item.posts).slice(0, 100)}...</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: item.status === 'published' ? 'rgba(52,211,153,.14)' : 'rgba(200,245,61,.14)', color: item.status === 'published' ? '#34d399' : '#c8f53d' }}>
                                    {item.status === 'published' ? 'Published' : 'Pending'}
                                  </div>
                                  {item.status !== 'published' && (
                                    <button onClick={() => deleteScheduledPost(item.id)} style={{ fontSize: 11, color: '#ff6b6b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕ Cancel</button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}

        {/* ====== SETTINGS TAB ====== */}
        {tab === 'settings' && (
          <>
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c8f53d' }}></span>
              <span style={{ fontSize: 12, color: '#c8f53d', fontWeight: 700 }}>Settings</span>
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Settings</h1>
            <p style={{ color: '#9090a8', marginBottom: 32 }}>Manage your API key and preferences.</p>

            {card('API Configuration', (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 8, textTransform: 'uppercase' }}>Groq API Key</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input type={showKey ? 'text' : 'password'} value={settingsKey} onChange={e => setSettingsKey(e.target.value)} placeholder="gsk_..." style={{ flex: 1, background: '#16161c', border: '1px solid #1f1f28', borderRadius: 12, padding: '12px 14px', color: '#f0f0f5', fontSize: 14, outline: 'none' }} />
                  <button onClick={() => setShowKey(!showKey)} style={{ background: '#16161c', border: '1px solid #1f1f28', borderRadius: 12, padding: '0 14px', color: '#9090a8', cursor: 'pointer' }}>{showKey ? '🙈' : '👁'}</button>
                </div>
                <button onClick={saveSettings} style={{ background: '#c8f53d', color: '#000', border: 'none', borderRadius: 12, padding: '10px 22px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Save Key</button>
                <p style={{ fontSize: 12, color: '#5a5a72', marginTop: 8 }}>Stored locally and synced to your account.</p>
              </>
            ))}

            {card('Default Preferences', (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div><div style={{ fontSize: 13, fontWeight: 700 }}>Default Niche</div><div style={{ fontSize: 12, color: '#5a5a72' }}>Pre-select your niche on load</div></div>
                  <select value={defaultNiche} onChange={e => setDefaultNiche(e.target.value)} style={{ background: '#16161c', border: '1px solid #1f1f28', borderRadius: 8, padding: '6px 10px', color: '#f0f0f5', fontSize: 13, outline: 'none' }}>
                    {NICHE.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div><div style={{ fontSize: 13, fontWeight: 700 }}>Default Language</div><div style={{ fontSize: 12, color: '#5a5a72' }}>Output language for posts</div></div>
                  <select value={defaultLang} onChange={e => setDefaultLang(e.target.value)} style={{ background: '#16161c', border: '1px solid #1f1f28', borderRadius: 8, padding: '6px 10px', color: '#f0f0f5', fontSize: 13, outline: 'none' }}>
                    {LANGS.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <button onClick={saveSettings} style={{ background: '#c8f53d', color: '#000', border: 'none', borderRadius: 12, padding: '10px 22px', fontSize: 13, fontWeight: 800, cursor: 'pointer', marginTop: 8 }}>Save Preferences</button>
              </>
            ))}

            {card('Subscription', (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div><div style={{ fontSize: 13, fontWeight: 700 }}>Current Plan</div><div style={{ fontSize: 12, color: '#5a5a72' }}>{usage.tier === 'free' ? 'Free — 15 generations/month' : usage.tier + ' plan'}</div></div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#c8f53d', background: 'rgba(200,245,61,.1)', padding: '4px 10px', borderRadius: 100 }}>{usage.tier}</span>
                </div>
                {usage.tier === 'free' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div><div style={{ fontSize: 13, fontWeight: 700 }}>Pro</div><div style={{ fontSize: 12, color: '#5a5a72' }}>500 generations/month — $19/mo</div></div>
                      <button onClick={() => upgrade('price_pro')} style={{ background: '#c8f53d', color: '#000', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Upgrade</button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div><div style={{ fontSize: 13, fontWeight: 700 }}>Agency</div><div style={{ fontSize: 12, color: '#5a5a72' }}>Unlimited + team features — $49/mo</div></div>
                      <button onClick={() => upgrade('price_agency')} style={{ background: '#c8f53d', color: '#000', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Upgrade</button>
                    </div>
                  </>
                )}
                {usage.tier !== 'free' && (
                  <button onClick={manageSub} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #1f1f28', background: '#16161c', color: '#9090a8', cursor: 'pointer', fontSize: 12, marginTop: 8 }}>Manage Subscription</button>
                )}
              </>
            ))}

            {card('Brand Voice', (
              <>
                <p style={{ fontSize: 12, color: '#5a5a72', marginBottom: 16 }}>Define your brand personality once. The AI will use this for all generated posts.</p>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 8, textTransform: 'uppercase' }}>Brand Name</div>
                <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. TechFounder, FitnessPro" style={{ width: '100%', maxWidth: 400, background: '#16161c', border: '1px solid #1f1f28', borderRadius: 12, padding: '12px 14px', color: '#f0f0f5', fontSize: 14, outline: 'none', marginBottom: 14 }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 10, textTransform: 'uppercase' }}>Tone</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  {BRAND_TONES.map(t => chip(t, brandTone === t, () => setBrandTone(t)))}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 8, textTransform: 'uppercase' }}>Audience</div>
                <input type="text" value={brandAudience} onChange={e => setBrandAudience(e.target.value)} placeholder="e.g. Startup founders, Gym goers, Marketers" style={{ width: '100%', maxWidth: 400, background: '#16161c', border: '1px solid #1f1f28', borderRadius: 12, padding: '12px 14px', color: '#f0f0f5', fontSize: 14, outline: 'none', marginBottom: 14 }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 8, textTransform: 'uppercase' }}>Example phrases</div>
                <textarea value={brandExamples} onChange={e => setBrandExamples(e.target.value)} rows={3} placeholder="e.g. 'Here's the thing', 'Let me break it down'" style={{ width: '100%', background: '#16161c', border: '1px solid #1f1f28', borderRadius: 12, padding: '12px 14px', color: '#f0f0f5', fontSize: 14, outline: 'none', resize: 'vertical', marginBottom: 14 }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 8, textTransform: 'uppercase' }}>What to AVOID</div>
                <textarea value={brandAvoid} onChange={e => setBrandAvoid(e.target.value)} rows={2} placeholder="e.g. Too technical jargon, Clickbait, Negative tone" style={{ width: '100%', background: '#16161c', border: '1px solid #1f1f28', borderRadius: 12, padding: '12px 14px', color: '#f0f0f5', fontSize: 14, outline: 'none', resize: 'vertical', marginBottom: 14 }} />
                <button onClick={saveBrandVoice} style={{ background: '#c8f53d', color: '#000', border: 'none', borderRadius: 12, padding: '10px 22px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Save Brand Voice</button>
              </>
            ))}
          </>
        )}
      </main>

      {/* Export Modal */}
      {exportOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setExportOpen(false)}>
          <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 24, padding: 32, width: '100%', maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Export Posts</div>
              <button onClick={() => setExportOpen(false)} style={{ background: 'none', border: 'none', color: '#9090a8', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: '#9090a8', marginBottom: 20 }}>Download your generated posts in your preferred format.</p>
            {[
              { name: 'Plain Text (.txt)', desc: 'All posts as simple text file', action: () => doExport('txt') },
              { name: 'Markdown (.md)', desc: 'Formatted with platform headers', action: () => doExport('md') },
              { name: 'Copy All to Clipboard', desc: 'All posts copied at once', action: copyAll },
            ].map(opt => (
              <div key={opt.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #1f1f28' }}>
                <div><div style={{ fontSize: 13, fontWeight: 700 }}>{opt.name}</div><div style={{ fontSize: 12, color: '#5a5a72' }}>{opt.desc}</div></div>
                <button onClick={opt.action} style={{ background: '#c8f53d', color: '#000', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Download</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setScheduleOpen(false)}>
          <div style={{ background: '#0e0e12', border: '1px solid #1f1f28', borderRadius: 24, padding: 32, width: '100%', maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Schedule Post</div>
              <button onClick={() => setScheduleOpen(false)} style={{ background: 'none', border: 'none', color: '#9090a8', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 6, textTransform: 'uppercase' }}>Post Preview</div>
              <div style={{ background: '#16161c', border: '1px solid #1f1f28', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#f0f0f5', lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>{scheduleText}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 6, textTransform: 'uppercase' }}>Date & Time</div>
              <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} style={{ width: '100%', background: '#16161c', border: '1px solid #1f1f28', borderRadius: 12, padding: '12px 14px', color: '#f0f0f5', fontSize: 14, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#9090a8', marginBottom: 6, textTransform: 'uppercase' }}>Platforms</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.keys(PLATS).map(p => (
                  <button key={p} onClick={() => setSchedulePlats(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #1f1f28', background: schedulePlats.includes(p) ? 'rgba(200,245,61,.14)' : '#16161c', color: schedulePlats.includes(p) ? '#c8f53d' : '#9090a8', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    {PLATS[p].name}
                  </button>
                ))}
              </div>
            </div>
            <button
              disabled={scheduling}
              onClick={async () => {
                if (!scheduleDate) { setError('Please select a date and time'); return; }
                if (schedulePlats.length === 0) { setError('Select at least one platform'); return; }
                setScheduling(true);
                try {
                  await createScheduledPost({ title: scheduleTitle, posts: scheduleText, platforms: schedulePlats, scheduled_date: new Date(scheduleDate).toISOString() });
                  setScheduleOpen(false);
                  setError('');
                  setTab('schedule');
                } finally {
                  setScheduling(false);
                }
              }}
              style={{
                width: '100%',
                background: scheduling ? '#8aa830' : '#c8f53d',
                color: '#000',
                border: 'none',
                borderRadius: 12,
                padding: '12px',
                fontSize: 14,
                fontWeight: 800,
                cursor: scheduling ? 'not-allowed' : 'pointer',
                opacity: scheduling ? 0.6 : 1,
                transition: 'opacity .2s',
              }}
            >
              {scheduling ? '⏳ Scheduling...' : 'Confirm Schedule'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
