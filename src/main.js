// src/main.js
import { CONFIG } from "./config.js";
import { State } from "./state.js";
import {
  setupKeyboard,
  setupPointer,
  endFrame,
  consume,
  consumePointer,
  Pointer,
  pointerDown,
  Keys,
} from "./input.js";
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
let mapImg, heroImg, potionTexture;
const POTION_SPRITE = "./assets/item/potionHeal.png";
const SOUND_SOURCES = {
  heroSlash: "./assets/sounds/Heros_Spell/sword-slash.mp3",
  heroDash: "./assets/sounds/Heros_Spell/Dash.mp3",
  kaelJump: "./assets/sounds/Kael_Spell/Jump_Aoe.mp3",
  kaelFireCone: "./assets/sounds/Kael_Spell/Fire_Cone.mp3",
  kaelOrbCast: "./assets/sounds/Kael_Spell/Invok_Orb.mp3",
  kaelOrbLaunch: "./assets/sounds/Kael_Spell/Orb.mp3",
  gameOver: "./assets/sounds/game-over/game-over.mp3",
  ambient: "./assets/sounds/Ambiance/Ambiance.mp3",
};

const touchControlState = {
  moveVector: null,
  attack: { held: false, justPressed: false },
  dashQueued: false,
};
State.touchControls = touchControlState;
const TOUCH_DEVICE = detectTouchDevice();
State.isMobile = TOUCH_DEVICE;
let touchControlsInitialized = false;
const SUPPORTS_POINTER_EVENTS = typeof window !== "undefined" && "PointerEvent" in window;
const SUPPORTS_TOUCH_EVENTS = typeof window !== "undefined" && "ontouchstart" in window;

function detectTouchDevice() {
  if (typeof window === "undefined") return false;
  const nav = typeof navigator !== "undefined" ? navigator : {};
  const ua = (nav.userAgent || nav.vendor || "").toLowerCase();
  const coarse = typeof window.matchMedia === "function" ? window.matchMedia("(pointer: coarse)").matches : false;
  const maxTouch = nav.maxTouchPoints || nav.msMaxTouchPoints || 0;
  return coarse || maxTouch > 1 || /android|iphone|ipad|ipod|mobile|tablet/.test(ua);
}

function resetTouchControlState() {
  touchControlState.moveVector = null;
  touchControlState.dashQueued = false;
  touchControlState.attack.justPressed = false;
  touchControlState.attack.held = false;
}

function setupTouchControls() {
  const wantsTouch = detectTouchDevice();
  State.isMobile = wantsTouch;
  const root = document.getElementById("touchControls");
  if (!root) return;
  if (!wantsTouch) {
    document.body?.classList?.remove("touch-mode");
    root.classList.add("hidden");
    resetTouchControlState();
    return;
  }
  document.body?.classList?.add("touch-mode");
  root.classList.remove("hidden");
  if (touchControlsInitialized) return;
  touchControlsInitialized = true;
  resetTouchControlState();
  const joystickBase = root.querySelector("[data-joystick-base]");
  const joystickThumb = root.querySelector("[data-joystick-thumb]");
  if (joystickBase && joystickThumb) {
    const joystickState = { pointerId: null };
    const centerThumb = () => {
      joystickThumb.style.transform = "translate(-50%, -50%)";
      touchControlState.moveVector = null;
    };
    const updateFromEvent = (clientX, clientY) => {
      const rect = joystickBase.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const limit = Math.min(rect.width, rect.height) * 0.45;
      const dist = Math.hypot(dx, dy);
      if (dist > limit && dist !== 0) {
        const scale = limit / dist;
        dx *= scale;
        dy *= scale;
      }
      joystickThumb.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
      touchControlState.moveVector = { x: dx, y: dy, dist: Math.hypot(dx, dy) };
    };
    const handlePointerDown = (e) => {
      if (joystickState.pointerId !== null) return;
      joystickState.pointerId = e.pointerId ?? 0;
      joystickBase.setPointerCapture?.(e.pointerId);
      e.preventDefault();
      updateFromEvent(e.clientX, e.clientY);
    };
    const handlePointerMove = (e) => {
      if (joystickState.pointerId !== (e.pointerId ?? -1)) return;
      e.preventDefault();
      updateFromEvent(e.clientX, e.clientY);
    };
    const handlePointerUp = (e) => {
      if (joystickState.pointerId !== (e.pointerId ?? -1)) return;
      joystickBase.releasePointerCapture?.(e.pointerId);
      joystickState.pointerId = null;
      e.preventDefault();
      centerThumb();
    };
    if (SUPPORTS_POINTER_EVENTS) {
      joystickBase.addEventListener("pointerdown", handlePointerDown);
      joystickBase.addEventListener("pointermove", handlePointerMove);
      ["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
        joystickBase.addEventListener(evt, handlePointerUp);
      });
    }
    if (SUPPORTS_TOUCH_EVENTS) {
      const getTouchById = (touchList, id) => {
        if (!touchList) return null;
        for (let i = 0; i < touchList.length; i++) {
          if (touchList[i].identifier === id) return touchList[i];
        }
        return null;
      };
      const handleTouchStart = (e) => {
        if (joystickState.pointerId !== null) return;
        const touch = e.changedTouches?.[0];
        if (!touch) return;
        joystickState.pointerId = touch.identifier;
        e.preventDefault();
        updateFromEvent(touch.clientX, touch.clientY);
      };
      const handleTouchMove = (e) => {
        const touch = getTouchById(e.changedTouches, joystickState.pointerId);
        if (!touch) return;
        e.preventDefault();
        updateFromEvent(touch.clientX, touch.clientY);
      };
      const handleTouchEnd = (e) => {
        const touch = getTouchById(e.changedTouches, joystickState.pointerId);
        if (!touch) return;
        joystickState.pointerId = null;
        e.preventDefault();
        centerThumb();
      };
      joystickBase.addEventListener("touchstart", handleTouchStart, { passive: false });
      joystickBase.addEventListener("touchmove", handleTouchMove, { passive: false });
      ["touchend", "touchcancel"].forEach((evt) => {
        joystickBase.addEventListener(evt, handleTouchEnd, { passive: false });
      });
    }
  }
  const attackBtn = root.querySelector("[data-touch-attack]");
  if (attackBtn) {
    bindTouchButton(attackBtn, {
      onPress: () => {
        touchControlState.attack.justPressed = true;
        touchControlState.attack.held = true;
      },
      onRelease: () => {
        touchControlState.attack.held = false;
      },
    });
  }
  const dashBtn = root.querySelector("[data-touch-dash]");
  if (dashBtn) {
    bindTouchButton(dashBtn, {
      onPress: () => {
        touchControlState.dashQueued = true;
      },
    });
  }
}

function bindTouchButton(el, { onPress, onRelease } = {}) {
  let activePointer = null;
  const pointerPress = (e) => {
    if (activePointer !== null) return;
    activePointer = e.pointerId ?? 0;
    el.setPointerCapture?.(e.pointerId);
    el.classList.add("pressed");
    if (onPress) onPress(e);
  };
  const pointerRelease = (e) => {
    if (activePointer !== (e.pointerId ?? 0)) return;
    el.releasePointerCapture?.(e.pointerId);
    el.classList.remove("pressed");
    activePointer = null;
    if (onRelease) onRelease(e);
  };
  if (SUPPORTS_POINTER_EVENTS) {
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      pointerPress(e);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((evt) => {
      el.addEventListener(evt, (e) => {
        if (activePointer === null) return;
        e.preventDefault();
        pointerRelease(e);
      });
    });
  }
  if (SUPPORTS_TOUCH_EVENTS) {
    const releaseTouchId = (id, e) => {
      if (activePointer !== id) return;
      el.classList.remove("pressed");
      activePointer = null;
      if (onRelease) onRelease(e);
    };
    el.addEventListener(
      "touchstart",
      (e) => {
        if (activePointer !== null) return;
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        const touch = e.changedTouches[0];
        if (!touch) return;
        e.preventDefault();
        activePointer = touch.identifier;
        el.classList.add("pressed");
        if (onPress) onPress(e);
      },
      { passive: false }
    );
    ["touchend", "touchcancel"].forEach((evt) => {
      el.addEventListener(
        evt,
        (e) => {
          if (activePointer === null || !e.changedTouches) return;
          for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === activePointer) {
              e.preventDefault();
              releaseTouchId(touch.identifier, e);
              break;
            }
          }
        },
        { passive: false }
      );
    });
  }
}

function getTouchMoveVector() {
  if (!State.isMobile || !touchControlState.moveVector) return null;
  const { x, y, dist } = touchControlState.moveVector;
  return { x, y, dist };
}

function consumeMobileAttackPress() {
  if (!State.isMobile || !touchControlState.attack.justPressed) return false;
  touchControlState.attack.justPressed = false;
  return true;
}

function mobileAttackHeld() {
  return State.isMobile && touchControlState.attack.held;
}

function consumeMobileDashPress() {
  if (!State.isMobile || !touchControlState.dashQueued) return false;
  touchControlState.dashQueued = false;
  return true;
}

function playSound(name, volume = 1) {
  const clip = State.sounds?.[name];
  if (!clip) return;
  try {
    const node = clip.cloneNode();
    node.volume = Math.max(0, Math.min(1, volume));
    node.play().catch(() => {});
  } catch (err) {
    // ignore play errors (autoplay policies, etc.)
  }
}

function startAmbientMusic() {
  if (State.ambientMusicStarted) return;
  const track = State.sounds?.ambient;
  if (!track) return;
  try {
    track.loop = true;
    track.volume = 0.35;
    track.currentTime = 0;
    track.play().catch(() => {});
    State.ambientMusicStarted = true;
    State.activeAmbientTrack = track;
  } catch {
    // ignore autoplay errors
  }
}
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

function loadAudio(src) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.src = src;
    audio.preload = "auto";
    const onReady = () => {
      cleanup();
      resolve(audio);
    };
    const onError = (err) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      audio.removeEventListener("canplaythrough", onReady);
      audio.removeEventListener("error", onError);
    };
    audio.addEventListener("canplaythrough", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });
    audio.load();
  });
}

async function loadAudios(sourceMap) {
  const entries = await Promise.all(
    Object.entries(sourceMap).map(async ([key, path]) => {
      try {
        const clip = await loadAudio(path);
        return [key, clip];
      } catch {
        return [key, null];
      }
    })
  );
  return Object.fromEntries(entries);
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
  resetGameOverSound();
  setupTouchControls();
  if (State.isMobile) resetTouchControlState();
  document.getElementById("dialogue")?.remove();
// Auto-wire: tag bottom fixed bars for autohide
function markBottomFixedOverlays() {
  const all = Array.from(document.querySelectorAll("body *"));
  const cand = all.filter((el) => {
    const s = getComputedStyle(el);
    if (s.position !== "fixed" || s.display === "none" || s.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    // heuristique: detect a wide bar (>= 48px high) near the bottom
    return r.height >= 48 && r.width >= 240 && r.bottom >= window.innerHeight - 8;
  });
  cand.forEach((el) => el.setAttribute("data-autohide-bottom", ""));
}
markBottomFixedOverlays();

// utilitaire de sync
function syncDialogueOverlay() {
  const isOpen = State.dialogue?.isOpen?.() === true;
  // hide/show every bar tagged earlier
  document.querySelectorAll('[data-autohide-bottom]').forEach((el) => {
    el.style.display = isOpen ? "block" : "none";
  });
}

  // === Assets ===
  const [
    h1,
    h2,
    h3,
    heroAnimations,
    kaelAnimations,
    princessAnimations,
    potionImage,
    soundBank,
  ] = await Promise.all([
    loadImage("./assets/hero1.png"),
    loadImage("./assets/hero2.png"),
    loadImage("./assets/hero3.png"),
    loadAnimations(HERO_ANIMATION_SOURCES),
    loadAnimations(KAEL_ANIMATION_SOURCES),
    loadAnimations(PRINCESS_ANIMATION_SOURCES),
    loadImage(POTION_SPRITE),
    loadAudios(SOUND_SOURCES),
  ]);
  const byPath = {
    "./assets/hero1.png": h1,
    "./assets/hero2.png": h2,
    "./assets/hero3.png": h3,
  };
  heroImg = byPath[heroSelection];
  potionTexture = potionImage;
  State.sounds = soundBank ?? {};
  State.playSound = playSound;
  State.ambientMusicStarted = false;
  startAmbientMusic();
  State.gameOverSoundPlayed = false;
  State.attackInput = null;

  // === Monde & collisions via Tiled ===
  const { image: mapImage, world, spawn } = await loadWorldMap();
  mapImg = mapImage;
  State.map = world;

  // === Camera sized to the map ============================
  function makeCameraFor(map) {
    const vw = Math.min($canvas.width, map.w);
    const vh = Math.min($canvas.height, map.h);
    return { x: 0, y: 0, w: vw, h: vh };
  }
  let camera = makeCameraFor(world);
  const shake = { power: 0 };
  State.camera = camera;
  State.shake = shake;

  // Camera helpers
  function clamp01(v, min, max) {
    if (max < min) max = min; // prevent negative max values
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
  // force spawn to the north for tests and snap to an open tile
  let start = world.nearestOpen(spawn.x, 120, PLAYER_RADIUS);
  let kaelStart = world.nearestOpen(world.w * 0.86, world.h * 0.18, PLAYER_RADIUS);
  let princessPos = world.nearestOpen(world.w * 0.5, world.h * 0.5, PLAYER_RADIUS);
  const entrance = { x: start.x, y: start.y, r: 80 };

  // === Actors / systems ===
  const heroAudioHooks = {
    onAttackSound: (soundKey) => playSound(soundKey ?? "heroSlash", 0.85),
    onDashSound: () => playSound("heroDash", 0.75),
  };
  State.player = new Player(heroImg, start.x, start.y, heroAnimations, {
    scale: ACTOR_SCALE,
    ...heroAudioHooks,
  });
  State.inventory = new Inventory({ capacity: 3 });

  // Dialogue layer (auto-closed at boot)
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

  State.princess = new NPC(princessAnimations, princessPos.x, princessPos.y, "Aelya", {
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
    onPlaySound: (name) => {
      const vol = name === "kaelOrbLaunch" ? 0.6 : 1;
      playSound(name, vol);
    },
  });
  State.bossCheckpoint = null;
  State.bossRetryShown = false;
  State.pickups = [];
  spawnPotion(start.x + 120, start.y - 40);

  State.fog = new FogOfWar(world.w, world.h);
  State.fog.reveal(State.player.x, State.player.y, 180);

  setupKeyboard();
  setupPointer($canvas);
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
  const pickupFactory = {
    potion: () => ({
      id: "potion",
      name: "Potion de soin",
      iconSrc: POTION_SPRITE,
      keep: false,
      onUse: ({ player, notify }) => {
        if (!player) return;
        const max = player.maxHp ?? 100;
        const healed = max * 0.5;
        const before = player.hp;
        player.hp = Math.min(max, player.hp + healed);
        notify?.(`+${Math.round(player.hp - before)} HP`);
      },
    }),
  };

  function pushStatus(text, duration = 2.5) {
    if (!text) return;
    State.statusMessage = text;
    State.statusTimer = duration;
  }

  function spawnPotion(x, y) {
    State.pickups.push({
      type: "potion",
      x,
      y,
      radius: 18,
      texture: potionTexture,
      iconSrc: POTION_SPRITE,
    });

  }

  function handlePickups() {
    if (!State.pickups.length) return;
    const { player } = State;
    State.pickups = State.pickups.filter((pickup) => {
      const dist = Math.hypot(player.x - pickup.x, player.y - pickup.y);
      if (dist <= pickup.radius + player.r + 4) {
        if (pickup.type === "potion") {
          const added = State.inventory.add(pickupFactory.potion());
          if (added) {
            pushStatus("Potion added");
            return false;
          }
          pushStatus("Inventory full");
          return true;
        }
      }
      return true;
    });
  }

  function drawPickups(ctx) {
    if (!State.pickups.length) return;
    State.pickups.forEach((pickup) => {
      ctx.save();
      const tex = pickup.texture;
      ctx.shadowColor = "rgba(255,120,200,0.5)";
      ctx.shadowBlur = 18;
      ctx.globalAlpha = 0.95;
      if (tex && tex.width && tex.height) {
        const target = pickup.radius * 2.4;
        const scale = target / tex.width;
        const w = tex.width * scale;
        const h = tex.height * scale;
        ctx.drawImage(tex, pickup.x - w / 2, pickup.y - h / 2 - 6, w, h);
      } else {
        ctx.fillStyle = "#ff66c4";
        ctx.beginPath();
        ctx.arc(pickup.x, pickup.y, pickup.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }
  // ===== Update =====
  function update(dt) {
    const { player, map } = State;

    const camera = State.camera;
    let pointerWorld = null;
    if (!State.isMobile && Pointer.hasPosition && camera) {
      pointerWorld = {
        x: Pointer.x + (camera?.x ?? 0),
        y: Pointer.y + (camera?.y ?? 0),
      };
      Pointer.worldX = pointerWorld.x;
      Pointer.worldY = pointerWorld.y;
    }
    const pointerData = State.isMobile ? null : pointerWorld;
    State.pointer = pointerData;
    let moveVectorInput = null;
    if (State.isMobile) {
      moveVectorInput = getTouchMoveVector();
    } else if (pointerData) {
      const dx = pointerData.x - player.x;
      const dy = pointerData.y - player.y;
      moveVectorInput = { x: dx, y: dy, dist: Math.hypot(dx, dy) };
    }

    if (!State.attackInput) {
      State.attackInput = { lastTap: -Infinity, holdStart: 0, wasHeld: false, pendingDouble: false };
    }
    const attackPressed = State.isMobile ? consumeMobileAttackPress() : consumePointer(0);
    const pointerHeld = State.isMobile ? mobileAttackHeld() : pointerDown(0);
    const attackState = State.attackInput;
    let attackReleased = false;
    let attackHoldTime = pointerHeld && attackState.wasHeld ? State.time - attackState.holdStart : 0;
    let attackDoubleTap = false;
    if (attackPressed) {
      const window = CONFIG.comboDoubleTapWindow ?? 0.28;
      attackState.pendingDouble = State.time - attackState.lastTap <= window;
      attackState.lastTap = State.time;
      attackState.holdStart = State.time;
      attackState.wasHeld = true;
    }
    if (!pointerHeld && attackState.wasHeld) {
      attackReleased = true;
      attackHoldTime = State.time - attackState.holdStart;
      attackDoubleTap = attackState.pendingDouble;
      attackState.pendingDouble = false;
      attackState.wasHeld = false;
    } else if (pointerHeld && attackState.wasHeld) {
      attackHoldTime = State.time - attackState.holdStart;
    }
    const attackHeld = pointerHeld && attackState.wasHeld;

    if (consume("r")) State.mode = State.mode === "LIGHT" ? "SHADOW" : "LIGHT";
    const dashPressed = consume(" ") || (State.isMobile && consumeMobileDashPress());
    const potionPressed =
      consume("\u00E9") || consume("&") || consume("2");
    const jumpPressed = consume("j");
    const interactPressed = consume("e");

    // E pour interagir uniquement si aucun dialogue en cours
    if (State.paused) {
      State.dialogue.update({ dt: 0 });
      syncDialogueOverlay();
      hud.update({
        hp: player.hp,
        hpMax: player.maxHp ?? 100,
        mode: State.mode,
        torch: player.torchOn,
        stamina: player.stamina,
        staminaMax: player.staminaMax,
        inventory: State.inventory?.list?.() ?? [],
        capacity: State.inventory?.capacity ?? 3,
        status: State.statusMessage ?? "",
        dashCooldown: player.getDashCooldown?.() ?? 0,
        dashCooldownMax: player.dashCooldown ?? 1,
        combo: player.getComboWindowProgress?.() ?? 0,
        charge: player.getChargeProgress?.() ?? 0,
      });
      return;
    }

    if (potionPressed) tryUsePotion();

    if (!State.dialogue.isOpen() && interactPressed) tryInteract();

    // Mouvements joueur
    player.update(dt, map, State.mode, {
      attackPressed,
      attackHeld,
      attackReleased,
      attackHoldTime,
      attackDoubleTap,
      jump: jumpPressed,
      aim: pointerData,
      aimValid: Boolean(pointerData),
      moveVector: moveVectorInput,
      pointerDeadzone: CONFIG.playerMouseDeadzone,
    });
    handlePickups();
    if (dashPressed) {
      const keyboardVector = getKeyboardMoveVector();
      const pointerVector = pointerData
        ? { x: pointerData.x - player.x, y: pointerData.y - player.y }
        : null;
      const pointerValid =
        pointerVector && (Math.abs(pointerVector.x) > 0.01 || Math.abs(pointerVector.y) > 0.01);
      const moveVectorValid =
        moveVectorInput && (Math.abs(moveVectorInput.x) > 0.01 || Math.abs(moveVectorInput.y) > 0.01);
      const dashDir = pointerValid
        ? pointerVector
        : moveVectorValid
        ? { x: moveVectorInput.x, y: moveVectorInput.y }
        : keyboardVector
        ? keyboardVector
        : { x: player.facing === "left" ? -1 : 1, y: 0 };
      player.tryDash(map, dashDir);
    }

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

    // Camera & fog
    clampCameraToPlayer(player.x, player.y);
    State.fog.reveal(player.x, player.y, 170);

    // Combat (after betrayal)
    if (!State.dialogue.isOpen() && State.flags.betrayalHappened && !State.flags.kaelDefeated) {
      State.boss.update(dt, player, map);
      const attackRange = player.attackRadius ?? 70;
      if (
        player.canDealAttackDamage?.() &&
        Math.hypot(player.x - State.boss.x, player.y - State.boss.y) < attackRange &&
        player.isTargetInAttackArc?.(State.boss.x, State.boss.y)
      ) {
        const dmg = player.getCurrentAttackDamage?.() ?? 15;
        State.boss.hit(dmg);
        player.confirmAttackHit?.();
      }
      if (!State.boss.alive) {
        State.flags.kaelDefeated = true;
        State.dialogue.show([{ speaker: "Mur", text: "Le jugement approche. Ramene Aelya a la porte." }]);
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

    if (State.statusTimer > 0) {
      State.statusTimer = Math.max(0, State.statusTimer - dt);
      if (State.statusTimer === 0) State.statusMessage = "";
    }

        // >>> Mise a jour du dialogue (auto-fermeture si rien a dire)
    State.dialogue.update({ dt });
    syncDialogueOverlay();
    // HUD
    hud.update({
      hp: player.hp,
      hpMax: player.maxHp ?? 100,
      mode: State.mode,
      torch: player.torchOn,
      stamina: player.stamina,
      staminaMax: player.staminaMax,
      inventory: State.inventory?.list?.() ?? [],
      capacity: State.inventory?.capacity ?? 3,
      status: State.statusMessage ?? "",
      dashCooldown: player.getDashCooldown?.() ?? 0,
      dashCooldownMax: player.dashCooldown ?? 1,
      combo: player.getComboWindowProgress?.() ?? 0,
      charge: player.getChargeProgress?.() ?? 0,
    });
  }

  function tryUsePotion() {
    const used = State.inventory.use("potion", { player: State.player, notify: pushStatus });
    if (!used) pushStatus("No potion available");
  }

  // ===== Interactions =====
  function tryInteract() {
    // Simple example: speak to Kael when close
    const dKael = Math.hypot(State.player.x - State.kael.x, State.player.y - State.kael.y);
    if (dKael < 70 && !State.flags.kaelMet) {
      State.flags.kaelMet = true;
      State.kael.follow = true;
      State.dialogue.show([
        { speaker: "Kael", text: "Tu as franchi les arches. Tes choix te collent a la peau." },
        { speaker: "Kael", text: "Je marcherai a tes cotes, mais sache que chaque pas reclame un tribut." },
        { speaker: "Kael", text: "Allons vers la princesse et regarde ce que tes decisions provoquent." },
      ]);
      return;
    }

    // Princess release example
    const dP = Math.hypot(State.player.x - State.princess.x, State.player.y - State.princess.y);
    if (dP < 60 && !State.princess.follow) {
      if (!State.flags.kaelDefeated) {
        State.dialogue.show([{ speaker: "Princesse", text: "Kael tient encore... debarrasse-toi de lui !" }]);
        return;
      }
      State.princess.follow = true;
      State.dialogue.show([
        { speaker: "Princesse", text: "Tu es venu me sauver !" },
        { speaker: "Moi", text: "Oui, partons vite !" },
        { speaker: "Princesse", text: "Je te suis de pres !" },
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
      { speaker: "Kael", text: "Te voila face a son innocence. Chaque decision porte une ombre." },
      { speaker: "Kael", text: "Je suis le prix de tes choix, Lioran. Tu ne quitteras pas ce labyrinthe indemne." },
      { speaker: "Kael", text: "Prepare-toi a affronter les consequences." },
    ]);;
  }

  // ===== Render =====
  function render() {
    const { map, player, boss, princess } = State;
    const camera = State.camera;

    // coords entiï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½,Â ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¾ï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?sï¿½,Â ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¾ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'Ã¢ï¿½,ï¿½Â¦ï¿½fï¿½?sï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¨res pour ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½,Â ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¾ï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?sï¿½,Â ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¾ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'Ã¢ï¿½,ï¿½Â¦ï¿½fï¿½?sï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â©viter les ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½,Â ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¾ï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½,Â¦ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¦ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½,Â¦ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"sautsï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½,Â ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¾ï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½,Â¦ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'Ã¢ï¿½,ï¿½Â¦ï¿½fï¿½?sï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â
    const camX = camera.x | 0;
    const camY = camera.y | 0;
      ctx.font = "16px ui-sans-serif";
    // world
    ctx.clearRect(0, 0, $canvas.width, $canvas.height);
    ctx.drawImage(mapImg, camX, camY, camera.w, camera.h, 0, 0, camera.w, camera.h);

    // actors in world space
    ctx.save();
    ctx.translate(-camX, -camY);
    drawPickups(ctx);

    State.princess.draw(ctx);
    if (!State.flags.betrayalHappened) State.kael.draw(ctx);
    if (State.flags.betrayalHappened && !State.flags.kaelDefeated) {
      State.boss.draw(ctx);
      ctx.font = "16px ui-sans-serif";
            strokeText(ctx, `Kael - ${boss.hp} HP`, boss.x - 40, boss.y - 40);
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

function playGameOverSound() {
  if (State.gameOverSoundScheduled) return;
  State.gameOverSoundScheduled = true;
  if (State.gameOverSoundTimeout) {
    clearTimeout(State.gameOverSoundTimeout);
  }
  State.gameOverSoundTimeout = setTimeout(() => {
    playSound("gameOver", 0.8);
    State.gameOverSoundTimeout = null;
  }, 2000);
}

function resetGameOverSound() {
  if (State.gameOverSoundTimeout) {
    clearTimeout(State.gameOverSoundTimeout);
    State.gameOverSoundTimeout = null;
  }
  State.gameOverSoundScheduled = false;
}

  function renderBossGameOver() {
    if (State.bossRetryShown) return;
    const el = document.getElementById("ending");
    if (!el) return;
    State.bossRetryShown = true;
    State.paused = true;
    playGameOverSound();
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
    resetGameOverSound();
    const checkpoint = State.bossCheckpoint;
    if (checkpoint?.player) {
      State.player.x = checkpoint.player.x;
      State.player.y = checkpoint.player.y;
    }
    State.attackInput = null;
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
    resetGameOverSound();
    location.reload();
  }

  function renderDeath() {
    const el = document.getElementById("ending");
    if (!el) return;
    playGameOverSound();
    el.classList.remove("hidden");
    el.innerHTML = `
      <div class="card">
        <h2>Le Labyrinthe ta lu.</h2>
        <p>Ton dernier souvenir sefface dans le sable des murs.</p>
        <div class="choices"><button data-retry>Recommencer</button></div>
      </div>`;
    el.querySelector("[data-retry]")?.addEventListener("click", () => location.reload());
  }
}

setupBoot();
setupTouchControls();
window.addEventListener("resize", () => setupTouchControls());
function getKeyboardMoveVector() {
  let x =
    (Keys.has("d") || Keys.has("arrowright") ? 1 : 0) - (Keys.has("q") || Keys.has("arrowleft") ? 1 : 0);
  let y =
    (Keys.has("s") || Keys.has("arrowdown") ? 1 : 0) - (Keys.has("z") || Keys.has("arrowup") ? 1 : 0);
  if (x === 0 && y === 0) return null;
  const mag = Math.hypot(x, y);
  return { x: x / mag || 0, y: y / mag || 0 };
}
