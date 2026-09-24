// Builds a single-page version (dist/artifact.html) for hosts that only allow
// inline scripts: JS is bundled inline, font comes from Google Fonts, audio
// files are published alongside. Online rooms are disabled there.
import { build } from 'esbuild';
import fs from 'node:fs';
const js = await build({ entryPoints: ['js/main.js'], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020' });
const css = fs.readFileSync('css/style.css', 'utf8').replace(/@import url\([^)]*\);\n?/, '');
const html = `<title>にゃごろ！</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap">
<style>${css}</style>
<div id="app"></div>
<script>window.NYAGORO_OFFLINE = true;</script>
<script>${js.outputFiles[0].text.replace(/<\/script/g, '<\\/script')}</script>
`;
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/artifact.html', html);
console.log('dist/artifact.html', (html.length / 1024).toFixed(0) + 'KB');
