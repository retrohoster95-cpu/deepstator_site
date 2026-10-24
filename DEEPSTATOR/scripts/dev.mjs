// Development: build once, serve dist/, rebuild when content, styles, code or config change.
// Usage: npm run dev   (then open http://localhost:4321 and refresh after saving)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { start } from './serve.mjs';

const watchDirs = ['content', 'src', 'public', 'site.config.ts'];
let running = null;
let queued = false;

function build() {
  if (running) { queued = true; return; }
  running = spawn(process.execPath, ['--import', 'tsx', 'src/build.tsx'], { stdio: 'inherit' });
  running.on('exit', () => {
    running = null;
    if (queued) { queued = false; build(); }
  });
}

build();
start();
let t;
for (const d of watchDirs) {
  if (!fs.existsSync(d)) continue;
  fs.watch(d, { recursive: true }, () => { clearTimeout(t); t = setTimeout(build, 150); });
}
console.log('watching content/, src/, public/, site.config.ts …');
