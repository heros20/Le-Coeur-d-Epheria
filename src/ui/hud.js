// src/ui/hud.js
import { setVirtualKey } from "../input.js";

function escapeHtml(text = "") {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function createHUD() {
  const hud = document.getElementById("hud");
  hud.innerHTML = "";

  const makeCard = (cls) => {
    const el = document.createElement("div");
    el.className = `hud-card ${cls}`;
    hud.appendChild(el);
    return el;
  };

  const vitals = makeCard("hud-vitals");
  const inventory = makeCard("hud-inventory");
  const helper = makeCard("hud-helper");

  const bar = (percent, cls) => {
    const p = Math.max(0, Math.min(100, percent));
    return `<div class="vital-bar ${cls}">
      <div class="fill" style="width:${p}%"></div>
    </div>`;
  };

  function update({
    hp = 0,
    hpMax = 100,
    mode = "LIGHT",
    torch = true,
    stamina = 0,
    staminaMax = 100,
    inventory: items = [],
    capacity = 3,
    status = "",
    dashCooldown = 0,
    dashCooldownMax = 1,
    combo = 0,
    charge = 0,
  }) {
    const hpPct = (hp / Math.max(1, hpMax)) * 100;
    const stamPct = (stamina / Math.max(1, staminaMax)) * 100;
    const dashReady = dashCooldown <= 0.05;
    const dashText = dashReady
      ? "Dash: ready"
      : `Dash: ${dashCooldown.toFixed(1)}s`;

    vitals.innerHTML = `
      <div class="vital-row">
        <span class="label">Health</span>
        <span class="value">${Math.round(hp)}/${Math.round(hpMax)}</span>
      </div>
      ${bar(hpPct, "health")}
      <div class="vital-row">
        <span class="label">Stamina</span>
        <span class="value">${Math.round(stamina)}/${Math.round(staminaMax)}</span>
      </div>
      ${bar(stamPct, "stamina")}
      <div class="chips">
        <span class="chip">${mode === "LIGHT" ? "Reality: Light" : "Reality: Shadow"}</span>
        <span class="chip">Torch: ${torch ? "On" : "Off"}</span>
        <span class="chip">${dashText}</span>
        ${combo > 0 ? '<span class="chip chip-alert">Combo window</span>' : ""}
      </div>
    `;

    const slots = [];
    for (let i = 0; i < capacity; i++) {
      const item = items[i];
      if (item) {
        const icon = item.iconSrc
          ? `<img src="${escapeHtml(item.iconSrc)}" alt="" />`
          : escapeHtml(item.icon ?? "⋄");
        slots.push(
          `<div class="inventory-slot filled">
            <div class="icon">${icon}</div>
            <div class="item-name">${escapeHtml(item.name ?? item.id)}</div>
          </div>`
        );
      } else {
        slots.push(`<div class="inventory-slot"><span>Empty</span></div>`);
      }
    }

    const indicators = [];
    if (charge > 0.01) indicators.push(`Charge ${Math.round(charge * 100)}%`);
    if (combo > 0.01) indicators.push("Combo ready");
    const statusText = status || indicators.join(" • ") || "All clear";

    inventory.innerHTML = `
      <div class="inventory-title">Inventory</div>
      <div class="inventory-grid">${slots.join("")}</div>
      <div class="status-line">${escapeHtml(statusText)}</div>
    `;

    helper.innerHTML = `
      <div class="helper-title">Controls</div>
      <div class="helper-grid">
        <span>Mouse move: Travel</span>
        <span>Left click: Attack</span>
        <span>Shift: Sprint</span>
        <span>Space: Dash</span>
        <span>E: Interact</span>
        <span>E (2): Potion</span>
        <span>R: Reality shift</span>
        <span>T: Torch</span>
        <span>Mobile: use on-screen joystick & buttons</span>
      </div>
    `;
  }

  // branche les contrôles mobiles si présents
  setupMobileControls();
// Ajoute un effet visuel sur tous les boutons mobiles
function addButtonFeedback(el) {
  if (!el) return;

  const down = (e) => {
    e.preventDefault();
    el.classList.add("btn-active");
  };

  const up = (e) => {
    e.preventDefault();
    el.classList.remove("btn-active");
  };

  el.addEventListener("mousedown", down);
  el.addEventListener("mouseup", up);
  el.addEventListener("mouseleave", up);

  el.addEventListener("touchstart", down, { passive: false });
  el.addEventListener("touchend", up, { passive: false });
  el.addEventListener("touchcancel", up, { passive: false });
}

// On appelle ce feedback pour chaque bouton mobile :
(function setupButtonVisualDebug() {
  const ids = [
    "btn-up", "btn-down", "btn-left", "btn-right",
    "btn-attack", "btn-dash", "btn-interact"
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    addButtonFeedback(el);
  });
})();
  return { update };
}

// ------------------------
// Contrôles mobiles
// ------------------------

function addHoldListeners(el, key) {
  if (!el) return;

  const start = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setVirtualKey(key, true); // rester appuyé tant que le doigt est dessus
  };

  const end = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setVirtualKey(key, false);
  };

  // Souris
  el.addEventListener("mousedown", start);
  el.addEventListener("mouseup", end);
  el.addEventListener("mouseleave", end);

  // Touch
  el.addEventListener("touchstart", start, { passive: false });
  el.addEventListener("touchend", end, { passive: false });
  el.addEventListener("touchcancel", end, { passive: false });

  // Limite le comportement par défaut (sélection texte, scroll chelou)
  el.style.userSelect = "none";
  el.style.webkitUserSelect = "none";
}

function addTapListener(el, key) {
  if (!el) return;

  const tap = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // "once" = press ponctuel, consommé par consume()
    setVirtualKey(key, true, true);
  };

  // Souris + clic classique
  el.addEventListener("click", tap);
  el.addEventListener("mousedown", tap);

  // Touch
  el.addEventListener("touchstart", tap, { passive: false });

  el.style.userSelect = "none";
  el.style.webkitUserSelect = "none";
}

function setupMobileControls() {
  const root = document.getElementById("mobile-controls");
  if (!root) return;

  // bloque les gestes par défaut dans la zone
  root.style.touchAction = "none";
  root.style.userSelect = "none";
  root.style.webkitUserSelect = "none";

  const btnUp = document.getElementById("btn-up");
  const btnDown = document.getElementById("btn-down");
  const btnLeft = document.getElementById("btn-left");
  const btnRight = document.getElementById("btn-right");

  const btnDash = document.getElementById("btn-dash");
  const btnAttack = document.getElementById("btn-attack");
  const btnInteract = document.getElementById("btn-interact");

  // Déplacements : ZQSD (à adapter si ton Player lit autre chose)
  addHoldListeners(btnUp, "z");
  addHoldListeners(btnDown, "s");
  addHoldListeners(btnLeft, "q");
  addHoldListeners(btnRight, "d");

  // Dash / attaque / interaction
  // Dash et Attaque : barre espace " "
  addTapListener(btnDash, " ");
  addTapListener(btnAttack, " ");

  // Interagir = "e"
  addTapListener(btnInteract, "e");
}
