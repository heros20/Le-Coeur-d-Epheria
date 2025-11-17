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

  setupMobileControls();

  return { update };
}

// ------------------------
// Contrôles mobiles + effet visuel
// ------------------------

function bindHoldButton(el, key) {
  if (!el) return;

  const down = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setVirtualKey(key, true);
    el.classList.add("btn-active");
  };

  const up = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setVirtualKey(key, false);
    el.classList.remove("btn-active");
  };

  // Souris
  el.addEventListener("mousedown", down);
  el.addEventListener("mouseup", up);
  el.addEventListener("mouseleave", up);

  // Touch
  el.addEventListener("touchstart", down, { passive: false });
  el.addEventListener("touchend", up, { passive: false });
  el.addEventListener("touchcancel", up, { passive: false });

  el.style.userSelect = "none";
  el.style.webkitUserSelect = "none";
}

function bindTapButton(el, key) {
  if (!el) return;

  const tap = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // petit flash visuel
    el.classList.add("btn-active");
    setTimeout(() => {
      el.classList.remove("btn-active");
    }, 100);

    // press ponctuel
    setVirtualKey(key, true, true);
  };

  // Souris
  el.addEventListener("click", tap);
  el.addEventListener("mousedown", tap);

  // Touch
  el.addEventListener("touchstart", tap, { passive: false });

  el.style.userSelect = "none";
  el.style.webkitUserSelect = "none";
}

function simulateCanvasAttack() {
  const canvas = document.getElementById("gameCanvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const opts = {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
  };
  const down = new MouseEvent("mousedown", opts);
  const up = new MouseEvent("mouseup", opts);
  canvas.dispatchEvent(down);
  setTimeout(() => {
    canvas.dispatchEvent(up);
    canvas.dispatchEvent(new MouseEvent("click", opts));
  }, 60);
}

function bindAttackButton(el) {
  if (!el) return;
  const trigger = (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.classList.add("btn-active");
    simulateCanvasAttack();
    setTimeout(() => el.classList.remove("btn-active"), 120);
  };
  if ("PointerEvent" in window) {
    el.addEventListener("pointerdown", trigger);
  } else {
    el.addEventListener("touchstart", trigger, { passive: false });
    el.addEventListener("mousedown", trigger);
  }
  el.style.userSelect = "none";
  el.style.webkitUserSelect = "none";
}

function setupMobileControls() {
  const root = document.getElementById("mobile-controls");
  if (!root) return;

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

  // Déplacements : ZQSD
  bindHoldButton(btnUp, "z");
  bindHoldButton(btnDown, "s");
  bindHoldButton(btnLeft, "q");
  bindHoldButton(btnRight, "d");

  // Dash / attaque / interagir
  bindTapButton(btnDash, " ");
  bindAttackButton(btnAttack);
  bindTapButton(btnInteract, "e");
}
