// src/input_mobile.js
// Version "safe" : ne casse rien, sert juste de couche d'abstraction
// si un ancien code importe encore ce module.

// État brut des contrôles tactiles (optionnel)
export const touchControlState = {
  moveVector: null,
  attack: { held: false, justPressed: false },
  dashQueued: false,
};

// Détection simple : est-ce qu'on est sur un device tactile ?
export function detectTouchDevice() {
  if (typeof window === "undefined") return false;
  const nav = typeof navigator !== "undefined" ? navigator : {};
  const ua = (nav.userAgent || nav.vendor || "").toLowerCase();
  const coarse = typeof window.matchMedia === "function"
    ? window.matchMedia("(pointer: coarse)").matches
    : false;
  const maxTouch = nav.maxTouchPoints || nav.msMaxTouchPoints || 0;
  return (
    coarse ||
    maxTouch > 1 ||
    /android|iphone|ipad|ipod|mobile|tablet/.test(ua)
  );
}

// Initialisation des contrôles mobiles.
// Ici on ne fait *rien*, car la vraie logique est dans main.js.
// Mais si un ancien fichier appelle setupTouchControls(), ça ne plantera pas.
export function setupTouchControls() {
  // No-op volontaire : la vraie logique est dans main.js
}

// Retourne le vecteur de déplacement mobile (ici : aucun par défaut)
export function getTouchMoveVector() {
  return touchControlState.moveVector;
}

// Consommation d’un "tap" d’attaque mobile (par défaut : jamais déclenché)
export function consumeMobileAttackPress() {
  if (!touchControlState.attack.justPressed) return false;
  touchControlState.attack.justPressed = false;
  return true;
}

// Indique si l’attaque est maintenue au doigt (jamais, par défaut)
export function mobileAttackHeld() {
  return touchControlState.attack.held;
}

// Consommation d’un "tap" de dash mobile (jamais, par défaut)
export function consumeMobileDashPress() {
  if (!touchControlState.dashQueued) return false;
  touchControlState.dashQueued = false;
  return true;
}
