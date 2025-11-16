// src/main.js
import { CONFIG } from "./config.js";
import { State } from "./state.js";
import { setupKeyboard, setupPointer, endFrame, consume, consumePointer, Pointer } from "./input.js";
import { loadWorldMap } from "./world/map.js";
import { applyLighting } from "./world/lighting.js";
import { FogOfWar } from "./world/fog.js";
import { Player } from "./actors/player.js";
import { NPC } from "./actors/npc.js";
import { BossKael } from "./actors/boss_kael.js";
import { Inventory } from "./systems/inventory.js";
import { createDialogueLayer } from "./systems/dialogue.js";
import { showEndings, renderEpilogue } from "./systems/endings.js";
import { vignette, strokeText } from "./utils/draw.js";
import { createHUD } from "./ui/hud.js";

const $boot = document.getElementById("boot");
const $game = document.getElementById("game");
const $canvas = document.getElementById("gameCanvas");
const ctx = $canvas.getContext("2d");

let heroSelection = null;
let mapImg, heroImg;

const ACTOR_SCALE = 0.35;

const HERO_ANIMATION_SOURCES = {
  idle: ["./assets/hero/idle/Idle.png", "./assets/hero/idle/Idle_2.png"],
  walk_left: ["./assets/hero/walk/Walk_left.png"],
  walk_right: ["./assets/hero/walk/Walk_right.png"],
  run_left: ["./assets/hero/run/Run_left.png"],
  run_right: ["./assets/hero/run/Run_right.png"],
  attack: [
    "./assets/hero/attack/Attack_1.png",
    "./assets/hero/attack/Attack_2.png",
    "./assets/hero/attack/Attack_3.png",
  ],
  jump: ["./assets/hero/jump/Jump.png"],
  hurt: ["./assets/hero/hurt/Hurt.png"],
  dead: ["./assets/hero/dead/Dead.png"],
};

const KAEL_ANIMATION_SOURCES = {
  idle: ["./assets/Kael/idle/Idle.png", "./assets/Kael/idle/Idle_2.png"],
  walk_left: ["./assets/Kael/walk/Walk_left.png"],
  walk_right: ["./assets/Kael/walk/Walk_right.png"],
  run: ["./assets/Kael/run/Run.png"],
  jump: ["./assets/Kael/jump/Jump.png"],
  hurt: ["./assets/Kael/hurt/Hurt.png"],
  dead: ["./assets/Kael/dead/Dead.png"],
};

const PRINCESS_ANIMATION_SOURCES = {
  idle: ["./assets/Princesse/idle/Idle.png", "./assets/Princesse/idle/Idle_2.png"],
  walk_left: ["./assets/Princesse/walk/Walk_left.png"],
  walk_right: ["./assets/Princesse/walk/Walk_right.png"],
  run: ["./assets/Princesse/run/Run.png"],
  attack: [
    "./assets/Princesse/attack/Attack_1.png",
    "./assets/Princesse/attack/Attack_2.png",
    "./assets/Princesse/attack/Attack_3.png",
  ],
  jump: ["./assets/Princesse/jump/Jump.png"],
  hurt: ["./assets/Princesse/hurt/Hurt.png"],
  dead: ["./assets/Princesse/dead/Dead.png"],
};

const ANIMATION_DEFAULTS = {
  idle: { fps: 6, loop: true },
  walk: { fps: 10, loop: true },
  walk_left: { fps: 10, loop: true },
  walk_right: { fps: 10, loop: true },
  run: { fps: 14, loop: true },
  run_left: { fps: 14, loop: true },
  run_right: { fps: 14, loop: true },
  attack: { fps: 12, loop: false },
  jump: { fps: 10, loop: false },
  hurt: { fps: 10, loop: false },
  dead: { fps: 6, loop: false, sticky: true },
};

function setupBoot() {
  const cards = [...document.querySelectorAll(".hero-card")];
  const startBtn = document.getElementById("startBtn");
  if (cards.length === 0) return;
  heroSelection = cards[0].getAttribute("data-src");
  cards.forEach((card) => {
    if (card !== cards[0]) card.classList.add("hidden");
    card.classList.add("selected");
  });
  startBtn.disabled = false;
  startBtn.addEventListener("click", startGame);
}

async function loadImage(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

async function loadAnimations(sourceMap) {
  const entries = Object.entries(sourceMap);
  const anims = {};
  await Promise.all(
    entries.map(async ([action, files]) => {
      const images = await Promise.all(files.map((src) => loadImage(src)));
      const frames = [];
      images.forEach((img) => {
        frames.push(...sliceSheet(img));
      });
      if (frames.length === 0) return;
      const defaults = ANIMATION_DEFAULTS[action] ?? {};
      anims[action] = {
        frames,
        fps: defaults.fps ?? 8,
        loop: defaults.loop !== false,
        sticky: Boolean(defaults.sticky),
      };
    })
  );
  return anims;
}

function sliceSheet(img) {
  const frameH = img.height || 1;
  const approx = frameH > 0 ? Math.max(1, Math.round(img.width / frameH)) : 1;
  const frameW = Math.max(1, Math.round(img.width / approx));
  const frames = [];
  for (let i = 0; i < approx; i++) {
    frames.push({ image: img, sx: i * frameW, sy: 0, sw: frameW, sh: frameH });
  }
  return frames;
}

async function startGame() {
  $boot.classList.add("hidden");
  $game.classList.remove("hidden");
  State.started = true;
  document.getElementById("dialogue")?.remove();
// Auto-wire : marque les barres fixées en bas pour autohide
function markBottomFixedOverlays() {
  const all = Array.from(document.querySelectorAll("body *"));
  const cand = all.filter((el) => {
    const s = getComputedStyle(el);
    if (s.position !== "fixed" || s.display === "none" || s.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    // heuristique : barre large, ≥ 48px de haut, collée bas
    return r.height >= 48 && r.width >= 240 && r.bottom >= window.innerHeight - 8;
  });
  cand.forEach((el) => el.setAttribute("data-autohide-bottom", ""));
}
markBottomFixedOverlays();

// utilitaire de sync
function syncDialogueOverlay() {
  const isOpen = State.dialogue?.isOpen?.() === true;
  // cache/affiche toutes les barres marquées
  document.querySelectorAll('[data-autohide-bottom]').forEach((el) => {
    el.style.display = isOpen ? "block" : "none";
  });
}

  // === Assets ===
  const [h1, h2, h3, heroAnimations, kaelAnimations, princessAnimations] = await Promise.all([
    loadImage("./assets/hero1.png"),
    loadImage("./assets/hero2.png"),
    loadImage("./assets/hero3.png"),
    loadAnimations(HERO_ANIMATION_SOURCES),
    loadAnimations(KAEL_ANIMATION_SOURCES),
    loadAnimations(PRINCESS_ANIMATION_SOURCES),
  ]);
  const byPath = {
    "./assets/hero1.png": h1,
    "./assets/hero2.png": h2,
    "./assets/hero3.png": h3,
  };
  heroImg = byPath[heroSelection];

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
    return v < min ? min : v > max ? max : v;
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
  // ► forcé tout au nord pour test et “snap” sur case ouverte
  let start = world.nearestOpen(spawn.x, 120, PLAYER_RADIUS);
  let kaelStart = world.nearestOpen(world.w * 0.86, world.h * 0.18, PLAYER_RADIUS);
  let princessPos = world.nearestOpen(world.w * 0.5, world.h * 0.5, PLAYER_RADIUS);
  const entrance = { x: start.x, y: start.y, r: 80 };

  // === Acteurs / systèmes ===
  State.player = new Player(heroImg, start.x, start.y, heroAnimations, { scale: ACTOR_SCALE });
  State.inventory = new Inventory();

  // Dialogue layer (avec sécurité : fermé au boot)
  State.dialogue = createDialogueLayer();
  State.dialogue.close();

  const hud = createHUD();

  State.kael = new NPC(kaelAnimations, kaelStart.x, kaelStart.y, "Kael", {
    scale: ACTOR_SCALE,
    speed: 110,
    keepDistance: 70,
    moveAction: "walk",
    idleAction: "idle",
    hitRadius: PLAYER_RADIUS,
  });
  State.kael.follow = false;
  State.flags.kaelMet = false;

  State.princess = new NPC(princessAnimations, princessPos.x, princessPos.y, "Aëlya", {
    scale: ACTOR_SCALE,
    speed: 95,
    keepDistance: 55,
    moveAction: "walk",
    idleAction: "idle",
    hitRadius: PLAYER_RADIUS,
  });
  State.princess.follow = false;
  State.princess.freed = false;
  State.boss = new BossKael(kaelAnimations, kaelStart.x, kaelStart.y, {
    scale: ACTOR_SCALE,
    hitRadius: PLAYER_RADIUS * 2.2,
  });
  State.bossCheckpoint = null;
  State.bossRetryShown = false;

  State.fog = new FogOfWar(world.w, world.h);
  State.fog.reveal(State.player.x, State.player.y, 180);

  setupKeyboard();
  setupPointer($canvas);

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

  // ===== Update =====
  function update(dt) {
    const { player, map } = State;

    const camera = State.camera;
    let pointerWorld = null;
    if (Pointer.hasPosition && camera) {
      pointerWorld = {
        x: Pointer.x + (camera?.x ?? 0),
        y: Pointer.y + (camera?.y ?? 0),
      };
      Pointer.worldX = pointerWorld.x;
      Pointer.worldY = pointerWorld.y;
    }
    const pointerData = pointerWorld ?? null;
    State.pointer = pointerData;
    let mouseMoveVector = null;
    if (pointerData) {
      const dx = pointerData.x - player.x;
      const dy = pointerData.y - player.y;
      mouseMoveVector = { x: dx, y: dy, dist: Math.hypot(dx, dy) };
    }

    if (consume("r")) State.mode = State.mode === "LIGHT" ? "SHADOW" : "LIGHT";
    const attackPressed = consumePointer(0) || consume(" ");
    const jumpPressed = consume("j");
    const interactPressed = consume("e");

    // E pour interagir uniquement si aucun dialogue en cours
    if (State.paused) {
      State.dialogue.update({ dt: 0 });
      syncDialogueOverlay();
      hud.update({
        hp: player.hp,
        mode: State.mode,
        torch: player.torchOn,
        stamina: player.stamina,
        staminaMax: player.staminaMax,
      });
      return;
    }

    if (!State.dialogue.isOpen() && interactPressed) tryInteract();

    // Mouvements joueur
    player.update(dt, map, State.mode, {
      attack: attackPressed,
      jump: jumpPressed,
      aim: pointerData,
      aimValid: Boolean(pointerData),
      moveVector: mouseMoveVector,
      pointerDeadzone: CONFIG.playerMouseDeadzone,
    });

    // NPC/Princess
    if (
      !State.flags.betrayalHappened &&
      State.kael.follow &&
      Math.hypot(player.x - State.princess.x, player.y - State.princess.y) < 110 &&
      !State.dialogue.isOpen()
    ) {
      triggerBetrayal();
    }
    State.kael.update(dt, player, map);
    State.princess.update(dt, player, map);

    // Caméra & Fog
    clampCameraToPlayer(player.x, player.y);
    State.fog.reveal(player.x, player.y, 170);

    // Combat (après trahison)
    if (!State.dialogue.isOpen() && State.flags.betrayalHappened && !State.flags.kaelDefeated) {
      State.boss.update(dt, player, map);
      const attackRange = player.attackRadius ?? 70;
      if (
        player.canDealAttackDamage?.() &&
        Math.hypot(player.x - State.boss.x, player.y - State.boss.y) < attackRange &&
        player.isTargetInAttackArc?.(State.boss.x, State.boss.y)
      ) {
        State.boss.hit(15);
        player.confirmAttackHit?.();
      }
      if (!State.boss.alive) {
        State.flags.kaelDefeated = true;
        State.dialogue.show([{ speaker: "Mur", text: "Le jugement approche. Ramène Aëlya à la porte." }]);
      }
    }

    if (State.flags.kaelDefeated && State.princess.follow) {
      if (Math.hypot(player.x - entrance.x, player.y - entrance.y) < entrance.r) {
        showEndings({ onPick: (id) => renderEpilogue(id) });
      }
    }

    if (player.hp <= 0) {
      if (State.flags.betrayalHappened && !State.flags.kaelDefeated) {
        renderBossGameOver();
      } else {
        renderDeath();
      }
      return;
    }

    // >>> MISE À JOUR DU DIALOGUE (auto-fermeture si rien à dire)
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
      State.kael.follow = true;
      State.dialogue.show([
        { speaker: "Kael", text: "Tu as osé franchir les arches. Tes choix te collent à la peau." },
        { speaker: "Kael", text: "Je marcherai à tes côtés, mais sache que chaque pas réclame un tribut." },
        { speaker: "Kael", text: "Allons vers la princesse… et regarde bien ce que tes décisions provoquent." },
      ]);
      return;
    }

    // Exemple princesse (libération)
    const dP = Math.hypot(State.player.x - State.princess.x, State.player.y - State.princess.y);
    if (dP < 60 && !State.princess.follow) {
      if (!State.flags.kaelDefeated) {
        State.dialogue.show([{ speaker: "Princesse", text: "Kael n'est pas encore tombé... débarrasse-toi de lui !" }]);
        return;
      }
      State.princess.follow = true;
      State.dialogue.show([
        { speaker: "Princesse", text: "Tu es venu me sauver !" },
        { speaker: "Moi", text: "Oui, allons-y vite !" },
        { speaker: "Princesse", text: "Je te suis de près !" },
      ]);
      return;
    }
  }

  function triggerBetrayal() {
    if (State.flags.betrayalHappened) return;
    State.flags.betrayalHappened = true;
    State.kael.follow = false;
    State.boss.resetForFight({ x: State.kael.x, y: State.kael.y });
    State.bossCheckpoint = {
      player: { x: State.player.x, y: State.player.y },
      boss: { x: State.boss.x, y: State.boss.y },
    };
    State.dialogue.show([
      { speaker: "Kael", text: "Te voilà face à son innocence. Chaque décision porte une ombre." },
      { speaker: "Kael", text: "Je suis le prix de tes choix, Lioran. Tu ne quitteras pas ce labyrinthe indemne." },
      { speaker: "Kael", text: "Prépare-toi à affronter les conséquences." },
    ]);
  }

  // ===== Render =====
  function render() {
    const { map, player, boss, princess } = State;
    const camera = State.camera;

    // coords entières pour éviter les “sauts”
    const camX = camera.x | 0;
    const camY = camera.y | 0;

    // world
    ctx.clearRect(0, 0, $canvas.width, $canvas.height);
    ctx.drawImage(mapImg, camX, camY, camera.w, camera.h, 0, 0, camera.w, camera.h);

    // actors in world space
    ctx.save();
    ctx.translate(-camX, -camY);

    State.princess.draw(ctx);
    if (!State.flags.betrayalHappened) State.kael.draw(ctx);
    if (State.flags.betrayalHappened && !State.flags.kaelDefeated) {
      State.boss.draw(ctx);
      ctx.font = "16px ui-sans-serif";
      strokeText(ctx, `Kael — ${boss.hp} PV`, boss.x - 40, boss.y - 40);
    }
    State.player.draw(ctx);

    const drawHitCircle = (entity, radius, color = "#4DFF9A") => {
      if (!entity || !radius) return;
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(entity.x, entity.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    };

    drawHitCircle(State.player, State.player?.r, "#4DFF9A");
    if (State.player?.isAttackActive?.()) {
      const facing = State.player?.facing === "left" ? Math.PI : 0;
      const arcStart = facing - Math.PI / 2;
      const arcEnd = facing + Math.PI / 2;
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#FFE266";
      ctx.beginPath();
      ctx.moveTo(State.player.x, State.player.y);
      ctx.arc(State.player.x, State.player.y, State.player.attackRadius, arcStart, arcEnd);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "#FFE266";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(State.player.x, State.player.y, State.player.attackRadius, arcStart, arcEnd);
      ctx.stroke();
      ctx.restore();
    }
    if (!State.flags.betrayalHappened) drawHitCircle(State.kael, State.kael?.hitRadius, "#FFD966");
    drawHitCircle(State.princess, State.princess?.hitRadius, "#A5B4FC");
    if (State.flags.betrayalHappened && !State.flags.kaelDefeated) {
      drawHitCircle(State.boss, State.boss?.hitRadius, "#FF6B6B");
    }

    ctx.restore();

    if (State.map?.drawCollisionDebug) {
      State.map.drawCollisionDebug(ctx, camX, camY, camera.w, camera.h);
    }

    // post-processing
    applyLighting(ctx, State.mode, State.player.x - camX, State.player.y - camY, State.player.torchOn);
    State.fog.drawTo(ctx, camX, camY, camera.w, camera.h);
    vignette(ctx, $canvas.width, $canvas.height, 0.35);

    // >>> DIALOGUE AU-DESSUS DE TOUT
    State.dialogue.draw(ctx, $canvas);

    // Aide UI
   
  }

  function renderBossGameOver() {
    if (State.bossRetryShown) return;
    const el = document.getElementById("ending");
    if (!el) return;
    State.bossRetryShown = true;
    State.paused = true;
    el.classList.remove("hidden");
    el.innerHTML = `
      <div class="card">
        <h2>Game Over</h2>
        <p>Kael t'a vaincu. Relance le duel et reprends le dessus.</p>
        <div class="choices">
          <button data-retry-boss>Retenter le combat</button>
          <button data-abandon>Abandonner</button>
        </div>
      </div>`;
    el.querySelector("[data-retry-boss]")?.addEventListener("click", () => retryBossFight());
    el.querySelector("[data-abandon]")?.addEventListener("click", () => goToTitle());
  }

  function retryBossFight() {
    const el = document.getElementById("ending");
    if (el) {
      el.classList.add("hidden");
      el.innerHTML = "";
    }
    State.bossRetryShown = false;
    State.paused = false;
    const checkpoint = State.bossCheckpoint;
    if (checkpoint?.player) {
      State.player.x = checkpoint.player.x;
      State.player.y = checkpoint.player.y;
    }
    State.player.hp = State.player.maxHp ?? 100;
    State.player.stamina = State.player.staminaMax;
    State.player.resetCombatState?.();
    State.player.animator?.setBase("idle");
    const bossSpawn = checkpoint?.boss ? { x: checkpoint.boss.x, y: checkpoint.boss.y } : undefined;
    State.boss.resetForFight(bossSpawn);
    State.flags.kaelDefeated = false;
    State.dialogue.close();
    clampCameraToPlayer(State.player.x, State.player.y);
    State.fog.reveal(State.player.x, State.player.y, 170);
  }

  function goToTitle() {
    State.paused = false;
    State.started = false;
    location.reload();
  }

  function renderDeath() {
    const el = document.getElementById("ending");
    if (!el) return;
    el.classList.remove("hidden");
    el.innerHTML = `
      <div class="card">
        <h2>Le Labyrinthe t’a lu.</h2>
        <p>Ton dernier souvenir s’efface dans le sable des murs.</p>
        <div class="choices"><button data-retry>Recommencer</button></div>
      </div>`;
    el.querySelector("[data-retry]")?.addEventListener("click", () => location.reload());
  }
}

setupBoot();
