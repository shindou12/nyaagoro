// Records the story ending (final win → dialogue → ending cinematic) to MP4 with sound.
// Usage: node tools/record-ending.mjs <outdir>   (server must be running on :8080)
// Video: CDP screencast frames; audio: the game's own WebAudio output via MediaRecorder.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const out = path.resolve(process.argv[2] || 'recording');
const frameDir = path.join(out, 'frames');
fs.rmSync(frameDir, { recursive: true, force: true });
fs.mkdirSync(frameDir, { recursive: true });
const FFMPEG = execFileSync('python3', ['-c', 'import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())']).toString().trim();

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('[pageerror]', e.message));
await p.goto('http://localhost:8080/');
await p.evaluate(() => { localStorage.setItem('nyagoro.story', '9'); localStorage.setItem('nyagoro.name', 'チビ'); localStorage.setItem('nyagoro.cat', 'tama'); });
await p.reload();
await p.waitForTimeout(700); await p.keyboard.press('x'); await p.waitForTimeout(3800);
await p.click('[data-view="Button:story"]'); await p.waitForTimeout(500);
await p.click('.stage-card.next'); await p.waitForTimeout(800);
await p.keyboard.press('Escape'); await p.waitForTimeout(4200);           // skip pre-talk, let the VS screen pass
const st = () => p.evaluate(() => window.__nyagoro.mediator.state);

// ---- start capture
const cdp = await ctx.newCDPSession(p);
const frames = [];
cdp.on('Page.screencastFrame', async (f) => {
  const file = path.join(frameDir, String(frames.length).padStart(6, '0') + '.jpg');
  fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
  frames.push({ file, ts: f.metadata.timestamp });
  try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* closing */ }
});
const audioT0 = await p.evaluate(() => {
  const a = window.__nyagoro.audio;
  const dest = a.ctx.createMediaStreamDestination();
  a.comp.connect(dest);
  const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 160000 });
  const chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  rec.start(500);
  window.__rec = { rec, chunks };
  return Date.now() / 1000;
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });

// ---- the final win (the match itself is skipped for the recording)
await p.evaluate(() => { const m = window.__nyagoro.mediator; m.session.stopMatch(); m.storyResult({ winner: 0 }); });
// read the dialogue at a comfortable pace
for (let i = 0; i < 200 && (await st()) === 'dialogue'; i++) {
  await p.waitForTimeout(400);
  const typing = await p.evaluate(() => window.__nyagoro.root.dialogue.isTyping());
  if (!typing) { await p.waitForTimeout(1100); await p.keyboard.press('Space'); }
}
console.log('credits started:', await st());
for (let i = 0; i < 200 && (await st()) === 'credits'; i++) await p.waitForTimeout(500);
await p.waitForTimeout(1500);

// ---- stop & collect
await cdp.send('Page.stopScreencast');
const audioB64 = await p.evaluate(() => new Promise((res) => {
  const { rec, chunks } = window.__rec;
  rec.onstop = async () => {
    const buf = await new Blob(chunks, { type: 'audio/webm' }).arrayBuffer();
    let s = ''; const u = new Uint8Array(buf);
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    res(btoa(s));
  };
  rec.stop();
}));
await b.close();
const audioFile = path.join(out, 'audio.webm');
fs.writeFileSync(audioFile, Buffer.from(audioB64, 'base64'));
console.log('frames:', frames.length, 'span', (frames.at(-1).ts - frames[0].ts).toFixed(1), 's');

// ---- assemble: variable frame durations via concat demuxer, audio aligned to the first frame
const list = frames.map((f, i) => `file '${f.file}'\nduration ${((frames[i + 1]?.ts ?? f.ts + 0.04) - f.ts).toFixed(4)}`).join('\n') + `\nfile '${frames.at(-1).file}'\n`;
const listFile = path.join(out, 'frames.txt');
fs.writeFileSync(listFile, list);
const offset = frames[0].ts - audioT0; // >0: audio started before the first frame
const mp4 = path.join(out, 'nyagoro-ending.mp4');
execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'concat', '-safe', '0', '-i', listFile,
  ...(offset >= 0 ? ['-ss', offset.toFixed(3)] : ['-itsoffset', (-offset).toFixed(3)]), '-i', audioFile,
  '-map', '0:v', '-map', '1:a', '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4]);
console.log('wrote', mp4, (fs.statSync(mp4).size / 1e6).toFixed(1), 'MB', 'audio offset', offset.toFixed(3));
