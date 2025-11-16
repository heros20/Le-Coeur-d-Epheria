export const State = {
  started: false,
  heroSrc: null,
  mode: "LIGHT",            // LIGHT | SHADOW
  time: 0,
  dt: 0,
  last: 0,

  player: null,
  kael: null,
  boss: null,
  bossCheckpoint: null,
  bossRetryShown: false,
  paused: false,
  princess: { x: 512, y: 240, freed: false },
  map: null,
  pointer: { x: 0, y: 0 },
  dialogue: null,
  inventory: null,
  flags: {
    torchOn: true,
    foundShrine: 0,
    betrayalHappened: false,
    kaelDefeated: false,
    visited: new Set(),
  }
};
