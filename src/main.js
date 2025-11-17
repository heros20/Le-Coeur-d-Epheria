// src/main.js
import { CONFIG } from "./config.js";
import { State } from "./state.js";
import { setupKeyboard, endFrame, consume } from "./input.js";
import { loadWorldMap } from "./world/map.js";
import { applyLighting } from "./world/lighting.js";
import { FogOfWar } from "./world/fog.js";
import { Player } from "./actors/player.js";
import { NPC } from "./actors/npc.js";
import { BossKael } from "./actors/boss_kael.js";
import { Inventory } from "./systems/inventory.js";
import { createDialogueLayer } from "./systems/dialogue.js";
import { showEndings, renderEpilogue } from "./systems/endings.js";
import { drawSprite, vignette, strokeText } from "./utils/draw.js";
import { createHUD } from "./ui/hud.js";

const $boot = document.getElementById("boot");
const $game = document.getElementById("game");
const $canvas = document.getElementById("gameCanvas");
const ctx = $canvas.getContext("2d");

// ==== HiDPI / Anti-flou ====
const DPR = window.devicePixelRatio || 1;
const BASE_WIDTH = 1024;
const BASE_HEIGHT = 768;

// taille "logique" du jeu
$canvas.style.width = "100%";
$canvas.style.height = "100%";

// taille réelle du buffer (plus grande sur écrans modernes)
$canvas.width = BASE_WIDTH * DPR;
$canvas.height = BASE_HEIGHT * DPR;

// on travaille en coordonnées "classiques" 1024x768
ctx.setTransform(DPR, 0, 0, DPR, 0, 0);


let heroSelection = null;
let mapImg;
let heroImg;
let princessImg;
let kaelImg;

// Détection basique : est-ce qu'on est sur un device tactile ?
const IS_TOUCH_DEVICE =
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0 ||
  navigator.msMaxTouchPoints > 0;

// --------------------------------------------------
// Auto-wire : marque les barres fixées en bas pour autohide
// --------------------------------------------------
function markBottomFixedOverlays() {
  const all = Array.from(document.querySelectorAll("body *"));
  const cand = all.filter((el) => {
    const s = getComputedStyle(el);
    if (s.position !== "fixed" || s.display === "none" || s.visibility === "hidden") {
      return false;
    }
    const r = el.getBoundingClientRect();
    // heuristique : barre large, >= 48px de haut, collée en bas
    return r.height >= 48 && r.width >= 240 && r.bottom >= window.innerHeight - 8;
  });
  cand.forEach((el) => el.setAttribute("data-autohide-bottom", ""));
}

// utilitaire de sync
function syncDialogueOverlay() {
  const isOpen = State.dialogue?.isOpen?.() === true;
  // cache/affiche toutes les barres marquées
  document.querySelectorAll("[data-autohide-bottom]").forEach((el) => {
    // comportement d'origine : "block" quand le dialogue est ouvert
    el.style.display = isOpen ? "block" : "none";
  });
}

// --------------------------------------------------
// Utilitaires pour les contrôles tactiles
// --------------------------------------------------

/**
 * Envoie un évènement clavier "virtuel" pour réutiliser tout le système d'input existant.
 * On pousse à la fois key + code pour maximiser les chances que input.js capte bien.
 */
function emitVirtualKey(type, key, code) {
  const ev = new KeyboardEvent(type, {
    key,
    code,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(ev);
}

/**
 * Ajoute / retire la classe visuelle .btn-active ...
 */
function setButtonActive(el, active) {
  if (!el) return;
  if (active) el.classList.add("btn-active");
  else el.classList.remove("btn-active");
}
/**
 * Simule un clic gauche de souris au centre du canvas
 * pour déclencher l'attaque comme sur PC.
 */
function simulateMouseClick() {
  if (!$canvas) return;
  const rect = $canvas.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  const down = new MouseEvent("mousedown", {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0, // bouton gauche
  });

  const up = new MouseEvent("mouseup", {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
  });

  $canvas.dispatchEvent(down);
  setTimeout(() => $canvas.dispatchEvent(up), 50);
}

/**
 * Bind d'un bouton "maintenu" (déplacement, dash si tu veux le garder en appui).
 * Quand on appuie : keydown ; quand on relâche : keyup.
 */
function bindHoldButton(id, bindings) {
  const btn = document.getElementById(id);
  if (!btn) return;

  const start = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setButtonActive(btn, true);
    bindings.forEach(({ key, code }) => emitVirtualKey("keydown", key, code));
  };

  const end = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setButtonActive(btn, false);
    bindings.forEach(({ key, code }) => emitVirtualKey("keyup", key, code));
  };

  ["pointerdown", "touchstart"].forEach((ev) => btn.addEventListener(ev, start));
  ["pointerup", "pointercancel", "touchend", "touchcancel", "mouseleave"].forEach((ev) =>
    btn.addEventListener(ev, end)
  );
}

/**
 * Bind d'un bouton "tap" (action instantanée : attaque, dash, interagir).
 * Ici on envoie un keydown puis un keyup rapide.
 */
function bindTapButton(id, bindings) {
  const btn = document.getElementById(id);
  if (!btn) return;

  const tap = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setButtonActive(btn, true);
    bindings.forEach(({ key, code }) => emitVirtualKey("keydown", key, code));
    // on relâche juste après, visuellement et côté input
    setTimeout(() => {
      setButtonActive(btn, false);
      bindings.forEach(({ key, code }) => emitVirtualKey("keyup", key, code));
    }, 60);
  };

  ["pointerdown", "touchstart"].forEach((ev) => btn.addEventListener(ev, tap));
}
/**
 * Joystick directionnel (bas gauche) :
 * - déplace le handle
 * - envoie Z / Q / S / D comme si on utilisait le clavier
 */
function setupJoystick() {
  const base = document.querySelector(".joystick-base");
  const handle = base?.querySelector(".joystick-handle");
  if (!base || !handle) return;

  let activeId = null;
  let last = { up: false, down: false, left: false, right: false };

  function sendDir(next) {
    const map = [
      { key: "z", code: "KeyZ", prop: "up" },
      { key: "s", code: "KeyS", prop: "down" },
      { key: "q", code: "KeyQ", prop: "left" },
      { key: "d", code: "KeyD", prop: "right" },
    ];

    map.forEach(({ key, code, prop }) => {
      const now = !!next[prop];
      const prev = !!last[prop];
      if (now && !prev) {
        emitVirtualKey("keydown", key, code);
      } else if (!now && prev) {
        emitVirtualKey("keyup", key, code);
      }
    });

    last = next;
  }

  function reset() {
    sendDir({ up: false, down: false, left: false, right: false });
    handle.style.transform = "translate(-50%, -50%)";
  }

  function onMove(clientX, clientY) {
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let dx = clientX - cx;
    let dy = clientY - cy;

    const maxRadius = rect.width / 2;
    const dist = Math.hypot(dx, dy);

    if (dist > maxRadius && dist > 0) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    // Visuel
    handle.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    const dead = maxRadius * 0.25;
    if (dist < dead) {
      sendDir({ up: false, down: false, left: false, right: false });
      return;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    const threshold = 0.35;

    const next = {
      up: ny < -threshold,
      down: ny > threshold,
      left: nx < -threshold,
      right: nx > threshold,
    };

    sendDir(next);
  }

  base.addEventListener("pointerdown", (e) => {
    if (!IS_TOUCH_DEVICE) return;
    e.preventDefault();
    e.stopPropagation();
    activeId = e.pointerId;
    onMove(e.clientX, e.clientY);
  });

  window.addEventListener("pointermove", (e) => {
    if (activeId == null || e.pointerId !== activeId) return;
    e.preventDefault();
    onMove(e.clientX, e.clientY);
  });

  const end = (e) => {
    if (activeId == null || (e && e.pointerId !== activeId)) return;
    activeId = null;
    reset();
  };

  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  window.addEventListener("pointerleave", end);
  window.addEventListener("resize", reset);
}

/**
 * Mise en place des contrôles mobiles : d-pad + actions.
 * Utilise les mêmes touches que sur PC : ZQSD / flèches, E, Space.
 */
const ATTACK_KEY = "k";
function setupTouchControls() {
  const mobileControls = document.getElementById("mobile-controls");
  if (!mobileControls) return;

  if (!IS_TOUCH_DEVICE) {
    // On désactive totalement sur desktop, on laisse le clavier/souris gérer
    mobileControls.style.display = "none";
    return;
  }

  document.body.classList.add("touch-mode");

  // === Joystick pour le déplacement (ZQSD virtuel) ===
  setupJoystick();

  // === Actions ===

  // Dash : uniquement ESPACE
  bindTapButton("btn-dash", [{ key: " ", code: "Space" }]);

  // Interagir : E
  bindTapButton("btn-interact", [{ key: "e", code: "KeyE" }]);

  // Sprint : touche Shift maintenue
  bindHoldButton("btn-sprint", [{ key: "Shift", code: "ShiftLeft" }]);

  // Attaque : on simule un clic gauche sur le canvas
  const btnAttack = document.getElementById("btn-attack");
  if (btnAttack) {
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setButtonActive(btnAttack, true);
      simulateMouseClick();
      setTimeout(() => setButtonActive(btnAttack, false), 80);
    };

    ["pointerdown", "touchstart"].forEach((ev) =>
      btnAttack.addEventListener(ev, handler)
    );
  }
}



// --------------------------------------------------
// Sélection du héros (écran de boot)
// --------------------------------------------------
function setupBoot() {
  const cards = [...document.querySelectorAll(".hero-card")];
  const startBtn = document.getElementById("startBtn");

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      cards.forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      heroSelection = card.getAttribute("data-src");
      startBtn.disabled = false;
    });
  });

  startBtn.addEventListener("click", startGame);
}

// --------------------------------------------------
// Chargement d'image
// --------------------------------------------------
async function loadImage(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

// --------------------------------------------------
// Lancement du jeu
// --------------------------------------------------
async function startGame() {
  // On masque l'écran de boot, on montre le jeu
  $boot.classList.add("hidden");
  $game.classList.remove("hidden");
  State.started = true;

  const existingDialogue = document.getElementById("dialogue");
  if (existingDialogue) existingDialogue.remove();

  markBottomFixedOverlays();

  // === Assets ===
  const [h1, h2, h3, P] = await Promise.all([
    loadImage("./assets/hero1.png"),
    loadImage("./assets/hero2.png"),
    loadImage("./assets/hero3.png"),
    loadImage("./assets/Princesse.png"),
  ]);

  princessImg = P;

  const byPath = {
    "./assets/hero1.png": h1,
    "./assets/hero2.png": h2,
    "./assets/hero3.png": h3,
  };

  heroImg = byPath[heroSelection];

  const kaelPool = Object.entries(byPath)
    .filter(([p]) => p !== heroSelection)
    .map(([, i]) => i);

  kaelImg = kaelPool[Math.floor(Math.random() * kaelPool.length)];

  // === Monde & collisions via Tiled ===
  const { image: mapImage, world, spawn } = await loadWorldMap();
  mapImg = mapImage;
  State.map = world;

  // === Camera adaptée à la taille de la map ============================
  function makeCameraFor(map) {
    const vw = Math.min($canvas.width, map.w);
    const vh = Math.min($canvas.height, map.h);
    return { x: 0, y: 0, w: vw, h: vh };
  }

  let camera = makeCameraFor(world);
  const shake = { power: 0 };
  State.camera = camera;
  State.shake = shake;

  // Helpers caméra
  function clamp01(v, min, max) {
    if (max < min) max = min; // empêche un max négatif
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }

  function clampCameraToPlayer(px, py) {
    const maxX = Math.max(0, world.w - camera.w);
    const maxY = Math.max(0, world.h - camera.h);
    camera.x = clamp01(px - camera.w / 2, 0, maxX);
    camera.y = clamp01(py - camera.h / 2, 0, maxY);
  }

  function resizeCamera() {
    const cx = State.player ? State.player.x : world.w / 2;
    const cy = State.player ? State.player.y : world.h / 2;
    camera = makeCameraFor(world);
    State.camera = camera;
    clampCameraToPlayer(cx, cy);
  }

  window.addEventListener("resize", resizeCamera);

  // === Spawn & POI ===
  const PLAYER_RADIUS = 8;
  // forcé tout au nord pour test et "snap" sur case ouverte
  const start = world.nearestOpen(spawn.x, 120, PLAYER_RADIUS);
  const kaelStart = world.nearestOpen(world.w * 0.86, world.h * 0.18, PLAYER_RADIUS);
  const princessPos = world.nearestOpen(world.w * 0.5, 140, PLAYER_RADIUS);
  const entrance = { x: start.x, y: start.y, r: 80 };

  // === Acteurs / systèmes ===
  State.player = new Player(heroImg, start.x, start.y);
  State.inventory = new Inventory();

  // Dialogue layer (avec sécurité : fermé au boot)
  State.dialogue = createDialogueLayer();
  State.dialogue.close();

  const hud = createHUD();

  State.kael = new NPC(kaelImg, kaelStart.x, kaelStart.y, "Kael");
  State.kael.follow = false;
  State.flags.kaelMet = false;

  State.princess = {
    x: princessPos.x,
    y: princessPos.y,
    follow: false,
    freed: false,
  };

  State.boss = new BossKael(kaelImg, kaelStart.x, kaelStart.y);

  State.fog = new FogOfWar(world.w, world.h);
  State.fog.reveal(State.player.x, State.player.y, 180);

  // Clavier + souris
  setupKeyboard();

  // Contrôles tactiles (console portable)
  setupTouchControls();

  // Boucle principale
  function frame(ts) {
    if (!State.last) State.last = ts;

    State.dt = Math.min(0.033, (ts - State.last) / 1000);
    State.time += State.dt;
    State.last = ts;

    update(State.dt);
    render();
    endFrame();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  // ===== Helpers gameplay =====
  const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

  function followWithCollisions(follower, target, worldMap, dist = 80, speed = 90) {
    const dx = target.x - follower.x;
    const dy = target.y - follower.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < dist) return;

    const mx = (dx / d) * speed * State.dt;
    const my = (dy / d) * speed * State.dt;

    const nx = follower.x + mx;
    const ny = follower.y + my;

    if (!worldMap.isBlocked(nx, follower.y)) follower.x = nx;
    if (!worldMap.isBlocked(follower.x, ny)) follower.y = ny;
  }

  // ===== Update =====
  function update(dt) {
    const { player, map } = State;

    if (consume("r")) {
      State.mode = State.mode === "LIGHT" ? "SHADOW" : "LIGHT";
    }

    // E pour interagir uniquement si aucun dialogue en cours
    if (!State.dialogue.isOpen() && consume("e")) {
      tryInteract();
    }

    // Mouvements joueur
    player.update(dt, map, State.mode);

    // NPC/Princess
    if (!State.flags.betrayalHappened && State.flags.kaelMet) {
      State.kael.update(dt, player, map);
    }

    if (State.princess.follow) {
      followWithCollisions(State.princess, player, map, 85, 90);
    }

    // Caméra & Fog
    clampCameraToPlayer(player.x, player.y);
    State.fog.reveal(player.x, player.y, 170);

    // Combat (après trahison)
    if (!State.dialogue.isOpen() && State.flags.betrayalHappened && !State.flags.kaelDefeated) {
      State.boss.update(dt, player, map);

      if (consume(" ")) {
        if (Math.hypot(player.x - State.boss.x, player.y - State.boss.y) < 60) {
          State.boss.hit(15);
        }
      }

      if (!State.boss.alive) {
        State.flags.kaelDefeated = true;
        State.dialogue.show([
          { speaker: "Mur", text: "Le jugement approche. Ramène Aelya a la porte." },
        ]);
      }
    }

    if (State.flags.kaelDefeated && State.princess.follow) {
      if (Math.hypot(player.x - entrance.x, player.y - entrance.y) < entrance.r) {
        showEndings({ onPick: (id) => renderEpilogue(id) });
      }
    }

    if (player.hp <= 0) {
      renderDeath();
    }

    // Mise à jour du dialogue
    State.dialogue.update({ dt });
    syncDialogueOverlay();

    // HUD
    hud.update({
      hp: player.hp,
      mode: State.mode,
      torch: player.torchOn,
      stamina: player.stamina,
      staminaMax: player.staminaMax,
    });
  }

  // ===== Interactions =====
  function tryInteract() {
    // Exemple minimal : parler à Kael si proche
    const dKael = Math.hypot(State.player.x - State.kael.x, State.player.y - State.kael.y);
    if (dKael < 70 && !State.flags.kaelMet) {
      State.flags.kaelMet = true;
      State.dialogue.show([
        { speaker: "Kael", text: "Tu es enfin la. Le labyrinthe se referme derriere nous." },
        { speaker: "Kael", text: "Garde l'oeil vif. Les murs observent." },
      ]);
      return;
    }

    // Exemple princesse (libération)
    const dP = Math.hypot(State.player.x - State.princess.x, State.player.y - State.princess.y);
    if (dP < 60 && !State.princess.follow) {
      State.princess.follow = true;
      State.dialogue.show([
        { speaker: "Aelya", text: "Lioran ! Je savais que tu viendrais." },
      ]);
      return;
    }
  }

  // ===== Render =====
  function render() {
    const { map, player, boss, princess } = State;
    const camera = State.camera;

    // coords entières pour éviter les "sauts"
    const camX = camera.x | 0;
    const camY = camera.y | 0;

    // world
    ctx.clearRect(0, 0, $canvas.width, $canvas.height);
    ctx.drawImage(mapImg, camX, camY, camera.w, camera.h, 0, 0, camera.w, camera.h);

    // actors in world space
    ctx.save();
    ctx.translate(-camX, -camY);

    drawSprite(ctx, princessImg, princess.x, princess.y, 52, 52);

    if (!State.flags.betrayalHappened) {
      State.kael.draw(ctx);
    }

    if (State.flags.betrayalHappened && !State.flags.kaelDefeated) {
      State.boss.draw(ctx);
      ctx.font = "16px ui-sans-serif";
      strokeText(ctx, `Kael - ${boss.hp} PV`, boss.x - 40, boss.y - 40);
    }

    State.player.draw(ctx);

    // Debug collisions si besoin :
    State.map.drawCollisionDebug(ctx, camX, camY, camera.w, camera.h);

    ctx.restore();

    // post-processing
    applyLighting(
      ctx,
      State.mode,
      State.player.x - camX,
      State.player.y - camY,
      State.player.torchOn
    );

    State.fog.drawTo(ctx, camX, camY, camera.w, camera.h);
    vignette(ctx, $canvas.width, $canvas.height, 0.35);

    // Dialogue au-dessus de tout
    State.dialogue.draw(ctx, $canvas);

    // Aide UIDs (rien d'affiché ici dans la version d'origine)
  }

  function renderDeath() {
    const el = document.getElementById("ending");
    el.classList.remove("hidden");
    el.innerHTML = `
      <div class="card">
        <h2>Le Labyrinthe t'a lu.</h2>
        <p>Ton dernier souvenir s'efface dans le sable des murs.</p>
        <div class="choices"><button onclick="location.reload()">Recommencer</button></div>
      </div>`;
  }
}

// Boot
setupBoot();
