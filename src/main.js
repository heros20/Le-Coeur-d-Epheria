// src/main.js
import { CONFIG } from "./config.js";
import { State } from "./state.js";
import { setupKeyboard, setupPointer, endFrame, consume, Keys } from "./input.js";
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
const $consoleScreen = document.querySelector(".console-screen");
const $screenFlash = document.getElementById("screenFlash");
const $orbPrompt = document.getElementById("orbPrompt");
const $escapeVideo = document.getElementById("escapeVideo");
const $escapeVideoPlayer = document.getElementById("escapeVideoPlayer");
const $escapeVideoSkip = document.querySelector("[data-video-skip]");
const $escapeVideoPlay = document.querySelector("[data-video-play]");

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
  orbActivate: "./assets/sounds/orbes/orbes.mp3",
  princessCry: "./assets/sounds/princesse/crying_princesse.mp3",
  bossFight: "./assets/sounds/Kael_Spell/boss_fight.mp3",
};

const DESKTOP_ATTACK_KEYS = ["1", "&"];
const ORB_MESSAGES = [
  "Toi qui entre dans ce labyrinthe, ne vois-tu pas ? ...",
  "Certaines lumieres guident. D'autres eblouissent... pour mieux cacher la lame qu'elles portent.",
  "Les promesses les plus sinceres sont celles qu'on fait en tremblant... Et elle ne tremble jamais.",
  "Quand viendra la derniere porte, ne sois pas surpris... Ce n'est jamais l'ennemi qui ouvre la voie.",
];
const ORB_REPEAT_MESSAGES = [
  "Qui a parle ? ...C'etait cense vouloir dire quoi, ca ?",
  "Des lumieres ? Des lames ? Je n'y comprends rien !",
  "Elle ne tremble jamais... Mais ce n'est pas un crime d'avoir du sang-froid.",
  "L'ennemi n'ouvre jamais la voie... ok, la ca commence a devenir flippant.",
];

const touchControlState = {
  moveVector: null,
  attack: { held: false, justPressed: false },
  dashQueued: false,
};
State.touchControls = touchControlState;
State.orbPromptOpen = false;
const TOUCH_DEVICE = detectTouchDevice();
State.isMobile = TOUCH_DEVICE;
let touchControlsInitialized = false;
const SUPPORTS_POINTER_EVENTS = typeof window !== "undefined" && "PointerEvent" in window;
const SUPPORTS_TOUCH_EVENTS = typeof window !== "undefined" && "ontouchstart" in window;
const CAMERA_ZOOM = 1.8;
const orbPromptState = {
  orb: null,
  yesHandler: null,
  noHandler: null,
  keyHandler: null,
  focusIndex: 0,
  buttons: [],
};
let shakeTimeout = null;
let flashTimeout = null;
let flashHideTimeout = null;
let kaelOrbHintTimeout = null;
let lastKaelOrbReminderTime = -Infinity;

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

function fadeAudio(node, targetVolume = 0, duration = 1000, onComplete) {
  if (!node) return;
  const start = node.volume ?? 0;
  const target = Math.max(0, Math.min(1, targetVolume));
  const steps = Math.max(1, Math.ceil(duration / 50));
  let current = 0;
  if (node.__fadeInterval) clearInterval(node.__fadeInterval);
  node.__fadeInterval = setInterval(() => {
    current++;
    const ratio = current / steps;
    node.volume = start + (target - start) * ratio;
    if (current >= steps) {
      clearInterval(node.__fadeInterval);
      node.__fadeInterval = null;
      node.volume = target;
      if (typeof onComplete === "function") onComplete();
    }
  }, 50);
}

function startBossMusic() {
  const track = State.sounds?.bossFight;
  if (!track) return;
  if (State.activeBossTrack === track) return;
  stopBossMusic(false);
  try {
    track.loop = true;
    track.currentTime = 0;
    track.volume = 0;
    track.play().catch(() => {});
    fadeAudio(track, 0.75, 1500);
    State.activeBossTrack = track;
  } catch {
    // ignore
  }
}

function stopBossMusic(withFade = true) {
  const track = State.activeBossTrack;
  if (!track) return;
  const finalize = () => {
    try {
      track.pause();
      track.currentTime = 0;
    } catch {
      // ignore
    }
    State.activeBossTrack = null;
  };
  if (withFade) {
    fadeAudio(track, 0, 1500, finalize);
  } else {
    finalize();
  }
}

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

const KAEL_DRAGON_ANIMATION_SOURCES = {
  idle: [
    "./assets/Dragon_Kael/idle/Idle1.png",
    "./assets/Dragon_Kael/idle/Idle2.png",
    "./assets/Dragon_Kael/idle/Idle3.png",
  ],
  walk_left: [
    "./assets/Dragon_Kael/walk/Walk1.png",
    "./assets/Dragon_Kael/walk/Walk2.png",
    "./assets/Dragon_Kael/walk/Walk3.png",
    "./assets/Dragon_Kael/walk/Walk4.png",
    "./assets/Dragon_Kael/walk/Walk5.png",
  ],
  walk_right: [
    "./assets/Dragon_Kael/walk/Walk1.png",
    "./assets/Dragon_Kael/walk/Walk2.png",
    "./assets/Dragon_Kael/walk/Walk3.png",
    "./assets/Dragon_Kael/walk/Walk4.png",
    "./assets/Dragon_Kael/walk/Walk5.png",
  ],
  run: [
    "./assets/Dragon_Kael/run/Walk1.png",
    "./assets/Dragon_Kael/run/Walk2.png",
    "./assets/Dragon_Kael/run/Walk3.png",
    "./assets/Dragon_Kael/run/Walk4.png",
    "./assets/Dragon_Kael/run/Walk5.png",
  ],
  attack: [
    "./assets/Dragon_Kael/attack/Attack1.png",
    "./assets/Dragon_Kael/attack/Attack2.png",
    "./assets/Dragon_Kael/attack/Attack3.png",
    "./assets/Dragon_Kael/attack/Attack4.png",
    "./assets/Dragon_Kael/attack/Fire_Attack1.png",
    "./assets/Dragon_Kael/attack/Fire_Attack2.png",
    "./assets/Dragon_Kael/attack/Fire_Attack3.png",
    "./assets/Dragon_Kael/attack/Fire_Attack4.png",
    "./assets/Dragon_Kael/attack/Fire_Attack5.png",
    "./assets/Dragon_Kael/attack/Fire_Attack6.png",
  ],
  hurt: [
    "./assets/Dragon_Kael/hurt/Hurt1.png",
    "./assets/Dragon_Kael/hurt/Hurt2.png",
  ],
  dead: [
    "./assets/Dragon_Kael/dead/Death1.png",
    "./assets/Dragon_Kael/dead/Death2.png",
    "./assets/Dragon_Kael/dead/Death3.png",
    "./assets/Dragon_Kael/dead/Death4.png",
    "./assets/Dragon_Kael/dead/Death5.png",
  ],
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
    dragonKaelAnimations,
    princessAnimations,
    potionImage,
    soundBank,
  ] = await Promise.all([
    loadImage("./assets/hero1.png"),
    loadImage("./assets/hero2.png"),
    loadImage("./assets/hero3.png"),
    loadAnimations(HERO_ANIMATION_SOURCES),
    loadAnimations(KAEL_ANIMATION_SOURCES),
    loadAnimations(KAEL_DRAGON_ANIMATION_SOURCES),
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
    const zoom = CAMERA_ZOOM > 0 ? CAMERA_ZOOM : 1;
    const vw = Math.min($canvas.width / zoom, map.w);
    const vh = Math.min($canvas.height / zoom, map.h);
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
  State.spawnPoint = { x: start.x, y: start.y };
  let kaelStart = world.nearestOpen(world.w * 0.86, world.h * 0.18, PLAYER_RADIUS);
  let princessPos = world.nearestOpen(world.w * 0.5, world.h * 0.5 + 110, PLAYER_RADIUS);
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
  State.flags.kaelPhaseTwoStarted = false;
  State.flags.kaelPhaseTwoDefeated = false;
  State.flags.kaelPhaseThreeStarted = false;
  State.flags.kaelPhaseThreeDefeated = false;
  State.flags.princessEscapeOffered = false;
  State.flags.endingPending = false;

  State.princess = new NPC(princessAnimations, princessPos.x, princessPos.y, "Aelya", {
    scale: ACTOR_SCALE,
    speed: 110,
    keepDistance: 35,
    moveAction: "walk",
    idleAction: "idle",
    hitRadius: PLAYER_RADIUS,
  });
  State.princess.follow = false;
  State.princess.freed = false;
  State.boss = new BossKael(kaelAnimations, kaelStart.x, kaelStart.y, {
    scale: ACTOR_SCALE,
    hitRadius: PLAYER_RADIUS * 2.2,
    dragonAnimations: dragonKaelAnimations,
    dragonScale: CONFIG.kael?.phaseThree?.dragonScale ?? ACTOR_SCALE * 1.5,
    onPlaySound: (name) => {
      const vol = name === "kaelOrbLaunch" ? 0.6 : 1;
      playSound(name, vol);
    },
  });
  State.bossCheckpoint = null;
  State.bossRetryShown = false;
  State.pickups = [];
  spawnPotion(start.x - 280, start.y - 10);

  State.fog = new FogOfWar(world.w, world.h);
  State.fog.reveal(State.player.x, State.player.y, 180);

  State.puzzleOrbs = createPuzzleOrbs(world);

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
      radius: 9,
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
    const pointerData = null;
    State.pointer = pointerData;
    let moveVectorInput = null;
    if (State.isMobile) {
      const touchVector = getTouchMoveVector();
      if (touchVector) {
        const { x, y, dist } = touchVector;
        moveVectorInput = { x, y, dist, source: "touch" };
      }
    } else {
      const keyboardVector = getKeyboardMoveVector();
      if (keyboardVector) {
        const { x, y } = keyboardVector;
        const dist = Math.hypot(x, y) || 1;
        moveVectorInput = { x, y, dist, source: "keyboard" };
      }
    }

    if (!State.attackInput) {
      State.attackInput = { lastTap: -Infinity, holdStart: 0, wasHeld: false, pendingDouble: false };
    }
    maybeStartBossMusic();
    const attackPressed = State.isMobile
      ? consumeMobileAttackPress()
      : DESKTOP_ATTACK_KEYS.some((key) => consume(key));
    const attackButtonHeld = State.isMobile
      ? mobileAttackHeld()
      : DESKTOP_ATTACK_KEYS.some((key) => Keys.has(key));
    const attackState = State.attackInput;
    let attackReleased = false;
    let attackHoldTime = attackButtonHeld && attackState.wasHeld ? State.time - attackState.holdStart : 0;
    let attackDoubleTap = false;
    if (attackPressed) {
      const window = CONFIG.comboDoubleTapWindow ?? 0.28;
      attackState.pendingDouble = State.time - attackState.lastTap <= window;
      attackState.lastTap = State.time;
      attackState.holdStart = State.time;
      attackState.wasHeld = true;
    }
    if (!attackButtonHeld && attackState.wasHeld) {
      attackReleased = true;
      attackHoldTime = State.time - attackState.holdStart;
      attackDoubleTap = attackState.pendingDouble;
      attackState.pendingDouble = false;
      attackState.wasHeld = false;
    } else if (attackButtonHeld && attackState.wasHeld) {
      attackHoldTime = State.time - attackState.holdStart;
    }
    const attackHeld = attackButtonHeld && attackState.wasHeld;

    const dashPressed = consume(" ") || (State.isMobile && consumeMobileDashPress());
    const potionPressed = consume("p");
    const quickItemPressed = consume("3");
    const jumpPressed = consume("j");
    const interactPressed = consume("e");

    // E pour interagir uniquement si aucun dialogue en cours
    if (State.paused || State.orbPromptOpen) {
      State.dialogue.update({ dt: 0 });
      syncDialogueOverlay();
      hud.update({
        hp: player.hp,
        hpMax: player.maxHp ?? 100,
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
      maybeStartBossMusic();
      return;
    }

    if (potionPressed) tryUsePotion();
    if (quickItemPressed) tryUseQuickItem();

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
      colliders: [...(State.puzzleOrbs ?? []), ...(State.pickups?.filter((p) => p.blocking) ?? [])],
    });
    enforcePreKaelBoundary(player);
    handlePickups();
    maybeTriggerPrincessHint();
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
      State.flags.betrayalHappened &&
      !State.flags.kaelDefeated &&
      Math.hypot(player.x - State.princess.x, player.y - State.princess.y) < 110 &&
      State.princess.follow
    ) {
      State.princess.follow = true;
    }
    State.kael.update(dt, player, map);
  if (State.flags.princessUnlocked) {
    State.princess.update(dt, player, map);
  }

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
      if (!State.boss.alive && !State.flags.kaelDefeated) {
        State.flags.kaelDefeated = true;
        State.bossMusicPending = false;
        stopBossMusic(true);
        if (State.flags.kaelPhaseThreeStarted && !State.flags.kaelPhaseThreeDefeated) {
          State.flags.kaelPhaseThreeDefeated = true;
          State.flags.princessEscapeOffered = false;
          pauseForDialogue(
            [
              {
                speaker: "Kael",
                text: "Je... ne peux plus me relever. La route est à toi, Lioran...",
              },
              {
                speaker: "Mur",
                text: "Hâte-toi vers la princesse. Le labyrinthe se replie déjà.",
              },
            ],
            () => {
              pushStatus("Parle à Aelya avant que ce lieu ne s'effondre.");
            }
          );
        } else if (State.flags.kaelPhaseTwoStarted && !State.flags.kaelPhaseTwoDefeated) {
          State.flags.kaelPhaseTwoDefeated = true;
          preparePrincessForPhaseTwo();
          pauseForDialogue(
            [
              { speaker: "Kael", text: "Ainsi soit-il... que tes pas trouvent enfin la lumière." },
              { speaker: "Mur", text: "La princesse t'attend à l'entrée. C'est elle qui décidera de la suite." },
            ],
            () => {
              pushStatus("Parle à Aelya pour quitter le labyrinthe.");
            }
          );
        } else {
          State.dialogue.show([{ speaker: "Mur", text: "Le jugement approche. Ramene Aelya a la porte." }]);
        }
      }
    }

    if (State.flags.kaelDefeated && State.princess.follow && !State.flags.endingPending) {
      if (Math.hypot(player.x - entrance.x, player.y - entrance.y) < entrance.r) {
        State.flags.endingPending = true;
        showOnlyEscapeEnding();
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
    maybeStartBossMusic();
    syncDialogueOverlay();
    // HUD
    hud.update({
      hp: player.hp,
      hpMax: player.maxHp ?? 100,
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

  function tryUseQuickItem() {
    const inv = State.inventory;
    if (!inv || typeof inv.list !== "function") {
      pushStatus("No item available");
      return false;
    }
    const items = inv.list();
    if (!items.length) {
      pushStatus("No item available");
      return false;
    }
    const item = items[0];
    if (!item?.id) {
      pushStatus("No usable item");
      return false;
    }
    const used = inv.use(item.id, { player: State.player, notify: pushStatus });
    if (!used) {
      pushStatus("Cannot use item");
      return false;
    }
    if (!item.onUse) {
      pushStatus(`${item.name ?? item.id} used`);
    }
    return true;
  }

  // ===== Interactions =====
  function tryInteract() {
    if (tryInteractOrb()) return;
    // Simple example: speak to Kael when close
    const dKael = Math.hypot(State.player.x - State.kael.x, State.player.y - State.kael.y);
    if (dKael < 70 && !State.flags.kaelMet) {
      State.flags.kaelMet = true;
      State.kael.follow = true;
      State.dialogue.show([
        { speaker: "Kael", text: "Te voilà… Les arches ont reconnu en toi une force que tu ignores encore." },
        { speaker: "Kael", text: "Je serai ton compagnon dans ces ténèbres. Même les ombres se dissipent quand deux voyageurs avancent ensemble." },
        { speaker: "Kael", text: "Allons vers la princesse. Son aura résonne… comme un appel que seuls les cœurs sincères entendent." },

      ]);
      scheduleKaelOrbHint();
      return;
    }

    // Princess release example
    if (!State.flags.princessUnlocked) return;
    const dP = Math.hypot(State.player.x - State.princess.x, State.player.y - State.princess.y);
    if (dP < 70) {
      if (State.flags.kaelPhaseThreeDefeated && !State.flags.princessEscapeOffered) {
        offerFinalEscapeAfterDragon();
        return;
      }
      if (State.flags.kaelPhaseTwoDefeated && !State.flags.kaelPhaseThreeStarted) {
        startPhaseThreeAwakening();
        return;
      }
    }
    if (dP < 60 && !State.princess.follow) {
      if (!State.flags.princessUnlocked) {
        State.dialogue.show([{ speaker: "Princesse", text: "Kael tient encore... debarrasse-toi de lui !" }]);
        return;
      }
      startPrincessEncounter();
      return;
    }
  }

  function teleportToBossArena() {
    const spawn = State.spawnPoint ?? { x: State.player.x, y: State.player.y - 120 };
    const heroX = spawn.x;
    const heroY = spawn.y + 100;
    const kaelX = heroX + 60;
    const kaelY = heroY;
    playSound("orbActivate", 0.9);
    startOrbFlash();
    State.player.x = heroX;
    State.player.y = heroY;
    State.kael.x = kaelX;
    State.kael.y = kaelY;
    clampCameraToPlayer(State.player.x, State.player.y);
    State.princess.x = heroX - 50;
    State.princess.y = heroY + 30;
    triggerBetrayal();
  }

  function startPrincessEncounter() {
    if (State.flags.betrayalHappened) return;
    pauseForDialogue(
      [
        {
          speaker: "Princesse",
          text: "Lioran ! C'était lui.. depuis le début c'était LUI !!!!!",
        },
      ],
      () => {
        State.princess.follow = true;
        State.princess.freed = true;
        teleportToBossArena();
      }
    );
  }

  function findNearbyOrb(threshold = 6) {
    const { player, puzzleOrbs } = State;
    if (!player || !Array.isArray(puzzleOrbs)) return null;
    const pr = player.r ?? 10;
    return puzzleOrbs.find((orb) => {
      if (!orb) return false;
      const or = Math.max(0, orb.radius ?? 0);
      const dist = Math.hypot(player.x - (orb.x ?? 0), player.y - (orb.y ?? 0));
      return dist <= pr + or + threshold;
    });
  }

  function tryInteractOrb() {
    if (State.orbPromptOpen) return true;
    const orb = findNearbyOrb();
    if (!orb) return false;
    if (isKaelTooFarForOrb()) {
      remindKaelToInspectOrb();
      return true;
    }
    if (orb.activated) {
      if (orb.repeatUsed) {
        pushStatus("L'orbe est silencieuse.");
        return true;
      }
      orb.repeatUsed = true;
      const repeatMessage = ORB_REPEAT_MESSAGES[orb.id ?? 0] ?? "Elle pulse deja. Je crois qu'elle est eveillee.";
      State.dialogue.show([{ speaker: "Moi", text: repeatMessage }]);
      return true;
    }
    showOrbPrompt(orb);
    return true;
  }

  function isKaelTooFarForOrb(distance = 100) {
    if (State.flags?.betrayalHappened) return false;
    const player = State.player;
    const kael = State.kael;
    if (!player || !kael) return false;
    const dist = Math.hypot(player.x - kael.x, player.y - kael.y);
    return dist > distance;
  }

  function remindKaelToInspectOrb() {
    if (!State || typeof State.time !== "number") return;
    if (State.time - lastKaelOrbReminderTime < 4) return;
    if (State.dialogue?.isOpen?.()) return;
    lastKaelOrbReminderTime = State.time;
    State.dialogue?.show?.([
      {
        speaker: "Kael",
        text: "Attends moi Lioran, je dois voir ça !",
      },
    ]);
  }

  function showOrbPrompt(orb) {
    if (!$orbPrompt || !orb) return;
    hideOrbPrompt();
    State.orbPromptOpen = true;
    orbPromptState.orb = orb;
    const text = "Cette etrange orbe reagit a ma presence...";
    $orbPrompt.innerHTML = `
      <div class="prompt-card">
        <h4>Activer l'orbe ?</h4>
        <p>${text}</p>
        <div class="prompt-actions">
          <button data-orb-no>Non</button>
          <button data-orb-yes>Oui</button>
        </div>
      </div>`;
    $orbPrompt.classList.remove("hidden");
    requestAnimationFrame(() => $orbPrompt.classList.add("visible"));

    const yesBtn = $orbPrompt.querySelector("[data-orb-yes]");
    const noBtn = $orbPrompt.querySelector("[data-orb-no]");

    const handleYes = () => {
      hideOrbPrompt();
      activateOrb(orb);
    };
    const handleNo = () => {
      hideOrbPrompt();
    };
    const buttons = [noBtn, yesBtn].filter(Boolean);
    orbPromptState.buttons = buttons;
    orbPromptState.focusIndex = buttons.length === 2 ? 1 : 0;
    updatePromptFocus();
    const handleKey = (event) => {
      if (!State.orbPromptOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        hideOrbPrompt();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        rotatePromptFocus(event.key === "ArrowRight" ? 1 : -1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const btn = orbPromptState.buttons[orbPromptState.focusIndex];
        btn?.click();
      } else if (event.key === "e" || event.key === "E") {
        event.preventDefault();
        hideOrbPrompt();
      }
    };
    orbPromptState.yesHandler = handleYes;
    orbPromptState.noHandler = handleNo;
    orbPromptState.keyHandler = handleKey;
    yesBtn?.addEventListener("click", handleYes);
    noBtn?.addEventListener("click", handleNo);
    window.addEventListener("keydown", handleKey);
  }

  function hideOrbPrompt() {
    if (!$orbPrompt) return;
    const currentTarget = orbPromptState.orb;
    const yesBtn = $orbPrompt.querySelector("[data-orb-yes]");
    const noBtn = $orbPrompt.querySelector("[data-orb-no]");
    if (orbPromptState.yesHandler && yesBtn) {
      yesBtn.removeEventListener("click", orbPromptState.yesHandler);
    }
    if (orbPromptState.noHandler && noBtn) {
      noBtn.removeEventListener("click", orbPromptState.noHandler);
    }
    if (orbPromptState.keyHandler) {
      window.removeEventListener("keydown", orbPromptState.keyHandler);
    }
    orbPromptState.yesHandler = null;
    orbPromptState.noHandler = null;
    orbPromptState.keyHandler = null;
    orbPromptState.orb = null;
    orbPromptState.buttons = [];
    orbPromptState.focusIndex = 0;
    $orbPrompt.classList.remove("visible");
    $orbPrompt.classList.add("hidden");
    $orbPrompt.innerHTML = "";
    State.orbPromptOpen = false;
    if (currentTarget && currentTarget.interacting) {
      currentTarget.interacting = false;
    }
  }

  function activateOrb(orb) {
    if (!orb || orb.activated) return;
    orb.activated = true;
    playSound("orbActivate", 0.85);
    const flashDuration = startOrbFlash();
    pushStatus("L'orbe s'embrase.");
    const message = ORB_MESSAGES[orb.id ?? 0];
    if (message) {
      setTimeout(() => {
        State.dialogue.show([{ speaker: "???", text: message }]);
      }, flashDuration + 150);
    }
    checkPrincessUnlock();
  }

  function checkPrincessUnlock() {
    if (State.flags.princessUnlocked) return;
    const allActivated = Array.isArray(State.puzzleOrbs) && State.puzzleOrbs.every((orb) => orb?.activated);
    if (allActivated && !State.flags.princessUnlocked) {
      State.flags.princessUnlocked = true;
      const flashDuration = 2000; // approximate delay after the orb flash
      setTimeout(() => playSound("princessCry", 0.9), flashDuration);
      State.princessHint = {
        startX: State.player.x,
        startY: State.player.y,
        shown: false,
      };
      pushStatus("Un murmure attire votre regard vers la prison de la princesse.");
    }
  }

  function startScreenShake(duration = 1000) {
    if (!$consoleScreen) return;
    $consoleScreen.classList.add("screen-shake");
    if (shakeTimeout) clearTimeout(shakeTimeout);
    shakeTimeout = setTimeout(() => {
      $consoleScreen.classList.remove("screen-shake");
      shakeTimeout = null;
    }, duration);
  }

  function flashScreen(duration = 900) {
    if (!$screenFlash) return;
    $screenFlash.classList.remove("hidden");
    $screenFlash.classList.add("visible");
    if (flashTimeout) clearTimeout(flashTimeout);
    if (flashHideTimeout) clearTimeout(flashHideTimeout);
    flashTimeout = setTimeout(() => {
      $screenFlash.classList.remove("visible");
      flashHideTimeout = setTimeout(() => {
        $screenFlash.classList.add("hidden");
        flashHideTimeout = null;
      }, 350);
      flashTimeout = null;
    }, duration);
  }

  function startOrbFlash() {
    if (!$screenFlash) return 0;
    const duration = 3500; // match audio length
    $screenFlash.style.transitionDuration = "0.9s";
    $screenFlash.classList.remove("hidden");
    $screenFlash.classList.add("visible");
    if (flashTimeout) clearTimeout(flashTimeout);
    if (flashHideTimeout) clearTimeout(flashHideTimeout);
    flashTimeout = setTimeout(() => {
      $screenFlash.classList.remove("visible");
      flashHideTimeout = setTimeout(() => {
        $screenFlash.classList.add("hidden");
        flashHideTimeout = null;
        $screenFlash.style.transitionDuration = "";
      }, 700);
      flashTimeout = null;
    }, duration);
    startScreenShake(duration);
    return duration;
  }

  function pauseForDialogue(lines = [], onComplete) {
    const hasLines = Array.isArray(lines) && lines.length > 0;
    if (!hasLines) {
      if (typeof onComplete === "function") onComplete();
      return;
    }
    State.paused = true;
    const handleClose = () => {
      State.paused = false;
      if (typeof onComplete === "function") onComplete();
    };
    State.dialogue.show(lines, { onClose: handleClose });
  }

  function scheduleKaelOrbHint() {
    const flags = State.flags || (State.flags = {});
    if (flags.kaelOrbHintSpoken) return;
    if (kaelOrbHintTimeout) clearTimeout(kaelOrbHintTimeout);
    kaelOrbHintTimeout = setTimeout(() => {
      kaelOrbHintTimeout = null;
      maybeSpeakKaelOrbHint();
    }, 60_000);
  }

  function maybeSpeakKaelOrbHint() {
    const flags = State.flags || (State.flags = {});
    if (!flags.kaelMet || flags.kaelOrbHintSpoken) return;
    const orbs = State.puzzleOrbs;
    const anyActivated = Array.isArray(orbs) && orbs.some((orb) => orb?.activated);
    if (anyActivated) return;
    flags.kaelOrbHintSpoken = true;
    pauseForDialogue([
      {
        speaker: "Kael",
        text: "C'est étrange... Tu as remarqué comme ces orbes aux quatre coins du labyrinthe sont étranges ?",
      },
    ]);
  }

  function showOnlyEscapeEnding() {
    const root = document.getElementById("ending");
    if (!root) return;
    State.paused = true;
    root.classList.remove("hidden");
    root.innerHTML = `
      <div class="card">
        <h2>Choix</h2>
        <p>La porte est ouverte. Qu'allez-vous faire ?</p>
        <div class="choices">
          <button data-flee>Fuir le Labyrinthe</button>
        </div>
      </div>`;
    const btn = root.querySelector("[data-flee]");
    btn?.addEventListener(
      "click",
      () => {
        root.classList.add("hidden");
        State.flags.endingPending = false;
        if (!State.flags.kaelPhaseTwoStarted) {
          startKaelPhaseTwoRequiem();
          return;
        }
        if (!State.flags.kaelPhaseTwoDefeated) {
          pushStatus("Kael n'abandonnera pas tant que vous ne l'affronterez pas.");
          return;
        }
        if (!State.flags.kaelPhaseThreeStarted) {
          pushStatus("Va parler à Aelya, elle sait comment vous enfuir.");
          return;
        }
        if (!State.flags.kaelPhaseThreeDefeated) {
          pushStatus("La forme draconique de Kael te barre encore la route.");
          return;
        }
        launchFinalEscape();
      },
      { once: true }
    );
  }

  function startKaelPhaseTwoRequiem() {
    pauseForDialogue(
      [
        { speaker: "Kael", text: "Je ne mourrai pas pour si peu, Lioran." },
        { speaker: "Kael", text: "Toi qui me connais bien... NE ME TOURNE PAS LE DOS !!!" },
      ],
      () => {
        flashScreen(1200);
        startScreenShake(1200);
        preparePrincessForPhaseTwo();
        startPhaseTwoBattle();
      }
    );
  }

  function preparePrincessForPhaseTwo() {
    if (!State.princess) return;
    const spawn = State.spawnPoint ?? { x: State.player.x, y: State.player.y };
    const waitX = spawn.x - 50;
    const waitY = spawn.y + 70;
    State.princess.x = waitX;
    State.princess.y = waitY;
    State.princess.follow = false;
    State.princess.waitingAtEntrance = true;
    State.flags.princessEscapeOffered = false;
  }

  function startPhaseTwoBattle() {
    const spawn = State.spawnPoint ?? { x: State.player.x, y: State.player.y };
    const heroPos = { x: spawn.x + 40, y: spawn.y + 70 };
    const bossPos = { x: heroPos.x + 110, y: heroPos.y - 20 };
    State.player.x = heroPos.x;
    State.player.y = heroPos.y;
    State.player.hp = State.player.maxHp ?? 100;
    State.player.stamina = State.player.staminaMax;
    State.player.resetCombatState?.();
    State.player.animator?.setBase("idle");
    clampCameraToPlayer(State.player.x, State.player.y);
    State.boss.enterPhaseTwo({ position: bossPos });
    State.bossCheckpoint = {
      player: { x: heroPos.x, y: heroPos.y },
      boss: { x: bossPos.x, y: bossPos.y },
      phase: 2,
      hpMultiplier: State.boss.phaseTwo?.hpMultiplier ?? 1.5,
    };
    State.flags.kaelDefeated = false;
    State.flags.endingPending = false;
    State.flags.kaelPhaseTwoStarted = true;
    State.flags.kaelPhaseTwoDefeated = false;
    State.flags.kaelPhaseThreeStarted = false;
    State.flags.kaelPhaseThreeDefeated = false;
    State.flags.endingPending = false;
    State.flags.princessEscapeOffered = false;
    State.bossMusicPending = false;
    startBossMusic();
  }

  function playLabyrinthLaugh(onComplete) {
    pauseForDialogue(
      [
        { speaker: "Chuchotement", text: "Vous entendez un rire venir du fond du labyrinthe." },
        { speaker: "???", text: "h..h...h..hahahahahahahahahahahahaha" },
      ],
      () => {
        if (typeof onComplete === "function") onComplete();
      }
    );
  }

  function startPhaseThreeAwakening() {
    pauseForDialogue(
      [
        { speaker: "Princesse", text: "Lioran... Tu as fait ta part. Quittons cet endroit." },
        { speaker: "Princesse", text: "Attends... Cette vibration... quelque chose s'éveille encore !" },
      ],
      () => {
        playLabyrinthLaugh(() => {
          flashScreen(1200);
          startScreenShake(1200);
          pauseForDialogue(
            [{ speaker: "Kael", text: "TU NE ME LAISSE PAS LE CHOIX LORIAN ! JE NE ME RETIENDRAI PLUS !!!!!!" }],
            () => {
              startPhaseThreeBattle();
            }
          );
        });
      }
    );
  }

  function startPhaseThreeBattle() {
    const spawn = State.spawnPoint ?? { x: State.player.x, y: State.player.y };
    const heroPos = { x: spawn.x + 30, y: spawn.y + 80 };
    const bossPos = { x: heroPos.x + 140, y: heroPos.y - 10 };
    State.player.x = heroPos.x;
    State.player.y = heroPos.y;
    State.player.hp = State.player.maxHp ?? 100;
    State.player.stamina = State.player.staminaMax;
    State.player.resetCombatState?.();
    State.player.animator?.setBase("idle");
    clampCameraToPlayer(State.player.x, State.player.y);
    State.boss.enterPhaseThree({
      position: bossPos,
      hpMultiplier: State.boss?.phaseThreeCfg?.hpMultiplier ?? 2,
    });
    State.bossCheckpoint = {
      player: { x: heroPos.x, y: heroPos.y },
      boss: { x: bossPos.x, y: bossPos.y },
      phase: 3,
      hpMultiplier: State.boss?.phaseThreeCfg?.hpMultiplier ?? 2,
    };
    preparePrincessForPhaseTwo();
    State.flags.kaelDefeated = false;
    State.flags.endingPending = false;
    State.flags.kaelPhaseThreeStarted = true;
    State.flags.kaelPhaseThreeDefeated = false;
    State.flags.kaelPhaseTwoDefeated = true;
    State.flags.princessEscapeOffered = false;
    State.bossMusicPending = false;
    startBossMusic();
  }

  function offerFinalEscapeAfterDragon() {
    State.flags.princessEscapeOffered = true;
    pauseForDialogue(
      [
        {
          speaker: "Princesse",
          text: "Il est tombé... vite, Lioran, fuyons de ce lieu maudit.",
        },
        {
          speaker: "Princesse",
          text: "Ne restons pas assez longtemps pour qu'il se réveille encore.",
        },
      ],
      () => {
        launchFinalEscape();
      }
    );
  }

  function launchFinalEscape() {
    playEscapeVideo(() => {
      renderEpilogue("release");
    });
  }

  function playEscapeVideo(onComplete) {
    if (!$escapeVideo || !$escapeVideoPlayer) {
      if (typeof onComplete === "function") onComplete();
      return;
    }
    let finished = false;
    const wasPaused = State.paused;
    const removeManualHandlers = () => {
      if ($escapeVideoPlay) {
        $escapeVideoPlay.classList.add("hidden");
        $escapeVideoPlay.removeEventListener("click", handleManualPlay);
      }
      $escapeVideo.removeEventListener("click", handleManualPlay);
    };
    const cleanup = () => {
      if (finished) return;
      finished = true;
      $escapeVideoPlayer.pause();
      try {
        $escapeVideoPlayer.currentTime = 0;
      } catch {
        // ignore seek issues on some browsers
      }
      removeManualHandlers();
      $escapeVideo.classList.add("hidden");
      State.paused = wasPaused;
      $escapeVideoPlayer.removeEventListener("ended", handleVideoEnd);
      $escapeVideoPlayer.removeEventListener("error", handleVideoEnd);
      if ($escapeVideoSkip) {
        $escapeVideoSkip.removeEventListener("click", handleSkip);
      }
      if (typeof onComplete === "function") onComplete();
    };
    const handleVideoEnd = () => cleanup();
    const handleSkip = () => cleanup();
    const handleManualPlay = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (finished) return;
      removeManualHandlers();
      requestPlay();
    };

    const attachManualPrompt = () => {
      if (finished) return;
      removeManualHandlers();
      if ($escapeVideoPlay) {
        $escapeVideoPlay.classList.remove("hidden");
        $escapeVideoPlay.addEventListener("click", handleManualPlay, { once: true });
      } else {
        $escapeVideo.addEventListener("click", handleManualPlay, { once: true });
      }
    };

    const requestPlay = () => {
      if (!$escapeVideoPlayer) return;
      try {
        const maybePromise = $escapeVideoPlayer.play();
        if (maybePromise && typeof maybePromise.catch === "function") {
          maybePromise.catch(() => {
            if (finished) return;
            attachManualPrompt();
          });
        }
      } catch {
        attachManualPrompt();
      }
    };

    State.paused = true;
    $escapeVideo.classList.remove("hidden");
    if ($escapeVideoPlay) $escapeVideoPlay.classList.add("hidden");
    try {
      $escapeVideoPlayer.currentTime = 0;
    } catch {
      // ignore seek issues if browser blocks it before metadata is ready
    }
    $escapeVideoPlayer.addEventListener("ended", handleVideoEnd);
    $escapeVideoPlayer.addEventListener("error", handleVideoEnd);
    if ($escapeVideoSkip) $escapeVideoSkip.addEventListener("click", handleSkip);
    requestPlay();
  }

  function showFinalText() {
    pauseForDialogue(
      [
        { speaker: "Chuchotement", text: "Vous entendez un rire venir du fond du labyrinthe." },
        { speaker: "???", text: "h..h...h..hahahahahahahahahahahahaha" },
      ],
      () => {
        playEscapeVideo(() => {
          renderEpilogue("release");
        });
      }
    );
  }

  function maybeTriggerPrincessHint() {
    const hint = State.princessHint;
    if (!hint || hint.shown) return;
    const player = State.player;
    if (!player) return;
    const dx = (player.x ?? hint.startX) - hint.startX;
    const dy = (player.y ?? hint.startY) - hint.startY;
    if (Math.hypot(dx, dy) < 100) return;
    hint.shown = true;
    pauseForDialogue(
      [
        {
          speaker: "Moi",
          text: "J'entends quelqu'un pleurer... C'est surement elle ! Je dois me depecher.",
        },
      ],
      () => {
        State.princessHint = null;
      }
    );
  }

  function maybeStartBossMusic() {
    if (!State.flags.betrayalHappened) return;
    if (!State.bossMusicPending) return;
    if (State.dialogue.isOpen()) return;
    State.bossMusicPending = false;
    startBossMusic();
  }

  function enforcePreKaelBoundary(player) {
    if (State.flags.kaelMet || !player) return;
    const spawn = State.spawnPoint;
    if (!spawn) return;
    const limit = spawn.y + 300;
    if (player.y > limit) {
      player.y = limit - 5;
      clampCameraToPlayer(player.x, player.y);
      pauseForDialogue(
        [
          {
            speaker: "Moi",
            text: "Je devrais aller parler a Kael avant toute chose.",
          },
        ]
      );
    }
  }

  function updatePromptFocus() {
    if (!orbPromptState.buttons.length) return;
    orbPromptState.buttons.forEach((btn, idx) => {
      if (!btn) return;
      btn.classList.toggle("btn-active", idx === orbPromptState.focusIndex);
    });
  }

  function rotatePromptFocus(dir) {
    if (!orbPromptState.buttons.length) return;
    const len = orbPromptState.buttons.length;
    orbPromptState.focusIndex = (orbPromptState.focusIndex + dir + len) % len;
    updatePromptFocus();
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
    State.bossMusicPending = true;
    State.dialogue.show([
     { speaker: "Kael", text: "Pardonne moi Lioran… " },
      { speaker: "Kael", text: "Je t’ai guidé jusqu’ici, comme le destin me l’avait demandé. Tu as fait ta part du chemin." },
      { speaker: "Kael", text: "La princesse… son âme porte une lumière que tu ne peux pas comprendre. Une lumière qui ne t’est pas destinée." },
      { speaker: "Kael", text: "Je suis désolé, vraiment. Mais ce fragment… je ne peux pas te laisser l’approcher." },
      { speaker: "Kael", text: "Tu croyais que je marchais à tes côtés. En vérité, je marchais vers elle." },
      { speaker: "Kael", text: "Pardonne-moi si tu peux. Ou déteste-moi si tu dois. Le labyrinthe ne juge jamais… mais il réclame toujours son prix." },

    ]);;
  }

  // ===== Render =====
  function render() {
    const { map, player, boss, princess, puzzleOrbs } = State;
    const camera = State.camera;

    // coords entiï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½,Â ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¾ï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?sï¿½,Â ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¾ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'Ã¢ï¿½,ï¿½Â¦ï¿½fï¿½?sï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¨res pour ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½,Â ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¾ï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?sï¿½,Â ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¾ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'Ã¢ï¿½,ï¿½Â¦ï¿½fï¿½?sï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â©viter les ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½,Â ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¾ï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½,Â¦ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¦ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½,Â¦ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"sautsï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½,Â ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¾ï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½,Â¦ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'Ã¢ï¿½,ï¿½Â ï¿½fÂ¢Ã¢ï¿½?sÂ¬Ã¢ï¿½?zÂ¢ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?sï¿½,Â¢ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½?sï¿½,Â¬ï¿½fï¿½'Ã¢ï¿½,ï¿½Â¦ï¿½fï¿½?sï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fï¿½?ï¿½Ã¢ï¿½,ï¿½ï¿½"ï¿½ï¿½fï¿½'ï¿½,Â¢ï¿½fÂ¢Ã¢ï¿½,ï¿½Å¡ï¿½,Â¬ï¿½fï¿½?ï¿½ï¿½,Â¡ï¿½fï¿½'ï¿½?ï¿½?Tï¿½fÂ¢Ã¢ï¿½?sÂ¬ï¿½.Â¡ï¿½fï¿½'Ã¢ï¿½,ï¿½Å¡ï¿½fï¿½?sï¿½,Â
    const camX = camera.x | 0;
    const camY = camera.y | 0;
    const scaleX = $canvas.width / Math.max(1, camera.w);
    const scaleY = $canvas.height / Math.max(1, camera.h);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, $canvas.width, $canvas.height);

    ctx.save();
    ctx.scale(scaleX, scaleY);

    ctx.drawImage(mapImg, camX, camY, camera.w, camera.h, 0, 0, camera.w, camera.h);

    // actors in world space
    ctx.save();
    ctx.translate(-camX, -camY);
    drawPickups(ctx);

    if (State.flags.princessUnlocked) {
      State.princess.draw(ctx);
    }
    if (!State.flags.betrayalHappened) State.kael.draw(ctx);
    if (State.flags.betrayalHappened && !State.flags.kaelDefeated) {
      State.boss.draw(ctx);
      drawBossHpBar(ctx, boss);
    }
    State.player.draw(ctx);

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
    if (Array.isArray(puzzleOrbs)) {
      puzzleOrbs.forEach((orb) => drawPuzzleOrb(ctx, orb));
    }

    ctx.restore();
    ctx.restore();
    drawAtmosphericFog(ctx, $canvas.width, $canvas.height);

    const playerScreenX = (player.x - camX) * scaleX;
    const playerScreenY = (player.y - camY) * scaleY;
    if (!State.flags.betrayalHappened || State.flags.kaelDefeated) {
      drawHeroShroud(ctx, playerScreenX, playerScreenY);
    }

    // post-processing
    applyLighting(ctx, State.mode, playerScreenX, playerScreenY, player.torchOn);

    ctx.save();
    ctx.scale(scaleX, scaleY);
    State.fog.drawTo(ctx, camX, camY, camera.w, camera.h);
    ctx.restore();

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
    stopBossMusic(true);
    State.bossMusicPending = false;
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
    if (checkpoint?.phase === 3 || State.flags.kaelPhaseThreeStarted) {
      State.boss.enterPhaseThree({ position: bossSpawn, hpMultiplier: checkpoint?.hpMultiplier });
      preparePrincessForPhaseTwo();
      State.flags.kaelPhaseTwoStarted = true;
      State.flags.kaelPhaseTwoDefeated = true;
      State.flags.kaelPhaseThreeStarted = true;
      State.flags.kaelPhaseThreeDefeated = false;
      State.flags.princessEscapeOffered = false;
    } else if (checkpoint?.phase === 2 || State.flags.kaelPhaseTwoStarted) {
      State.boss.enterPhaseTwo({ position: bossSpawn, hpMultiplier: checkpoint?.hpMultiplier });
      preparePrincessForPhaseTwo();
      State.flags.kaelPhaseTwoStarted = true;
      State.flags.kaelPhaseTwoDefeated = false;
      State.flags.kaelPhaseThreeStarted = false;
      State.flags.kaelPhaseThreeDefeated = false;
      State.flags.princessEscapeOffered = false;
    } else {
      State.boss.resetForFight(bossSpawn);
      State.flags.kaelPhaseTwoStarted = false;
      State.flags.kaelPhaseTwoDefeated = false;
      State.flags.kaelPhaseThreeStarted = false;
      State.flags.kaelPhaseThreeDefeated = false;
    }
    State.flags.kaelDefeated = false;
    State.dialogue.close();
    clampCameraToPlayer(State.player.x, State.player.y);
    State.fog.reveal(State.player.x, State.player.y, 170);
    State.bossMusicPending = false;
    startBossMusic();
  }

  function goToTitle() {
    State.paused = false;
    State.started = false;
    resetGameOverSound();
    stopBossMusic(true);
    State.bossMusicPending = false;
    location.reload();
  }

  function renderDeath() {
    const el = document.getElementById("ending");
    if (!el) return;
    playGameOverSound();
    stopBossMusic(true);
    State.bossMusicPending = false;
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

function createPuzzleOrbs(world) {
  if (!world) return [];
  const margin = 80;
  const radius = 9;
  const leftBase = margin;
  const rightBase = Math.max(margin, world.w - margin);
  const topBase = Math.max(margin, world.h * 0.1 + 230);
  const bottomBase = Math.max(margin, world.h - margin);

  const leftX = Math.max(radius, leftBase - 2);
  const rightX = Math.min(world.w - radius, rightBase + 2);
  const topY = Math.min(world.h - radius, topBase + 3);
  const bottomY = Math.min(world.h - radius, bottomBase + 3);
  return [
    { id: 0, x: leftX, y: topY, radius, color: "#f94144", activated: false, repeatUsed: false },
    { id: 1, x: rightX, y: topY, radius, color: "#f9c74f", activated: false, repeatUsed: false },
    { id: 2, x: leftX, y: bottomY, radius, color: "#43aa8b", activated: false, repeatUsed: false },
    { id: 3, x: rightX, y: bottomY, radius, color: "#577590", activated: false, repeatUsed: false },
  ];
}

function drawPuzzleOrb(ctx, orb) {
  if (!ctx || !orb) return;
  const time = State.time ?? 0;
  ctx.save();
  const glowColor = orb.color ?? "#ffffff";
  const activated = Boolean(orb.activated);
  const pulse = activated ? (Math.sin(time * 5 + (orb.id ?? 0)) * 0.5 + 0.5) : 0;
  const radius = orb.radius ?? 9;
  ctx.shadowColor = activated ? "#ffffff" : glowColor;
  ctx.shadowBlur = activated ? 24 + pulse * 12 : 18;
  ctx.globalAlpha = activated ? 0.85 + pulse * 0.15 : 0.95;
  ctx.fillStyle = activated ? "#ffffff" : glowColor;
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = activated ? 3 : 2;
  ctx.strokeStyle = activated ? glowColor : "rgba(255,255,255,0.8)";
  ctx.stroke();
  if (activated) {
    ctx.globalAlpha = 0.25 + pulse * 0.2;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, radius + 6 + pulse * 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBossHpBar(ctx, boss) {
  if (!ctx || !boss) return;
  const maxHp = Math.max(1, boss.maxHp ?? boss.hp ?? 1);
  const hp = Math.max(0, Math.min(maxHp, boss.hp ?? 0));
  const ratio = hp / maxHp;
  const barWidth = 78;
  const barHeight = 7;
  const barX = boss.x - barWidth / 2;
  const barY = boss.y - (boss.hitRadius ?? 40) - 30;
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
  const grad = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
  grad.addColorStop(0, "#f97316");
  grad.addColorStop(1, "#ef4444");
  ctx.fillStyle = grad;
  ctx.fillRect(barX, barY, barWidth * ratio, barHeight);
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
  ctx.restore();
}

function drawAtmosphericFog(ctx, width, height) {
  if (!ctx) return;
  ctx.save();
  const gradient = ctx.createRadialGradient(width * 0.5, height * 0.35, width * 0.08, width * 0.5, height * 0.6, width * 0.8);
  gradient.addColorStop(0, "rgba(8, 10, 25, 0.25)");
  gradient.addColorStop(0.5, "rgba(4, 6, 18, 0.35)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.55)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawHeroShroud(ctx, x, y) {
  if (!ctx || !Number.isFinite(x) || !Number.isFinite(y)) return;
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  const maxDim = Math.max(ctx.canvas.width, ctx.canvas.height);
  const gradient = ctx.createRadialGradient(x, y, 55, x, y, maxDim * 0.85);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.2, "rgba(0,0,0,0.9)");
  gradient.addColorStop(0.45, "rgba(0,0,0,0.99)");
  gradient.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
  function showPickupPrompt(pickup) {
    return;
    /*if (!$orbPrompt || State.orbPromptOpen || !pickup) return;
    pickup.interacting = true;
    State.orbPromptOpen = true;
    orbPromptState.orb = pickup;
    const text = pickup.promptText ?? "Ramasser cet objet ?";
    $orbPrompt.innerHTML = `
      <div class="prompt-card">
        <h4>${pickup.name ?? "Objet inconnu"}</h4>
        <p>${text}</p>
        <div class="prompt-actions">
          <button data-orb-no>Non</button>
          <button data-orb-yes>Oui</button>
        </div>
      </div>`;
    $orbPrompt.classList.remove("hidden");
    requestAnimationFrame(() => $orbPrompt.classList.add("visible"));

    const yesBtn = $orbPrompt.querySelector("[data-orb-yes]");
    const noBtn = $orbPrompt.querySelector("[data-orb-no]");
    const handleYes = () => {
      if (pickup.type === "potion") {
        const added = State.inventory.add(pickupFactory.potion());
        if (added) {
          pushStatus("Potion added");
          pickup._remove = true;
          pickup.blocking = false;
          pickup.interacting = false;
          hideOrbPrompt();
        } else {
          pushStatus("Inventory full");
        }
      } else {
        pickup.interacting = false;
        hideOrbPrompt();
      }
    };
    const handleNo = () => {
      pickup.interacting = false;
      hideOrbPrompt();
    };
    const buttons = [noBtn, yesBtn].filter(Boolean);
    orbPromptState.buttons = buttons;
    orbPromptState.focusIndex = buttons.length === 2 ? 1 : 0;
    updatePromptFocus();
    const handleKey = (event) => {
      if (!State.orbPromptOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        handleNo();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        rotatePromptFocus(event.key === "ArrowRight" ? 1 : -1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const btn = orbPromptState.buttons[orbPromptState.focusIndex];
        btn?.click();
      } else if (event.key === "e" || event.key === "E") {
        event.preventDefault();
        handleYes();
      }
    };
    orbPromptState.yesHandler = handleYes;
    orbPromptState.noHandler = handleNo;
    orbPromptState.keyHandler = handleKey;
    yesBtn?.addEventListener("click", handleYes);
    noBtn?.addEventListener("click", handleNo);
    window.addEventListener("keydown", handleKey);*/
  }
