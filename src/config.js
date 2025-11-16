export const CONFIG = {
  canvas: { w: 1024, h: 768, scale: 1 },
  speed: 140,
  torchRadius: 180,
  shadowPenalty: 0.25,

  // cellule de collision plus large pour lisser la texture brique
  collisionCell: 6,

  kael: {
    hp: 320,
    speed: 120,
    preferredDistance: 140,
    attackRange: 180,
    attackCooldown: 2.8,
    attackWindup: 0.85,
    dashDuration: 0.4,
    dashSpeed: 360,
    dashDamage: 42,
    knockback: 32,
    knockbackResistance: 0.35,
    orbCooldown: 7.5,
    orbCount: 4,
    orbLifetime: 4,
    orbOrbitRadius: 110,
    orbSpinSpeed: 2.4,
    orbLaunchSpeed: 240,
    orbDamage: 28,
    fissureCooldown: 9,
    fissureWindup: 1,
    fissureLength: 320,
    fissureSpeed: 320,
    fissureWidth: 42,
    fissureDamage: 36,
  },

  // Sprint / endurance
  staminaMax: 100,
  sprintMult: 1.8,
  staminaDrain: 28,
  staminaRegen: 18,
};
