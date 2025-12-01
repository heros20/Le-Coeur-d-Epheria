// src/ui/hud.js
import { setVirtualKey } from "../input.js";
import { State } from "../state.js";

const SUPPORTS_POINTER_EVENTS = typeof window !== "undefined" && "PointerEvent" in window;
const POINTER_MOUSE_ID = "mouse";

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
  hud.classList.remove("hud-gold");
  hud.classList.remove("hud-gold");

  const makeCard = (cls) => {
    const el = document.createElement("div");
    el.className = `hud-card ${cls}`;
    hud.appendChild(el);
    return el;
  };

  const vitals = makeCard("hud-vitals");
  const inventory = makeCard("hud-inventory");
  const orbInventoryCard = makeCard("hud-orb-inventory");
  const helper = makeCard("hud-helper");
  const handleInventoryClick = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const rawTarget = event.target;
    const targetElement =
      rawTarget instanceof Element ? rawTarget : rawTarget?.parentElement ?? null;
    const slot = targetElement?.closest?.(".inventory-slot[data-inventory-index]");
    if (!slot) return;
    const idx = Number(slot.dataset.inventoryIndex);
    const inv = State.inventory;
    if (!inv) return;
    const list = typeof inv.list === "function" ? inv.list() : [];
    const item = list[idx];
    if (!item?.id) {
      State.pushStatus?.("Aucun objet disponible");
      return;
    }
    const used = inv.use?.(item.id, { player: State.player, notify: State.pushStatus });
    if (!used) {
      State.pushStatus?.(`${item.name ?? item.id} impossible à utiliser`);
    }
  };
  inventory.addEventListener("pointerdown", (event) => {
    handleInventoryClick(event);
    if (event.pointerType === "mouse") {
      event.preventDefault();
    }
  });
  const dashCooldownButton = document.getElementById("btn-dash");
  const dashCooldownText = dashCooldownButton?.querySelector(".cooldown-text");

  const bar = (percent, cls) => {
    const p = Math.max(0, Math.min(100, percent));
    return `<div class="vital-bar ${cls}">
      <div class="fill" style="width:${p}%"></div>
    </div>`;
  };

  function update({
    hp = 0,
    hpMax = 100,
    stamina = 0,
    staminaMax = 100,
    inventory: items = [],
    orbInventory: orbItems = [],
    orbCapacity = 0,
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
          `<div class="inventory-slot filled" data-inventory-index="${i}" data-item-id="${escapeHtml(
            item.id
          )}">
            <div class="icon">${icon}</div>
            <div class="item-name">${escapeHtml(item.name ?? item.id)}</div>
          </div>`
        );
      } else {
        slots.push(`<div class="inventory-slot"><span>Vide</span></div>`);
      }
    }

    const indicators = [];
    if (charge > 0.01) indicators.push(`Charge ${Math.round(charge * 100)}%`);
    if (combo > 0.01) indicators.push("Combo ready");
    const statusText = status || indicators.join(" • ") || "All clear";

    inventory.innerHTML = `
      <div class="inventory-title">Inventaire</div>
      <div class="inventory-grid">${slots.join("")}</div>
      <div class="status-line">${escapeHtml(statusText)}</div>
    `;

    const orbSlotsArr = [];
    const totalOrbSlots = Math.max(orbCapacity, orbItems.length);
    for (let i = 0; i < totalOrbSlots; i += 1) {
      const item = orbItems[i];
      if (item) {
        const icon = item.iconSrc
          ? `<img src="${escapeHtml(item.iconSrc)}" alt="" />`
          : escapeHtml(item.icon ?? "?");
        orbSlotsArr.push(
          `<div class="inventory-slot filled" data-orb-index="${i}" data-item-id="${escapeHtml(
            item.id ?? ""
          )}">
            <div class="icon">${icon}</div>
            <div class="item-name">${escapeHtml(item.name ?? item.id ?? "Objet")}</div>
          </div>`
        );
      } else {
        orbSlotsArr.push(`<div class="inventory-slot"><span>Vide</span></div>`);
      }
    }
    const orbStatus =
      orbItems.length > 0 ? `Objets d'orbe : ${orbItems.length}/${orbCapacity}` : "Aucun objet d'orbe";
    orbInventoryCard.innerHTML = `
      <div class="inventory-title">Clés</div>
      <div class="inventory-grid">${orbSlotsArr.join("")}</div>
      <div class="status-line">${escapeHtml(orbStatus)}</div>
    `;

    helper.innerHTML = `
      <div class="helper-title">Commandes</div>
      <div class="helper-grid helper-grid-rpg">
        <div class="helper-group">
          <div class="helper-group-label">Déplacement</div>
          <div class="helper-keys">
            <span class="key">Z</span>
            <span class="key">Q</span>
            <span class="key">S</span>
            <span class="key">D</span>
          </div>
          <div class="helper-desc">Se déplacer dans le labyrinthe</div>
        </div>

        <div class="helper-group">
          <div class="helper-group-label">Clavier</div>
          <div class="helper-keys">
            <span class="key">1</span>
            <span> - </span>
            <span class="key">K</span>
            <span class="helper-desc-inline">Attaquer</span>
          </div>
          <div class="helper-keys">
            <span class="key">5</span>
            <span> - </span>
            <span class="key">O</span>
            <span class="helper-desc-inline">Sprint</span>
          </div>
          <div class="helper-keys">
            <span class="key">3</span>
            <span> - </span>
            <span class="key">M</span>
            <span class="helper-desc-inline">Attaque \u00e0 distance</span>
          </div>
          <div class="helper-keys">
          <span class="key">2</span>
          <span> - </span>
            <span class="key">L</span>
            
            <span class="helper-desc-inline">Objet rapide</span>
          </div>
          
          <div class="helper-keys">
            <span class="key">Space</span>
            <span class="helper-desc-inline">Dash</span>
          </div>
        </div>

        <div class="helper-group">
          <div class="helper-group-label">Interaction</div>
          <div class="helper-keys">
            <span class="key">E</span>
            <span class="helper-desc-inline">Parler / Interagir</span>
          </div>
          <div class="helper-desc">NPC, leviers, orbes et autres mauvaises idées</div>
        </div>
      </div>
    `;


    if (dashCooldownButton) {
      const max = Math.max(0.0001, dashCooldownMax || 0.0001);
      const ratio = Math.min(1, Math.max(0, dashCooldown / max));
      dashCooldownButton.style.setProperty("--cooldown-fill", String(ratio));
      if (ratio > 0.01 && dashCooldown > 0.01) {
        dashCooldownButton.classList.add("on-cooldown");
        if (dashCooldownText) {
          const precision = dashCooldown >= 1 ? 1 : 2;
          dashCooldownText.textContent = dashCooldown.toFixed(precision);
        }
      } else {
        dashCooldownButton.classList.remove("on-cooldown");
        if (dashCooldownText) dashCooldownText.textContent = "";
      }
    }
  }

  setupMobileControls();

  return { update };
}

// ------------------------
// Contrôles mobiles + effet visuel
// ------------------------

const normalizeKeys = (keys) => (Array.isArray(keys) ? keys : [keys]);

function setKeys(keys, down) {
  normalizeKeys(keys).forEach((key) => setVirtualKey(key, down));
}

function bindHoldButton(el, keys) {
  if (!el) return;
  const activePointers = new Set();

  const press = () => {
    if (activePointers.size === 1) {
      setKeys(keys, true);
      el.classList.add("btn-active");
    }
  };

  const release = (id) => {
    if (activePointers.has(id)) activePointers.delete(id);
    if (activePointers.size === 0) {
      setKeys(keys, false);
      el.classList.remove("btn-active");
    }
  };

  const getPointerId = (id) => (Number.isFinite(id) ? id : POINTER_MOUSE_ID);

  if ("PointerEvent" in window) {
    el.addEventListener(
      "pointerdown",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = getPointerId(e.pointerId);
        if (!activePointers.has(id)) {
          activePointers.add(id);
          press();
        }
      },
      { passive: false }
    );
    el.addEventListener(
      "pointerenter",
      (e) => {
        if (!(e.buttons & 1)) return;
        e.preventDefault();
        e.stopPropagation();
        const id = getPointerId(e.pointerId);
        if (!activePointers.has(id)) {
          activePointers.add(id);
          press();
        }
      },
      { passive: false }
    );
    el.addEventListener(
      "pointerup",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        release(getPointerId(e.pointerId));
      },
      { passive: false }
    );
    el.addEventListener(
      "pointercancel",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        release(getPointerId(e.pointerId));
      },
      { passive: false }
    );
    el.addEventListener(
      "pointerleave",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        release(getPointerId(e.pointerId));
      },
      { passive: false }
    );
  } else {
    const down = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = typeof e.identifier === "number" ? e.identifier : MOUSE_ID;
      if (!activePointers.has(id)) {
        activePointers.add(id);
        press();
      }
    };
    const up = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = typeof e.identifier === "number" ? e.identifier : MOUSE_ID;
      release(id);
    };
    el.addEventListener("mousedown", down);
    el.addEventListener("mouseup", up);
    el.addEventListener("mouseleave", up);
    el.addEventListener("touchstart", down, { passive: false });
    el.addEventListener("touchend", up, { passive: false });
    el.addEventListener("touchcancel", up, { passive: false });
  }

  el.style.userSelect = "none";
  el.style.webkitUserSelect = "none";
  el.style.touchAction = "none";
}

function bindTapButton(el, key, onTap) {
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
    if (typeof onTap === "function") onTap();
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
  const baseOpts = {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
    buttons: 1,
    pointerId: 999,
    pointerType: "touch",
    width: 1,
    height: 1,
  };
  const hasPointer = typeof PointerEvent !== "undefined";
  const down = hasPointer ? new PointerEvent("pointerdown", baseOpts) : new MouseEvent("mousedown", baseOpts);
  const up = hasPointer ? new PointerEvent("pointerup", baseOpts) : new MouseEvent("mouseup", baseOpts);
  canvas.dispatchEvent(down);
  setTimeout(() => {
    canvas.dispatchEvent(up);
    canvas.dispatchEvent(new MouseEvent("click", baseOpts));
  }, 60);
}

function bindAttackButton(el) {
  if (!el) return;
  const trigger = (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.classList.add("btn-active");
    simulateCanvasAttack();
    const touchControls = State.touchControls;
    if (touchControls) {
      touchControls.attack.justPressed = true;
      touchControls.attack.held = true;
    }
    setTimeout(() => {
      el.classList.remove("btn-active");
    }, 120);
  };
  if ("PointerEvent" in window) {
    el.addEventListener("pointerdown", trigger);
    el.addEventListener("pointerup", () => {
      const touchControls = State.touchControls;
      if (touchControls) touchControls.attack.held = false;
    });
    el.addEventListener("pointercancel", () => {
      const touchControls = State.touchControls;
      if (touchControls) touchControls.attack.held = false;
    });
  } else {
    el.addEventListener("touchstart", trigger, { passive: false });
    el.addEventListener("mousedown", trigger);
    const release = () => {
      const touchControls = State.touchControls;
      if (touchControls) touchControls.attack.held = false;
    };
    el.addEventListener("touchend", release);
    el.addEventListener("touchcancel", release);
    el.addEventListener("mouseup", release);
    el.addEventListener("mouseleave", release);
  }
  el.style.userSelect = "none";
  el.style.webkitUserSelect = "none";
}

function bindDirectionalPad(container, entries) {
  if (!container) return;
  const pointerAssignments = new Map();
  const entryList = entries
    .filter((entry) => entry?.el)
    .map((entry) => ({
      ...entry,
      keys: normalizeKeys(entry.keys),
      activeCount: 0,
    }));

  const getPointerId = (id) => (Number.isFinite(id) ? id : POINTER_MOUSE_ID);
  const getEntryFromTarget = (target) =>
    entryList.find((entry) => entry.el === target || entry.el.contains(target));

  const getEntryFromPoint = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    return getEntryFromTarget(el);
  };

  const activate = (entry) => {
    if (!entry) return;
    entry.activeCount += 1;
    if (entry.activeCount === 1) {
      setKeys(entry.keys, true);
      entry.el.classList.add("btn-active");
    }
  };

  const deactivate = (entry) => {
    if (!entry) return;
    entry.activeCount = Math.max(0, entry.activeCount - 1);
    if (entry.activeCount === 0) {
      setKeys(entry.keys, false);
      entry.el.classList.remove("btn-active");
    }
  };

  const assignPointer = (pointerId, entry) => {
    if (!entry) return;
    const current = pointerAssignments.get(pointerId);
    if (current === entry) return;
    if (current) deactivate(current);
    pointerAssignments.set(pointerId, entry);
    activate(entry);
  };

  const releasePointer = (pointerId) => {
    const current = pointerAssignments.get(pointerId);
    if (!current) return;
    pointerAssignments.delete(pointerId);
    deactivate(current);
  };

  const handlePointerDown = (entry) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    assignPointer(getPointerId(e.pointerId), entry);
  };

  const handlePointerEnter = (entry) => (e) => {
    if (!(e.buttons & 1)) return;
    e.preventDefault();
    e.stopPropagation();
    assignPointer(getPointerId(e.pointerId), entry);
  };

  const handleLocalPointerMove = (e) => {
    if (!(e.buttons & 1)) return;
    const id = getPointerId(e.pointerId);
    const entry = getEntryFromTarget(e.target);
    if (entry) assignPointer(id, entry);
    else releasePointer(id);
  };

  const handleGlobalPointerMove = (e) => {
    const id = getPointerId(e.pointerId);
    if (!pointerAssignments.has(id)) return;
    if (!(e.buttons & 1)) {
      releasePointer(id);
      return;
    }
    const entry = getEntryFromPoint(e.clientX, e.clientY);
    if (entry) assignPointer(id, entry);
    else releasePointer(id);
  };

  const releaseFromEvent = (e) => {
    releasePointer(getPointerId(e.pointerId));
  };

  entryList.forEach((entry) => {
    entry.el.style.touchAction = "none";
    entry.el.style.userSelect = "none";
    entry.el.style.webkitUserSelect = "none";
    entry.el.addEventListener("pointerdown", handlePointerDown(entry), { passive: false });
    entry.el.addEventListener("pointerenter", handlePointerEnter(entry), { passive: false });
  });

  container.addEventListener("pointermove", handleLocalPointerMove, { passive: false });
  container.addEventListener("pointerleave", releaseFromEvent, { passive: false });
  window.addEventListener("pointermove", handleGlobalPointerMove, { passive: false });
  window.addEventListener("pointerup", releaseFromEvent, { passive: false });
  window.addEventListener("pointercancel", releaseFromEvent, { passive: false });
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
  const btnSprint = document.getElementById("btn-sprint");

  // Déplacements : ZQSD
  const dpadEntries = [
    { el: btnUp, keys: ["z", "ArrowUp"] },
    { el: btnDown, keys: ["s", "ArrowDown"] },
    { el: btnLeft, keys: ["q", "ArrowLeft"] },
    { el: btnRight, keys: ["d", "ArrowRight"] },
  ];

  if (SUPPORTS_POINTER_EVENTS) {
    bindDirectionalPad(root.querySelector(".touch-dpad"), dpadEntries);
  } else {
    dpadEntries.forEach((entry) => bindHoldButton(entry.el, entry.keys));
  }

  // Dash / attaque / interagir
  bindTapButton(btnDash, " ", () => {
    const touchControls = State.touchControls;
    if (touchControls) touchControls.dashQueued = true;
  });
  bindAttackButton(btnAttack);
  bindTapButton(btnInteract, "e", () => {
    if (State.dialogue?.isOpen?.()) {
      State.dialogue.next?.();
    }
  });
  bindHoldButton(btnSprint, ["2"]);
}
