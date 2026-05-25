const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function execPromise(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024, timeout: 60000, ...opts }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout + stderr);
    });
  });
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
  const videoId = 'cf_' + Date.now();
  const outPath = path.join(tempDir, videoId);

  let output = '';
  try {
    const cmd = `${ytdlp} "${url}" --dump-json --write-subs --write-auto-subs --sub-langs en,-live_chat --skip-download -o "${outPath}" --no-warnings`;
    output = await execPromise(cmd);
  } catch (err) {
    // Retry without subtitles
    try {
      const cmd2 = `${ytdlp} "${url}" --dump-json --skip-download -o "${outPath}" --no-warnings`;
      output = await execPromise(cmd2);
    } catch (err2) {
      throw new Error('Failed to extract video: ' + (err2.message || err.message));
    }
  }

  // Parse JSON from output (yt-dlp dumps JSON as last non-empty line)
  const lines = output.trim().split('\n');
  let jsonData = null;
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

  // Read subtitle file
  let transcript = null;
  try {
    const files = fs.readdirSync(tempDir).filter(f => f.startsWith(videoId) && (f.endsWith('.vtt') || f.endsWith('.srt')));
    if (files.length > 0) {
      const subFile = path.join(tempDir, files[0]);
      let content = fs.readFileSync(subFile, 'utf-8');
      try { fs.unlinkSync(subFile); } catch (e) {}

      content = content
        .replace(/<[^>]+>/g, '')
        .replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+.*/g, '')
        .replace(/^\s*\d+\s*$/gm, '')
        .trim();

      transcript = content.substring(0, 6000);
    }
  } catch (subErr) {
    // ignore
  }

  // Cleanup any remaining temp files
  try {
    fs.readdirSync(tempDir)
      .filter(f => f.startsWith(videoId))
      .forEach(f => fs.unlinkSync(path.join(tempDir, f)));
  } catch (e) {}

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
}

module.exports = { extractAll };