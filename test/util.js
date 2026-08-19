// Outils du harnais : assertions, lancement du vrai serveur en sous-process.

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

let passed = 0;
let failed = 0;

export function ok(cond, label) {
  if (cond) {
    passed++;
    process.stdout.write(`  ✓ ${label}\n`);
  } else {
    failed++;
    process.stdout.write(`  ✗ ${label}\n`);
  }
}

export function eq(a, b, label) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label} (${JSON.stringify(a)} == ${JSON.stringify(b)})`);
}

export function section(name) {
  process.stdout.write(`\n■ ${name}\n`);
}

export function summary() {
  process.stdout.write(`\n${passed} ✓  ${failed} ✗\n`);
  return failed === 0;
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Démarre le vrai serveur (sous-process) en mode turbo et attend /healthz.
export async function startServer({ turbo = 10, port = 3900 + Math.floor(Math.random() * 100) } = {}) {
  const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    env: { ...process.env, PORT: String(port), KERMESSE_TURBO: String(turbo) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const errors = [];
  child.stdout.on('data', (d) => {
    const s = d.toString();
    if (/erreur|crash|Exception/i.test(s)) errors.push(s.trim());
  });
  child.stderr.on('data', (d) => errors.push(d.toString().trim()));

  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (res.ok) {
        return {
          port,
          url: `ws://127.0.0.1:${port}`,
          httpUrl: `http://127.0.0.1:${port}`,
          errors,
          stop: () => new Promise((r) => { child.on('exit', r); child.kill(); }),
        };
      }
    } catch { /* pas encore prêt */ }
    await sleep(150);
  }
  child.kill();
  throw new Error(`serveur injoignable sur le port ${port}\n${errors.join('\n')}`);
}
