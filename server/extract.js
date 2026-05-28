const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const config = require('./config');

const MAX_TRANSCRIPT_CHARS = 6000;
const AUDIO_MAX_FILESIZE = '24M';
const AUDIO_DOWNLOAD_TIMEOUT = 180000;
const AUDIO_EXTENSIONS = ['.m4a', '.mp3', '.webm', '.wav', '.mp4', '.mpeg', '.mpga'];

function execPromise(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024, timeout: 60000, ...opts }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout + stderr);
    });
  });
}

function quoteShell(value) {
  return `"${String(value).replace(/["$`\\]/g, '\\$&')}"`;
}

function cleanupTempFiles(tempDir, videoId) {
  try {
    fs.readdirSync(tempDir)
      .filter(f => f.startsWith(videoId))
      .forEach(f => {
        try { fs.unlinkSync(path.join(tempDir, f)); } catch (e) {}
      });
  } catch (e) {}
}

function readSubtitleTranscript(tempDir, videoId) {
  try {
    const files = fs.readdirSync(tempDir).filter(f => f.startsWith(videoId) && (f.endsWith('.vtt') || f.endsWith('.srt')));
    if (files.length === 0) return null;

    const subFile = path.join(tempDir, files[0]);
    let content = fs.readFileSync(subFile, 'utf-8');

    content = content
      .replace(/^WEBVTT.*$/gm, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+.*$/gm, '')
      .replace(/\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+.*$/gm, '')
      .replace(/^\s*\d+\s*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return content ? content.substring(0, MAX_TRANSCRIPT_CHARS) : null;
  } catch (subErr) {
    return null;
  }
}

function findDownloadedAudioFile(tempDir, audioPrefix) {
  try {
    const files = fs.readdirSync(tempDir)
      .filter(f => f.startsWith(path.basename(audioPrefix)) && AUDIO_EXTENSIONS.includes(path.extname(f).toLowerCase()));
    return files.length ? path.join(tempDir, files[0]) : null;
  } catch (e) {
    return null;
  }
}

async function downloadAudioForTranscription(url, ytdlp, tempDir, videoId) {
  const audioPrefix = path.join(tempDir, `${videoId}_audio`);
  const commonArgs = `${quoteShell(url)} --no-playlist --max-filesize ${AUDIO_MAX_FILESIZE} -o ${quoteShell(`${audioPrefix}.%(ext)s`)} --no-warnings`;
  const primaryCmd = `${ytdlp} ${commonArgs} -f "bestaudio[filesize<${AUDIO_MAX_FILESIZE}]/bestaudio/best[height<=360]"`;

  try {
    await execPromise(primaryCmd, { timeout: AUDIO_DOWNLOAD_TIMEOUT, maxBuffer: 20 * 1024 * 1024 });
  } catch (err) {
    const fallbackCmd = `${ytdlp} ${commonArgs} -f bestaudio/best`;
    await execPromise(fallbackCmd, { timeout: AUDIO_DOWNLOAD_TIMEOUT, maxBuffer: 20 * 1024 * 1024 });
  }

  return findDownloadedAudioFile(tempDir, audioPrefix);
}

function getMimeType(audioPath) {
  switch (path.extname(audioPath).toLowerCase()) {
    case '.m4a':
    case '.mp4':
      return 'audio/mp4';
    case '.mp3':
    case '.mpeg':
    case '.mpga':
      return 'audio/mpeg';
    case '.webm':
      return 'audio/webm';
    case '.wav':
      return 'audio/wav';
    default:
      return 'application/octet-stream';
  }
}

async function transcribeAudioWithGroq(audioPath) {
  if (!config.GROQ_API_KEY) return null;
  if (typeof fetch !== 'function' || typeof FormData !== 'function' || typeof Blob !== 'function') {
    throw new Error('Audio transcription requires Node 18+ fetch/FormData/Blob support');
  }

  const audio = fs.readFileSync(audioPath);
  const form = new FormData();
  form.append('file', new Blob([audio], { type: getMimeType(audioPath) }), path.basename(audioPath));
  form.append('model', 'whisper-large-v3');
  form.append('response_format', 'json');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.GROQ_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq transcription failed: ${res.status} ${body}`.trim());
  }

  const data = await res.json();
  const text = data.text?.trim();
  return text ? text.substring(0, MAX_TRANSCRIPT_CHARS) : null;
}

// Try multiple ways to find yt-dlp
async function findYtDlp() {
  const attempts = [
    'python -m yt_dlp',
    'python3 -m yt_dlp',
    'yt-dlp',
    'yt-dlp.exe'
  ];
  for (const cmd of attempts) {
    try {
      await execPromise(`${cmd} --version`, { timeout: 5000 });
      return cmd;
    } catch (e) {
      continue;
    }
  }
  throw new Error('yt-dlp not found. Please install: pip install yt-dlp');
}

async function extractAll(url) {
  const ytdlp = await findYtDlp();
  const tempDir = os.tmpdir();
  const videoId = `cf_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const outPath = path.join(tempDir, videoId);

  let output = '';
  let jsonData = null;

  try {
    try {
      const cmd = `${ytdlp} ${quoteShell(url)} --dump-json --write-subs --write-auto-subs --sub-langs en,-live_chat --skip-download -o ${quoteShell(outPath)} --no-warnings`;
      output = await execPromise(cmd);
    } catch (err) {
      // Retry without subtitles
      try {
        const cmd2 = `${ytdlp} ${quoteShell(url)} --dump-json --skip-download -o ${quoteShell(outPath)} --no-warnings`;
        output = await execPromise(cmd2);
      } catch (err2) {
        throw new Error('Failed to extract video: ' + (err2.message || err.message));
      }
    }

    // Parse JSON from output (yt-dlp dumps JSON as last non-empty line)
    const lines = output.trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed && (parsed.title || parsed.id)) {
          jsonData = parsed;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!jsonData) {
      throw new Error('Could not parse video metadata');
    }

    const title = jsonData.title || jsonData.fulltitle || '';
    const uploader = jsonData.uploader || jsonData.channel || jsonData.creator || jsonData.uploader_id || '';
    const description = jsonData.description || '';

    let transcript = readSubtitleTranscript(tempDir, videoId);
    if (!transcript && config.GROQ_API_KEY) {
      try {
        const audioPath = await downloadAudioForTranscription(url, ytdlp, tempDir, videoId);
        if (audioPath) transcript = await transcribeAudioWithGroq(audioPath);
      } catch (audioErr) {
        console.warn('Groq transcription fallback failed:', audioErr.message || audioErr);
      }
    }

    const thumbnail = jsonData.thumbnail
      || jsonData.thumbnails?.find(t => t.preference === 0)?.url
      || jsonData.thumbnails?.[0]?.url
      || '';

    return {
      title,
      description,
      duration: jsonData.duration || '',
      uploader,
      thumbnail,
      transcript
    };
  } finally {
    cleanupTempFiles(tempDir, videoId);
  }
}

module.exports = { extractAll };