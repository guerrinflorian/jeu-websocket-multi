// Harnais de test de la Kermesse : `npm test`.
// Lance le vrai serveur en sous-process (mode turbo ×10) et simule des
// clients WebSocket qui jouent réellement.

import { summary } from './util.js';

const suites = ['./core.test.js', './games.test.js'];

for (const s of suites) {
  try {
    const mod = await import(s);
    await mod.run();
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' && String(err).includes(s.replace('./', ''))) {
      continue; // suite pas encore écrite
    }
    console.error(`\nSuite ${s} : échec brutal\n`, err);
    process.exitCode = 1;
  }
}

process.exit(summary() && process.exitCode !== 1 ? 0 : 1);
