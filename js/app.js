const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const PLATS = {
  x:  { name:'X / Twitter',     cls:'x',  icon:'𝕏', max:280,  tag:'Hook-first post' },
  fb: { name:'Facebook',        cls:'fb', icon:'f', max:null, tag:'Personal story' },
  li: { name:'LinkedIn',        cls:'li', icon:'in', max:3000, tag:'Thought leadership' },
  ig: { name:'Instagram',       cls:'ig', icon:'📷', max:null, tag:'Visual caption' },
  tt: { name:'TikTok',          cls:'tt', icon:'🎵', max:null, tag:'Script/Caption' },
  th: { name:'Threads',         cls:'th', icon:'🧵', max:500,  tag:'Casual thread' },
  yt: { name:'YouTube Shorts',  cls:'yt', icon:'▶️', max:null, tag:'Short desc' }
};
const LENGTH_LABELS = ['Short', 'Medium', 'Long'];
const SYSTEM_PROMPT = `You are an expert social media ghostwriter and content strategist.

TASK: Transform video content into compelling, original first-person social media posts.

CRITICAL RULES:
1. ALWAYS use specific details, examples, and quotes from the video transcript provided
2. Write in FIRST PERSON as if YOU personally experienced/discovered the insights
3. NEVER mention "video", "watch this", "in this video", creator name, channel name, or any links
4. Include concrete examples, numbers, or specific tips from the content
5. Make posts sound like your authentic, original thoughts
6. Use the BRAND VOICE guidelines if provided

QUALITY STANDARDS:
- Hook readers in the first few words
- Use conversational, natural language
- Include 1-2 specific insights or takeaways
- End with engagement (question, CTA, or thought-provoking statement)
- Platform-specific: X=short&punchy, FB=story-based, LI=professional&valuable

OUTPUT: Return ONLY valid JSON matching the requested format.`;

const state = {
  activePlats: { x:true, fb:true, li:true },
  tone:   'raw and honest',
  niche:  'General',
  hook:   'Bold claim',
  lang:   'English',
  length: 2,
  vars:   1,
  cta:    '',
  srcTab: 'url',
  currentPosts: {},
  currentTitle: '',
  currentThumbnail: '',
  topicOverride: '',
  brandVoice: {
    name: '',
    tone: 'Professional & authoritative',
    audience: '',
    examples: '',
    avoid: ''
  },
  scheduledPosts: [],
  currentCalendarDate: new Date(),
  usage: { tier: 'free', used: 0, remaining: 15, limit: 15 }
};

async function init() {
  initSupabase();
  await refreshSession();
  updateAuthUI();

  bindNav();
  bindGenerate();
  bindBatch();
  bindHistory();
  bindSettings();
  bindExport();
  bindChips();
  bindBrandVoice();
  bindSliders();
  bindSourceTabs();
  bindTopicPreview();
  bindCalendar();
  bindAuthUI();

  await loadSettings();
  await renderHistoryPage();
  await renderScheduledList();
  await updateUsageBar();
}

function bindNav() {
  document.querySelectorAll('.nav-btn, .mob-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pg = btn.getAttribute('data-page');
      goPage(pg);
    });
  });
}

function goPage(pg) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn, .mob-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('page-' + pg);
  if (el) el.classList.add('active');
  document.querySelectorAll(`[data-page="${pg}"]`).forEach(b => b.classList.add('active'));
  if (pg === 'history') renderHistoryPage();
}

function bindChips() {
  document.querySelectorAll('#page-generate .plat-chip').forEach(el => {
    el.addEventListener('click', () => {
      const p = el.getAttribute('data-plat');
      const count = Object.keys(state.activePlats).filter(k => state.activePlats[k]).length;
      if (state.activePlats[p]) {
        if (count === 1) return;
        state.activePlats[p] = false;
        el.classList.remove('active');
      } else {
        state.activePlats[p] = true;
        el.classList.add('active');
      }
    });
  });

  document.querySelectorAll('.niche-chip').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.niche-chip').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      state.niche = el.getAttribute('data-niche');
    });
  });

  document.querySelectorAll('.hook-chip').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.hook-chip').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      state.hook = el.getAttribute('data-hook');
    });
  });

  document.querySelectorAll('.tone-chip').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.tone-chip').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      state.tone = el.getAttribute('data-tone');
    });
  });

  document.querySelectorAll('.lang-chip').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.lang-chip').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      state.lang = el.getAttribute('data-lang');
    });
  });

  document.querySelectorAll('#batchPlats .plat-chip').forEach(el => {
    el.addEventListener('click', () => {
      el.classList.toggle('active');
    });
  });

  bindEye('eyeBtn','apiKey');
  bindEye('batchEyeBtn','batchApiKey');
  bindEye('settingsEyeBtn','settingsKey');
}

function bindEye(btnId, inputId) {
  const btn = document.getElementById(btnId);
  const inp = document.getElementById(inputId);
  if (btn && inp) btn.addEventListener('click', () => {
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });
}

function bindBrandVoice() {
  document.querySelectorAll('.brand-tone-chip').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.brand-tone-chip').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      state.brandVoice.tone = el.getAttribute('data-tone');
    });
  });

  document.getElementById('saveBrandBtn').addEventListener('click', async () => {
    const brandVoice = {
      name: document.getElementById('brandName').value.trim(),
      tone: state.brandVoice.tone,
      audience: document.getElementById('brandAudience').value.trim(),
      examples: document.getElementById('brandExamples').value.trim(),
      avoid: document.getElementById('brandAvoid').value.trim()
    };
    state.brandVoice = brandVoice;
    if (currentUser) {
      try {
        await updateProfile({ brand_voice: brandVoice });
        const btn = document.getElementById('saveBrandBtn');
        btn.textContent = '✓ Saved!';
        setTimeout(() => { btn.textContent = 'Save Brand Voice'; }, 2000);
        return;
      } catch (e) { console.error(e); }
    }
    localStorage.setItem('cf_brand_voice', JSON.stringify(brandVoice));
    const btn = document.getElementById('saveBrandBtn');
    btn.textContent = '✓ Saved!';
    setTimeout(() => { btn.textContent = 'Save Brand Voice'; }, 2000);
  });
}

async function loadBrandVoice() {
  if (currentUser) {
    try {
      const profile = await loadUserProfile();
      if (profile && profile.brand_voice) {
        const bv = profile.brand_voice;
        state.brandVoice = bv;
        document.getElementById('brandName').value = bv.name || '';
        document.getElementById('brandAudience').value = bv.audience || '';
        document.getElementById('brandExamples').value = bv.examples || '';
        document.getElementById('brandAvoid').value = bv.avoid || '';
        document.querySelectorAll('.brand-tone-chip').forEach(el => {
          el.classList.toggle('active', el.getAttribute('data-tone') === bv.tone);
        });
        state.brandVoice.tone = bv.tone || 'Professional & authoritative';
        return;
      }
    } catch (e) { console.error(e); }
  }
  const saved = localStorage.getItem('cf_brand_voice');
  if (saved) {
    const brandVoice = JSON.parse(saved);
    state.brandVoice = brandVoice;
    document.getElementById('brandName').value = brandVoice.name || '';
    document.getElementById('brandAudience').value = brandVoice.audience || '';
    document.getElementById('brandExamples').value = brandVoice.examples || '';
    document.getElementById('brandAvoid').value = brandVoice.avoid || '';
    document.querySelectorAll('.brand-tone-chip').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-tone') === brandVoice.tone);
    });
    state.brandVoice.tone = brandVoice.tone || 'Professional & authoritative';
  }
}

function bindSliders() {
  const ls = document.getElementById('lengthSlider');
  const lv = document.getElementById('lengthVal');
  ls.addEventListener('input', () => {
    state.length = parseInt(ls.value);
    lv.textContent = LENGTH_LABELS[state.length - 1];
  });

  const vs = document.getElementById('varSlider');
  const vv = document.getElementById('varVal');
  vs.addEventListener('input', () => {
    state.vars = parseInt(vs.value);
    vv.textContent = state.vars;
  });
}

function bindSourceTabs() {
  document.querySelectorAll('.src-tab').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.src-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.src-panel').forEach(p => p.classList.remove('active'));
      el.classList.add('active');
      state.srcTab = el.getAttribute('data-src');
      document.getElementById('src-' + state.srcTab).classList.add('active');
    });
  });
}

function bindTopicPreview() {
  document.getElementById('extractBtn').addEventListener('click', () => extractTopic());
  document.getElementById('topicEditBtn').addEventListener('click', () => {
    const te = document.getElementById('topicEdit');
    te.value = document.getElementById('topicContent').textContent;
    te.style.display = 'block';
    document.getElementById('topicPreview').style.display = 'none';
  });
  document.getElementById('topicEdit').addEventListener('input', () => {
    state.topicOverride = document.getElementById('topicEdit').value;
  });
}

function extractTopic() {
  const key = getKey();
  if (!key) { showEr('Please enter your Groq API key.'); return; }
  const content = getSourceContent();
  if (!content.text) { showEr('Please provide a URL or paste content first.'); return; }

  const extractBtn = document.getElementById('extractBtn');
  extractBtn.disabled = true;
  extractBtn.textContent = '🔍 Extracting…';

  callGroq(key,
    'You are a content analyst. Extract the single core idea from the given content.',
    'Extract the ONE core idea/insight from this content in 1-2 sentences. Be specific. Return only the idea text, nothing else.\n\nContent:\n' + content.text.substring(0,2000),
    200
  ).then(idea => {
    document.getElementById('topicContent').textContent = idea.trim();
    document.getElementById('topicPreview').classList.add('visible');
    document.getElementById('topicEdit').style.display = 'none';
    state.topicOverride = '';
  }).catch(e => {
    showEr(e.message);
  }).finally(() => {
    extractBtn.disabled = false;
    extractBtn.textContent = '🔍 Extract Core Idea First';
  });
}

function callGroq(key, system, user, maxTokens) {
  return fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':'Bearer ' + key },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [ {role:'system',content:system}, {role:'user',content:user} ],
      temperature: 1.0,
      max_tokens: maxTokens || 1500
    })
  }).then(resp => {
    if (!resp.ok) return resp.json().then(e => {
      throw new Error((e && e.error && e.error.message) || ('Groq error ' + resp.status));
    });
    return resp.json();
  }).then(data => {
    return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
      ? data.choices[0].message.content.trim()
      : '';
  });
}

function getKey() {
  const k = document.getElementById('apiKey').value.trim();
  if (!k) return localStorage.getItem('cf_groq_key') || '';
  return k;
}

function getSourceContent() {
  if (state.srcTab === 'url') {
    const url = document.getElementById('urlInput').value.trim();
    const tr  = document.getElementById('transcript').value.trim();
    const vid = getYtId(url);
    const isTT = /tiktok\.com/i.test(url);
    if (!url || (!vid && !isTT)) return { text:'', url:'', error:'Please enter a valid YouTube or TikTok URL.' };
    let text = 'URL: ' + url;
    if (tr) text += '\n\nOpening transcript:\n' + tr;
    return { text, url, vid };
  } else {
    const t = document.getElementById('textInput').value.trim();
    if (!t) return { text:'', url:'', error:'Please paste some content.' };
    return { text:t, url:'' };
  }
}

function getYtId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function fetchYtMeta(vid) {
  return fetch('https://www.youtube.com/oembed?url=https://youtube.com/watch?v=' + vid + '&format=json')
    .then(r => r.ok ? r.json() : null)
    .catch(() => null);
}

function buildPrompt(videoCtx, platKeys, numVars) {
  const lengthDesc = LENGTH_LABELS[state.length - 1];
  const topicLine  = (state.topicOverride || document.getElementById('topicContent').textContent || '').trim();
  const ctaLine    = state.cta ? ('Naturally weave in this CTA: "' + state.cta + '"') : '';

  // Build brand voice section
  const brand = state.brandVoice;
  let brandSection = '';
  if (brand.name || brand.tone || brand.audience || brand.examples) {
    brandSection = 'BRAND VOICE (YOU MUST FOLLOW THIS):\n';
    if (brand.name) brandSection += '- Brand: ' + brand.name + '\n';
    if (brand.tone) brandSection += '- Tone: ' + brand.tone + '\n';
    if (brand.audience) brandSection += '- Target audience: ' + brand.audience + '\n';
    if (brand.examples) brandSection += '- Phrases you use: ' + brand.examples + '\n';
    if (brand.avoid) brandSection += '- AVOID: ' + brand.avoid + '\n';
    brandSection += '\n';
  }

  let prompt = 'SOURCE MATERIAL:\n' + videoCtx + '\n\n';
  if (topicLine) prompt += 'CORE IDEA TO USE: ' + topicLine + '\n\n';
  prompt += brandSection;
  prompt += 'Niche/industry context: ' + state.niche + '\n';
  prompt += 'Hook style: ' + state.hook + '\n';
  prompt += 'Writing style: ' + state.tone + '\n';
  prompt += 'Post length: ' + lengthDesc + '\n';
  prompt += 'Output language: ' + state.lang + '\n';
  if (ctaLine) prompt += ctaLine + '\n';
  prompt += '\nPLATFORM RULES:\n';
  prompt += '- x: ' + (state.length===1?'Max 180':'Max 280') + ' chars. ' + state.hook + ' opening. First person. 2-3 hashtags.\n';
  prompt += '- fb: ' + (state.length===1?'60-100':state.length===2?'100-200':'200-350') + ' words. Personal story. End with question. No hashtags.\n';
  prompt += '- li: ' + (state.length===1?'100-180':state.length===2?'180-300':'300-450') + ' words. Bold statement opener. Punchy paragraphs. Question + hashtags at end.\n';
  prompt += '- ig: ' + (state.length===1?'60-100':state.length===2?'100-200':'200-300') + ' words. Engaging caption with emojis. Strong hook in first line. 5-10 hashtags.\n';
  prompt += '- tt: ' + (state.length===1?'30-60':state.length===2?'60-120':'120-200') + ' words. Fast-paced, conversational. Trendy and punchy. 3-5 hashtags.\n';
  prompt += '- th: ' + (state.length===1?'Max 250':state.length===2?'Max 400':'Max 500') + ' chars. Casual thread-style. Conversational tone. No heavy formatting.\n';
  prompt += '- yt: ' + (state.length===1?'60-120':state.length===2?'120-200':'200-300') + ' words. Short description. Hook in first line. Include 3-5 hashtags.\n';
  prompt += '\nGenerate ' + numVars + ' variation(s) for each requested platform.\n';
  prompt += 'Platforms: ' + platKeys.join(', ') + '\n\n';
  if (numVars === 1) {
    prompt += 'Return ONLY valid JSON, no markdown:\n{"x":"...","fb":"...","li":"..."}\nOnly include requested platform keys: ' + platKeys.join(',');
  } else {
    prompt += 'Return ONLY valid JSON, no markdown:\n{"x":["var1","var2"],"fb":["var1","var2"],"li":["var1","var2"]}\nOnly include requested platform keys: ' + platKeys.join(',');
  }
  return prompt;
}

function bindGenerate() {
  document.getElementById('genBtn').addEventListener('click', () => runGenerate());
  document.getElementById('saveHistBtn').addEventListener('click', () => saveToHistory());
  document.getElementById('scheduleBtn').addEventListener('click', () => openScheduleModal());
}

async function runGenerate() {
  const key = getKey();
  if (!key) { showEr('Please enter your Groq API key.'); return; }

  // Check usage
  try {
    const limits = await getUsageLimits();
    state.usage = limits;
    if (limits.remaining <= 0) {
      showEr('Monthly generation limit reached. Upgrade to Pro for more.');
      return;
    }
    await updateUsageBar();
  } catch (e) { /* ignore */ }

  state.cta = document.getElementById('ctaInput').value.trim();
  const src = getSourceContent();
  if (src.error) { showEr(src.error); return; }

  const platKeys = Object.keys(state.activePlats).filter(k => state.activePlats[k]);
  const btn = document.getElementById('genBtn');
  btn.disabled = true;
  hideEr();
  document.getElementById('resultsWrap').style.display = 'none';
  document.getElementById('results').innerHTML = '';

  try {
    let videoCtx = '';
    let title = '';

    if (src.url && (src.vid || /tiktok\.com/i.test(src.url))) {
      setSt('Fetching video content with yt-dlp…');

      const resp = await fetch(`${API_BASE}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: src.url })
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Failed to extract video');
      }

      const data = await resp.json();
      title = data.title || src.url;
      state.currentTitle = title;
      state.currentThumbnail = data.thumbnail || '';

      if (data.transcript) {
        // Clean up transcript - remove VTT headers, timestamps, and duplicate lines
        const lines = data.transcript.split('\n');
        const cleaned = [];
        let lastLine = '';

        for (const line of lines) {
          // Skip empty, timestamps, and numbers (VTT cue numbers)
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.match(/^\d{2}:\d{2}/)) continue; // timestamp
          if (trimmed.match(/^\d+$/)) continue; // cue numbers
          if (trimmed === lastLine) continue; // duplicate

          cleaned.push(trimmed);
          lastLine = trimmed;
        }

        const cleanTranscript = cleaned.join(' ').substring(0, 4000);

        // Use channel name from different possible fields
        const channelName = data.uploader || data.channel || data.creator || 'Unknown';

        videoCtx = `Video Title: "${data.title || 'Untitled'}"\nChannel: "${channelName}"\n\nVideo Transcript:\n${cleanTranscript}`;
      } else if (data.description) {
        videoCtx = `Video Title: "${data.title}"\nChannel: "${data.uploader}"\n\nVideo Description:\n${data.description}`;
      } else {
        videoCtx = `Video Title: "${data.title}"\nChannel: "${data.uploader}"\n\n(No transcript or description available for this video)`;
      }
    } else {
      title = src.url || 'Text Content';
      state.currentTitle = title;
      videoCtx = src.text;
    }

    setSt('Generating your original posts with Groq…');

    const raw = await callGroq(key, SYSTEM_PROMPT, buildPrompt(videoCtx, platKeys, state.vars), state.vars > 1 ? 2500 : 1500);

    const clean = raw.replace(/```json/g,'').replace(/```/g,'').trim();
    const m = clean.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Could not parse response. Try again.');

    const posts = JSON.parse(m[0]);
    state.currentPosts = posts;
    hideSt();
    renderPosts(posts, key, src);
    document.getElementById('resultsWrap').style.display = 'block';
  } catch (e) {
    hideSt();
    showEr(e.message || 'Something went wrong.');
  } finally {
    btn.disabled = false;
  }
}

function renderPosts(posts, key, src) {
  const c = document.getElementById('results');
  c.innerHTML = '';

  // Show video preview if we have a thumbnail
  if (state.currentThumbnail && state.currentTitle) {
    const preview = document.createElement('div');
    preview.className = 'video-preview';
    preview.innerHTML = `
      <img class="video-preview-img" src="${escHtml(state.currentThumbnail)}" alt="Video thumbnail" onerror="this.style.display='none'"/>
      <div class="video-preview-info">
        <div class="video-preview-title">${escHtml(state.currentTitle)}</div>
        <div class="video-preview-channel">Source video</div>
      </div>
    `;
    c.appendChild(preview);
  }

  Object.keys(posts).forEach((k, i) => {
    const p = PLATS[k];
    if (!p) return;
    const raw = posts[k];
    const isArr = Array.isArray(raw);
    const text = isArr ? raw[0] : raw;
    const allVars = isArr ? raw : [raw];

    const div = document.createElement('div');
    div.className = 'pc';
    div.style.animationDelay = (i * 130) + 'ms';
    div.setAttribute('data-key', k);

    const ci = charInfo(text, p);
    div.innerHTML =
      '<div class="ph">'
        + '<div class="pi"><div class="pico ' + p.cls + '">' + p.icon + '</div>'
        + '<div class="pmeta"><span class="pn">' + p.name + '</span><span class="ptag">' + p.tag + '</span></div></div>'
        + '<span class="cc" id="cc-' + k + '">' + ci.text + '</span>'
      + '</div>'
      + '<div class="pb"><div class="pt" id="t-' + k + '" contenteditable="false">' + escHtml(text) + '</div></div>'
      + '<div class="pf">'
        + '<div class="pf-left">'
          + (allVars.length > 1 ? '<button class="btn-secondary" id="vbtn-' + k + '">📄 Variations (' + allVars.length + ')</button>' : '')
          + '<button class="btn-secondary" id="rbtn-' + k + '">↻ Rewrite</button>'
          + '<button class="btn-secondary" id="ebtn-' + k + '">✏️ Edit</button>'
        + '</div>'
        + '<div class="pf-right">'
          + '<button class="btn-icon" id="cbtn-' + k + '">📋 Copy</button>'
        + '</div>'
      + '</div>';

    if (allVars.length > 1) {
      let vHtml = '<div class="vars-panel" id="vars-' + k + '">'
        + '<div class="vars-label"><span>Choose a variation — click to use it</span><span id="vclose-' + k + '" style="cursor:pointer;color:var(--muted);">✕</span></div>';
      allVars.forEach((v, vi) => {
        vHtml += '<div class="var-item" data-vi="' + vi + '" data-key="' + k + '">' + escHtml(v) + '</div>';
      });
      vHtml += '</div>';
      div.innerHTML += vHtml;
    }

    c.appendChild(div);

    updateCharColor(k, text, p);

    if (allVars.length > 1) {
      document.getElementById('vbtn-' + k).addEventListener('click', () => {
        document.getElementById('vars-' + k).classList.toggle('open');
      });
      document.getElementById('vclose-' + k).addEventListener('click', () => {
        document.getElementById('vars-' + k).classList.remove('open');
      });
      div.querySelectorAll('.var-item').forEach(vi => {
        vi.addEventListener('click', () => {
          const chosen = allVars[parseInt(vi.getAttribute('data-vi'))];
          document.getElementById('t-' + k).textContent = chosen;
          document.getElementById('vars-' + k).classList.remove('open');
          const ci2 = charInfo(chosen, p);
          document.getElementById('cc-' + k).textContent = ci2.text;
          updateCharColor(k, chosen, p);
        });
      });
    }

    document.getElementById('ebtn-' + k).addEventListener('click', function() {
      const el = document.getElementById('t-' + k);
      const editing = el.getAttribute('contenteditable') === 'true';
      el.setAttribute('contenteditable', editing ? 'false' : 'true');
      this.textContent = editing ? '✏️ Edit' : '✅ Done';
      if (!editing) el.focus();
      el.addEventListener('input', function() {
        const txt = el.innerText;
        const ci3 = charInfo(txt, p);
        document.getElementById('cc-' + k).textContent = ci3.text;
        updateCharColor(k, txt, p);
      });
    });

    document.getElementById('rbtn-' + k).addEventListener('click', () => regenOne(k, key, src));
    document.getElementById('cbtn-' + k).addEventListener('click', () => copyPost(k));
  });
}

function charInfo(text, p) {
  const len = text.length;
  const txt = p.max ? (len + ' / ' + p.max + ' chars') : (len + ' chars');
  let cls = '';
  if (p.max) {
    if (len > p.max) cls = 'danger';
    else if (len > p.max * 0.9) cls = 'warn';
  }
  return { text:txt, cls };
}

function updateCharColor(k, text, p) {
  const el = document.getElementById('cc-' + k);
  if (!el) return;
  const ci = charInfo(text, p);
  el.className = 'cc' + (ci.cls ? ' ' + ci.cls : '');
}

function regenOne(k, key, src) {
  const rbtn = document.getElementById('rbtn-' + k);
  const p = PLATS[k];
  rbtn.textContent = '↻ Rewriting…';
  rbtn.disabled = true;

  const metaP = (src && src.vid) ? fetchYtMeta(src.vid) : Promise.resolve(null);
  metaP.then(meta => {
    let videoCtx = src ? src.text : '';
    if (meta) videoCtx = 'Title: "' + meta.title + '"\nCreator: "' + meta.author_name + '"\n\n' + videoCtx;
    const rules = k === 'x'
      ? 'Max 280 chars. ' + state.hook + ' hook. First person. 2-3 hashtags.'
      : k === 'fb' ? '100-220 words. Personal story. End with question. No hashtags.'
      : '180-300 words. Bold opener. Short paragraphs. Question + hashtags.';
    const prompt = 'SOURCE:\n' + videoCtx + '\nNiche: ' + state.niche + '\nStyle: ' + state.tone + '\nLanguage: ' + state.lang + '\n'
      + (state.cta ? 'CTA: ' + state.cta + '\n' : '')
      + 'Write ONE original first-person ' + p.name + ' post.\nRules: ' + rules + '\nReturn ONLY the post text.';
    return callGroq(key, SYSTEM_PROMPT, prompt, 600);
  }).then(text => {
    text = text.trim();
    const el = document.getElementById('t-' + k);
    el.textContent = text;
    el.setAttribute('contenteditable', 'false');
    document.getElementById('ebtn-' + k).textContent = '✏️ Edit';
    const ci = charInfo(text, p);
    document.getElementById('cc-' + k).textContent = ci.text;
    updateCharColor(k, text, p);
  }).catch(e => { alert('Rewrite failed: ' + e.message); })
  .finally(() => { rbtn.textContent = '↻ Rewrite'; rbtn.disabled = false; });
}

function copyPost(k) {
  const text = document.getElementById('t-' + k).innerText;
  const btn  = document.getElementById('cbtn-' + k);
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓ Copied!';
    btn.classList.add('ok');
    setTimeout(() => { btn.textContent = '📋 Copy'; btn.classList.remove('ok'); }, 2000);
  });
}

function setSt(msg) { document.getElementById('stBar').classList.add('on'); document.getElementById('stMsg').textContent = msg; }
function hideSt()   { document.getElementById('stBar').classList.remove('on'); }
function showEr(msg){ document.getElementById('erBar').classList.add('on'); document.getElementById('erMsg').textContent = msg; }
function hideEr()   { document.getElementById('erBar').classList.remove('on'); }

function getLocalHistory() {
  try { return JSON.parse(localStorage.getItem('cf_history') || '[]'); } catch(e){ return []; }
}
function saveLocalHistory(h) { localStorage.setItem('cf_history', JSON.stringify(h)); }

async function getHistory() {
  if (currentUser) {
    try { return await loadHistory(); } catch(e) { return []; }
  }
  return getLocalHistory();
}

async function updateHistCount() {
  const h = await getHistory();
  document.getElementById('histCount').textContent = h.length;
}

async function saveToHistory() {
  if (!Object.keys(state.currentPosts).length) return;
  const entry = {
    id: Date.now(),
    title: state.currentTitle || 'Untitled',
    posts: state.currentPosts,
    date: new Date().toLocaleDateString()
  };

  if (currentUser) {
    const cloudEntry = {
      title: entry.title,
      posts: entry.posts,
      platforms: Object.keys(entry.posts),
      source_url: state.currentTitle || ''
    };
    const saved = await saveGenerationToCloud(cloudEntry);
    if (saved) {
      const btn = document.getElementById('saveHistBtn');
      btn.textContent = '✓ Saved!';
      setTimeout(() => { btn.textContent = '💾 Save to History'; }, 2000);
      await updateHistCount();
      await renderHistoryPage();
      return;
    }
  }

  let h = getLocalHistory();
  h.unshift(entry);
  if (h.length > 50) h = h.slice(0, 50);
  saveLocalHistory(h);
  await updateHistCount();
  const btn = document.getElementById('saveHistBtn');
  btn.textContent = '✓ Saved!';
  setTimeout(() => { btn.textContent = '💾 Save to History'; }, 2000);
}

async function renderHistoryPage() {
  const h = await getHistory();
  const c = document.getElementById('historyList');
  if (!h.length) {
    c.innerHTML = '<div class="empty-state"><div class="empty-icon">🕒</div><p>No saved posts yet.<br>Generate content and click <strong>Save to History</strong>.</p></div>';
    return;
  }
  c.innerHTML = '';
  h.forEach(entry => {
    const platKeys = Object.keys(entry.posts || {});
    let preview = '';
    if (platKeys.length) {
      const first = entry.posts[platKeys[0]];
      preview = Array.isArray(first) ? first[0] : first;
    }
    const div = document.createElement('div');
    div.className = 'hist-item';
    const dateStr = entry.date || (entry.created_at ? new Date(entry.created_at).toLocaleDateString() : '');
    div.innerHTML =
      '<div class="hist-item-header">'
        + '<span class="hist-title">' + escHtml(entry.title) + '</span>'
        + '<span class="hist-date">' + dateStr + '</span>'
      + '</div>'
      + '<div class="hist-platforms">'
        + platKeys.map(k => '<span class="hist-plat">' + (PLATS[k] ? PLATS[k].name : k) + '</span>').join('')
      + '</div>'
      + '<div class="hist-preview">' + escHtml((preview || '').substring(0, 120)) + '…</div>'
      + '<div class="hist-actions">'
        + '<button class="btn-secondary hist-load" data-id="' + entry.id + '">Load Posts</button>'
        + '<button class="btn-danger hist-del" data-id="' + entry.id + '">Delete</button>'
      + '</div>';
    c.appendChild(div);
  });

  c.querySelectorAll('.hist-load').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const entry = h.find(e => String(e.id) === String(id));
      if (!entry) return;
      state.currentPosts = entry.posts;
      state.currentTitle = entry.title;
      goPage('generate');
      document.getElementById('resultsWrap').style.display = 'block';
      renderPosts(entry.posts, getKey(), null);
    });
  });

  c.querySelectorAll('.hist-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (currentUser) {
        const deleted = await deleteGenerationCloud(id);
        if (deleted) { await updateHistCount(); await renderHistoryPage(); return; }
      }
      const h2 = getLocalHistory().filter(e => String(e.id) !== String(id));
      saveLocalHistory(h2);
      await updateHistCount();
      await renderHistoryPage();
    });
  });
}

function bindHistory() {
  document.getElementById('clearHistBtn').addEventListener('click', async () => {
    if (!confirm('Clear all history?')) return;
    if (currentUser) {
      const all = await getHistory();
      for (const entry of all) { await deleteGenerationCloud(entry.id); }
    }
    localStorage.removeItem('cf_history');
    await updateHistCount();
    await renderHistoryPage();
  });
}

function bindBatch() {
  document.getElementById('batchGenBtn').addEventListener('click', () => runBatch());
  document.getElementById('batchEyeBtn').addEventListener('click', () => {
    const i = document.getElementById('batchApiKey');
    i.type = i.type === 'password' ? 'text' : 'password';
  });
}

async function runBatch() {
  const key  = document.getElementById('batchApiKey').value.trim() || localStorage.getItem('cf_groq_key') || '';
  const raw  = document.getElementById('batchUrls').value.trim();
  if (!key) { batchErr('Please enter your Groq API key.'); return; }
  if (!raw) { batchErr('Please enter at least one URL.'); return; }

  // Check usage
  try {
    const limits = await getUsageLimits();
    state.usage = limits;
    if (limits.remaining <= 0) {
      batchErr('Monthly generation limit reached. Upgrade to Pro for more.');
      return;
    }
    await updateUsageBar();
  } catch (e) { /* ignore */ }
  const urls = raw.split('\n').map(u => u.trim()).filter(u => u.length > 0).slice(0, 10);
  const platKeys = [];
  document.querySelectorAll('#batchPlats .plat-chip').forEach(el => {
    if (el.classList.contains('active')) platKeys.push(el.getAttribute('data-plat'));
  });
  if (!platKeys.length) { batchErr('Select at least one platform.'); return; }

  const btn = document.getElementById('batchGenBtn');
  btn.disabled = true;
  document.getElementById('batchResults').innerHTML = '';
  document.getElementById('batchStBar').classList.add('on');
  document.getElementById('batchErBar').classList.remove('on');

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    document.getElementById('batchStMsg').textContent = `Processing ${i + 1} of ${urls.length}: ${url.substring(0, 50)}…`;

    try {
      const resp = await fetch(`${API_BASE}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Failed to extract video');
      }

      const data = await resp.json();
      const title = data.title || url;

      let videoCtx = '';
      if (data.transcript) {
        videoCtx = `Title: "${data.title}"\nCreator: "${data.uploader}"\n\nTranscript:\n${data.transcript}`;
      } else if (data.description) {
        videoCtx = `Title: "${data.title}"\nCreator: "${data.uploader}"\n\nDescription:\n${data.description}`;
      } else {
        videoCtx = `Title: "${data.title}"\nCreator: "${data.uploader}"`;
      }

      const prompt = buildPrompt(videoCtx, platKeys, 1);
      const raw2 = await callGroq(key, SYSTEM_PROMPT, prompt, 1500);

      const clean = raw2.replace(/```json/g, '').replace(/```/g, '').trim();
      const m = clean.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('Parse error');

      const posts = JSON.parse(m[0]);
      renderBatchGroup(title, posts, url);
    } catch (e) {
      renderBatchError(url, e.message);
    }
  }

  document.getElementById('batchStBar').classList.remove('on');
  btn.disabled = false;
}

function renderBatchGroup(title, posts, url) {
  const c = document.getElementById('batchResults');
  const wrap = document.createElement('div');
  wrap.className = 'batch-group';
  let inner = '<div class="batch-group-header">🎬 <span class="batch-group-title">' + escHtml(title.substring(0, 60)) + '</span></div>';
  Object.keys(posts).forEach(k => {
    const p = PLATS[k];
    if (!p) return;
    const text = Array.isArray(posts[k]) ? posts[k][0] : posts[k];
    inner += '<div style="padding:16px 18px;border-bottom:1px solid var(--border);">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">'
        + '<div style="display:flex;align-items:center;gap:8px;"><div class="pico ' + p.cls + '" style="width:26px;height:26px;font-size:11px;">' + p.icon + '</div><span style="font-size:13px;font-weight:600;color:var(--text);">' + p.name + '</span></div>'
        + '<button class="btn-icon batch-copy-btn">📋 Copy</button>'
      + '</div>'
      + '<div style="font-size:13.5px;line-height:1.75;color:var(--text);white-space:pre-wrap;word-break:break-word;font-weight:300;">' + escHtml(text) + '</div>'
    + '</div>';
  });
  wrap.innerHTML = inner;
  wrap.querySelectorAll('.batch-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const textEl = btn.parentElement.nextElementSibling;
      navigator.clipboard.writeText(textEl ? textEl.innerText : '').then(() => {
        btn.textContent = '✓ Copied!';
        setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
      });
    });
  });
  c.appendChild(wrap);
}

function renderBatchError(url, msg) {
  const c = document.getElementById('batchResults');
  const div = document.createElement('div');
  div.style.cssText = 'background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.2);border-radius:12px;padding:14px 18px;font-size:13px;color:#fca5a5;margin-bottom:8px;';
  div.textContent = '⚠️ Failed: ' + url + ' — ' + msg;
  c.appendChild(div);
}

function batchErr(msg) {
  document.getElementById('batchErBar').classList.add('on');
  document.getElementById('batchErMsg').textContent = msg;
}

function bindExport() {
  document.getElementById('exportBtn').addEventListener('click', () => {
    document.getElementById('exportModal').classList.add('open');
  });
  document.getElementById('exportClose').addEventListener('click', () => {
    document.getElementById('exportModal').classList.remove('open');
  });
  document.getElementById('exportTxt').addEventListener('click', () => exportFile('txt'));
  document.getElementById('exportMd').addEventListener('click',  () => exportFile('md'));
  document.getElementById('exportClip').addEventListener('click', () => exportClipboard());

  // Hashtag generation
  document.getElementById('hashtagBtn').addEventListener('click', () => generateHashtags());
  document.getElementById('copyHashtags').addEventListener('click', () => copyHashtags());
}

async function generateHashtags() {
  const key = getKey();
  if (!key) { showEr('Please enter your Groq API key.'); return; }

  // Collect all post content
  let allContent = '';
  Object.keys(state.currentPosts).forEach(k => {
    const post = state.currentPosts[k];
    allContent += Array.isArray(post) ? post.join(' ') : post;
  });

  const btn = document.getElementById('hashtagBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Generating...';

  try {
    const prompt = `Based on this social media post content, generate 10 relevant hashtags that would increase visibility. Return ONLY a JSON array of strings like ["#hashtag1", "#hashtag2"].

Content:
${allContent.substring(0, 1000)}`;

    const raw = await callGroq(key, 'You are a hashtag expert. Generate relevant, popular hashtags.', prompt, 200);

    const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const m = clean.match(/\[[\s\S]*\]/);
    if (!m) throw new Error('Could not parse hashtags');

    const hashtags = JSON.parse(m[0]);

    // Display hashtags
    const container = document.getElementById('hashtagSuggestions');
    container.innerHTML = hashtags.map(tag =>
      `<span class="hashtag-pill" onclick="copySingleHashtag('${tag}')">${tag}</span>`
    ).join('');

    document.getElementById('hashtagsPanel').style.display = 'block';
  } catch (e) {
    showEr('Could not generate hashtags: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '#️⃣ Hashtags';
  }
}

function copyHashtags() {
  const tags = document.querySelectorAll('.hashtag-pill');
  const text = Array.from(tags).map(t => t.textContent).join(' ');
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyHashtags');
    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.textContent = '📋 Copy All Hashtags', 2000);
  });
}

window.copySingleHashtag = function(tag) {
  navigator.clipboard.writeText(tag).then(() => {
    // Brief feedback could be added here
  });
};

function collectPostTexts() {
  const out = {};
  Object.keys(PLATS).forEach(k => {
    const el = document.getElementById('t-' + k);
    if (el) out[k] = el.innerText;
  });
  return out;
}

function exportFile(type) {
  const posts = collectPostTexts();
  const lines = [];
  Object.keys(posts).forEach(k => {
    const p = PLATS[k];
    if (type === 'md') {
      lines.push('## ' + p.name + '\n\n' + posts[k] + '\n');
    } else {
      lines.push('--- ' + p.name.toUpperCase() + ' ---\n\n' + posts[k] + '\n');
    }
  });
  const content = lines.join('\n');
  const blob = new Blob([content], { type:'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'contentforge-posts.' + type;
  a.click();
}

function exportClipboard() {
  const posts = collectPostTexts();
  const lines = [];
  Object.keys(posts).forEach(k => {
    lines.push('--- ' + PLATS[k].name.toUpperCase() + ' ---\n\n' + posts[k]);
  });
  navigator.clipboard.writeText(lines.join('\n\n')).then(() => {
    const btn = document.getElementById('exportClip');
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = 'Copy All'; }, 2000);
  });
}

async function loadSettings() {
  const key = localStorage.getItem('cf_groq_key') || '';
  if (key) {
    document.getElementById('apiKey').value = key;
    document.getElementById('settingsKey').value = key;
  }
  let prefs = {};
  if (currentUser) {
    try {
      const profile = await loadUserProfile();
      if (profile && profile.preferences) prefs = profile.preferences;
    } catch (e) { console.error(e); }
  } else {
    prefs = JSON.parse(localStorage.getItem('cf_prefs') || '{}');
  }
  if (prefs.niche) {
    state.niche = prefs.niche;
    document.querySelectorAll('.niche-chip').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-niche') === prefs.niche);
    });
    document.getElementById('defaultNiche').value = prefs.niche;
  }
  if (prefs.lang) {
    state.lang = prefs.lang;
    document.querySelectorAll('.lang-chip').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-lang') === prefs.lang);
    });
    document.getElementById('defaultLang').value = prefs.lang;
  }
  await loadBrandVoice();
}

function bindSettings() {
  document.getElementById('saveKeyBtn').addEventListener('click', () => {
    const key = document.getElementById('settingsKey').value.trim();
    if (key) {
      localStorage.setItem('cf_groq_key', key);
      document.getElementById('apiKey').value = key;
      const btn = document.getElementById('saveKeyBtn');
      btn.textContent = '✓ Saved!';
      setTimeout(() => { btn.textContent = 'Save Key'; }, 2000);
    }
  });
  document.getElementById('savePrefsBtn').addEventListener('click', async () => {
    const prefs = {
      niche: document.getElementById('defaultNiche').value,
      lang:  document.getElementById('defaultLang').value
    };
    state.niche = prefs.niche;
    state.lang = prefs.lang;
    if (currentUser) {
      try {
        await updateProfile({ preferences: prefs });
        const btn = document.getElementById('savePrefsBtn');
        btn.textContent = '✓ Saved!';
        setTimeout(() => { btn.textContent = 'Save Preferences'; }, 2000);
        return;
      } catch (e) { console.error(e); }
    }
    localStorage.setItem('cf_prefs', JSON.stringify(prefs));
    const btn = document.getElementById('savePrefsBtn');
    btn.textContent = '✓ Saved!';
    setTimeout(() => { btn.textContent = 'Save Preferences'; }, 2000);
  });
}

// ===================== CALENDAR =====================
function bindCalendar() {
  loadScheduledPosts();
  renderCalendar();

  document.getElementById('prevMonth').addEventListener('click', () => {
    state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() + 1);
    renderCalendar();
  });

  document.getElementById('cancelSchedule').addEventListener('click', () => {
    document.getElementById('scheduleModal').classList.remove('open');
  });

  document.getElementById('confirmSchedule').addEventListener('click', () => confirmSchedule());
}

async function loadScheduledPosts() {
  if (currentUser) {
    try { state.scheduledPosts = await loadScheduled(); } catch (e) { state.scheduledPosts = []; }
  } else {
    try { state.scheduledPosts = JSON.parse(localStorage.getItem('cf_scheduled') || '[]'); } catch (e) { state.scheduledPosts = []; }
  }
  const count = state.scheduledPosts.length;
  const el = document.getElementById('scheduledCount');
  if (el) el.textContent = count;
}

function saveScheduledPosts() {
  if (!currentUser) {
    localStorage.setItem('cf_scheduled', JSON.stringify(state.scheduledPosts));
  }
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const monthLabel = document.getElementById('currentMonth');

  const year = state.currentCalendarDate.getFullYear();
  const month = state.currentCalendarDate.getMonth();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  monthLabel.textContent = `${monthNames[month]} ${year}`;

  // Clear existing days (keep headers)
  while (grid.children.length > 7) {
    grid.removeChild(grid.lastChild);
  }

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Previous month days
  const prevMonthLast = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const day = document.createElement('div');
    day.className = 'cal-day other-month';
    day.innerHTML = `<span class="cal-day-num">${prevMonthLast - i}</span>`;
    grid.appendChild(day);
  }

  // Current month days
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);

    const dayEl = document.createElement('div');
    dayEl.className = 'cal-day';

    // Check if today
    if (date.getTime() === today.getTime()) {
      dayEl.classList.add('today');
    }

    // Check if has scheduled posts
    const dateStr = date.toISOString().split('T')[0];
    const hasPosts = state.scheduledPosts.some(p => p.scheduledDate.startsWith(dateStr));
    if (hasPosts) {
      dayEl.classList.add('has-posts');
      dayEl.innerHTML = `<span class="cal-day-num">${day}</span><div class="cal-dot"></div>`;
    } else {
      dayEl.innerHTML = `<span class="cal-day-num">${day}</span>`;
    }

    dayEl.addEventListener('click', () => showDayPosts(dateStr));
    grid.appendChild(dayEl);
  }

  // Next month days
  const remaining = 42 - (startDay + totalDays);
  for (let i = 1; i <= remaining; i++) {
    const day = document.createElement('div');
    day.className = 'cal-day other-month';
    day.innerHTML = `<span class="cal-day-num">${i}</span>`;
    grid.appendChild(day);
  }
}

function showDayPosts(dateStr) {
  renderScheduledList(dateStr);
}

let selectedCalendarDate = null;

function renderScheduledList(filterDate = null) {
  const container = document.getElementById('scheduledPostsList');
  selectedCalendarDate = filterDate;

  if (!filterDate) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><p>Click on a date in the calendar to see scheduled posts.<br>Dates with dots have posts scheduled.</p></div>';
    return;
  }

  const posts = state.scheduledPosts
    .filter(p => p.scheduledDate.startsWith(filterDate))
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

  if (posts.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>No posts scheduled for this date.</p></div>';
    return;
  }

  // Show selected date header
  const displayDate = new Date(filterDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  container.innerHTML = `
    <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-weight:600;color:var(--text);">${displayDate}</div>
      <button class="btn-secondary" onclick="renderScheduledList(null)">Show All</button>
    </div>
  ` + posts.map((p, idx) => {
    // Get actual index in full array
    const actualIdx = state.scheduledPosts.findIndex(sp => sp.id === p.id);
    const time = new Date(p.scheduledDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const platforms = Object.keys(p.posts).map(k => `<span class="scheduled-platform-tag">${PLATS[k]?.name || k}</span>`).join('');

    const postPreviews = Object.entries(p.posts).map(([k, v]) => {
      const platName = PLATS[k]?.name || k;
      const content = typeof v === 'string' ? v : v[0];
      return `<div style="margin-top:8px;padding:8px;background:var(--surface);border-radius:8px;"><div style="font-size:10px;color:var(--accent);margin-bottom:4px;">${platName}</div><div style="font-size:12px;color:var(--text);line-height:1.4;">${escHtml(content?.substring(0, 100) || '')}${content?.length > 100 ? '...' : ''}</div></div>`;
    }).join('');

    return `
      <div class="scheduled-post">
        <div class="scheduled-post-content">
          <div class="scheduled-post-date">⏰ ${time}</div>
          <div class="scheduled-post-platforms" style="margin-bottom:8px;">${platforms}</div>
          ${postPreviews}
        </div>
        <div class="scheduled-post-actions">
          <button class="btn-icon" onclick="copyScheduledPost(${actualIdx})">📋</button>
          <button class="btn-danger" onclick="deleteScheduledPost(${actualIdx})">🗑</button>
        </div>
      </div>
    `;
  }).join('');
}

window.copyScheduledPost = function(idx) {
  const post = state.scheduledPosts[idx];
  const lines = [];
  Object.keys(post.posts).forEach(k => {
    const platName = PLATS[k]?.name || k;
    const content = Array.isArray(post.posts[k]) ? post.posts[k][0] : post.posts[k];
    lines.push(`=== ${platName.toUpperCase()} ===\n${content}\n`);
  });
  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    alert('All posts copied to clipboard!');
  });
};

window.deleteScheduledPost = async function(idx) {
  if (!confirm('Delete this scheduled post?')) return;
  const post = state.scheduledPosts[idx];
  if (currentUser && post && post.id) {
    try { await deleteScheduledCloud(post.id); } catch (e) { console.error(e); }
  }
  state.scheduledPosts.splice(idx, 1);
  saveScheduledPosts();
  renderCalendar();
  renderScheduledList();
};

function openScheduleModal() {
  const dateInput = document.getElementById('scheduleDate');
  const timeInput = document.getElementById('scheduleTime');

  // Default to tomorrow 9am
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.value = tomorrow.toISOString().split('T')[0];
  timeInput.value = '09:00';

  document.getElementById('scheduleModal').classList.add('open');
}

async function confirmSchedule() {
  const dateInput = document.getElementById('scheduleDate').value;
  const timeInput = document.getElementById('scheduleTime').value;

  if (!dateInput) {
    alert('Please select a date');
    return;
  }

  const scheduledDate = `${dateInput}T${timeInput || '09:00'}:00`;

  const entry = {
    id: Date.now(),
    title: state.currentTitle || 'Untitled',
    posts: state.currentPosts,
    scheduledDate: scheduledDate,
    createdAt: new Date().toISOString()
  };

  if (currentUser) {
    try {
      await saveScheduledCloud({
        title: entry.title,
        posts: entry.posts,
        platforms: Object.keys(entry.posts),
        scheduled_date: scheduledDate
      });
    } catch (e) { console.error(e); }
  }

  state.scheduledPosts.push(entry);
  saveScheduledPosts();

  document.getElementById('scheduleModal').classList.remove('open');

  // Show success
  const btn = document.getElementById('saveHistBtn');
  btn.textContent = '✓ Scheduled!';
  setTimeout(() => {
    btn.textContent = '💾 Save to History';
    document.getElementById('resultsWrap').style.display = 'none';
  }, 2000);

  renderCalendar();
  renderScheduledList();
}

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---- AUTH UI ----
function updateAuthUI() {
  let authBtn = document.getElementById('authNavBtn');
  if (!authBtn) {
    authBtn = document.createElement('button');
    authBtn.id = 'authNavBtn';
    authBtn.className = 'nav-btn';
    const settingsBtn = document.querySelector('[data-page="settings"]');
    if (settingsBtn && settingsBtn.parentNode) {
      settingsBtn.parentNode.insertBefore(authBtn, settingsBtn.nextSibling);
    }
  }
  if (currentUser) {
    authBtn.innerHTML = '<span class="nav-icon">👤</span>' + (currentUser.email || 'Account');
    authBtn.onclick = async () => { await signOut(); updateAuthUI(); location.reload(); };
  } else {
    authBtn.innerHTML = '<span class="nav-icon">🔑</span>Sign In';
    authBtn.onclick = () => openAuthModal();
  }
}

function openAuthModal() {
  document.getElementById('authModal').classList.add('open');
  document.getElementById('authError').style.display = 'none';
}

function bindAuthUI() {
  const modal = document.getElementById('authModal');
  document.getElementById('authClose').addEventListener('click', () => modal.classList.remove('open'));

  let isSignUp = false;
  const toggle = () => {
    isSignUp = !isSignUp;
    document.getElementById('authTitle').textContent = isSignUp ? 'Sign Up' : 'Sign In';
    document.getElementById('authSub').textContent = isSignUp ? 'Create your ContentForge account' : 'Welcome back to ContentForge';
    document.getElementById('authActionBtn').textContent = isSignUp ? 'Create Account' : 'Sign In';
    document.getElementById('authToggleText').textContent = isSignUp ? 'Already have an account?' : 'Don\'t have an account?';
    document.getElementById('authToggleLink').textContent = isSignUp ? 'Sign in' : 'Sign up';
  };
  document.getElementById('authToggleLink').addEventListener('click', (e) => { e.preventDefault(); toggle(); });

  document.getElementById('authActionBtn').addEventListener('click', async () => {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const errEl = document.getElementById('authError');
    if (!email || !password) {
      errEl.textContent = 'Please enter email and password.';
      errEl.style.display = 'block'; return;
    }
    try {
      if (isSignUp) {
        await signUp(email, password);
        errEl.textContent = 'Account created! Please sign in.';
        errEl.style.color = 'var(--accent3)'; errEl.style.display = 'block'; toggle();
      } else {
        await signIn(email, password);
        modal.classList.remove('open');
        updateAuthUI();
        await init();
      }
    } catch (e) {
      errEl.textContent = e.message || 'Authentication failed.';
      errEl.style.color = 'var(--danger)'; errEl.style.display = 'block';
    }
  });

  // Billing buttons
  document.getElementById('upgradeProBtn')?.addEventListener('click', async () => {
    try {
      const cfg = await getBillingConfig();
      if (!cfg.publishableKey) { alert('Billing not configured'); return; }
      // Stripe checkout requires a price ID from config
      const priceId = '';
      const { url } = await createCheckout(priceId);
      if (url) window.location.href = url;
    } catch (e) { alert('Checkout error: ' + e.message); }
  });
  document.getElementById('upgradeAgencyBtn')?.addEventListener('click', async () => {
    try {
      const { url } = await createCheckout('');
      if (url) window.location.href = url;
    } catch (e) { alert('Checkout error: ' + e.message); }
  });
  document.getElementById('manageSubBtn')?.addEventListener('click', async () => {
    try {
      const { url } = await createPortal();
      if (url) window.location.href = url;
    } catch (e) { alert('Portal error: ' + e.message); }
  });
}

async function updateUsageBar() {
  try {
    const limits = await getUsageLimits();
    state.usage = limits;
    const bar = document.getElementById('usageBar');
    if (!bar) return;
    bar.style.display = 'block';
    document.getElementById('tierLabel').textContent = limits.tier.charAt(0).toUpperCase() + limits.tier.slice(1);
    document.getElementById('remainingLabel').textContent = limits.remaining;
    const pct = limits.limit > 0 ? ((limits.used / limits.limit) * 100) : 0;
    document.getElementById('usageProgress').style.width = pct + '%';
  } catch (e) {
    const bar = document.getElementById('usageBar');
    if (bar) bar.style.display = 'none';
  }
}

init();