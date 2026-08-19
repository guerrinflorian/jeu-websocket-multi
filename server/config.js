// Toutes les constantes serveur. KERMESSE_TURBO accélère l'horloge réelle
// (les jeux voient toujours dt = 50 ms) : utilisé par le harnais de test.

const TURBO = Math.max(1, Number(process.env.KERMESSE_TURBO) || 1);

export const CFG = {
  PORT: Number(process.env.PORT) || 3000,
  HOST: '0.0.0.0',
  PROD: process.env.NODE_ENV === 'production',

  MAX_CONNS: 400,
  MAX_ROOMS: 100,
  MAX_ROOM_SIZE: 8,
  MAX_NAME: 16,

  TICK_SIM_MS: 50,                     // dt vu par les jeux (20 Hz)
  TICK_REAL_MS: Math.max(5, 50 / TURBO),
  TURBO,

  COUNTDOWN_S: 3,
  GRACE_MS: 60_000 / TURBO,            // reprise après déconnexion
  AFK_TICKS: 400,                      // 20 s sans input → autopilote
  EMPTY_ROOM_TTL_MS: 120_000 / TURBO,  // room sans humain connecté
  IDLE_ROOM_TTL_MS: 1_800_000,         // room lobby inactive 30 min
  RESULTS_AUTO_LOBBY_MS: 60_000 / TURBO,
  SWEEP_MS: 5_000 / TURBO,

  HEARTBEAT_MS: 25_000,
  MAX_PAYLOAD: 8 * 1024,

  // Rate limiting par connexion (token buckets).
  RATE_INPUT_PER_S: 45,
  RATE_MSG_PER_S: 12,
  RATE_BURST: 25,
  RATE_STRIKES: 5,                     // dépassements consécutifs avant kick
};
