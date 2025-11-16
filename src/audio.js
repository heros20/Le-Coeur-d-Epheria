// Léger wrapper (prêt pour ajouter des SFX plus tard)
const cache = new Map();

export function play(name, opts = {}) {
  if (!cache.has(name)) return;
  const a = cache.get(name).cloneNode();
  a.volume = opts.v ?? 0.6;
  a.play().catch(() => {});
}

export async function preload() {
  // (optionnel) Ex: cache.set('switch', new Audio('./assets/switch.mp3'))
}
