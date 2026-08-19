// Smoke test navigateur (Playwright, hors `npm test` — lancé à la main :
// `node test/browser.smoke.js`). Charge l'app, crée une room, ajoute des
// forains, lance SERPENTIN, vérifie zéro erreur console, capture des écrans.

import { chromium, devices } from 'playwright';
import { startServer, sleep } from './util.js';
import path from 'node:path';

const OUT = process.env.SMOKE_OUT || path.join(process.cwd(), 'test', 'screens');
const srv = await startServer({ turbo: 1, port: 3777 });
const errors = [];

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'fr-FR' });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(`http://127.0.0.1:${srv.port}/`);
  await page.waitForSelector('#btn-create');
  await page.fill('#name-input', 'Testeur');
  await page.screenshot({ path: path.join(OUT, '1-home.png') });

  await page.click('#btn-create');
  await page.waitForSelector('.ticket-code', { timeout: 5000 });
  const code = await page.textContent('.ticket-code');
  console.log('room:', code.trim());
  for (let i = 0; i < 3; i++) { await page.click('#btn-addbot'); await sleep(150); }
  await page.screenshot({ path: path.join(OUT, '2-lobby.png') });

  // Un 2e joueur (desktop) rejoint par lien direct.
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'fr-FR' });
  const page2 = await ctx2.newPage();
  page2.on('console', (m) => { if (m.type() === 'error') errors.push(`p2 console: ${m.text()}`); });
  page2.on('pageerror', (e) => errors.push(`p2 pageerror: ${e.message}`));
  await page2.goto(`http://127.0.0.1:${srv.port}/`);
  await page2.fill('#name-input', 'Copain');
  await page2.fill('#code-input', code.trim());
  await page2.click('#btn-join');
  await page2.waitForSelector('#btn-ready', { timeout: 5000 });
  await page2.click('#btn-ready');
  await sleep(300);

  // Lancement.
  await page.click('#btn-start');
  await page.waitForSelector('body[data-screen="game"]', { timeout: 8000 });
  await sleep(4500); // countdown + jeu qui tourne
  await page.screenshot({ path: path.join(OUT, '3-game-mobile.png') });
  await page2.screenshot({ path: path.join(OUT, '3-game-desktop.png') });

  // Inputs tactiles/clavier pendant le jeu.
  await page2.keyboard.down('ArrowLeft');
  await sleep(600);
  await page2.keyboard.up('ArrowLeft');
  await page2.keyboard.press('Space');
  await sleep(2000);

  // Règles en jeu.
  await page.click('#hud-rules');
  await page.waitForSelector('.modal-rules', { timeout: 4000 });
  await page.screenshot({ path: path.join(OUT, '4-rules.png') });
  await page.click('.modal-close');
  await sleep(500);

  const benign = /favicon|fonts\.googleapis|net::ERR_INTERNET|Failed to load resource.*fonts/i;
  const real = errors.filter((e) => !benign.test(e));
  console.log(real.length ? `❌ ${real.length} erreur(s) :\n${real.join('\n')}` : '✅ zéro erreur console');
  process.exitCode = real.length ? 1 : 0;
} finally {
  await browser.close();
  await srv.stop();
}
