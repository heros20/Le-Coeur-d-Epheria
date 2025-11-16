export function createHUD() {
  const hud = document.getElementById('hud');
  const left = document.createElement('div');
  const right = document.createElement('div');
  left.className='hud-card'; right.className='hud-card';
  hud.appendChild(left); hud.appendChild(right);

  function bar(percent) {
    const p = Math.max(0, Math.min(100, percent));
    return `<div class="bar"><div class="fill" style="width:${p}%"></div></div>`;
  }

  function update({hp, mode, torch, stamina, staminaMax}) {
    const pct = (stamina / staminaMax) * 100;
    left.innerHTML = `
      <div><span class="stat">❤️ ${hp.toFixed(0)}</span>
      <span class="stat">🌗 ${mode==='LIGHT'?'Lumière':'Ombre'}</span>
      <span class="stat">🔦 ${torch?'On':'Off'}</span></div>
      <div class="row"><span class="stat">⚡ Endurance</span>${bar(pct)}</div>
    `;
    right.innerHTML = `<span class="stat">ZQSD/Flèches: Bouger • SHIFT: Sprint • R: Réalité • E: Interagir • T: Torche</span>`;
  }
  return { update };
}
