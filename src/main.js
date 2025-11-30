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
import { Animator } from "./utils/animator.js";
import { createHUD } from "./ui/hud.js";
console.log("### VERSION CURSOR OK ###");
let heroAnimations = null;
let heroGoldAnimations = null;
let goldAnimActive = false;
let ghostAnimations = null;
const $boot = document.getElementById("boot");
const $game = document.getElementById("game");
const $canvas = document.getElementById("gameCanvas");
const ctx = $canvas.getContext("2d");
const $consoleScreen = document.querySelector(".console-screen");
const $screenFlash = document.getElementById("screenFlash");
const $orbPrompt = document.getElementById("orbPrompt");
const $bossRiddle = document.getElementById("bossRiddle");
const $escapeVideo = document.getElementById("escapeVideo");
const $escapeVideoPlayer = document.getElementById("escapeVideoPlayer");
const $escapeVideoSkip = document.querySelector("[data-video-skip]");
const $escapeVideoPlay = document.querySelector("[data-video-play]");
const $bossObjectiveBanner = document.getElementById("bossObjectiveBanner");
const $introScroll = document.getElementById("introScroll");
const $introScrollContent = document.querySelector("[data-intro-content]");
const $introScrollSkip = document.querySelector("[data-intro-skip]");
const $goldOrbPortal = document.getElementById("goldOrbPortal");
const INTRO_CRAWL_TEXT = [
"Dans les entrailles d’Éphéria, un labyrinthe ancien né d’une magie oubliée, le jeune héros Lioran s’avance, porté par l’espoir et l’inquiétude. À ses côtés, marchant comme son ombre, se tient Kael, son compagnon d’armes, son frère d’âme… ", 
  "Ils sont venus pour retrouver Aëlya, la princesse qui porte le mystérieux Cœur, une relique vivante capable de guérir un royaume… ou de le réduire en poussière. Disparue dans les profondeurs du labyrinthe, elle semble appeler Lioran à travers des échos, des murmures, des traces d’elle éparpillées comme des lucioles dans l’obscurité.", 
  "Mais Éphéria n’est pas qu’un dédale, c est un esprit, un piège, un cimetière d anciens voyageurs dont les voix hantent chaque orbe, chaque pierre, chaque recoin. Lioran et Kael avancent, percés par des énigmes sibyllines et des avertissements menaçants, tandis que quelque chose, dans les ténèbres, observe… grignote… s insinue.", 
].join("\n\n");
const INTRO_CRAWL_DURATION = 40000;
const INTRO_FADE_DURATION = 450;
const GOLD_PORTAL_FADE_DURATION = 450;
let introScrollActive = false;

function showIntroCrawl() {
  if (!($introScroll && $introScrollContent)) return Promise.resolve();
  if (introScrollActive) return Promise.resolve();
  return new Promise((resolve) => {
    introScrollActive = true;
    let resolved = false;
    let timer;
    let introClip = null;
    let introFadeStarted = false;
    const menuAudioEnabled = State.audioSettings?.menu ?? true;
    const handleSkipClick = (event) => {
      event?.preventDefault?.();
      finish();
    };
    const handleSkipKey = (event) => {
      if (event?.key?.toLowerCase?.() === "e") {
        event.preventDefault();
        finish();
      }
    };
    const fadeIntroAudio = () => {
      if (!introClip || introFadeStarted) return;
      introFadeStarted = true;
      fadeAudio(introClip, 0, 1200, () => {
        try {
          introClip.pause();
          introClip.currentTime = 0;
        } catch {
          // ignore cleanup errors
        }
        introClip = null;
      });
    };
    const startIntroAudio = () => {
      if (!menuAudioEnabled) return;
      const source = State.sounds?.intro;
      if (!source) return;
      try {
        introClip = source.cloneNode();
      } catch {
        introClip = source;
      }
      if (!introClip) return;
      introClip.loop = false;
      introClip.currentTime = 0;
      introClip.volume = 0.75;
      introClip.playbackRate = 0.5;
      introClip.play().catch(() => {});
    };
    const finish = () => {
      if (resolved) return;
      resolved = true;
      introScrollActive = false;
      clearTimeout(timer);
      window.removeEventListener("keydown", handleSkipKey);
      if ($introScrollSkip) {
        $introScrollSkip.removeEventListener("click", handleSkipClick);
      }
      const completeHide = () => {
        $introScroll.classList.add("hidden");
        resolve();
      };
      fadeIntroAudio();
      $introScroll.classList.remove("intro-scroll-active");
      $introScroll.classList.remove("visible");
      setTimeout(() => {
        if (!$introScroll.classList.contains("visible")) {
          completeHide();
        }
      }, INTRO_FADE_DURATION);
    };
    $introScrollContent.textContent = INTRO_CRAWL_TEXT;
    $introScroll.style.setProperty("--intro-duration", `${INTRO_CRAWL_DURATION}ms`);
    $introScroll.classList.remove("hidden");
    requestAnimationFrame(() => {
      $introScroll.classList.add("visible");
      requestAnimationFrame(() => $introScroll.classList.add("intro-scroll-active"));
    });
    window.addEventListener("keydown", handleSkipKey);
    if ($introScrollSkip) {
      $introScrollSkip.addEventListener("click", handleSkipClick);
    }
    startIntroAudio();
    timer = setTimeout(finish, INTRO_CRAWL_DURATION);
  });
}

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
  gameOver: "./assets/sounds/game-over/Theme_game_over.mp3",
  gameOverPost: "./assets/sounds/game-over/game-over.mp3",
  ambient: "./assets/sounds/Ambiance/Ambiance.mp3",
  themeAmbient: "./assets/sounds/Ambiance/Theme_ambiance.mp3",
  orbActivate: "./assets/sounds/orbes/orbes.mp3",
  princessCry: "./assets/sounds/princesse/crying_princesse.mp3",
  bossFight: "./assets/sounds/Kael_Spell/boss_fight.mp3",
  ghostWall: "./assets/sounds/Ghost/Laby_ghost.mp3",
  ghostDash: "./assets/sounds/Ghost/Ghost-attack.mp3",
  ghostCreepy: "./assets/sounds/Ghost/Creepy_ghost.mp3",
  intro: "./assets/sounds/Intro/Intro.mp3",
};
const MENU_SFX_PATHS = {
  start: "./assets/sounds/menu/start.mp3",
  click: "./assets/sounds/menu/click-button.mp3",
};
const MENU_THEME_PATH = "./assets/sounds/Theme_menu/Eternal-Glory.mp3";
const menuThemeAudio = (() => {
  const audio = new Audio(MENU_THEME_PATH);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.55;
  return audio;
})();

function updateMenuThemePlayback() {
  if (!menuThemeAudio) return;
  if (State.audioSettings?.menu) {
    menuThemeAudio.play().catch(() => {});
  } else {
    menuThemeAudio.pause();
  }
}

const resumeMenuThemeOnInteract = () => {
  updateMenuThemePlayback();
  window.removeEventListener("pointerdown", resumeMenuThemeOnInteract, { capture: true });
  window.removeEventListener("keydown", resumeMenuThemeOnInteract, { capture: true });
};
window.addEventListener("pointerdown", resumeMenuThemeOnInteract, { once: true, capture: true });
window.addEventListener("keydown", resumeMenuThemeOnInteract, { once: true, capture: true });
window.addEventListener("DOMContentLoaded", () => {
  updateMenuThemePlayback();
  setTimeout(() => updateMenuThemePlayback(), 1400);
});

const ORB_NAMES = {
  0: "red",
  1: "gold",
  2: "green",
  3: "blue",
};
const ORB_REALM_CONFIG = {
  0: { label: "Orbe rouge", mapSrc: "./assets/map/Red_orb.png", statusMessage: "Exploration rouge" },
  1: { label: "Orbes d'Éphéria", mapSrc: "./assets/map/Gold_orb.png", statusMessage: "Exploration dorée" },
  2: { label: "Orbe verte", mapSrc: "./assets/map/Green-orb.png", statusMessage: "Exploration verdoyante" },
  3: { label: "Orbe bleue", mapSrc: "./assets/map/Blue_orb.png", statusMessage: "Exploration bleue" },
};
const DESKTOP_ATTACK_KEYS = ["1", "&", "k"];
const ORB_MESSAGES = [
  "A toi qui n'a pas su écouter les voix, paye ton crime de ton âme.",
  "Vous n'êtes pas les bienvenues en ces lieux.",
  "Continuez et payer le prix.. Ou sortez et sacrifier votre coeur.",
  "Chaque pas dans une direction, vous éloigne de l'autre, jusqu'au point de non-retour.",
];
const ORB_REPEAT_MESSAGES = [
  "Kael ? tout va bien ? Tu es tout pâle..",
  "Tu as entendu ? D'ou venait cette voix ?",
  "Encore une menace, nous sommes forcés sur la bonne voie.",
  "On ne peux pas reculer maintenant, restons vigilant.",
];

const HUD_ROOT_ID = "hud";
const ORB_REALM_START_Y = 64;
const ORB_REALM_RETURN_RADIUS = 28;
const ORB_BARRIER_RATIO = 0.3;
const ORB_BARRIER_OFFSET = 60;
const ORB_BARRIER_VISIBLE = false;
const ORB_BARRIER_COLOR = "rgba(57, 255, 20, 0.55)";
const ORB_RETURN_ZONE_VISIBLE = true;
const ORB_RETURN_ZONE_RADIUS_EXTRA = 14;
const ORB_RETURN_ZONE_FILL = "rgba(250, 218, 39, 0.64)";
const ORB_RETURN_ZONE_STROKE = "rgba(153, 99, 0, 0.9)";
const ORB_RETURN_ZONE_VERTICAL_OFFSET = -90;
const ORB_REALM_CENTER = { x: 0, y: 0 };

function isGoldBossReturnAllowed() {
  if (orbRealmState.id !== 1) return true;
  const goldState = orbRealmState.goldBoss;
  if (!goldState) return false;
  return Boolean(goldState.returnUnlocked);
}

const orbRealmEntries = Object.fromEntries(
  Object.entries(ORB_REALM_CONFIG).map(([id, config]) => {
    const parsedId = Number(id);
    const image = new Image();
    const entry = {
      id: parsedId,
      config,
      image,
      loaded: false,
    };
    image.addEventListener("load", () => {
      entry.loaded = true;
    });
    image.addEventListener("error", () => {
      entry.loaded = true;
    });
    image.src = config.mapSrc;
    return [parsedId, entry];
  })
);
const orbHazards = [];
const ORB_SPELL_SCALE = 2;
const ORB_SPEED_MULT = 1.5;
const ORB_BOSS_CONFIG = {
  0: { hp: 320, attackDamage: 18, chaseSpeed: 120, scale: 0.34, color: "#ff6a4d" },
  1: { hp: 300, attackDamage: 16, chaseSpeed: 110, scale: 0.32, color: "#ffd98b", scaleMultiplier: 2.5, orbCount: 8 },
  2: { hp: 280, attackDamage: 14, chaseSpeed: 108, scale: 0.32, color: "#7bd68f" },
  3: { hp: 260, attackDamage: 15, chaseSpeed: 106, scale: 0.32, color: "#7fc0ff" },
};

const ORB_RIDDLES = {
  0: {
    title: "Énigme rouge",
    question:
      "Je suis la danse des braises qui dévore la forêt, le souffle qui avale le bois sans s’éteindre. Qui suis-je ?",
    options: ["La flamme éternelle", "Le murmure du vent", "La pierre immobile"],
    answerIndex: 0,
    success: "Le rouge s’incline : tu lis l’ardeur du feu, l’épreuve reste en cendres.",
    failure: "Le rouge rugit : tu as oublié la braise, tu vas brûler sans répit.",
  },
  1: {
    title: "Énigme dorée",
    question:
      "Je suis la lumière que les pierres gardent, le battement que Kael convoite. Je brûle sans se consumer. Qui suis-je ?",
    options: ["Le vent du labyrinthe", "Le Cœur d'Éphéria", "La colère d'un ancien roi"],
    answerIndex: 1,
    success: "Kael sourit : tu connais la vérité, le spectre s'incline et s'efface.",
    failure: "Kael rugit : tu t'es trompé. La lumière s'assombrit, prépare-toi au combat.",
  },
  2: {
    title: "Énigme verte",
    question:
      "Je suis la sève qui ranime, l’étincelle qui fait pousser les racines. Je ressuscite les plaines à chaque printemps. Qui suis-je ?",
    options: ["La vie qui jaillit", "La pluie de cendre", "Le silence des pierres"],
    answerIndex: 0,
    success: "La verdure applaudit : tu entends le souffle des racines, l’énigme est apaisée.",
    failure: "La forêt gronde : tu as ignoré sa croissance, elle t’enfonce dans l’ombre.",
  },
  3: {
    title: "Énigme bleue",
    question:
      "Je suis le miroir du ciel et la houle compacte, la patience qui garde les lacs. Qui suis-je ?",
    options: ["La mer en mouvement", "Le miroir du ciel", "La flamme glacée"],
    answerIndex: 1,
    success: "Le bleu t’accueille : tu domines les reflets, la vague reste calme.",
    failure: "Le bleu se referme : tu as brisé sa clarté, les eaux t’engloutissent.",
  },
};

const GOLD_BOSS_ENTRY_DURATION = 2.6;
const GOLD_BOSS_ENTRY_HEIGHT = 180;
const GOLD_BOSS_TRIGGER_DISTANCE = 20;
const GOLD_BOSS_APPROACH_SPEED = 110;
const GOLD_BOSS_AURA_RADIUS = 150;
const GOLD_BOSS_RIDDLE = ORB_RIDDLES[1];

const ORB_STORM_DESCRIPTORS = {
  0: { colorLabel: "rouge", spirit: "braise" },
  1: { colorLabel: "dorée", spirit: "lumière" },
  2: { colorLabel: "verte", spirit: "sève" },
  3: { colorLabel: "bleue", spirit: "onde" },
};

const ORB_LIGHT_STORM_DURATION = 20;
const ORB_LIGHT_STORM_BASE_SPEED = 240;
const ORB_LIGHT_STORM_MAX_SPEED = 560;
const ORB_LIGHT_STORM_START_INTERVAL = 0.7;
const ORB_LIGHT_STORM_END_INTERVAL = 0.18;
const ORB_LIGHT_STORM_ARROW_RADIUS = 24;
const ORB_LIGHT_STORM_BURST_COUNT = 12;
const ORB_LIGHT_STORM_VERTICAL_OFFSET = 100;
const ORB_LIGHT_STORM_ZONE_SHIFT_X = 0;
const ORB_LIGHT_STORM_TARGET_SHIFT_X = 0;
const ORB_LIGHT_STORM_GHOST_APPROACH_SPEED = 360;


function applyHeroAnimations(useGold) {
  const player = State.player;
  if (!player || !player.animator) return;
  if (useGold && heroGoldAnimations) {
    player.animator.setAnimations(heroGoldAnimations);
    player.animator.setBase("idle");
    goldAnimActive = true;
  } else if (!useGold && heroAnimations) {
    player.animator.setAnimations(heroAnimations);
    player.animator.setBase("idle");
    goldAnimActive = false;
  }
}
let orbRealmSpeedBackup = null;

const KAEL_MECHANIC_META = {
  dash: { label: "Dash Spectral", color: "#ffd18b", accent: "#ff6f40", icon: "⚡" },
  orb: { label: "Orbes d'Éphéria", color: "#ffe4c5", accent: "#ff853a", icon: "◎" },
  fissure: { label: "Fissure Brûlante", color: "#ffd1b8", accent: "#e04b1d", icon: "⛰" },
  sigil: { label: "Sigils Protecteurs", color: "#d1efff", accent: "#5fb7ff", icon: "✦" },
  clone: { label: "Flèches Sombres", color: "#c3e6ff", accent: "#4d8cff", icon: "〰" },
  beam: { label: "Rayon de Feu", color: "#ffe7bc", accent: "#ffb31a", icon: "━" },
  inferno: { label: "Souffle Infernal", color: "#ffd6aa", accent: "#ff3f1b", icon: "☄" },
  meteor: { label: "Pluie de Météores", color: "#ffd1b2", accent: "#ff5c1b", icon: "☄" },
  shockwave: { label: "Onde de Choc", color: "#fff0d9", accent: "#ffd600", icon: "◯" },
  storm: { label: "Éclairs Orbitaux", color: "#dbe9ff", accent: "#5fb7ff", icon: "⚡" },
};

function hexToRgba(value, alpha = 1) {
  if (!value) return `rgba(255,255,255,${alpha})`;
  const normalized = value.trim();
  if (/^(rgba?|hsla?|hsl)\(/i.test(normalized)) return normalized;
  let hex = normalized.replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
  }
  if (hex.length !== 6) return `rgba(255,255,255,${alpha})`;
  const parsed = parseInt(hex, 16);
  if (Number.isNaN(parsed)) return `rgba(255,255,255,${alpha})`;
  const r = (parsed >> 16) & 0xff;
  const g = (parsed >> 8) & 0xff;
  const b = parsed & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function enqueueKaelMechanic(action, phase, delay = 0) {
  const meta = KAEL_MECHANIC_META[action];
  if (!meta) return;
  const now = State.time;
  const dueAt = now + Math.max(0, delay);
  const alert = {
    action,
    phase,
    startAt: dueAt - 2,
    dueAt,
    label: meta.label,
    color: meta.color,
    accent: meta.accent,
    icon: meta.icon,
  };
  State.kaelMechanicAlerts = (State.kaelMechanicAlerts ?? []).filter((a) => a.dueAt > now);
  State.kaelMechanicAlerts.push(alert);
}

const touchControlState = {
  moveVector: null,
  attack: { held: false, justPressed: false },
  dashQueued: false,
  dashHeld: false,
};
State.touchControls = touchControlState;
  State.orbPromptOpen = false;
  State.bossRiddleOpen = false;
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
  previousPaused: false,
};
const bossRiddleState = {
  active: false,
  buttons: [],
  focusIndex: 0,
  keyHandler: null,
  optionHandler: null,
  onSelect: null,
  previousPaused: false,
  hideTimer: null,
  fullText: "",
  typingAccumulator: 0,
  typingSpeed: 64,
  textNode: null,
  optionsContainer: null,
  optionsVisible: false,
  typedChars: 0,
};
const orbRealmState = {
  active: false,
  id: null,
  returnPoint: null,
  returnCamera: null,
  restore: null,
  onReturn: null,
  playerScale: null,
  dashDistance: null,
  savedGhosts: null,
  orbGhost: null,
  kaelReplica: null,
  orbRiddleStatus: {},
  activeStorm: null,
  teleportEffect: null,
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
        touchControlState.dashHeld = true;
      },
      onRelease: () => {
        touchControlState.dashHeld = false;
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


const gameOverAudioNodes = new Set();

function trackGameOverAudio(node) {
  if (!node) return;
  gameOverAudioNodes.add(node);
  const cleanup = () => {
    gameOverAudioNodes.delete(node);
    node.removeEventListener("ended", cleanup);
    node.removeEventListener("error", cleanup);
  };
  node.addEventListener("ended", cleanup);
  node.addEventListener("error", cleanup);
}

function stopGameOverAudioPlayback() {
  if (!gameOverAudioNodes.size) return;
  for (const node of Array.from(gameOverAudioNodes)) {
    try {
      node.pause();
      node.currentTime = 0;
    } catch {
      try {
        node.pause();
      } catch {}
    }
    gameOverAudioNodes.delete(node);
  }
}

function playTrackedGameOverClip(name, volume = 1) {
  if (!State.audioSettings?.game) return null;
  const clip = State.sounds?.[name];
  if (!clip) return null;
  try {
    const node = clip.cloneNode();
    node.volume = Math.max(0, Math.min(1, volume));
    node.play().catch(() => {});
    trackGameOverAudio(node);
    return node;
  } catch {
    return null;
  }
}

function playSound(name, volume = 1) {
  if (!State.audioSettings?.game) return;
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

function createMenuClip(name, volume = 1) {
  const path = MENU_SFX_PATHS[name];
  if (!path) return null;
  const audio = new Audio(path);
  audio.preload = "auto";
  audio.volume = Math.max(0, Math.min(1, volume));
  return audio;
}

function playMenuClickSound(volume = 0.85) {
  const clip = createMenuClip("click", volume);
  if (!clip) return;
  clip.play().catch(() => {});
}

let ghostDashActive = 0;
function playGhostDashSound() {
  if (!State.audioSettings?.game) return;
  const clip = State.sounds?.ghostDash;
  if (!clip) return;
  if (ghostDashActive >= 2) return;
  let node;
  try {
    node = clip.cloneNode();
  } catch {
    return;
  }
  ghostDashActive += 1;
  const release = () => {
    ghostDashActive = Math.max(0, ghostDashActive - 1);
    node?.removeEventListener("ended", release);
    node?.removeEventListener("error", release);
  };
  node.addEventListener("ended", release);
  node.addEventListener("error", release);
  node.volume = 0.05;
  node.play().catch(() => release());
}

function playGhostWallSound() {
  if (State.ghostWallSoundPlayed) return;
  if (!State.audioSettings?.game) return;
  State.ghostWallSoundPlayed = true;
  playSound("ghostWall", 0.07);
}

function playGhostCreepy() {
  if (!State.audioSettings?.game) return;
  const clip = State.sounds?.ghostCreepy;
  if (!clip) return;
  const node = clip.cloneNode();
  node.volume = 0.45;
  node.play().catch(() => {});
  const fadeDelay = 5000;
  const fadeDuration = 1000;
  const startVolume = node.volume;
  const steps = Math.max(1, Math.ceil(fadeDuration / 50));
  let stepCount = 0;
  let fadeInterval = null;
  const startFade = () => {
    if (fadeInterval) return;
    fadeInterval = setInterval(() => {
      stepCount++;
      const ratio = Math.min(1, stepCount / steps);
      node.volume = Math.max(0, startVolume * (1 - ratio));
      if (ratio >= 1 && fadeInterval) {
        clearInterval(fadeInterval);
        fadeInterval = null;
      }
    }, fadeDuration / steps);
  };
  const fadeTimeout = setTimeout(startFade, fadeDelay);
  setTimeout(() => {
    if (fadeInterval) {
      clearInterval(fadeInterval);
      fadeInterval = null;
    }
    clearTimeout(fadeTimeout);
    node.pause();
    node.currentTime = 0;
  }, fadeDelay + fadeDuration);
}

function startAmbientMusic() {
  if (State.ambientMusicStarted) return;
  if (!State.audioSettings?.game) return;
  const ambientTrack = State.sounds?.ambient;
  const themeTrack = State.sounds?.themeAmbient;
  if (!ambientTrack && !themeTrack) return;
  try {
    if (ambientTrack) {
      ambientTrack.loop = true;
      ambientTrack.volume = 0.35 * 0.4; // reduce by 60%
      ambientTrack.currentTime = 0;
      ambientTrack.play().catch(() => {});
      State.activeAmbientTrack = ambientTrack;
    }
    if (themeTrack) {
      themeTrack.loop = true;
      themeTrack.volume = 0.02;
      themeTrack.currentTime = 0;
      themeTrack.play().catch(() => {});
      State.activeThemeAmbientTrack = themeTrack;
    }
    State.ambientMusicStarted = true;
  } catch {
    // ignore autoplay errors
  }
}

function pauseAmbientMusic() {
  State.activeAmbientTrack?.pause();
  State.activeThemeAmbientTrack?.pause();
}

function resumeAmbientMusic() {
  if (!State.audioSettings?.game) return;
  State.activeAmbientTrack?.play().catch(() => {});
  State.activeThemeAmbientTrack?.play().catch(() => {});
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
const HERO_GOLD_ANIMATION_SOURCES = {
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
  dash: ["./assets/hero/run/Run_right.png"],
  hurt: ["./assets/hero/hurt/Hurt.png"],
  dead: ["./assets/hero/dead/Dead.png"],
};

const KAEL_ANIMATION_SOURCES = {
  idle: ["./assets/Kael/idle/Idle.png", "./assets/Kael/idle/Idle_2.png"],
  walk_left: ["./assets/Kael/walk/Walk_left.png"],
  walk_right: ["./assets/Kael/walk/Walk_right.png"],
  run: ["./assets/Kael/run/Run.png"],
  attack: [
    "./assets/Kael/attack/Attack_1.png",
    "./assets/Kael/attack/Attack_2.png",
    "./assets/Kael/attack/Attack_3.png",
  ],
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

function buildGhostAnimationPaths(folder, stem, count = 20) {
  const frames = [];
  for (let i = 0; i < count; i++) {
    const idx = String(i).padStart(3, "0");
    frames.push({ src: `./assets/ghost/${folder}/${stem}_${idx}.png`, sheet: false });
  }
  return frames;
}

const GHOST_ANIMATION_SOURCES = {
  idle: buildGhostAnimationPaths("idle", "9_enemies_1_idle"),
  walk_left: buildGhostAnimationPaths("walk", "9_enemies_1_walk"),
  walk_right: buildGhostAnimationPaths("walk", "9_enemies_1_walk"),
  run: buildGhostAnimationPaths("run", "9_enemies_1_run"),
  attack: buildGhostAnimationPaths("attack", "9_enemies_1_attack"),
  hurt: buildGhostAnimationPaths("hurt", "9_enemies_1_hurt"),
  dead: buildGhostAnimationPaths("dead", "9_enemies_1_die"),
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
  const menuToggle = document.getElementById("toggleMenuSound");
  const gameToggle = document.getElementById("toggleGameSound");
  if (cards.length === 0) return;
  heroSelection = cards[0].getAttribute("data-src");
  cards.forEach((card) => {
    if (card !== cards[0]) card.classList.add("hidden");
    card.classList.add("selected");
  });
  startBtn.disabled = false;
  let startSequenceTriggered = false;
  const cleanupStartAnimation = () => {
    if (!startBtn) return;
    startBtn.classList.remove("menu-btn-launching");
    startBtn.style.removeProperty("--launch-duration");
  };
  const handleStartClick = () => {
    if (startSequenceTriggered) return;
    startSequenceTriggered = true;
    if (startBtn) startBtn.disabled = true;
    menuThemeAudio.pause();
    menuThemeAudio.currentTime = 0;
    const clip = createMenuClip("start", 0.95);
    const finalize = (() => {
      let done = false;
      return () => {
        if (done) return;
        done = true;
        cleanupStartAnimation();
        startGame();
      };
    })();
    if (!clip) {
      finalize();
      return;
    }
    startBtn.classList.add("menu-btn-launching");
    const applyDuration = () => {
      const duration = clip.duration;
      if (Number.isFinite(duration) && duration > 0) {
        startBtn.style.setProperty("--launch-duration", `${duration}s`);
      }
    };
    applyDuration();
    clip.addEventListener("loadedmetadata", applyDuration, { once: true });
    clip.addEventListener("ended", finalize, { once: true });
    clip.addEventListener("error", finalize, { once: true });
    clip.play().catch(() => finalize());
  };
  startBtn.addEventListener("click", handleStartClick);
  const bindToggle = (element, settingKey, label) => {
    if (!element) return;
    const sync = () => {
      const enabled = Boolean(State.audioSettings?.[settingKey]);
      const labelEl = element.querySelector(".label") ?? element;
      labelEl.textContent = `${label}: ${enabled ? "ON" : "OFF"}`;
    };
    const triggerClickAnimation = () => {
      element.classList.add("menu-btn-clicked");
      const cleanup = () => {
        element.classList.remove("menu-btn-clicked");
        element.removeEventListener("animationend", cleanup);
      };
      element.addEventListener("animationend", cleanup);
    };

    element.addEventListener("click", () => {
      State.audioSettings = State.audioSettings ?? { menu: true, game: true };
      State.audioSettings[settingKey] = !State.audioSettings[settingKey];
      if (settingKey === "menu") {
        updateMenuThemePlayback();
      }
      if (settingKey === "game") {
        if (State.audioSettings.game) {
          startAmbientMusic();
        } else {
          State.activeAmbientTrack?.pause();
          State.activeThemeAmbientTrack?.pause();
        }
      }
      sync();
      playMenuClickSound();
      triggerClickAnimation();
    });
    sync();
  };
  bindToggle(menuToggle, "menu", "Musique menu");
  bindToggle(gameToggle, "game", "Son du jeu");
  updateMenuThemePlayback();
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
      const normalized = files.map((entry) => {
        if (typeof entry === "string") return { src: entry, sheet: true };
        if (entry && typeof entry === "object") {
          return {
            src: entry.src,
            sheet: entry.sheet !== false,
          };
        }
        return { src: String(entry ?? ""), sheet: true };
      });
      const images = await Promise.all(normalized.map((item) => loadImage(item.src)));
      const frames = [];
      images.forEach((img, idx) => {
        const meta = normalized[idx];
        if (meta.sheet === false) {
          frames.push({ image: img, sx: 0, sy: 0, sw: img.width, sh: img.height });
        } else {
          frames.push(...sliceSheet(img));
        }
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
  menuThemeAudio.pause();
  menuThemeAudio.currentTime = 0;
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
    heroAnimationsLoaded,
    heroGoldAnimationsLoaded,
    kaelAnimations,
    dragonKaelAnimations,
    princessAnimations,
    ghostAnimationsLoaded,
    potionImage,
    soundBank,
  ] = await Promise.all([
    loadImage("./assets/hero1.png"),
    loadImage("./assets/hero2.png"),
    loadImage("./assets/hero3.png"),
    loadAnimations(HERO_ANIMATION_SOURCES),
    loadAnimations(HERO_GOLD_ANIMATION_SOURCES),
    loadAnimations(KAEL_ANIMATION_SOURCES),
    loadAnimations(KAEL_DRAGON_ANIMATION_SOURCES),
    loadAnimations(PRINCESS_ANIMATION_SOURCES),
    loadAnimations(GHOST_ANIMATION_SOURCES),
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
  heroAnimations = heroAnimationsLoaded;
  heroGoldAnimations = heroGoldAnimationsLoaded;
  State.dialoguePortraits = {
    hero1: byPath["./assets/hero1.png"],
    hero2: byPath["./assets/hero2.png"],
    hero3: byPath["./assets/hero3.png"],
  };
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
  const HERO_SPAWN_OFFSET_Y = 100;
  // force spawn to the north for tests and snap to an open tile
  let start = world.nearestOpen(spawn.x, 120, PLAYER_RADIUS);
  const heroTargetY = Math.max(0, (start?.y ?? 0) - HERO_SPAWN_OFFSET_Y);
  const heroStart = world.nearestOpen(start?.x ?? spawn.x, heroTargetY, PLAYER_RADIUS) ?? start;
  State.spawnPoint = { x: heroStart.x, y: heroStart.y };
  let kaelStart = world.nearestOpen(world.w * 0.86, world.h * 0.18, PLAYER_RADIUS);
  let princessPos = world.nearestOpen(world.w * 0.5, world.h * 0.5 + 110, PLAYER_RADIUS);
  const entrance = { x: heroStart.x, y: heroStart.y, r: 80 };

  function finalizeWorldLoop(dt) {
    const player = State.player;
    if (!player) return false;
    if (State.flags.kaelDefeated && State.princess.follow && !State.flags.endingPending) {
      if (Math.hypot(player.x - entrance.x, player.y - entrance.y) < entrance.r) {
        State.flags.endingPending = true;
        showOnlyEscapeEnding();
      }
    }
    if (player.hp <= 0) {
      State.flags = State.flags || {};
      if (!State.flags.deathPending) {
        State.flags.deathPending = true;
        State.deathPendingTimer = 0;
        player.animator?.play?.("dead");
        return true;
      }
      State.deathPendingTimer = Math.max(0, (State.deathPendingTimer ?? 0) + dt);
      if (State.deathPendingTimer < 1.1) {
        return true;
      }
      State.paused = true;
      State.flags.orbRealmPaused = Boolean(orbRealmState.active);
      if (State.flags.betrayalHappened && !State.flags.kaelDefeated) {
        renderBossGameOver();
      } else {
        renderDeath();
      }
      State.flags.deathPending = false;
      State.deathPendingTimer = 0;
      return true;
    }
    State.flags = State.flags || {};
    State.flags.orbRealmPaused = false;
    if (State.statusTimer > 0) {
      State.statusTimer = Math.max(0, State.statusTimer - dt);
      if (State.statusTimer === 0) State.statusMessage = "";
    }
    State.flags = State.flags || {};
    State.flags.deathPending = false;
    State.deathPendingTimer = 0;
    State.dialogue.update({ dt });
    maybeStartBossMusic();
    syncDialogueOverlay();
    return false;
  }

  // === Actors / systems ===
  const heroAudioHooks = {
    onAttackSound: (soundKey) => playSound(soundKey ?? "heroSlash", 0.85),
    onDashSound: () => playSound("heroDash", 0.75),
  };
  State.player = new Player(heroImg, heroStart.x, heroStart.y, heroAnimations, {
    scale: ACTOR_SCALE,
    ...heroAudioHooks,
  });
  {
    const originalApplyDamage = State.player.applyDamage.bind(State.player);
    State.player.applyDamage = (amount) => {
      if (!Number.isFinite(amount) || amount <= 0) {
        return originalApplyDamage(amount);
      }
      const result = originalApplyDamage(amount);
      if (State.flags.betrayalHappened && !State.flags.kaelDefeated) {
        spawnFloatingText(Math.round(amount), State.player.x, State.player.y - 20, {
          color: "rgba(255,80,80,0.95)",
          stroke: "rgba(0,0,0,0.7)",
        });
      }
      return result;
    };
  }
  State.inventory = new Inventory({ capacity: 3 });

  // Dialogue layer (auto-closed at boot)
  State.dialogue = createDialogueLayer();
  State.dialogue.close();

  applyHeroAnimations(false);

  let hud = createHUD();
  setHudMode(false);
  let activeHud = hud;

  function setHudMode(gold) {
    const root = document.getElementById(HUD_ROOT_ID);
    if (!root) return;
    if (gold) {
      root.classList.add("hud-gold");
    } else {
      root.classList.remove("hud-gold");
    }
  }

  State.kael = new NPC(kaelAnimations, kaelStart.x, kaelStart.y, "Kael", {
    scale: ACTOR_SCALE,
    speed: 110,
    keepDistance: 70,
    moveAction: "walk",
    idleAction: "idle",
    hitRadius: PLAYER_RADIUS,
    hp: 100,
    attackDamage: 16,
    attackRange: 38,
  });
  State.kael.follow = false;
  State.flags.kaelMet = false;
  State.flags.princessQuestAccepted = false;
  State.flags.preQuestBoundaryWarned = false;
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
    onMechanic: enqueueKaelMechanic,
  });
  State.bossCheckpoint = null;
  State.bossRetryShown = false;
  State.pickups = [];
  spawnPotion(heroStart.x - 258, heroStart.y + 150);
  State.ghosts = spawnGhosts(world, start, ghostAnimationsLoaded, 5);
  State.ghostAnimations = ghostAnimationsLoaded;
  ghostAnimations = ghostAnimationsLoaded;

  State.fog = new FogOfWar(world.w, world.h);
  State.fog.reveal(State.player.x, State.player.y, 180);

  State.puzzleOrbs = createPuzzleOrbs(world);

  setupKeyboard();
  setupPointer($canvas);
  setupPointer($canvas);

  await showIntroCrawl();

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
  State.pushStatus = pushStatus;

  function showBossObjective(title = "Vaincre Kael", subtitle = "", duration = 0.5) {
    const max = Math.max(0.1, duration);
    State.bossObjective = { title, subtitle, timer: max, max, extraHoldRemaining: 0 };
    State.bossObjectiveReminder = { title, subtitle };
    State.bossObjectiveReminderActive = true;
    updateBossObjectiveBanner();
  }

  function updateBossObjective(dt) {
    const obj = State.bossObjective;
    if (!obj) return;
    if (obj.timer > 0) {
      obj.timer = Math.max(0, obj.timer - dt * 3);
      if (obj.timer > 0) return;
    }
    if ((obj.extraHoldRemaining ?? 0) <= 0) {
      obj.extraHoldRemaining = 1;
    }
    obj.extraHoldRemaining = Math.max(0, obj.extraHoldRemaining - dt);
    if (obj.extraHoldRemaining > 0) return;
    State.bossObjective = null;
    State.bossObjectiveReminderActive = !State.flags.kaelDefeated;
    updateBossObjectiveBanner();
  }

  function updateBossObjectiveBanner() {
    if (!$bossObjectiveBanner) return;
    const reminder = State.bossObjectiveReminder;
    if (State.bossObjectiveReminderActive && reminder && !State.flags.kaelDefeated) {
      const label = reminder.subtitle ? `${reminder.title} · ${reminder.subtitle}` : reminder.title;
      $bossObjectiveBanner.textContent = label;
      $bossObjectiveBanner.classList.remove("hidden");
    } else {
      $bossObjectiveBanner.classList.add("hidden");
    }
  }

  function spawnPotion(x, y) {
    State.pickups.push({
      type: "potion",
      x,
      y: y + 2,
      radius: 8,
      blocking: true,
      collisionShape: "potion",
      texture: potionTexture,
      iconSrc: POTION_SPRITE,
    });
  }

  function handlePickups() {
    if (!State.pickups.length) return;
    State.pickups = State.pickups.filter((pickup) => !pickup.collected);
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

  function drawQuestMarker(ctx, npc) {
    if (!npc) return;
    const markerHeight = 20;
    const markerWidth = 12;
    const offsetY = 15;
    ctx.save();
    ctx.translate(npc.x, npc.y - offsetY);
    ctx.fillStyle = "#f6c344";
    ctx.beginPath();
    ctx.moveTo(0, -markerHeight);
    ctx.lineTo(markerWidth * 0.6, -4);
    ctx.lineTo(0, 6);
    ctx.lineTo(-markerWidth * 0.6, -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1c1c2b";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", 0, -5);
    ctx.restore();
  }

  function drawQuestBanner(ctx, screenX, screenY, qa) {
    if (!qa) return;
    const w = 220;
    const h = 64;
    const x = screenX - w / 2;
    const y = screenY - h;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (qa.timer ?? 0) / (qa.max || 4) + 0.3);
    const grd = ctx.createLinearGradient(x, y, x, y + h);
    grd.addColorStop(0, "rgba(32,36,58,0.92)");
    grd.addColorStop(1, "rgba(18,22,38,0.94)");
    ctx.fillStyle = grd;
    ctx.strokeStyle = "rgba(255,210,120,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffd76a";
    ctx.font = "bold 16px 'Segoe UI', sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    ctx.fillText(qa.title ?? "Quete acceptee", screenX, y + 10);
    ctx.fillStyle = "#e9f1ff";
    ctx.font = "13px 'Segoe UI', sans-serif";
    ctx.fillText(qa.subtitle ?? "", screenX, y + 32);
    ctx.restore();
  }

  function drawBossObjective(ctx, screenX, screenY, objective) {
    if (!objective) return;
    const w = 360;
    const h = 110;
    const x = screenX - w / 2;
    const y = screenY - h - 10;
    const timer = objective.timer ?? 0;
    const max = Math.max(0.1, objective.max ?? 1);
    const holding = (objective.extraHoldRemaining ?? 0) > 0;
    const ratio = holding ? 1 : Math.min(1, timer / max);
    const alpha = Math.min(1, Math.max(0, ratio * 1.2));
    ctx.save();
    ctx.globalAlpha = alpha;
    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, "rgba(220, 48, 48, 0.98)");
    gradient.addColorStop(1, "rgba(32, 6, 6, 0.93)");
    ctx.fillStyle = gradient;
    ctx.strokeStyle = "rgba(255, 200, 120, 0.97)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffe7b4";
    ctx.font = "bold 24px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(objective.title ?? "Objectif", screenX, y + 12);
    if (objective.subtitle) {
      ctx.fillStyle = "#f5f8ff";
      ctx.font = "17px 'Segoe UI', sans-serif";
      ctx.fillText(objective.subtitle, screenX, y + 48);
    }
    ctx.restore();
  }

  function drawLowHpOverlay(ctx, player) {
    if (!player) return;
    const maxHp = player.maxHp || 1;
    const ratio = Math.max(0, Math.min(1, (player.hp ?? maxHp) / maxHp));
    const threshold = 0.6;
    if (ratio >= threshold) return;
    const severity = Math.max(0, Math.min(1, (threshold - ratio) / threshold));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const w = $canvas.width;
    const h = $canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radial = ctx.createRadialGradient(
      cx,
      cy,
      Math.min(w, h) * 0.05,
      cx,
      cy,
      Math.max(w, h)
    );
    radial.addColorStop(0, "rgba(0,0,0,0)");
    radial.addColorStop(0.4, `rgba(255,90,90,${0.15 * severity})`);
    radial.addColorStop(0.75, `rgba(220,30,40,${0.35 * severity})`);
    radial.addColorStop(1, `rgba(200,20,40,${0.8 * severity})`);
    ctx.globalAlpha = Math.min(1, 0.3 + severity * 0.6);
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  // ===== Update =====
  function update(dt) {
  const { player, map } = State;

  State.questPromptCooldown = Math.max(0, (State.questPromptCooldown ?? 0) - dt);
    updateFloatingTexts(dt);
    if (State.bossRiddleOpen) {
      updateBossRiddleText(dt);
    }

    const camera = State.camera;
    const pointerData = null;
    State.pointer = pointerData;
    let moveVectorInput = null;
    let currentAim = State.lastAim ?? { x: 1, y: 0 };
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
        if (dist > 0.01) currentAim = { x: x / dist, y: y / dist };
      }
    }
    // si aucune entrée de déplacement, aligner l'aim sur le facing horizontal
    if ((!moveVectorInput || moveVectorInput.dist === 0) && State.player) {
      currentAim = State.player.facing === "left" ? { x: -1, y: 0 } : { x: 1, y: 0 };
    }
    State.lastAim = currentAim;
    if (State.player) State.player._aimDir = currentAim;
    if (!State.attackInput) {
      State.attackInput = { lastTap: -Infinity, holdStart: 0, wasHeld: false, pendingDouble: false };
    }
    maybeStartBossMusic();
    updateBossObjectiveBanner();
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
    const quickItemPressed = consume("l") || consume("2");
    const bossShortcutPressed = consume("9");
    const goldTeleportPressed = consume("8");
    const jumpPressed = consume("j");
    const interactPressed = consume("e");
    const rangedPressed = consume("3") || consume("m");

    // E pour interagir uniquement si aucun dialogue en cours
    const orbRealmFlag = State.flags?.orbRealm;
    const orbRealmFlagActive = orbRealmFlag != null;
    const orbPaused = Boolean(State.flags?.orbRealmPaused);
    if (
      (State.paused && (!orbRealmFlagActive || orbPaused)) ||
      State.orbPromptOpen ||
      State.bossRiddleOpen
    ) {
      State.dialogue.update({ dt: 0 });
      syncDialogueOverlay();
      activeHud.update({
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
    if (rangedPressed && player.rangedCooldown <= 0) {
      fireRangedAttack(player, currentAim);
    }
    if (bossShortcutPressed) {
      triggerBossFightShortcut();
    }

    const dashHold = Keys.has(" ") || (touchControlState.dashHeld ?? false);

    if (interactPressed && !State.dialogue.isOpen()) tryInteract();

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
      dashHold,
    });
    const dashTrailLife = 0.36;
    const dashTrail = State.playerDashTrail ?? [];
    if (player.isDashing) {
      dashTrail.push({
        x: player.x,
        y: player.y,
        life: dashTrailLife,
        maxLife: dashTrailLife,
      });
      if (dashTrail.length > 28) {
        dashTrail.splice(0, dashTrail.length - 28);
      }
    }
    dashTrail.forEach((node) => {
      node.life = Math.max(0, node.life - dt);
    });
    State.playerDashTrail = dashTrail.filter((node) => node.life > 0);

    const attackTrailLife = 0.26;
    const attackTrail = State.playerAttackTrail ?? [];
    if (player.isAttackActive?.()) {
      const facing = player.facing === "left" ? -1 : 1;
      attackTrail.push({
        x: player.x + facing * 12,
        y: player.y,
        life: attackTrailLife,
        maxLife: attackTrailLife,
        radius: 18 + Math.random() * 6,
      });
      if (attackTrail.length > 30) {
        attackTrail.splice(0, attackTrail.length - 30);
      }
    }
    attackTrail.forEach((node) => {
      node.life = Math.max(0, node.life - dt);
    });
    State.playerAttackTrail = attackTrail.filter((node) => node.life > 0);
    enforcePreKaelBoundary(player);
    handlePickups();
    if (goldTeleportPressed && !orbRealmState.active) {
      enterOrbRealm(1);
    }
    if (orbRealmState.active) {
      processOrbRealmInputs({
        player,
        map,
        dashPressed,
        moveVector: moveVectorInput,
        pointerData,
      });
      checkOrbRealmReturn(player);
      enforceOrbBarrier(player);
      updateOrbHazards(dt);
      updateOrbRealmCamera(player);
        activeHud.update?.({
          hp: player.hp,
          hpMax: player.maxHp ?? 100,
          stamina: player.stamina,
          staminaMax: player.staminaMax ?? 100,
          status: "Exploration dorée",
          dashCooldown: player.getDashCooldown?.() ?? 0,
          dashCooldownMax: player.dashCooldown ?? 1,
          inventory: State.inventory?.list?.() ?? [],
          capacity: State.inventory?.capacity ?? 3,
          combo: player.getComboWindowProgress?.() ?? 0,
          charge: player.getChargeProgress?.() ?? 0,
        });
      clampCameraToPlayer(player?.x ?? 0, player?.y ?? 0);
      State.fog.reveal(player?.x ?? 0, player?.y ?? 0, 170);
      updateGhosts(dt);
      if (orbRealmState.id === 1) {
        updateGoldBossLifecycle(dt, player);
        if (orbRealmState.kaelReplica && orbRealmState.goldBoss?.combatActive) {
          orbRealmState.kaelReplica.update(dt, player, State.map);
        }
      }
      updateQuestAnnouncement(dt);
      maybeAutoAcceptKaelQuest();
      if (orbRealmState.activeStorm) {
        updateActiveLightStorm(dt, player);
      }
      updateBossObjective(dt);
      updateProjectiles(dt);
      damageGhostsFromPlayer();
      if (finalizeWorldLoop(dt)) return;
      return;
    }
    maybeTriggerPrincessHint();
    checkPrincessQuestCompletion(player);
    updateProjectiles(dt);
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
      const dashed = player.tryDash(map, dashDir);
      if (dashed && isKaelAllyAlive() && State.flags.princessQuestAccepted) {
        const heroDashDuration = Math.max(
          0.05,
          Number.isFinite(player.dashDuration)
            ? player.dashDuration
            : CONFIG.dashDuration ?? 0.25
        );
        const heroDashSpeed = player.dashDistance / heroDashDuration;
        State.kael.startPartnerDash(dashDir, {
          duration: heroDashDuration,
          speed: heroDashSpeed,
        });
      }
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
    let kaelTarget = player;
    const savedKeep = State.kael.keepDistance;
    if (!State.flags.betrayalHappened && isKaelAllyAlive() && State.flags.kaelAggro) {
      const nearbyGhost = findNearestAliveGhost(170);
      if (nearbyGhost) {
        kaelTarget = nearbyGhost;
        State.kael.keepDistance = 30;
      }
    }
    State.kael.update(dt, kaelTarget, map);
    const kaelDashTrailLife = 0.36;
    const kaelDashTrail = State.kaelDashTrail ?? [];
    const kael = State.kael;
    if (kael?.isPartnerDashing?.()) {
      kaelDashTrail.push({
        x: kael.x,
        y: kael.y,
        life: kaelDashTrailLife,
        maxLife: kaelDashTrailLife,
      });
      if (kaelDashTrail.length > 28) {
        kaelDashTrail.splice(0, kaelDashTrail.length - 28);
      }
    }
    kaelDashTrail.forEach((node) => {
      node.life = Math.max(0, node.life - dt);
    });
    State.kaelDashTrail = kaelDashTrail.filter((node) => node.life > 0);
    State.kael.keepDistance = savedKeep;
    if (State.flags.princessUnlocked) {
      State.princess.update(dt, player, map);
    }
    updateGhosts(dt);
    if (!State.flags.betrayalHappened) {
      handleKaelVsGhosts(dt);
      maybeWarnEnemiesNearby();
    }
    updateQuestAnnouncement(dt);
    maybeAutoAcceptKaelQuest();
    updateBossObjective(dt);

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
        spawnFloatingText(dmg, State.boss.x, State.boss.y - 30, {
          color: "rgba(255,215,110,1)",
          stroke: "rgba(0,0,0,0.6)",
        });
        player.confirmAttackHit?.();
      }
      if (!State.boss.alive && !State.flags.kaelDefeated) {
        State.flags.kaelDefeated = true;
        State.bossObjectiveReminderActive = false;
        updateBossObjectiveBanner();
        State.bossObjective = null;
        State.bossMusicPending = false;
        stopBossMusic(true);
        if (State.flags.kaelPhaseThreeStarted && !State.flags.kaelPhaseThreeDefeated) {
          State.flags.kaelPhaseThreeDefeated = true;
          State.flags.princessEscapeOffered = false;
          pauseForDialogue(
            [
              {
                speaker: "Kael",
                text: "Je... Pardonne... Moi...",
              },
              {
                speaker: "???",
                text: "Vous n'êtes pas les bienvenues en ces lieux... PARTEZ !",
              },
              {
                speaker: "Moi",
                text: "Aelya ! Prends ma main, partons vite !",
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
              { speaker: "Kael", text: "ARGH... Tu es devenu fort mon ami.." },
              { speaker: "Moi", text: "Je dois rejoindre la princesse au plus vite." },
            ],
            () => {
              pushStatus("Parle à Aelya pour quitter le labyrinthe.");
            }
          );
        } else {
          State.dialogue.show([{ speaker: "Moi", text: "Les ombres ce rapproche, nous devons fuir, et vite." }]);
        }
      }
    }
    damageGhostsFromPlayer();

    if (finalizeWorldLoop(dt)) return;

    // HUD
    activeHud.update({
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

  function findNearbyPickup({ type = "potion", threshold = 14 } = {}) {
    const player = State.player;
    const pickups = State.pickups;
    if (!player || !Array.isArray(pickups) || pickups.length === 0) return null;
    const r = (player.r ?? 10) + (threshold ?? 0);
    return pickups.find((pickup) => {
      if (pickup.collected) return false;
      if (type && pickup.type !== type) return false;
      const reach = (pickup.radius ?? 10) + r;
      return Math.hypot(player.x - pickup.x, player.y - pickup.y) <= reach;
    });
  }

  function tryInteractPickup() {
    const pickup = findNearbyPickup({ type: "potion", threshold: 12 });
    if (!pickup) return false;
    const added = State.inventory.add(pickupFactory.potion());
    if (!added) {
      pushStatus("Inventaire plein");
      return true;
    }
    pickup.collected = true;
    pushStatus("Potion récupérée");
    handlePickups();
    return true;
  }

  // ===== Interactions =====
  function tryInteract() {
    if (State.dialogue.isOpen()) return;
    if (State.orbPromptOpen || State.bossRiddleOpen) return;
    if (tryInteractOrb()) return;
    if (tryInteractPickup()) return;
    // Simple example: speak to Kael when close
    const dKael = Math.hypot(State.player.x - State.kael.x, State.player.y - State.kael.y);
    if (
      dKael < 70 &&
      !State.flags.princessQuestAccepted &&
      !State.orbPromptOpen &&
      !State.bossRiddleOpen
    ) {
      startKaelQuestDialogue();
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
        State.dialogue.show([
          {
            speaker: "Princesse",
            text: "Lorian, Kael.. Vous m'avez libéré de ce labyrinthe infernale. merci.",
          },
          {
            speaker: "Moi",
            text: "Princesse, veuillez me pardonner mais le temps presse, nous devons fuir !",
          },
          {
            speaker: "Kael",
            text: "Lorian.. les voix.. Je.. AHHHHH",
          },
        ]);
        return;
      }
      startPrincessEncounter();
      return;
    }
  }

  function teleportToBossArena() {
    const spawn = State.spawnPoint ?? { x: State.player.x, y: State.player.y - 120 };
    const heroX = spawn.x;
    const heroY = spawn.y + 150;
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
            text: "Lorian, Kael.. Vous m'avez libéré de ce labyrinthe maudit. merci.",
          },
          {
            speaker: "Moi",
            text: "Princesse, veuillez me pardonner mais le temps presse, nous devons fuir !",
          },
          {
            speaker: "Kael",
            text: "Lorian.. les voix.. Je.. AHHHHH",
          },
        {
          speaker: "Princesse",
          text: "Lioran… j'entends le cœur d'Éphéria. L'ombre de Kael vacille.",
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
  if (State.orbPromptOpen || State.bossRiddleOpen) return true;

  const orb = findNearbyOrb();
  if (!orb) return false;

  if (isKaelTooFarForOrb()) {
    remindKaelToInspectOrb();
    return true;
  }

  // Orbe déjà activée : on ne rejoue pas la séquence, juste un feedback
  if (orb.activated) {
    if (orb.repeatUsed) {
      pushStatus("L'orbe est silencieuse.");
      return true;
    }

    // Cas de secours : activée mais pas encore de dialogue (bug / edge-case)
    startOrbDialogueSequence(orb, 0);
    return true;
  }

  // Première interaction → prompt Oui / Non
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
    if (isOrbRealmActive()) return;
    if (State.time - lastKaelOrbReminderTime < 4) return;
    if (State.dialogue?.isOpen?.()) return;
    lastKaelOrbReminderTime = State.time;
      State.dialogue?.show?.([
        {
          speaker: "Kael",
          text: "Lioran… Je sens la présence du coeur. J'ignore ce que nous faisons, mais cela semble fonctionner !",
        },
      ]);
  }

  function showOrbPrompt(orb) {
    if (!$orbPrompt || !orb) return;
    hideOrbPrompt();
    State.orbPromptOpen = true;
    orbPromptState.orb = orb;
    orbPromptState.previousPaused = State.paused;
    State.paused = true;
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
      if (ORB_REALM_CONFIG[orb?.id]) {
        handleOrbRealmActivation(orb);
        return;
      }
      const flashDuration = activateOrb(orb) || 0;
      startOrbDialogueSequence(orb, flashDuration);
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
      } else if (event.key === "e" || event.key === "E") {
        event.preventDefault();
        event.stopPropagation();
        const yesBtn = $orbPrompt.querySelector("[data-orb-yes]");
        yesBtn?.click();
      } else if (event.key === "Enter") {
        event.preventDefault();
        const btn = orbPromptState.buttons[orbPromptState.focusIndex];
        btn?.click();
      }
    };
    orbPromptState.yesHandler = handleYes;
    orbPromptState.noHandler = handleNo;
    orbPromptState.keyHandler = handleKey;
    yesBtn?.addEventListener("click", handleYes);
    noBtn?.addEventListener("click", handleNo);
    window.addEventListener("keydown", handleKey);
  }

  function handleOrbRealmActivation(orb) {
    if (!orb) return;
    enterOrbRealm(orb.id).then(() => {
      const flashDuration = activateOrb(orb) || 0;
      startOrbDialogueSequence(orb, flashDuration);
    });
  }

function pauseWorldForOrb(orbId) {
  const flags = State.flags || (State.flags = {});
  flags.orbRealm = orbId;
  State.dialogue?.close?.();
  stopBossMusic(true);
  pauseAmbientMusic();
}

function resumeWorldAfterOrb() {
  const flags = State.flags || (State.flags = {});
  flags.orbRealm = null;
  resumeAmbientMusic();
}

function isOrbRealmActive() {
  return Boolean(State.flags?.orbRealm != null || orbRealmState.active);
}

async function enterOrbRealm(orbId) {
  const entry = orbRealmEntries[orbId];
  if (!entry) return Promise.resolve();
  if (orbRealmState.active && orbRealmState.id === orbId) return Promise.resolve();
  if (!entry.loaded) {
    await new Promise((resolve) => {
      const done = () => {
        entry.loaded = true;
        resolve();
      };
      entry.image.addEventListener("load", done, { once: true });
      entry.image.addEventListener("error", done, { once: true });
    });
  }
  if (!entry.loaded) return Promise.resolve();
  const player = State.player;
  const camera = State.camera;
  if (!player || !camera) return Promise.resolve();
  orbRealmState.returnPoint = { x: player.x, y: player.y };
  orbRealmState.returnCamera = { x: camera.x, y: camera.y };
  orbRealmState.restore = {
    map: State.map,
    mapImg,
    fog: State.fog,
    cameraW: camera.w,
    cameraH: camera.h,
    puzzleOrbs: State.puzzleOrbs,
  };
  State.puzzleOrbs = [];
  orbRealmState.goldBoss = null;
  pauseWorldForOrb(orbId);
  orbRealmState.savedGhosts = State.ghosts ?? [];
  orbHazards.length = 0;
  if (orbId === 1) {
    const replica = new BossKael(kaelAnimations, player.x + 60, player.y, {
      scale: ACTOR_SCALE,
      hitRadius: (CONFIG?.actorRadius ?? 12) * 2,
      onPlaySound: (name) => playSound(name, name === "kaelOrbLaunch" ? 0.9 : 1),
      onMechanic: enqueueKaelMechanic,
    });
    replica.resetForFight({ x: player.x + 60, y: player.y });
    const ghostAnim = State.ghostAnimations ?? ghostAnimations ?? {};
    replica.animator = new Animator(ghostAnim, "idle");
    replica.baseAnimations = replica.animator.animations;
    replica.scale = (replica.scale ?? 1) * (ORB_BOSS_CONFIG[1]?.scaleMultiplier ?? 1);
    replica.baseScale = replica.scale;
    replica.orbCount = ORB_BOSS_CONFIG[1]?.orbCount ?? 8;
    replica.realmLabel = "Kael";
    replica.realmColor = "#ffd18b";
    replica.speed = (replica.speed ?? 1) * ORB_SPEED_MULT;
    replica.dashSpeed = (replica.dashSpeed ?? (replica.speed * 3)) * ORB_SPEED_MULT;
    orbRealmState.kaelReplica = replica;
    orbRealmState.orbGhost = null;
    State.ghosts = [];
  } else {
    orbRealmState.kaelReplica = null;
    const orbGhost = createOrbBossGhost(orbId, player.x + 60, player.y);
    orbRealmState.orbGhost = orbGhost;
    State.ghosts = orbGhost ? [orbGhost] : [];
  }
  if (orbId !== 1) {
    presentOrbRiddle(orbId);
  }
  const realmMap = createOrbRealmWorld(entry.image);
  State.map = realmMap;
  mapImg = entry.image;
  State.fog = new FogOfWar(State.map.w, State.map.h);
  State.fog.reveal(State.map.w / 2, State.map.h / 2, Math.max(State.map.w, State.map.h));
  player.x = Math.max(30, State.map.w / 2);
  player.y = ORB_REALM_START_Y;
  if (orbId === 1 && orbRealmState.kaelReplica) {
    orbRealmState.goldBoss = {
      stage: "waiting",
      entranceTimer: 0,
      riddleShown: false,
      answered: false,
      combatActive: false,
      returnUnlocked: false,
    };
    const boss = orbRealmState.kaelReplica;
    const baseScale = boss.baseScale ?? boss.scale ?? 1;
    boss.x = ORB_REALM_CENTER.x;
    boss.y = ORB_REALM_CENTER.y - GOLD_BOSS_ENTRY_HEIGHT;
    boss.scale = baseScale * 0.6;
    boss.alive = true;
  }
  if (!orbRealmState.playerScale) {
    orbRealmState.playerScale = player.scale;
    player.scale = (player.scale ?? 1) * 2;
  }
  if (!orbRealmSpeedBackup) {
    orbRealmSpeedBackup = player.speed;
  }
  player.speed = (player.speed ?? 1) * 2;
  if (!orbRealmState.dashDistance) {
    orbRealmState.dashDistance = player.dashDistance;
    player.dashDistance = (player.dashDistance ?? 120) * 2;
  }
  const realmZoom = CAMERA_ZOOM * 0.35;
  camera.w = Math.min(Math.max(1, $canvas.width / realmZoom), State.map.w);
  camera.h = Math.min(Math.max(1, $canvas.height / realmZoom), State.map.h);
  clampCameraToPlayer(player.x, player.y);
  setHudMode(true);
  applyHeroAnimations(true);
  activeHud.update?.({
    hp: player.hp,
    hpMax: player.maxHp ?? 100,
    stamina: player.stamina,
    staminaMax: player.staminaMax ?? 100,
    status: entry.config.statusMessage ?? "Exploration dorée",
    dashCooldown: player.getDashCooldown?.() ?? 0,
    dashCooldownMax: player.dashCooldown ?? 1,
  });
  orbRealmState.active = true;
  orbRealmState.id = orbId;
  return new Promise((resolve) => {
    orbRealmState.onReturn = resolve;
  });
}

function exitOrbRealm() {
  if (!orbRealmState.active) return;
  orbRealmState.active = false;
  const player = State.player;
  const camera = State.camera;
  restoreWorldFromOrb();
  State.ghosts = orbRealmState.savedGhosts ?? [];
  orbRealmState.savedGhosts = null;
  if (player && orbRealmState.returnPoint) {
    player.x = orbRealmState.returnPoint.x;
    player.y = orbRealmState.returnPoint.y;
  }
  if (camera && orbRealmState.returnCamera) {
    camera.x = orbRealmState.returnCamera.x;
    camera.y = orbRealmState.returnCamera.y;
  }
  clampCameraToPlayer(player?.x ?? 0, player?.y ?? 0);
  const callback = orbRealmState.onReturn;
  orbRealmState.onReturn = null;
  if (typeof callback === "function") {
    callback();
  }
  hideOrbEntitiesForStorm(false);
  orbRealmState.activeStorm = null;
  orbRealmState.orbRiddleStatus = {};
  if (player && orbRealmState.playerScale) {
    player.scale = orbRealmState.playerScale;
    orbRealmState.playerScale = null;
  }
  if (player && orbRealmSpeedBackup) {
    player.speed = orbRealmSpeedBackup;
    orbRealmSpeedBackup = null;
  }
  if (player && orbRealmState.dashDistance) {
    player.dashDistance = orbRealmState.dashDistance;
    orbRealmState.dashDistance = null;
  }
  if (player && State.fog) {
    State.fog.reveal(player.x, player.y, 170);
  }
  setHudMode(false);
  resumeWorldAfterOrb();
  applyHeroAnimations(false);
  hud = createHUD();
  activeHud = hud;
  orbRealmState.id = null;
  orbHazards.length = 0;
  orbRealmState.orbGhost = null;
  orbRealmState.goldBoss = null;
  const flags = State.flags || (State.flags = {});
  flags.orbRealmPaused = false;
}

function restoreWorldFromOrb() {
  if (!orbRealmState.restore) return;
  State.map = orbRealmState.restore.map;
  mapImg = orbRealmState.restore.mapImg;
  State.fog = orbRealmState.restore.fog;
  const camera = State.camera;
  if (camera) {
    camera.w = orbRealmState.restore.cameraW ?? camera.w;
    camera.h = orbRealmState.restore.cameraH ?? camera.h;
  }
  State.puzzleOrbs = orbRealmState.restore.puzzleOrbs ?? State.puzzleOrbs ?? [];
  orbRealmState.restore = null;
}

function createOrbRealmWorld(image) {
  const width = Math.max(1, image.width || 512);
  const height = Math.max(1, image.height || 384);
  ORB_REALM_CENTER.x = width / 2;
  ORB_REALM_CENTER.y = height / 2 + ORB_RETURN_ZONE_VERTICAL_OFFSET;
  return {
    w: width,
    h: height,
    nearestOpen: (x = width * 0.5, y = height * 0.5) => ({
      x: Math.max(2, Math.min(width - 2, x)),
      y: Math.max(2, Math.min(height - 2, y)),
    }),
    isBlocked: () => false,
    circleFree: (px, py, radius) => {
      if (radius == null) radius = 0;
      const minX = radius;
      const maxX = width - radius;
      const minY = radius;
      const maxY = height - radius;
      return px >= minX && px <= maxX && py >= minY && py <= maxY;
    },
    getTiles: () => [],
  };
}
function updateGoldBossLifecycle(dt, player) {
  const goldState = orbRealmState.goldBoss;
  if (!goldState) return;
  if (orbRealmState.kaelReplica && goldState.stage !== "storm") {
    orbRealmState.kaelReplica.hiddenForStorm = false;
  }
  if (goldState.stage === "waiting" && player) {
    const dist = Math.hypot(player.x - ORB_REALM_CENTER.x, player.y - ORB_REALM_CENTER.y);
    if (dist <= GOLD_BOSS_TRIGGER_DISTANCE) {
      startGoldBossEntrance();
    }
  } else if (goldState.stage === "enter") {
    updateGoldBossEntrance(dt);
  } else if (goldState.stage === "approach") {
    updateGoldBossApproach(dt, player);
  }
  if (
    goldState.combatActive &&
    orbRealmState.kaelReplica &&
    !orbRealmState.kaelReplica.alive
  ) {
    goldState.combatActive = false;
    goldState.returnUnlocked = true;
    pushStatus("La lumière s'apaise, la sortie se dévoile.");
  }
}

function startGoldBossEntrance() {
  const goldState = orbRealmState.goldBoss;
  const boss = orbRealmState.kaelReplica;
  if (!goldState || !boss || goldState.stage !== "waiting") return;

  goldState.stage = "enter";
  goldState.entranceTimer = GOLD_BOSS_ENTRY_DURATION;

  // Position de départ : bien au-dessus du centre
  boss.x = ORB_REALM_CENTER.x;
  boss.y = ORB_REALM_CENTER.y - GOLD_BOSS_ENTRY_HEIGHT;

  const baseScale = boss.baseScale ?? boss.scale ?? 1;
  boss.baseScale = baseScale; // on s'assure que c'est stocké
  boss.scale = baseScale * 0.4; // très petit au début
  boss.alive = true;

  // Petits paramètres d'animation "whaou"
  goldState.entryFx = {
    // Secousse + pulsation pendant qu'il « charge »
    shake: true,
    pulse: true,
    playedImpact: false
  };

  // Hooks FX (si tu as déjà ces systèmes quelque part)
  // playSfx && playSfx("gold_boss_appear");
  // cameraFocus && cameraFocus(ORB_REALM_CENTER.x, ORB_REALM_CENTER.y, 1.2);
  // triggerScreenFlash && triggerScreenFlash(0.3);
}
const Fx = {
  shakeTimer: 0,
  shakeIntensity: 0,
  flashTimer: 0,
  flashColor: "rgba(255, 255, 255, 1)",
  particles: []
};

function updateGoldBossEntrance(dt) {
  const goldState = orbRealmState.goldBoss;
  const boss = orbRealmState.kaelReplica;
  if (!goldState || !boss || goldState.stage !== "enter") return;

  goldState.entranceTimer = Math.max(0, goldState.entranceTimer - dt);
  const t = 1 - goldState.entranceTimer / GOLD_BOSS_ENTRY_DURATION; // 0 → 1

  // Easing doux (smoothstep)
  const ease = t * t * (3 - 2 * t);

  const height = GOLD_BOSS_ENTRY_HEIGHT;
  const baseScale = boss.baseScale ?? boss.scale ?? 1;

  // --- 1) POSITION : chute + petit rebond à la fin ---
  // position de base : il descend
  let y = ORB_REALM_CENTER.y - height * (1 - ease);

  // rebond léger quand il "touche" le centre
  const bounceStrength = 14; // px
  const bounce = Math.sin(Math.min(1, t) * Math.PI) * bounceStrength * (1 - t);
  y -= bounce;

  boss.x = ORB_REALM_CENTER.x;
  boss.y = y;

  // --- 2) SCALE : il grossit en arrivant, façon boss qui prend possession de la salle ---
  const minScale = baseScale * 0.4;
  const maxScale = baseScale * 1.15; // léger overscale
  const scale = minScale + (maxScale - minScale) * ease;

  // petit "pulse" en plus
  let finalScale = scale;
  if (goldState.entryFx?.pulse) {
    const pulseAmp = 0.03;     // amplitude
    const pulseSpeed = 9;      // vitesse
    finalScale *= 1 + Math.sin(t * Math.PI * pulseSpeed) * pulseAmp * (1 - t);
  }

  boss.scale = finalScale;

  // --- 3) SHAKES / IMPACT à la fin de l'entrée ---
  if (t > 0.75 && goldState.entryFx && !goldState.entryFx.playedImpact) {
    goldState.entryFx.playedImpact = true;
    // Hook FX d'impact
    // playSfx && playSfx("gold_boss_impact");
    // cameraShake && cameraShake(GOLD_BOSS_SHAKE_INTENSITY, 0.6);
    // triggerScreenFlash && triggerScreenFlash(0.2);
  }

  // --- 4) Fin de l'entrée → phase "approach" ---
  if (goldState.entranceTimer <= 0) {
    boss.x = ORB_REALM_CENTER.x;
    boss.y = ORB_REALM_CENTER.y;
    boss.scale = baseScale;

    goldState.stage = "approach";
    goldState.entryFx = null;

    // Petite phrase dramatique facultative
    pushStatus && pushStatus("Une présence écrase l'air...");
  }
}


function updateGoldBossApproach(dt, player) {
  const goldState = orbRealmState.goldBoss;
  const boss = orbRealmState.kaelReplica;
  if (!goldState || !boss || goldState.stage !== "approach" || !player) return;
  const dx = player.x - boss.x;
  const dy = player.y - boss.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.0001) {
    goldState.stage = "riddle";
    presentGoldBossRiddle();
    return;
  }
  const moveDist = Math.min(GOLD_BOSS_APPROACH_SPEED * dt, dist);
  boss.x += (dx / dist) * moveDist;
  boss.y += (dy / dist) * moveDist;
  if (dist <= 48) {
    goldState.stage = "riddle";
    presentGoldBossRiddle();
  }
}

function presentGoldBossRiddle() {
  const goldState = orbRealmState.goldBoss;
  if (!goldState || goldState.riddleShown) return;
  goldState.riddleShown = true;
  showBossRiddlePrompt({
    title: GOLD_BOSS_RIDDLE.title,
    description: GOLD_BOSS_RIDDLE.question,
    options: GOLD_BOSS_RIDDLE.options,
    onSelect: handleGoldBossRiddleChoice,
  });
}

function handleGoldBossRiddleChoice(choiceIndex) {
  const goldState = orbRealmState.goldBoss;
  if (!goldState) return;
  goldState.answered = true;
  if (choiceIndex === GOLD_BOSS_RIDDLE.answerIndex) {
    goldState.correct = true;
    goldState.returnUnlocked = true;
    goldState.combatActive = false;
    goldState.stage = "resolved";
    pauseForDialogue([
      { speaker: "Fantome", text: "Tu es digne." },
      { speaker: "Fantome", text: "Passe par ce portail, il activera l'une des clés du labyrinthe." },
    ]);
    orbRealmState.kaelReplica = null;
    pushStatus(GOLD_BOSS_RIDDLE.success);
    orbRealmState.activeStorm = null;
    startTeleportEffect({
      orbId: 1,
      origin: { x: ORB_REALM_CENTER.x, y: ORB_REALM_CENTER.y },
      teleportEffect: { phase: 0 },
    });
    return;
  }
  goldState.correct = false;
  goldState.combatActive = false;
  pauseForDialogue([
    { speaker: "Fantome", text: "Tu t'es tromp?, Lioran." },
    { speaker: "Fantome", text: "Je te ferai payer cette arrogance !" },
  ]);
  pushStatus(GOLD_BOSS_RIDDLE.failure);
  goldState.stage = "storm";
  goldState.returnUnlocked = false;
  startOrbLightStorm(1);
}
function presentOrbRiddle(orbId) {
  if (orbId === 1) return;
  const config = ORB_RIDDLES[orbId];
  if (!config) return;
  const status = orbRealmState.orbRiddleStatus[orbId] ?? {};
  if (status.shown) return;
  status.shown = true;
  orbRealmState.orbRiddleStatus[orbId] = status;
  showBossRiddlePrompt({
    title: config.title,
    description: config.question,
    options: config.options,
    onSelect: (choiceIndex) => handleOrbRiddleChoice(orbId, choiceIndex),
  });
}

function handleOrbRiddleChoice(orbId, choiceIndex) {
  const config = ORB_RIDDLES[orbId];
  if (!config) return;
  const status = orbRealmState.orbRiddleStatus[orbId] ?? {};
  status.answered = true;
  status.correct = choiceIndex === config.answerIndex;
  orbRealmState.orbRiddleStatus[orbId] = status;
  if (status.correct) {
    pushStatus(config.success);
    return;
  }
  pushStatus(config.failure);
  startOrbLightStorm(orbId);
}

function startOrbLightStorm(orbId) {
  const map = State.map;
  if (!map) return;
  const status = orbRealmState.orbRiddleStatus[orbId] ?? {};
  if (status.stormTriggered) return;
  status.stormTriggered = true;
  orbRealmState.orbRiddleStatus[orbId] = status;
  const originX = map.w * 0.5 + ORB_LIGHT_STORM_ZONE_SHIFT_X;
  const originY = Math.max(0, map.h * 0.5 - ORB_LIGHT_STORM_VERTICAL_OFFSET);
  const descriptor = ORB_STORM_DESCRIPTORS[orbId] ?? ORB_STORM_DESCRIPTORS[1];
  const targetX = originX + ORB_LIGHT_STORM_TARGET_SHIFT_X;
  pauseForDialogue(
    [
      { speaker: "Fantome", text: "Tu va subir l'épreuve d'Epheria." },
      { speaker: "Fantome", text: `Si tu survie pendant 30 secondes, tu sera libre de poursuivre ta quête.` },
    ],
    () => beginOrbLightStorm(orbId, targetX, originY)
  );
}
State.startOrbLightStorm = startOrbLightStorm;

function beginOrbLightStorm(orbId, originX, originY) {
  const storm = {
    orbId,
    timer: ORB_LIGHT_STORM_DURATION,
    spawnAccumulator: 0,
    origin: { x: originX, y: originY },
    arrows: [],
    teleportEffect: null,
    congratulated: false,
    completed: false,
    waitingForGhost: true,
  };
  orbRealmState.activeStorm = storm;
  const bossEntity = orbRealmState.kaelReplica ?? orbRealmState.orbGhost;
  if (bossEntity?.animator) {
    bossEntity.hiddenForStorm = false;
    bossEntity.animator.setBase?.("idle");
    bossEntity.animator.play?.("idle", { loop: true, force: true });
  }
  pushStatus("Les flèches de lumière s'abattent sur la carte !");
  orbRealmState.teleportEffect = null;
}

function createLightStormArrow(origin, opts = {}) {
  if (!origin) return null;
  let { dirX, dirY } = opts;
  if (!Number.isFinite(dirX) || !Number.isFinite(dirY) || (dirX === 0 && dirY === 0)) {
    const angle = Math.random() * Math.PI * 2;
    dirX = Math.cos(angle);
    dirY = Math.sin(angle);
  }
  const len = Math.hypot(dirX, dirY);
  const normX = dirX / (len || 1);
  const normY = dirY / (len || 1);
  return {
    x: origin.x,
    y: origin.y,
    dirX: normX,
    dirY: normY,
    radius: ORB_LIGHT_STORM_ARROW_RADIUS,
    width: ORB_LIGHT_STORM_ARROW_RADIUS * 0.5,
  };
}

function updateActiveLightStorm(dt, player) {
  const storm = orbRealmState.activeStorm;
  const map = State.map;
  if (!storm || !map) return;
  if (storm.waitingForGhost) {
    const ghost = orbRealmState.orbGhost ?? orbRealmState.kaelReplica;
    if (ghost) {
      const dx = storm.origin.x - ghost.x;
      const dy = storm.origin.y - ghost.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 1) {
        ghost.x = storm.origin.x;
        ghost.y = storm.origin.y;
        storm.waitingForGhost = false;
      } else {
        const move = Math.min(ORB_LIGHT_STORM_GHOST_APPROACH_SPEED * dt, dist);
        if (move > 0) {
          ghost.x += (dx / dist) * move;
          ghost.y += (dy / dist) * move;
        }
        storm.waitingForGhost = true;
      }
    } else {
      storm.waitingForGhost = false;
    }
    if (storm.waitingForGhost) {
      return;
    }
  }
  storm.timer = Math.max(0, storm.timer - dt);
  const progress = Math.min(1, 1 - storm.timer / Math.max(0.0001, ORB_LIGHT_STORM_DURATION));
  const hero = player ?? State.player;
  if (storm.timer > 0) {
    const interval = Math.max(
      0.05,
      lerp(ORB_LIGHT_STORM_START_INTERVAL, ORB_LIGHT_STORM_END_INTERVAL, progress)
    );
    storm.spawnAccumulator += dt;
    while (storm.spawnAccumulator >= interval) {
      storm.spawnAccumulator -= interval;
      for (let i = 0; i < ORB_LIGHT_STORM_BURST_COUNT; i++) {
        storm.arrows.push(createLightStormArrow(storm.origin));
      }
      if (hero && hero.hp > 0) {
        const dx = hero.x - storm.origin.x;
        const dy = hero.y - storm.origin.y;
        const targetedArrow = createLightStormArrow(storm.origin, { dirX: dx, dirY: dy });
        if (targetedArrow) storm.arrows.push(targetedArrow);
      }
    }
  }
  const arrowSpeed = lerp(ORB_LIGHT_STORM_BASE_SPEED, ORB_LIGHT_STORM_MAX_SPEED, progress);
  const survivors = [];
  for (const arrow of storm.arrows) {
    arrow.x += arrow.dirX * arrowSpeed * dt;
    arrow.y += arrow.dirY * arrowSpeed * dt;
    const outOfBounds =
      arrow.x < -40 || arrow.x > map.w + 40 || arrow.y < -40 || arrow.y > map.h + 40;
    if (outOfBounds) continue;
    if (hero && hero.hp > 0) {
      const hitRadius = (hero.r ?? 0) + (arrow.radius ?? ORB_LIGHT_STORM_ARROW_RADIUS);
      const dist = Math.hypot(hero.x - arrow.x, hero.y - arrow.y);
      if (dist <= hitRadius) {
        const maxHp = Math.max(1, hero.maxHp ?? 100);
        hero.applyDamage(Math.max(1, Math.round(maxHp * 0.5)));
        continue;
      }
    }
    survivors.push(arrow);
  }
  storm.arrows = survivors;
  if (!storm.completed && storm.timer <= 0) {
    if (!hero || hero.hp > 0) {
      handleStormCompletion(storm);
    }
  }
}

function handleStormCompletion(storm) {
  if (!storm || storm.completed) return;
  storm.completed = true;
  hideOrbEntitiesForStorm(false);
  const descriptor = ORB_STORM_DESCRIPTORS[storm.orbId] ?? ORB_STORM_DESCRIPTORS[1];
  pushStatus(`Les flèches de ${descriptor.colorLabel} s'estompent, la sortie se dévoile.`);
  if (storm.orbId === 1) {
    const goldState = orbRealmState.goldBoss;
    if (goldState) {
      goldState.stage = "resolved";
      goldState.returnUnlocked = true;
    }
  }
  startTeleportEffect(storm);
  congratulateHeroForOrb(storm.orbId, storm);
  orbRealmState.activeStorm = null;
}

function congratulateHeroForOrb(orbId, storm = orbRealmState.activeStorm) {
  if (!storm || storm.congratulated || storm.orbId !== orbId) return;
  storm.congratulated = true;
  const descriptor = ORB_STORM_DESCRIPTORS[orbId] ?? ORB_STORM_DESCRIPTORS[1];
  pauseForDialogue(
    [
      {
        speaker: "Fantome",
        text: "Tu es digne.",
      },
      {
        speaker: "Fantome",
        text: "Passe par ce portail, il activera l'une des clés du labyrinthe.",
      },
    ],
    () => startTeleportEffect(storm)
  );
}

function startTeleportEffect(storm) {
  if (!storm) return;
  if (!storm.teleportEffect) {
    storm.teleportEffect = { phase: 0 };
  }
  const descriptor = ORB_STORM_DESCRIPTORS[storm.orbId] ?? ORB_STORM_DESCRIPTORS[1];
  const origin = storm.origin ?? { x: ORB_REALM_CENTER.x, y: ORB_REALM_CENTER.y };
  if (!orbRealmState.teleportEffect) {
    orbRealmState.teleportEffect = { phase: 0 };
  }
  orbRealmState.teleportEffect.phase = storm.teleportEffect.phase;
  orbRealmState.teleportEffect.origin = { x: origin.x, y: origin.y };
  orbRealmState.teleportEffect.descriptor = descriptor;
}

function hideOrbEntitiesForStorm(hidden) {
  const ghost = orbRealmState.orbGhost;
  if (ghost) ghost.hiddenForStorm = hidden;
  const kael = orbRealmState.kaelReplica;
  if (kael) kael.hiddenForStorm = hidden;
}

function drawActiveLightStorm(ctx) {
  const storm = orbRealmState.activeStorm;
  if (!ctx || !storm) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const arrow of storm.arrows) {
    const tailX = arrow.x - arrow.dirX * 32;
    const tailY = arrow.y - arrow.dirY * 32;
    const gradient = ctx.createLinearGradient(tailX, tailY, arrow.x, arrow.y);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.6, "rgba(255,255,255,0.35)");
    gradient.addColorStop(1, "rgba(255,255,255,0.95)");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = arrow.width ?? 6;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(arrow.x, arrow.y);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(arrow.x, arrow.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "rgba(255, 255, 210, 0.3)";
  ctx.beginPath();
  ctx.arc(storm.origin.x, storm.origin.y, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawActiveLightStormTimer(ctx) {
  const storm = orbRealmState.activeStorm;
  if (!ctx || !storm) return;
  const remaining = Math.max(0, storm.timer);
  const label = `${Math.ceil(remaining)}s`;
  const x = $canvas.width / 2;
  const y = 12;
  ctx.save();
  ctx.font = "600 22px 'Inter', system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.65)";
  ctx.lineWidth = 5;
  ctx.strokeText(label, x, y);
  ctx.fillStyle = "#fff";
  ctx.fillText(label, x, y);
  ctx.restore();
}

function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function checkOrbRealmReturn(player) {
  if (!orbRealmState.active || !player) return;
  if (!isGoldBossReturnAllowed()) return;
  const dist = Math.hypot(player.x - ORB_REALM_CENTER.x, player.y - ORB_REALM_CENTER.y);
  if (dist <= ORB_REALM_RETURN_RADIUS) {
    exitOrbRealm();
  }
}

  function showKaelQuestPrompt() {
    if (!$orbPrompt) return;
    hideOrbPrompt();
    State.orbPromptOpen = true;
    State.questPromptCooldown = 0.8;
    $orbPrompt.innerHTML = `
      <div class="prompt-card">
        <h4>Quête : Chercher le Cœur</h4>
        <p>Kael et toi cherchez Aelya et le Cœur d'Éphéria. Ensemble, vous pouvez percer le labyrinthe.</p>
        <div class="prompt-actions">
          <button data-orb-no>Refuser</button>
          <button data-orb-yes>Accepter</button>
        </div>
      </div>`;
    $orbPrompt.classList.remove("hidden");
    requestAnimationFrame(() => $orbPrompt.classList.add("visible"));

    const yesBtn = $orbPrompt.querySelector("[data-orb-yes]");
    const noBtn = $orbPrompt.querySelector("[data-orb-no]");

    const handleYes = () => {
      hideOrbPrompt();
      acceptKaelQuest();
    };
    const handleNo = () => {
      hideOrbPrompt();
      State.questPromptCooldown = 1.2;
      State.dialogue?.show?.([{ speaker: "Kael", text: "Nous n'avons pas de temps à perdre, décide toi vite." }]);
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
      } else if (event.key === "e" || event.key === "E") {
        event.preventDefault();
        event.stopPropagation();
        const btn = $orbPrompt.querySelector("[data-orb-yes]");
        btn?.click();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        rotatePromptFocus(event.key === "ArrowRight" ? 1 : -1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const btn = orbPromptState.buttons[orbPromptState.focusIndex];
        btn?.click();
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
    State.paused = orbPromptState.previousPaused;
  orbPromptState.previousPaused = false;
}

function showBossRiddlePrompt(opts = {}) {
  if (!$bossRiddle || !Array.isArray(opts.options) || opts.options.length === 0) return;
  hideBossRiddlePrompt();
  if (bossRiddleState.hideTimer) {
    clearTimeout(bossRiddleState.hideTimer);
    bossRiddleState.hideTimer = null;
  }
  State.bossRiddleOpen = true;
  bossRiddleState.previousPaused = State.paused;
  State.paused = true;
  bossRiddleState.onSelect = typeof opts.onSelect === "function" ? opts.onSelect : null;
  bossRiddleState.focusIndex = 0;
  bossRiddleState.active = true;
  const description = String(opts.description ?? "").trim();
  const title = String(opts.title ?? "Énigme").trim();
  const optionsMarkup = opts.options
    .map(
      (option, index) => `
        <button type="button" data-riddle-option data-index="${index}">
          <span class="boss-riddle-index">${index + 1}</span>
          ${String(option ?? "").trim()}
        </button>`
    )
    .join("");
  $bossRiddle.innerHTML = `
    <div class="boss-riddle-card">
      <h4>${title}</h4>
      <div class="boss-riddle-dialogue">
        <p class="boss-riddle-text"></p>
      </div>
      <div class="boss-riddle-options hidden">
        ${optionsMarkup}
      </div>
    </div>`;
  const buttons = Array.from($bossRiddle.querySelectorAll("[data-riddle-option]"));
  bossRiddleState.buttons = buttons;
  const optionHandler = (event) => {
    const index = Number(event.currentTarget?.dataset?.index ?? -1);
    commitBossRiddleChoice(index);
  };
  bossRiddleState.optionHandler = optionHandler;
  buttons.forEach((btn) => btn.addEventListener("click", optionHandler));
  bossRiddleState.textNode = $bossRiddle.querySelector(".boss-riddle-text");
  bossRiddleState.optionsContainer = $bossRiddle.querySelector(".boss-riddle-options");
  if (bossRiddleState.optionsContainer) {
    bossRiddleState.optionsContainer.classList.add("hidden");
  }
  bossRiddleState.fullText = description;
  bossRiddleState.typedChars = 0;
  bossRiddleState.typingAccumulator = 0;
  bossRiddleState.typingSpeed = opts.typingSpeed ?? 42;
  if (bossRiddleState.textNode) {
    bossRiddleState.textNode.textContent = "";
  }
  bossRiddleState.optionsVisible = false;
  bossRiddleState.keyHandler = (event) => {
    if (!bossRiddleState.active) return;
    const key = event.key;
    if (!bossRiddleState.optionsVisible) {
      if (key === "Enter" || key === " " || key === "e" || key === "E") {
        bossRiddleState.typingAccumulator = bossRiddleState.fullText?.length ?? 0;
        updateBossRiddleText(0);
      }
      return;
    }
    if (key === "ArrowRight" || key === "ArrowDown") {
      event.preventDefault();
      rotateBossRiddleFocus(1);
      return;
    }
    if (key === "ArrowLeft" || key === "ArrowUp") {
      event.preventDefault();
      rotateBossRiddleFocus(-1);
      return;
    }
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      commitBossRiddleChoice(bossRiddleState.focusIndex);
      return;
    }
    if (key === "e" || key === "E") {
      event.preventDefault();
      commitBossRiddleChoice(bossRiddleState.focusIndex);
      return;
    }
    if (/^[1-9]$/.test(key)) {
      const numericIndex = Math.min(buttons.length - 1, Number(key) - 1);
      if (numericIndex >= 0) {
        event.preventDefault();
        commitBossRiddleChoice(numericIndex);
      }
    }
  };
  window.addEventListener("keydown", bossRiddleState.keyHandler);
  $bossRiddle.classList.remove("hidden");
  requestAnimationFrame(() => $bossRiddle.classList.add("visible"));
  updateBossRiddleFocus();
}

function hideBossRiddlePrompt() {
  if (!$bossRiddle || !bossRiddleState.active) return;
  bossRiddleState.buttons.forEach((btn) => {
    if (bossRiddleState.optionHandler) {
      btn.removeEventListener("click", bossRiddleState.optionHandler);
    }
  });
  if (bossRiddleState.keyHandler) {
    window.removeEventListener("keydown", bossRiddleState.keyHandler);
  }
  bossRiddleState.active = false;
  bossRiddleState.buttons = [];
  bossRiddleState.focusIndex = 0;
  bossRiddleState.onSelect = null;
  bossRiddleState.keyHandler = null;
  bossRiddleState.optionHandler = null;
  bossRiddleState.textNode = null;
  bossRiddleState.optionsContainer = null;
  bossRiddleState.optionsVisible = false;
  State.bossRiddleOpen = false;
  State.paused = bossRiddleState.previousPaused;
  bossRiddleState.previousPaused = false;
  $bossRiddle.classList.remove("visible");
  if (bossRiddleState.hideTimer) {
    clearTimeout(bossRiddleState.hideTimer);
  }
  bossRiddleState.hideTimer = setTimeout(() => {
    $bossRiddle.classList.add("hidden");
    bossRiddleState.hideTimer = null;
  }, 250);
}

function updateBossRiddleText(dt) {
  if (!bossRiddleState.active || bossRiddleState.optionsVisible) return;
  const textNode = bossRiddleState.textNode;
  const fullText = bossRiddleState.fullText ?? "";
  if (!textNode) return;
  if (!fullText.length) {
    revealBossRiddleOptions();
    return;
  }
  bossRiddleState.typingAccumulator += (bossRiddleState.typingSpeed ?? 64) * dt;
  const targetChars = Math.min(fullText.length, Math.floor(bossRiddleState.typingAccumulator));
  if (targetChars !== bossRiddleState.typedChars) {
    bossRiddleState.typedChars = targetChars;
    textNode.textContent = fullText.slice(0, targetChars);
  }
  if (targetChars >= fullText.length) {
    revealBossRiddleOptions();
  }
}

function revealBossRiddleOptions() {
  if (bossRiddleState.optionsVisible) return;
  const container = bossRiddleState.optionsContainer;
  if (!container) return;
  container.classList.remove("hidden");
  bossRiddleState.optionsVisible = true;
  updateBossRiddleFocus();
}

function rotateBossRiddleFocus(direction) {
  if (!bossRiddleState.buttons.length) return;
  const len = bossRiddleState.buttons.length;
  bossRiddleState.focusIndex = (bossRiddleState.focusIndex + direction + len) % len;
  updateBossRiddleFocus();
}

function updateBossRiddleFocus() {
  if (!bossRiddleState.optionsVisible) return;
  bossRiddleState.buttons.forEach((btn, index) => {
    if (index === bossRiddleState.focusIndex) {
      btn.classList.add("btn-active");
      btn.focus?.();
    } else {
      btn.classList.remove("btn-active");
    }
  });
}

function commitBossRiddleChoice(index) {
  if (bossRiddleState.buttons.length === 0) return;
  if (!bossRiddleState.optionsVisible) return;
  const choice = Math.max(0, Math.min(bossRiddleState.buttons.length - 1, index));
  const callback = bossRiddleState.onSelect;
  hideBossRiddlePrompt();
  if (typeof callback === "function") {
    callback(choice);
  }
}

function activateOrb(orb) {
  if (!orb || orb.activated) return 0;

  orb.activated = true;
  playGhostCreepy();
  playSound("orbActivate", 0.85);

  const flashDuration = startOrbFlash();
  pushStatus("L'orbe s'embrase.");

  checkPrincessUnlock();

  // On renvoie la durée du flash pour caler le dialogue derrière
  return flashDuration || 0;
}
function startOrbDialogueSequence(orb, delay = 0) {
  if (!orb) return;

  const id = orb.id ?? 0;
  const mysterious = ORB_MESSAGES[id];
  const reply =
    ORB_REPEAT_MESSAGES[id] ??
    "L'écho de la pierre s'est déjà réveillé. Écoute plutôt le Coeur.";

  const lines = [];
  if (mysterious) {
    lines.push({ speaker: "???", text: mysterious });
  }
  if (reply) {
    lines.push({ speaker: "Moi", text: reply });
  }

  if (lines.length === 0) return;

  const run = () => {
    // Un seul appel avec les deux lignes, l'ordre ne peut plus s’inverser
    pauseForDialogue(lines);
    // On marque l’orbe comme “déjà utilisée” pour les prochaines interactions
    orb.repeatUsed = true;
  };

  if (delay > 0) {
    setTimeout(run, delay + 150);
  } else {
    run();
  }
}


  function areAllPuzzleOrbsActivated() {
    const orbs = State.puzzleOrbs;
    return (
      Array.isArray(orbs) &&
      orbs.length >= 4 &&
      orbs.every((orb) => orb?.activated)
    );
  }

  function checkPrincessUnlock() {
    if (State.flags.princessUnlocked) return;
    const allActivated = areAllPuzzleOrbsActivated();
    if (allActivated && !State.flags.princessUnlocked) {
      State.flags.princessUnlocked = true;
      State.flags.princessQuestBlockedForOrbs = false;
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

  function showQueuedDialogue(lines) {
    if (!Array.isArray(lines) || lines.length === 0) return;
    const attempt = () => {
      if (State.dialogue.isOpen()) {
        setTimeout(attempt, 120);
        return;
      }
      State.dialogue.show(lines);
    };
    attempt();
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
    if (isOrbRealmActive()) return;
    const orbs = State.puzzleOrbs;
    const anyActivated = Array.isArray(orbs) && orbs.some((orb) => orb?.activated);
    if (anyActivated) return;
    flags.kaelOrbHintSpoken = true;
    pauseForDialogue([
      {
        speaker: "Kael",
        text: "Tu as remarqué ces étranges Orbes aux coins du Labyrinthe ?",
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
        { speaker: "Kael", text: "Toi qui me connais bien... NE ME TOURNE PAS LE DOS !" },
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
    const heroPos = { x: spawn.x + 40, y: spawn.y + 120 };
    const bossPos = { x: heroPos.x + 110, y: heroPos.y - 20 };
    State.player.x = heroPos.x;
    State.player.y = heroPos.y;
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

  function triggerBossFightShortcut() {
    if (!State.player || !State.boss) return;
    if (State.flags.kaelDefeated) {
      pushStatus("Kael est déjà vaincu.");
      return;
    }
    if (!State.flags.betrayalHappened) {
      triggerBetrayal();
    }
    State.awaitingEndingButton = true;
    if (State.bossObjectiveReminder) {
      State.bossObjectiveReminderActive = true;
      updateBossObjectiveBanner();
    }
    pushStatus("Accès direct au combat Kael (touche 9)");
  }

  function playLabyrinthLaugh(onComplete) {
    pauseForDialogue(
      [
        { speaker: "Chuchotement", text: "Vous entendez un rire venir du fond du labyrinthe." },
        { speaker: "???", text: "h..h...h..ha ha ha ha HA HA HA HA HA HA HA" },
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
        { speaker: "Princesse", text: "Attends... Cette vibration... L'ombre de Kael s'éveille encore !" },
      ],
      () => {
        playLabyrinthLaugh(() => {
          flashScreen(1200);
          startScreenShake(1200);
          pauseForDialogue(
            [{ speaker: "Kael", text: "TU NE ME LAISSE PAS LE CHOIX LORIAN ! LES VOIX M'ONT RENDU PLUS FORT QUE JAMAIS !!!" }],
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
          text: "Le souffle de Kael s'est éteint. Viens, Lioran, quittons pour de bon.",
        },
        {
          speaker: "Princesse",
          text: "Puisse-tu reposer en Paix.. Kael.. Mage déchu qui aura sombré au voix de ce lieu maudit.",
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

  function spawnGhosts(world, spawnPoint, animations, count = 5) {
    if (!world || !animations) return [];
    const ghosts = [];
    const spawnY = (spawnPoint?.y ?? 0) + 300;
    const minY = Math.min(Math.max(40, spawnY), Math.max(40, world.h - 60));
    const usableHeight = Math.max(60, world.h - minY - 40);
    for (let i = 0; i < count; i++) {
      let pos = null;
      for (let attempt = 0; attempt < 30; attempt++) {
        const randX = 40 + Math.random() * Math.max(40, world.w - 80);
        const randY = minY + Math.random() * usableHeight;
        const candidate = world.nearestOpen(randX, randY, PLAYER_RADIUS);
        if (candidate && candidate.y >= minY) {
          pos = candidate;
          break;
        }
      }
      if (!pos) {
        pos = {
          x: (spawnPoint?.x ?? world.w / 2) + (i - count / 2) * 30,
          y: minY + i * 35,
        };
      }
      ghosts.push(createGhost(pos.x, pos.y, animations));
    }
    return ghosts;
  }

function createGhost(x, y, animations) {
  const animator = new Animator(animations, "idle");
  return {
    x,
    y,
    hp: 70,
    maxHp: 70,
    speed: 60,
    chaseSpeed: 115,
    attackRange: 26,
    attackDamage: 8,
    attackCooldown: 0,

    // Gestion ancienne / nouvelle spé
    specialCooldown: 0,
    specialFlash: 0,
    specialState: null, // null | "warp_charge" | "warp_dash"

    // Timers spéciaux
    chargeTimer: 0,
    chargeMax: 0,
    warpTimer: 0,
    warpDuration: 0,
    warpHit: false,
    warpDir: { x: 0, y: 0 },

    // Visuel / feedback
    hurtTimer: 0,
    hitFlash: 0,
    dead: false,
    scale: 0.128,
    animator,

    // Trail fantomatique (servira si on pimpe drawGhosts plus tard)
    ghostTrail: [], // { x, y, life, maxLife }
  };
}

function dealDamageToTarget(target, amount) {
  if (!target || !Number.isFinite(amount) || amount <= 0) return 0;
  const multiplier = Math.max(0, Number.isFinite(target.damageTakenMultiplier) ? target.damageTakenMultiplier : 1);
  const damage = Math.max(0, Math.round(amount * multiplier));
  if (damage <= 0) return 0;
  if (typeof target.applyDamage === "function") {
    target.applyDamage(damage);
  } else if (typeof target.hit === "function") {
    target.hit(damage);
  } else if (Number.isFinite(target.hp)) {
    target.hp = Math.max(0, target.hp - damage);
  }
  return damage;
}

function spawnOrbProjectile(ghost, angle, speed, damage, opts = {}) {
  if (!ghost || !Number.isFinite(angle) || !Number.isFinite(speed) || !Number.isFinite(damage)) return;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  State.projectiles = State.projectiles ?? [];
  State.projectiles.push({
    x: ghost.x,
    y: ghost.y,
    vx,
    vy,
    lifetime: opts.lifetime ?? 1.5,
    damage,
    len: (opts.len ?? 28) * ORB_SPELL_SCALE,
    hitRadius: (opts.hitRadius ?? 22) * ORB_SPELL_SCALE,
    trail: [],
    slow: opts.slow,
    slowDuration: opts.slowDuration,
    owner: ghost,
  });
}

function spawnOrbProjectileCircle(ghost, count, speed, damage, opts = {}) {
  if (!Number.isFinite(count) || count <= 0) return;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    spawnOrbProjectile(ghost, angle, speed, damage, opts);
  }
}

function spawnOrbHazard(x, y, radius, duration, damage, opts = {}) {
  if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(duration) || duration <= 0) return;
  orbHazards.push({
    x,
    y,
    radius: Math.max(8, radius * ORB_SPELL_SCALE),
    duration,
    damage: Math.max(0, damage ?? 0),
    tick: 0,
    cooldown: opts.cooldown ?? 0.6,
    color: opts.color || "rgba(255,255,255,0.25)",
  });
}

function spawnOrbBeam(ghost, angle, length, width, damage, opts = {}) {
  if (!ghost || !Number.isFinite(angle) || !Number.isFinite(length) || !Number.isFinite(width)) return;
  const steps = Math.max(3, Math.round(length / (width * 1.2)));
  for (let i = 0; i < steps; i += 1) {
    const t = i / Math.max(1, steps - 1);
    const dx = Math.cos(angle) * (t * length);
    const dy = Math.sin(angle) * (t * length);
    spawnOrbHazard(
      ghost.x + dx,
      ghost.y + dy,
      Math.max(4, (width / 2) * ORB_SPELL_SCALE),
      opts.duration ?? 2.6,
      damage,
      { color: opts.color, cooldown: opts.cooldown ?? 0.15 }
    );
  }
}

function spawnOrbArcWave(ghost, radius, segments, damage, opts = {}) {
  if (!ghost || !Number.isFinite(radius) || radius <= 0 || segments <= 0) return;
  const start = Math.random() * Math.PI * 2;
  for (let i = 0; i < segments; i += 1) {
    const angle = start + (i / segments) * Math.PI * 0.8;
    spawnOrbHazard(
      ghost.x + Math.cos(angle) * radius,
      ghost.y + Math.sin(angle) * radius,
      (opts.segmentRadius ?? 42) * ORB_SPELL_SCALE,
      opts.duration ?? 3,
      damage,
      { color: opts.color ?? "rgba(255,255,255,0.3)", cooldown: opts.cooldown ?? 0.25 }
    );
  }
}

function updateOrbHazards(dt) {
  if (!orbRealmState.active || orbHazards.length === 0) return;
  const player = State.player;
  for (const hazard of orbHazards) {
    hazard.duration -= dt;
    if (player && hazard.damage > 0) {
      hazard.tick += dt;
      if (hazard.tick >= hazard.cooldown) {
        hazard.tick = 0;
        const dist = Math.hypot(player.x - hazard.x, player.y - hazard.y);
        if (dist <= hazard.radius + (player.r ?? 10)) {
          dealDamageToTarget(player, hazard.damage);
        }
      }
    }
  }
  for (let i = orbHazards.length - 1; i >= 0; i -= 1) {
    if (orbHazards[i].duration <= 0) {
      orbHazards.splice(i, 1);
    }
  }
}

function drawOrbHazards(ctx) {
  if (!ctx || orbHazards.length === 0) return;
  orbHazards.forEach((hazard) => {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = hazard.color;
    ctx.strokeStyle = hazard.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

function createOrbBossGhost(orbId, x, y) {
  const config = ORB_BOSS_CONFIG[orbId];
  if (!config) return null;
  const animations = State.ghostAnimations ?? ghostAnimations;
  const ghost = createGhost(x, y, animations);
  ghost.hp = config.hp;
  ghost.maxHp = config.hp;
  ghost.attackDamage = config.attackDamage;
  const boostedSpeed = Math.max(1, config.chaseSpeed ?? 1) * 3;
  ghost.chaseSpeed = boostedSpeed * ORB_SPEED_MULT;
  ghost.baseChaseSpeed = boostedSpeed * ORB_SPEED_MULT;
  ghost.attackRange = 42;
  const baseScale = config.scale ?? 0.32;
  ghost.scale = baseScale * (config.scaleMultiplier ?? 1);
  ghost.damageTakenMultiplier = 1;
  ghost.realmBoss = true;
  ghost.realmId = orbId;
  ghost.orbTimers = {};
  ghost.shieldActive = false;
  ghost.surgeTimer = 0;
  ghost.realmLabel = config.label;
  ghost.realmColor = config.color;
  ghost.orbCount = config.orbCount ?? 3;
  return ghost;
}

function updateRedOrbBoss(ghost, dt) {
  const player = State.player;
  if (!player) return;
  const timers = ghost.orbTimers;
  timers.redBurst = Math.max(0, (timers.redBurst ?? 2.5) - dt);
  if (timers.redBurst <= 0) {
    timers.redBurst = 5 + Math.random();
    spawnOrbProjectileCircle(ghost, 8, 320, 16, { hitRadius: 24 });
  }
  timers.redHazard = Math.max(0, (timers.redHazard ?? 4) - dt);
  if (timers.redHazard <= 0) {
    timers.redHazard = 9;
    spawnOrbHazard(
      ghost.x + (Math.random() - 0.5) * 90,
      ghost.y + (Math.random() - 0.5) * 70,
      42,
      4.5,
      9,
      { color: "rgba(255,110,55,0.35)", cooldown: 0.3 }
    );
  }
  timers.redLeap = Math.max(0, (timers.redLeap ?? 6) - dt);
  if (timers.redLeap <= 0) {
    timers.redLeap = 8;
    const offsetX = (Math.random() - 0.5) * 80;
    const offsetY = (Math.random() - 0.5) * 80;
    ghost.x = player.x + offsetX;
    ghost.y = player.y + offsetY;
    spawnOrbHazard(ghost.x, ghost.y, 50, 2.5, 12, {
      color: "rgba(255,180,120,0.55)",
      cooldown: 0.2,
    });
    spawnOrbProjectileCircle(ghost, 6, 240, 14, { hitRadius: 22 });
  }
  timers.redFlare = Math.max(0, (timers.redFlare ?? 2.1) - dt);
  if (timers.redFlare <= 0) {
    timers.redFlare = 4.2;
    spawnOrbProjectileCircle(ghost, 12, 300, 18, { hitRadius: 26 });
    spawnOrbHazard(ghost.x, ghost.y, 68, 2.8, 0, {
      color: "rgba(255,140,80,0.3)",
      cooldown: 0.2,
    });
  }
  timers.redStorm = Math.max(0, (timers.redStorm ?? 6.5) - dt);
  if (timers.redStorm <= 0) {
    timers.redStorm = 9;
    const map = State.map;
    if (map) {
      const length = Math.max(map.w, map.h) * 1.15;
      [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].forEach((angle) => {
        spawnOrbBeam(ghost, angle, length, 84, 16, {
          color: "rgba(255,130,80,0.45)",
          duration: 3.4,
        });
      });
    }
  }
}

function updateGoldOrbBoss(ghost, dt) {
  const player = State.player;
  if (!player) return;
  const timers = ghost.orbTimers;
  timers.goldRays = Math.max(0, (timers.goldRays ?? 3) - dt);
  if (timers.goldRays <= 0) {
    timers.goldRays = 5 + Math.random() * 1.5;
    const baseAngle = Math.atan2(player.y - ghost.y, player.x - ghost.x);
    for (let i = -1; i <= 1; i += 1) {
      spawnOrbProjectile(ghost, baseAngle + i * 0.15, 300, 15, {
        len: 32,
        hitRadius: 24,
      });
    }
  }
  timers.goldAura = Math.max(0, (timers.goldAura ?? 5) - dt);
  if (timers.goldAura <= 0) {
    timers.goldAura = 7;
    spawnOrbHazard(ghost.x, ghost.y, 60, 4, 6, {
      color: "rgba(255,230,170,0.35)",
      cooldown: 0.4,
    });
  }
  timers.goldShield = Math.max(0, (timers.goldShield ?? 4) - dt);
  if (timers.goldShield <= 0) {
    ghost.shieldActive = !ghost.shieldActive;
    ghost.damageTakenMultiplier = ghost.shieldActive ? 0.55 : 1;
    timers.goldShield = ghost.shieldActive ? 6 : 4;
    spawnOrbHazard(ghost.x, ghost.y, 70, 2.5, ghost.shieldActive ? 3 : 0, {
      color: "rgba(255,215,140,0.3)",
      cooldown: 0.2,
    });
  }
  timers.goldBeacon = Math.max(0, (timers.goldBeacon ?? 6) - dt);
  if (timers.goldBeacon <= 0) {
    timers.goldBeacon = 9;
    for (let i = 0; i < 3; i += 1) {
      const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.25;
      const px = ghost.x + Math.cos(angle) * 210;
      const py = ghost.y + Math.sin(angle) * 210;
      spawnOrbHazard(px, py, 42, 4.5, 10, {
        color: "rgba(255,245,190,0.35)",
        cooldown: 0.35,
      });
      spawnOrbProjectile(ghost, angle + Math.PI, 280, 16, {
        len: 32,
        hitRadius: 26,
      });
    }
  }
  timers.goldPulse = Math.max(0, (timers.goldPulse ?? 5.5) - dt);
  if (timers.goldPulse <= 0) {
    timers.goldPulse = 11;
    spawnOrbArcWave(ghost, Math.max(State.map?.w ?? 320, State.map?.h ?? 240) * 0.6, 12, 12, {
      color: "rgba(255,235,190,0.45)",
      segmentRadius: 48,
      duration: 3.4,
      cooldown: 0.3,
    });
  }
  timers.goldOrbs = Math.max(0, (timers.goldOrbs ?? 4.5) - dt);
  if (timers.goldOrbs <= 0) {
    timers.goldOrbs = 6;
    const count = Math.max(ghost.orbCount ?? 3, 6);
    spawnOrbProjectileCircle(ghost, count, 320, 18, {
      hitRadius: 26,
      len: 32,
    });
  }
}

function updateGreenOrbBoss(ghost, dt) {
  const player = State.player;
  if (!player) return;
  const timers = ghost.orbTimers;
  timers.greenSeeds = Math.max(0, (timers.greenSeeds ?? 3) - dt);
  if (timers.greenSeeds <= 0) {
    timers.greenSeeds = 5 + Math.random();
    const baseAngle = Math.atan2(player.y - ghost.y, player.x - ghost.x);
    for (let i = 0; i < 5; i += 1) {
      const angle = baseAngle + (Math.random() - 0.5) * 1.2;
      spawnOrbProjectile(ghost, angle, 220, 10, {
        hitRadius: 18,
        len: 20,
      });
    }
  }
  timers.greenBloom = Math.max(0, (timers.greenBloom ?? 10) - dt);
  if (timers.greenBloom <= 0) {
    timers.greenBloom = 12;
    ghost.hp = Math.min(ghost.maxHp, ghost.hp + 16);
    spawnOrbHazard(ghost.x, ghost.y, 55, 3, 0, {
      color: "rgba(120,230,175,0.4)",
      cooldown: 0.6,
    });
  }
  timers.greenRoots = Math.max(0, (timers.greenRoots ?? 6) - dt);
  if (timers.greenRoots <= 0) {
    timers.greenRoots = 8;
    spawnOrbHazard(
      ghost.x + (Math.random() - 0.5) * 80,
      ghost.y + (Math.random() - 0.5) * 80,
      48,
      4,
      7,
      { color: "rgba(80,200,120,0.45)", cooldown: 0.35 }
    );
  }
  timers.greenSerpent = Math.max(0, (timers.greenSerpent ?? 5) - dt);
  if (timers.greenSerpent <= 0) {
    timers.greenSerpent = 7;
    const baseAngle = Math.atan2(player.y - ghost.y, player.x - ghost.x);
    for (let i = 0; i < 6; i += 1) {
      const angle = baseAngle + (i / 6) * Math.PI * 2 + Math.random() * 0.2;
      spawnOrbProjectile(ghost, angle, 240, 13, {
        len: 20,
        hitRadius: 20,
      });
    }
    spawnOrbHazard(player.x, player.y, 52, 3.2, 9, {
      color: "rgba(110,235,150,0.4)",
      cooldown: 0.3,
    });
  }
  timers.greenCanopy = Math.max(0, (timers.greenCanopy ?? 8) - dt);
  if (timers.greenCanopy <= 0) {
    timers.greenCanopy = 12;
    const map = State.map;
    if (map) {
      const density = Math.max(3, Math.ceil(Math.max(map.w, map.h) / 90));
      for (let x = 0; x < density; x += 1) {
        for (let y = 0; y < density; y += 1) {
          spawnOrbHazard(
            (x / Math.max(1, density - 1)) * map.w,
            (y / Math.max(1, density - 1)) * map.h,
            48,
            3.6,
            8,
            { color: "rgba(90,210,160,0.35)", cooldown: 0.4 }
          );
        }
      }
    }
  }
}

function updateBlueOrbBoss(ghost, dt) {
  const player = State.player;
  if (!player) return;
  const timers = ghost.orbTimers;
  timers.blueSpiral = Math.max(0, (timers.blueSpiral ?? 3) - dt);
  if (timers.blueSpiral <= 0) {
    timers.blueSpiral = 6 + Math.random();
    spawnOrbProjectileCircle(ghost, 6, 260, 12, {
      hitRadius: 20,
      len: 26,
    });
  }
  timers.blueMist = Math.max(0, (timers.blueMist ?? 4) - dt);
  if (timers.blueMist <= 0) {
    timers.blueMist = 7;
    spawnOrbHazard(
      player.x + (Math.random() - 0.5) * 40,
      player.y + (Math.random() - 0.5) * 40,
      38,
      4,
      8,
      { color: "rgba(110,190,255,0.3)", cooldown: 0.3 }
    );
  }
  timers.blueSurge = Math.max(0, (timers.blueSurge ?? 10) - dt);
  if (ghost.surgeTimer > 0) {
    ghost.surgeTimer -= dt;
    if (ghost.surgeTimer <= 0) {
      ghost.chaseSpeed = ghost.baseChaseSpeed ?? ghost.chaseSpeed;
    }
  } else if (timers.blueSurge <= 0) {
    timers.blueSurge = 10 + Math.random() * 3;
    ghost.surgeTimer = 3;
    ghost.chaseSpeed = (ghost.baseChaseSpeed ?? ghost.chaseSpeed) * 1.6;
    spawnOrbHazard(ghost.x, ghost.y, 60, 2, 5, {
      color: "rgba(130,210,255,0.35)",
      cooldown: 0.2,
    });
  }
  timers.bluePulse = Math.max(0, (timers.bluePulse ?? 3) - dt);
  if (timers.bluePulse <= 0) {
    timers.bluePulse = 5;
    const angle = Math.atan2(player.y - ghost.y, player.x - ghost.x);
    spawnOrbProjectile(ghost, angle, 360, 18, {
      len: 32,
      hitRadius: 26,
      slow: true,
      slowDuration: 1.4,
    });
    spawnOrbHazard(ghost.x, ghost.y, 50, 2.5, 0, {
      color: "rgba(150,210,255,0.45)",
      cooldown: 0.2,
    });
  }
  timers.blueTide = Math.max(0, (timers.blueTide ?? 7) - dt);
  if (timers.blueTide <= 0) {
    timers.blueTide = 10;
    const map = State.map;
    if (map) {
      const beams = 5;
      for (let i = 0; i < beams; i += 1) {
        const angle = (i / beams) * Math.PI;
        spawnOrbBeam(ghost, angle, map.w * 1.1, 88, 14, {
          color: "rgba(120,200,255,0.42)",
          duration: 3.2,
        });
      }
    }
  }
}

const ORB_BOSS_ROUTINES = {
  0: updateRedOrbBoss,
  1: updateGoldOrbBoss,
  2: updateGreenOrbBoss,
  3: updateBlueOrbBoss,
};

function updateOrbBossMechanics(ghost, dt) {
  if (!ghost || !ghost.realmBoss) return;
  const routine = ORB_BOSS_ROUTINES[ghost.realmId];
  if (typeof routine === "function") {
    routine(ghost, dt);
  }
}

  function isKaelAllyAlive() {
    return (
      !State.flags.betrayalHappened &&
      State.kael &&
      !State.flags.kaelDown &&
      Number.isFinite(State.kael.hp) &&
      State.kael.hp > 0
    );
  }

  function handleKaelDeath() {
    if (State.flags.kaelDown) return;
    State.flags.kaelDown = true;
    State.kael.follow = false;
    clearKaelAggroTargets();
    showKaelAllyGameOver();
  }

function updateGhosts(dt) {
  const ghosts = State.ghosts;
  const player = State.player;
  const kaelAlive = isKaelAllyAlive();
  const kael = State.kael;
  const map = State.map;
  if (!Array.isArray(ghosts) || !player || !map) return;

  for (const ghost of ghosts) {
    if (!ghost) continue;

    // Timers généraux
    ghost.attackCooldown = Math.max(0, (ghost.attackCooldown ?? 0) - dt);
    ghost.hurtTimer = Math.max(0, (ghost.hurtTimer ?? 0) - dt);
    ghost.hitFlash = Math.max(0, (ghost.hitFlash ?? 0) - dt);
    ghost.specialCooldown = Math.max(0, (ghost.specialCooldown ?? 0) - dt);
    ghost.specialFlash = Math.max(0, (ghost.specialFlash ?? 0) - dt);

    if (ghost.dead) {
      ghost.animator?.update?.(dt);
      continue;
    }

    // Cible : player par défaut, Kael allié si plus proche
    const dxP = player.x - ghost.x;
    const dyP = player.y - ghost.y;
    const distP = Math.hypot(dxP, dyP) || 1;

    const dxK = kaelAlive ? kael.x - ghost.x : 0;
    const dyK = kaelAlive ? kael.y - ghost.y : 0;
    const distK = kaelAlive ? Math.hypot(dxK, dyK) || 1 : Infinity;

  const inOrbRealm = orbRealmState.active;
  let target = player;
  let dx = dxP;
  let dy = dyP;
  let dist = distP;
  if (!inOrbRealm && kaelAlive && distK < distP * 0.9) {
    target = kael;
    dx = dxK;
    dy = dyK;
    dist = distK;
  }

    let baseAction = "idle";

    // =========================================================
    //      NOUVELLE ATTAQUE SPÉCIALE : WARP SPECTRAL
    // =========================================================

    // 1) Déclenchement : quand assez proche, cooldown OK, pas déjà en spé
    const canTriggerSpecial =
      !ghost.specialState && ghost.specialCooldown <= 0 && dist > 40 && dist < 180;

    if (canTriggerSpecial) {
      ghost.specialState = "warp_charge";
      ghost.chargeMax = 1.5;      // temps de charge
      ghost.chargeTimer = ghost.chargeMax;
      ghost.specialFlash = 0.3;
    }

    // === Phase de charge ===
    if (ghost.specialState === "warp_charge") {
      ghost.chargeTimer = Math.max(0, ghost.chargeTimer - dt);
      baseAction = "attack"; // le sprite peut lever les bras, etc.

      // petit clignotement visuel
      ghost.specialFlash = Math.max(
        ghost.specialFlash,
        0.25 + 0.35 * Math.sin((ghost.chargeTimer * 18) % Math.PI)
      );

      // On ne se déplace pas pendant la charge
      ghost.animator?.setBase?.(baseAction);
      ghost.animator?.update?.(dt);
      if (ghost.realmBoss) {
        updateOrbBossMechanics(ghost, dt);
      }

      if (ghost.chargeTimer <= 0) {
        // Transition vers le dash spectral
        ghost.specialState = "warp_dash";
        ghost.warpDuration = 0.4;
        ghost.warpTimer = ghost.warpDuration;
        ghost.warpHit = false;
        playGhostDashSound();

        // Direction figée vers la cible à l'instant T
        const d = Math.hypot(dx, dy) || 1;
        ghost.warpDir.x = dx / d;
        ghost.warpDir.y = dy / d;

        // petit flash d'impact
        ghost.specialFlash = 0.8;
      }

      continue; // on ne fait rien d'autre ce frame
    }

    // === Phase de dash spectral ===
    if (ghost.specialState === "warp_dash") {
      ghost.warpTimer = Math.max(0, ghost.warpTimer - dt);

      // vitesse du dash
      const dashSpeed = ghost.chaseSpeed * 2.4;
      const step = dashSpeed * dt;

      // PHASE : pas de collision pour le dash spectral
      ghost.x += ghost.warpDir.x * step;
      ghost.y += ghost.warpDir.y * step;

      // trail fantomatique simple (données, rendu dans drawGhosts)
      if (!ghost.ghostTrail) ghost.ghostTrail = [];
      const trailLife = 0.35;
      ghost.ghostTrail.push({
        x: ghost.x,
        y: ghost.y,
        life: trailLife,
        maxLife: trailLife,
      });
      if (ghost.ghostTrail.length > 24) {
        ghost.ghostTrail.splice(0, ghost.ghostTrail.length - 24);
      }

      baseAction = "run";

      // vecteur vers la cible
      const tx = target.x - ghost.x;
      const ty = target.y - ghost.y;
      const distToTarget = Math.hypot(tx, ty) || 1;

      // projection de la cible sur l'axe du dash
      const proj = tx * ghost.warpDir.x + ty * ghost.warpDir.y;

      // dégâts au moment où on traverse la cible pour la première fois
      if (!ghost.warpHit && distToTarget < ghost.attackRange * 1.4) {
        const dmg = Math.round(ghost.attackDamage * 2.1);
        registerKaelAggroTarget(ghost);
        if (target === kael) {
          if (kael.applyDamage(dmg)) {
            handleKaelDeath();
          }
        } else {
          target.applyDamage?.(dmg);
        }
        spawnFloatingText(-dmg, target.x, target.y - 14, {
          color: "rgba(120,220,255,0.98)",
          stroke: "rgba(0,0,0,0.7)",
        });
        ghost.warpHit = true;
        ghost.hitFlash = 0.25;
      }

      // Une fois qu'on a touché la cible, on laisse le fantôme continuer
      // jusqu'à ce qu'elle soit derrière lui (proj <= 0 => cible dépassée)
      if (ghost.warpHit && proj <= 0) {
        ghost.warpTimer = 0; // on force la fin du dash spectral
      }

      ghost.animator?.setBase?.(baseAction);
      ghost.animator?.update?.(dt);

      if (ghost.warpTimer <= 0) {
        ghost.specialState = null;
        ghost.specialCooldown = 4.5; // délai avant prochaine spé
      }

      // On ne fait pas la logique de poursuite normale sur cette frame
      continue;
    }


    // =========================================================
    //       COMPORTEMENT NORMAL : POURSUITE + ATTAQUE
    // =========================================================

    if (dist < 50) {
      const step = ghost.chaseSpeed * dt;
      const moved = moveGhost(
        ghost,
        (dx / dist) * step,
        (dy / dist) * step,
        map,
        { x: dx / dist, y: dy / dist }
      );
      baseAction = moved ? "run" : "idle";

      if (dist < ghost.attackRange && ghost.attackCooldown <= 0) {
        registerKaelAggroTarget(ghost);
        const dmg = ghost.attackDamage;
        if (target === kael) {
          if (kael.applyDamage(dmg)) {
            handleKaelDeath();
          }
        } else {
          target.applyDamage?.(dmg);
        }
        spawnFloatingText(-dmg, target.x, target.y - 14, {
          color: "rgba(255,80,80,0.95)",
          stroke: "rgba(0,0,0,0.7)",
        });
        ghost.attackCooldown = 1.35;
        ghost.animator?.play?.("attack", { force: true });
      }
    }

    // Décroissance du trail fantomatique (si déjà généré)
    if (ghost.ghostTrail && ghost.ghostTrail.length) {
      for (const t of ghost.ghostTrail) {
        t.life -= dt;
      }
      ghost.ghostTrail = ghost.ghostTrail.filter((t) => t.life > 0);
    }

    ghost.animator?.setBase?.(baseAction);
    ghost.animator?.update?.(dt);
    if (ghost.realmBoss) {
      updateOrbBossMechanics(ghost, dt);
    }
  }
}


  function spawnFloatingText(value, x, y, opts = {}) {
    State.floatingTexts.push({
      value: Math.round(value),
      x,
      y,
      lifetime: 1,
      maxLifetime: 1,
      vy: -30 - Math.random() * 20,
      color: opts.color || "rgba(255,215,110,1)",
      stroke: opts.stroke || "rgba(0,0,0,0.65)",
    });
  }

  function fireRangedAttack(player, dir = { x: 1, y: 0 }) {
    const mag = Math.hypot(dir.x, dir.y) || 1;
    const vx = dir.x / mag;
    const vy = dir.y / mag;
    const speed = 600;
    const maxDist = 170;
    const life = maxDist / speed;
    const len = 21 * 2.5;
    const hitRadius = 16;
    State.projectiles.push({
      x: player.x + vx * 12,
      y: player.y + vy * 12,
      vx: vx * speed,
      vy: vy * speed,
      lifetime: life,
      damage: 10,
      len,
      hitRadius: hitRadius * 2,
      trail: [],
      hit: false,
    });
    player.rangedCooldown = 0.35;
  }

  function updateProjectiles(dt) {
    const arr = State.projectiles ?? [];
    const ghosts = State.ghosts;
    const map = State.map;
    const remaining = [];
    arr.forEach((p) => {
      if (!p || p.lifetime <= 0) return;
      p.lifetime -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const trail = p.trail ?? [];
      trail.push({
        x: p.x,
        y: p.y,
        life: 0.18,
        maxLife: 0.18,
        radius: 12,
      });
      if (trail.length > 10) trail.splice(0, trail.length - 10);
      trail.forEach((node) => {
        node.life = Math.max(0, node.life - dt);
      });
      p.trail = trail.filter((node) => node.life > 0);
      // stop if blocked by wall
      if (map?.isBlocked?.(p.x, p.y)) return;
      let hit = false;
      const canHitKael = !isKaelAllyAlive();
      const kael = State.kael;
      const targets = [
        ...(Array.isArray(ghosts) ? ghosts : []),
        State.boss,
        State.kael,
      ]
        .filter(Boolean)
        .filter((target) => {
          if (target === kael && !canHitKael) return false;
          return true;
        });
      for (const target of targets) {
      if (target.dead || !Number.isFinite(target.hp)) continue;
        if (target === p.owner) continue;
        const hitRadius =
          p.hitRadius ??
          Math.max(28, (target.scale ?? 0.128) * 140) * 0.5;
        const d = Math.hypot(p.x - target.x, p.y - target.y);
        if (d < hitRadius) {
          const damage = dealDamageToTarget(target, p.damage);
          if (damage > 0) {
            target.hurtTimer = Math.max(0, target.hurtTimer ?? 0);
            target.hitFlash = 0.35;
            spawnFloatingText(damage, target.x, target.y - 18, {
              color: "rgba(255,215,110,1)",
            });
            if (target.hp === 0 && !target.dead) {
              target.dead = true;
              target.animator?.play?.("dead", { sticky: true, force: true });
              unregisterKaelAggroTarget(target);
              if (target === State.boss) {
                handleKaelDeath?.();
              }
            }
          }
          hit = true;
          break;
        }
      }
      if (!hit && p.lifetime > 0) remaining.push(p);
    });
    State.projectiles = remaining;
    if (State.player) {
      State.player.rangedCooldown = Math.max(0, (State.player.rangedCooldown ?? 0) - dt);
    }
  }

  function drawProjectiles(ctx, camX, camY, scaleX, scaleY) {
    const arr = State.projectiles ?? [];
    if (!arr.length) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    arr.forEach((p) => {
      const sx = (p.x - camX) * scaleX;
      const sy = (p.y - camY) * scaleY;
      const len = p.len ?? 21;
      const dir = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(dir);
      const grad = ctx.createLinearGradient(-len, 0, len, 0);
      grad.addColorStop(0, 'rgba(255,215,80,0)');
      grad.addColorStop(0.3, 'rgba(255,255,255,0.9)');
      grad.addColorStop(0.6, 'rgba(255,200,130,0.9)');
      grad.addColorStop(1, 'rgba(255,145,60,0.1)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = len * 0.35;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-len, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = len * 0.15;
      ctx.stroke();
      ctx.restore();

      const beamTrail = p.trail ?? [];
      if (beamTrail.length) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        beamTrail.forEach((node) => {
          const ratio = Math.max(
            0,
            Math.min(1, (node.life ?? 0) / Math.max(0.0001, node.maxLife ?? 1))
          );
          const radius = Math.max(6, (len * 0.15) * ratio);
          const glow = ctx.createRadialGradient(
            (node.x - camX) * scaleX,
            (node.y - camY) * scaleY,
            0,
            (node.x - camX) * scaleX,
            (node.y - camY) * scaleY,
            radius * Math.max(scaleX, scaleY)
          );
          glow.addColorStop(0, `rgba(255,255,255,${0.45 * ratio})`);
          glow.addColorStop(0.5, `rgba(255,200,130,${0.35 * ratio})`);
          glow.addColorStop(1, 'rgba(255,120,70,0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(
            (node.x - camX) * scaleX,
            (node.y - camY) * scaleY,
            radius * Math.max(scaleX, scaleY),
            0,
            Math.PI * 2
          );
          ctx.fill();
        });
        ctx.restore();
      }
    });
    ctx.restore();
  }
  function updateFloatingTexts(dt) {
    const arr = State.floatingTexts;
    if (!Array.isArray(arr)) return;
    for (const ft of arr) {
      ft.lifetime = Math.max(0, ft.lifetime - dt);
      ft.y += ft.vy * dt;
    }
    State.floatingTexts = arr.filter((ft) => ft.lifetime > 0);
  }

  function drawFloatingTexts(ctx, camX, camY, scaleX, scaleY) {
    const arr = State.floatingTexts;
    if (!Array.isArray(arr) || arr.length === 0) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textAlign = "center";
    ctx.font = "bold 18px 'Segoe UI', sans-serif";
    for (const ft of arr) {
      const alpha = ft.lifetime / ft.maxLifetime;
      const sx = (ft.x - camX) * scaleX;
      const sy = (ft.y - camY) * scaleY;
      ctx.globalAlpha = Math.min(1, alpha + 0.2);
      ctx.fillStyle = ft.color || "rgba(255,215,110,1)";
      ctx.strokeStyle = ft.stroke || "rgba(0,0,0,0.65)";
      ctx.lineWidth = 2;
      ctx.strokeText(ft.value, sx, sy);
      ctx.fillText(ft.value, sx, sy);
    }
    ctx.restore();
  }

  function checkPrincessQuestCompletion(player) {
    if (!State.flags.princessQuestAccepted) return;
    if (State.flags.questCompletedShown) return;
    const princess = State.princess;
    if (!princess) return;
    const allActivated = areAllPuzzleOrbsActivated();
    if (!allActivated) {
      if (!State.flags.princessQuestBlockedForOrbs) {
        State.flags.princessQuestBlockedForOrbs = true;
        pushStatus("Active les quatre orbes avant de rejoindre la princesse.");
      }
      return;
    }
    State.flags.princessQuestBlockedForOrbs = false;
    const dist = Math.hypot(player.x - princess.x, player.y - princess.y);
    if (dist <= 50) {
      State.flags.questCompletedShown = true;
      State.questAnnouncement = { title: "Quete terminee", subtitle: "Rejoins la princesse", timer: 4, max: 4 };
      pushStatus("Princesse trouvee !");
    }
  }

  function maybeAutoAcceptKaelQuest() {
    if (State.flags.princessQuestAccepted) return;
    if (!State.flags.princessUnlocked) return;
    const player = State.player;
    const princess = State.princess;
    if (!player || !princess) return;
    const dist = Math.hypot(player.x - princess.x, player.y - princess.y);
    if (dist <= 50) {
      acceptKaelQuest();
    }
  }

function registerKaelAggroTarget(ghost) {
  if (!ghost) return;
  if (orbRealmState.active) return;
  const targets = State.kaelAggroTargets;
    if (!targets) return;
    targets.add(ghost);
    State.flags.kaelAggro = true;
  }

  function unregisterKaelAggroTarget(ghost) {
    const targets = State.kaelAggroTargets;
    if (!targets || !targets.has(ghost)) return;
    targets.delete(ghost);
    State.flags.kaelAggro = targets.size > 0;
  }

  function clearKaelAggroTargets() {
    const targets = State.kaelAggroTargets;
    if (!targets) return;
    targets.clear();
    State.flags.kaelAggro = false;
  }

  function damageGhostsFromPlayer() {
    const ghosts = State.ghosts;
    const player = State.player;
    if (!player || !Array.isArray(ghosts)) return;
    if (!player.canDealAttackDamage?.()) return;
    const attackRange = player.attackRadius ?? 70;
    let registeredHit = false;
    ghosts.forEach((ghost) => {
      if (!ghost || ghost.dead) return;
      const dist = Math.hypot(player.x - ghost.x, player.y - ghost.y);
      if (dist > attackRange) return;
      if (player.isTargetInAttackArc?.(ghost.x, ghost.y) === false) return;
      const damage = player.getCurrentAttackDamage?.() ?? 12;
      const inflicted = dealDamageToTarget(ghost, damage);
      ghost.hurtTimer = 0.25;
      ghost.hitFlash = 0.35;
      ghost.animator?.play?.("hurt", { force: true });
      if (!registeredHit) {
        player.confirmAttackHit?.();
        registeredHit = true;
      }
      if (ghost.hp === 0 && !ghost.dead) {
        ghost.dead = true;
        ghost.animator?.play?.("dead", { sticky: true, force: true });
        unregisterKaelAggroTarget(ghost);
      }
      if (inflicted > 0) {
        spawnFloatingText(inflicted, ghost.x, ghost.y - 20, { color: "rgba(255,215,110,1)" });
      }
    });

    const boss = orbRealmState.id === 1 ? orbRealmState.kaelReplica : null;
    const goldState = orbRealmState.id === 1 ? orbRealmState.goldBoss : null;
    if (boss && goldState?.combatActive && boss.alive) {
      const dist = Math.hypot(player.x - boss.x, player.y - boss.y);
      const effectiveRange = attackRange + (boss.hitRadius ?? 0);
      if (dist <= effectiveRange) {
        const damage = player.getCurrentAttackDamage?.() ?? 12;
        const inflicted = dealDamageToTarget(boss, damage);
        if (inflicted > 0) {
          if (!registeredHit) {
            player.confirmAttackHit?.();
            registeredHit = true;
          }
          spawnFloatingText(inflicted, boss.x, boss.y - 20, { color: "rgba(255,215,110,1)" });
        }
      }
    }
  }

  function handleKaelVsGhosts(dt) {
    const kael = State.kael;
    if (!isKaelAllyAlive()) return;
    const threats = State.kaelAggroTargets;
    if (!threats || !threats.size) {
      State.flags.kaelAggro = false;
      return;
    }
    kael.attackCooldown = Math.max(0, (kael.attackCooldown ?? 0) - dt);
    const range = kael.attackRange ?? 40;
    if (kael.attackCooldown > 0) return;

    const targets = Array.from(threats);
    for (const ghost of targets) {
      if (!ghost || ghost.dead) {
        threats.delete(ghost);
        continue;
      }
      const dist = Math.hypot(kael.x - ghost.x, kael.y - ghost.y);
      if (dist > range) continue;
      const dmg = kael.attackDamage ?? 14;
      const inflicted = dealDamageToTarget(ghost, dmg);
      ghost.hurtTimer = 0.25;
      ghost.hitFlash = 0.35;
      ghost.animator?.play?.("hurt", { force: true });
      const atkAnim = kael.animator?.animations?.[`attack_${kael.facing}`] ? `attack_${kael.facing}` : "attack";
      kael.animator?.play?.(atkAnim, { force: true });
      kael.attackCooldown = 0.8;
      if (ghost.hp === 0 && !ghost.dead) {
        ghost.dead = true;
        ghost.animator?.play?.("dead", { sticky: true, force: true });
        unregisterKaelAggroTarget(ghost);
      }
      if (inflicted > 0) {
        spawnFloatingText(inflicted, ghost.x, ghost.y - 20, { color: "rgba(255,215,110,1)" });
      }
      break;
    }
    State.flags.kaelAggro = threats.size > 0;
  }

  function maybeWarnEnemiesNearby() {
    if (State.flags.enemyWarningSpoken) return;
    const ghosts = State.ghosts;
    const player = State.player;
    const kael = State.kael;
    if (!Array.isArray(ghosts) || !player) return;
    const threshold = 150;
    if (State.dialogue?.isOpen?.()) return;
    for (const ghost of ghosts) {
      if (!ghost || ghost.dead) continue;
      const distPlayer = Math.hypot(player.x - ghost.x, player.y - ghost.y);
      const distKael = kael ? Math.hypot(kael.x - ghost.x, kael.y - ghost.y) : Infinity;
      if (distPlayer < threshold || distKael < threshold) {
        State.flags.enemyWarningSpoken = true;
        State.dialogue?.show?.([
          { speaker: "Kael", text: "Je sens des spectres a moins de cent pas. Reste sur tes gardes." },
        ]);
        break;
      }
    }
  }

  function findNearestAliveGhost(maxDist = Infinity) {
    const ghosts = State.ghosts;
    if (!Array.isArray(ghosts)) return null;
    const origin = State.kael ?? State.player;
    if (!origin) return null;
    let best = null;
    let bestD = maxDist;
    ghosts.forEach((g) => {
      if (!g || g.dead) return;
      const d = Math.hypot(origin.x - g.x, origin.y - g.y);
      if (d < bestD) {
        best = g;
        bestD = d;
      }
    });
    return best;
  }

  function updateQuestAnnouncement(dt) {
    const qa = State.questAnnouncement;
    if (!qa) return;
    qa.timer = Math.max(0, qa.timer - dt);
    if (qa.timer <= 0) State.questAnnouncement = null;
  }

  function moveGhost(ghost, mx, my, world, dir = null) {
    if (!world) {
      ghost.x += mx;
      ghost.y += my;
      return true;
    }
    let moved = false;
    if (mx !== 0) {
      const nextX = ghost.x + mx;
      if (!world.isBlocked(nextX, ghost.y)) {
        ghost.x = nextX;
        moved = true;
      }
    }
    if (my !== 0) {
      const nextY = ghost.y + my;
      if (!world.isBlocked(ghost.x, nextY)) {
        ghost.y = nextY;
        moved = true;
      }
    }

    // Petit évitement de mur : tente un pas latéral si bloqué
    if (!moved && dir && (mx !== 0 || my !== 0)) {
      const len = Math.hypot(dir.x, dir.y) || 1;
      const nx = dir.x / len;
      const ny = dir.y / len;
      const steer = Math.hypot(mx, my) * 0.7;
      const options = [
        { x: -ny * steer, y: nx * steer },
        { x: ny * steer, y: -nx * steer },
      ];
      for (const opt of options) {
        const tx = ghost.x + opt.x;
        const ty = ghost.y + opt.y;
        if (!world.isBlocked(tx, ty)) {
          ghost.x = tx;
          ghost.y = ty;
          moved = true;
          break;
        }
      }
    }
    return moved;
  }

function drawGhosts(ctx) {
  const ghosts = State.ghosts;
  if (!Array.isArray(ghosts)) return;

  ghosts.forEach((ghost) => {
    if (!ghost || ghost.hiddenForStorm) return;

    const frame = ghost.animator?.getFrame?.();
    const scale = ghost.scale ?? 0.32;

    // ============================================================
    // 1) TRAIL FANTOMATIQUE (halo radial + afterimages)
    // ============================================================

    if (ghost.ghostTrail && ghost.ghostTrail.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      ghost.ghostTrail.forEach((t) => {
        const ratio = t.life / t.maxLife;
        const radius = 24 + (1 - ratio) * 32;
        const alpha = 0.12 + ratio * 0.25;

        // halo radial moderne
        const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, radius);
        grad.addColorStop(0, `rgba(120,180,255,${alpha})`);
        grad.addColorStop(0.45, `rgba(80,140,255,${alpha * 0.85})`);
        grad.addColorStop(1, "rgba(10,20,40,0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Afterimages directionnelles (ombre bleutée)
        ctx.globalAlpha = alpha * 0.55;
        ctx.fillStyle = "rgba(90,160,255,0.55)";
        ctx.beginPath();
        ctx.arc(t.x, t.y, radius * 0.55, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    }

    // ============================================================
    // 2) SPRITE DU FANTÔME (dessin principal)
    // ============================================================

    let flashWx = 26;
    let flashWy = 26;

    if (frame) {
      const dw = frame.sw * scale;
      const dh = frame.sh * scale;

      flashWx = dw * 0.35;
      flashWy = dh * 0.35;

      // Glow léger même idle
      ctx.save();
      ctx.globalCompositeOperation = "lighten";
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "rgba(80,160,255,0.6)";
      ctx.beginPath();
      ctx.arc(ghost.x, ghost.y, flashWx * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Sprite
      ctx.drawImage(
        frame.image,
        frame.sx, frame.sy,
        frame.sw, frame.sh,
        Math.round(ghost.x - dw / 2),
        Math.round(ghost.y - dh / 2),
        dw, dh
      );
    }

    // ============================================================
    // 3) BARRE DE VIE
    // ============================================================

    if (!ghost.dead) {
      const w = 34;
      const h = 4;
      const ratio = Math.max(0, ghost.hp) / (ghost.maxHp || 1);

      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(ghost.x - w / 2, ghost.y - 28, w, h);

      ctx.fillStyle = "#7ff3ff";
      ctx.fillRect(ghost.x - w / 2 + 1, ghost.y - 27, (w - 2) * ratio, h - 2);

      ctx.restore();
    }

    // ============================================================
    // 4) HIT FLASH (quand il prend un coup)
    // ============================================================

    if (ghost.hitFlash > 0) {
      const alpha = Math.min(0.8, ghost.hitFlash / 0.35);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(120,200,255,0.95)";
      ctx.beginPath();
      ctx.ellipse(ghost.x, ghost.y, flashWx, flashWy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ============================================================
    // 5) EFFET CHARGE (warp_charge)
    // ============================================================

    if (ghost.specialState === "warp_charge") {
      const progress = 1 - ghost.chargeTimer / Math.max(ghost.chargeMax || 1, 0.0001);

      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.globalCompositeOperation = "screen";

      const radius = flashWx * (1.4 + progress * 1.8);

      ctx.strokeStyle = `rgba(150,220,255,0.85)`;
      ctx.lineWidth = 4;

      ctx.beginPath();
      ctx.arc(ghost.x, ghost.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      // pulsation interne
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = `rgba(120,180,255,0.45)`;
      ctx.beginPath();
      ctx.arc(ghost.x, ghost.y, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // ============================================================
    // 6) FLASH SPÉCIAL DURANT LE WARP
    // ============================================================

    if (ghost.specialFlash > 0) {
      const alpha = Math.min(0.5, ghost.specialFlash / 0.55);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = "lighter";

      const radius = flashWx * 1.8;

      ctx.strokeStyle = "rgba(120,200,255,0.95)";
      ctx.lineWidth = 6;

      ctx.beginPath();
      ctx.arc(ghost.x, ghost.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
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
        { speaker: "???", text: "h..h...h..ha ha ha ha HA HA HA HA HA HA HA" },
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
          text: "Tu entends ça ? ",
        },
         {
          speaker: "Kael",
          text: "Oui, et la présence du Coeur est encore plus forte, c'est forcément elle ! . . . Ahhhhh les voix.... ",
        },
        {
          speaker: "Moi",
          text: "Tu ... Tu va bien ? ",
        },
          {
          speaker: "Kael",
          text: "Ce n'est rien, allons y, Vite ! ",
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
    if (!player) return;
    const spawn = State.spawnPoint;
    if (!spawn) return;
    const limit = spawn.y + 300;
    if (player.y > limit) {
      playGhostWallSound();
      if (State.flags.princessQuestAccepted) {
        return;
      }
      player.y = limit - 5;
      clampCameraToPlayer(player.x, player.y);
      if (!State.flags.preQuestBoundaryWarned) {
        State.flags.preQuestBoundaryWarned = true;
        pauseForDialogue(
          [
            {
              speaker: "Moi",
              text: "Je devrais parler a Kael avant d'entrer dans le labyrinthe.",
            },
          ]
        );
      }
    } else {
      State.flags.preQuestBoundaryWarned = false;
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

  function acceptKaelQuest() {
    if (State.flags.princessQuestAccepted) return;
    State.questPromptCooldown = 0.6;
    State.flags.kaelMet = true;
    State.flags.princessQuestAccepted = true;
    State.kael.follow = true;
    pushStatus("Quete acceptee : aider Kael a retrouver la princesse.");
    State.questAnnouncement = { title: "Quete acceptee", subtitle: "Retrouver Aelya", timer: 4, max: 4 };
    scheduleKaelOrbHint();
  }

  function startKaelQuestDialogue() {
    if (State.dialogue.isOpen() || State.orbPromptOpen || State.bossRiddleOpen) return;
    if ((State.questPromptCooldown ?? 0) > 0) return;
    if (State.flags.princessQuestAccepted) return;
    pauseForDialogue(
      [
        {
          speaker: "Kael",
          text: "Lioran… te voilà enfin. Aëlya n’est plus très loin. Je sens sa présence quelque part dans les profondeurs du labyrinthe d’Éphéria.",
        },
        {
          speaker: "Kael",
          text: "On dit que ce labyrinthe résonne des voix et des ombres du passé… Restons sur nos gardes.",
        },
        {
          speaker: "Kael",
          text: "Allons y, retrouvons la princesse. Elle qui porte le 'Coeur'… et si nous la ramenons, nous pourrons enfin libérer ce monde des ténèbres.",
        },
      ],
      () => {
        showKaelQuestPrompt();
      }
    );
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
    State.questAnnouncement = null;
    pauseForDialogue(
      [
        { speaker: "Kael", text: "..." },
{ speaker: "Kael", text: "Lioran... les voix… elles ont gagné." },
{ speaker: "Kael", text: "Le Cœur doit m'appartenir. Avec lui, je deviendrai aussi puissant qu’un dieu !" },
{ speaker: "Kael", text: "Tu n'es pas digne de le garder pour toi." },
{ speaker: "Kael", text: "Aëlya et toi allez mourir ici, de mes mains. Et lorsque ce sera fait, je ravagerai ce monde au nom des ténèbres." },
{ speaker: "Kael", text: "Tourne-toi maintenant. Le coup sera bref, tu n’es pas obligé de souffrir." },
{ speaker: "Moi", text: "Tu as perdu la tête ? Je ne peux pas te laisser faire ça… reprends-toi !" },
{ speaker: "Kael", text: "Tu ne me laisses pas le choix. En garde !" },

      ],
      () => {
        showBossObjective("Vaincre Kael");
      }
    );
  }

  // ===== Render =====
function render() {
    const { map, player, boss, princess, puzzleOrbs } = State;
    const camera = State.camera;

    const camX = camera.x | 0;
    const camY = camera.y | 0;
    const scaleX = $canvas.width / Math.max(1, camera.w);
    const scaleY = $canvas.height / Math.max(1, camera.h);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, $canvas.width, $canvas.height);

    ctx.save();
    ctx.scale(scaleX, scaleY);

    ctx.drawImage(mapImg, camX, camY, camera.w, camera.h, 0, 0, camera.w, camera.h);

    ctx.save();
    ctx.translate(-camX, -camY);
    if (orbRealmState.active) {
      drawGhosts(ctx);
      drawPlayerDashTrail(ctx);
      drawKaelDashTrail(ctx);
      drawPlayerAttackTrail(ctx);
      drawPlayerWithinOrbRealm(ctx);
      drawOrbHazards(ctx);
      drawOrbReturnZone(ctx);
      drawOrbBarrier(ctx, camX, camY, camera);
      if (orbRealmState.id === 1) {
        const goldStage = orbRealmState.goldBoss?.stage;
        if (goldStage !== "waiting" && orbRealmState.kaelReplica && !orbRealmState.kaelReplica.hiddenForStorm) {
          orbRealmState.kaelReplica.draw(ctx);
          drawGoldBossAura(ctx);
        }
      }
      if (orbRealmState.activeStorm) {
        drawActiveLightStorm(ctx);
        drawActiveLightStormTimer(ctx);
      }
      ctx.restore();
      ctx.restore();
      drawOrbBossHealth(ctx);
      State.fog.drawTo(ctx, camX, camY, camera.w, camera.h);
      applyLighting(ctx, State.mode, camX + camera.w / 2, camY + camera.h / 2, 0);
      vignette(ctx, $canvas.width, $canvas.height, 0.35);
      State.dialogue.draw(ctx, $canvas);
      return;
    }
    drawPickups(ctx);
    drawGhosts(ctx);
    drawPlayerDashTrail(ctx);
    drawKaelDashTrail(ctx);
    drawPlayerAttackTrail(ctx);

    if (State.flags.princessUnlocked) {
      State.princess.draw(ctx);
    }
    if (!State.flags.betrayalHappened) {
      State.kael.draw(ctx);
      if (State.flags.princessQuestAccepted && isKaelAllyAlive()) {
        drawKaelAllyHpBar(ctx, State.kael);
      }
      if (!State.flags.princessQuestAccepted) {
        drawQuestMarker(ctx, State.kael);
      }
    }
    if (State.flags.betrayalHappened && !State.flags.kaelDefeated) {
      State.boss.draw(ctx);
      drawBossHpBar(ctx, boss);
      drawKaelMechanicIndicator(ctx, boss);
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
    if (State.bossObjective) {
      drawBossObjective(ctx, playerScreenX, playerScreenY, State.bossObjective);
    }
    if (State.questAnnouncement) {
      drawQuestBanner(ctx, playerScreenX, playerScreenY - 80, State.questAnnouncement);
    }
    drawFloatingTexts(ctx, camX, camY, scaleX, scaleY);
    drawProjectiles(ctx, camX, camY, scaleX, scaleY);

    // post-processing
    applyLighting(ctx, State.mode, playerScreenX, playerScreenY, player.torchOn);
    drawLowHpOverlay(ctx, player);

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
  playTrackedGameOverClip("gameOver", 0.2);
  if (State.gameOverSoundTimeout) {
    clearTimeout(State.gameOverSoundTimeout);
  }

  State.gameOverSoundTimeout = setTimeout(() => {
    playTrackedGameOverClip("gameOverPost", 0.2);
    State.gameOverSoundTimeout = null;
  }, 1000);
}

function resetGameOverSound() {
  if (State.gameOverSoundTimeout) {
    clearTimeout(State.gameOverSoundTimeout);
    State.gameOverSoundTimeout = null;
  }
  State.gameOverSoundScheduled = false;
  stopGameOverAudioPlayback();
}

  function showKaelAllyGameOver() {
    if (State.flags.kaelGameOverShown) return;
    State.flags.kaelGameOverShown = true;
    State.paused = true;
    State.awaitingEndingButton = true;
    State.dialogue?.close?.();
    const el = document.getElementById("ending");
    if (!el) return;
    playGameOverSound();
    stopBossMusic(true);
    State.bossMusicPending = false;
    el.classList.remove("hidden");
    el.innerHTML = `
      <div class="card">
        <h2>Game Over</h2>
        <p>Kael n'a pas survécu. Le labyrinthe reprend sa colère.</p>
        <div class="choices">
          <button data-retry-kael>Recommencer</button>
        </div>
      </div>`;
    el.querySelector("[data-retry-kael]")?.addEventListener(
      "click",
      () => {
        State.awaitingEndingButton = false;
        State.paused = false;
        resetGameOverSound();
        location.reload();
      },
      { once: true }
    );
  }

  function renderBossGameOver() {
    if (State.bossRetryShown) return;
    const el = document.getElementById("ending");
    if (!el) return;
    stopBossMusic(true);
    State.bossMusicPending = false;
    State.bossRetryShown = true;
    State.paused = true;
    State.awaitingEndingButton = true;
    playGameOverSound();
    el.classList.remove("hidden");
    el.innerHTML = `
      <div class="card">
        <h2>Game Over</h2>
        <p>Kael t'a vaincu. Relance le duel et reprends le dessus.</p>
        <div class="choices">
          <button data-retry-boss>Retenter le combat</button>
          <button data-retry-ghost>Retenter l'épreuve</button>
          <button data-abandon>Abandonner</button>
        </div>
      </div>`;
    el.querySelector("[data-retry-boss]")?.addEventListener("click", () => {
      State.awaitingEndingButton = false;
      retryBossFight();
    });
    el.querySelector("[data-abandon]")?.addEventListener("click", () => {
      State.awaitingEndingButton = false;
      goToTitle();
    });
    el.querySelector("[data-retry-ghost]")?.addEventListener("click", () => {
      State.awaitingEndingButton = false;
      State.paused = false;
      const container = document.getElementById("ending");
      if (container) {
        container.classList.add("hidden");
        container.innerHTML = "";
      }
      retryOrbStorm({ showDialogue: true });
    });
  }

  function retryBossFight() {
    const el = document.getElementById("ending");
    if (el) {
      el.classList.add("hidden");
      el.innerHTML = "";
    }
    State.bossRetryShown = false;
    State.paused = false;
    State.awaitingEndingButton = false;
    State.awaitingEndingButton = false;
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
    State.flags.kaelPhaseTwoStarted = false;
    State.flags.kaelPhaseTwoDefeated = false;
    State.flags.kaelPhaseThreeStarted = false;
    State.flags.kaelPhaseThreeDefeated = false;
    State.flags.princessEscapeOffered = false;
    if (checkpoint) {
      checkpoint.phase = 1;
      checkpoint.hpMultiplier = 1;
    }
    if (State.princess) {
      State.princess.x = (checkpoint?.player?.x ?? State.player.x) - 40;
      State.princess.y = (checkpoint?.player?.y ?? State.player.y) + 30;
      State.princess.follow = true;
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
    State.awaitingEndingButton = false;
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
    State.paused = true;
    State.awaitingEndingButton = true;
    el.classList.remove("hidden");
    el.innerHTML = `
      <div class="card">
        <h2>Les âmes défuntes t'emporte.</h2>
        <p>Ton dernier souvenir disparais dans la poussière d'Ephéria.</p>
        <div class="choices">
          <button data-retry>Retenter l'épreuve</button>
          <button data-abandon>Retour à l'accueil</button>
        </div>
      </div>`;
    const retryBtn = el.querySelector("[data-retry]");
    const abandonBtn = el.querySelector("[data-abandon]");
    const buttons = [retryBtn, abandonBtn].filter(Boolean);
    let focusIndex = 0;
    const updateFocus = () => {
      buttons.forEach((btn, idx) => {
        btn.classList.toggle("active", idx === focusIndex);
      });
      buttons[focusIndex]?.focus();
    };
    const handleDeathKey = (event) => {
      if (!buttons.length) return;
      let changed = false;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        focusIndex = (focusIndex + 1) % buttons.length;
        changed = true;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        focusIndex = (focusIndex - 1 + buttons.length) % buttons.length;
        changed = true;
      } else if (event.key === "Enter" || event.key?.toLowerCase?.() === "e") {
        event.preventDefault();
        buttons[focusIndex]?.click();
        return;
      }
      if (changed) {
        updateFocus();
        event.preventDefault();
      }
    };
    const cleanupDeathNav = () => {
      window.removeEventListener("keydown", handleDeathKey);
    };
    if (buttons.length) {
      window.addEventListener("keydown", handleDeathKey);
      updateFocus();
    }
    const handleRetry = () => {
      cleanupDeathNav();
      retryOrbStorm({ showDialogue: true });
    };
    const handleAbandon = () => {
      cleanupDeathNav();
      goToTitle();
    };
    retryBtn?.addEventListener("click", handleRetry);
    abandonBtn?.addEventListener("click", handleAbandon);
  }
}

  function retryOrbStorm(opts = {}) {
    const orbId = orbRealmState.id ?? 1;
    if (typeof resetGameOverSound === "function") {
      resetGameOverSound();
    } else {
      if (State.gameOverSoundTimeout) {
        clearTimeout(State.gameOverSoundTimeout);
        State.gameOverSoundTimeout = null;
      }
      State.gameOverSoundScheduled = false;
      stopGameOverAudioPlayback();
    }
  const status = orbRealmState.orbRiddleStatus[orbId] ?? {};
    status.stormTriggered = false;
    orbRealmState.orbRiddleStatus[orbId] = status;
    orbRealmState.activeStorm = null;
    if (orbRealmState.orbGhost) {
      orbRealmState.orbGhost.hiddenForStorm = false;
    }
    if (orbRealmState.kaelReplica) {
      orbRealmState.kaelReplica.hiddenForStorm = false;
    }
    const endingEl = document.getElementById("ending");
    if (endingEl) {
      endingEl.classList.add("hidden");
      endingEl.innerHTML = "";
    }
    State.awaitingEndingButton = false;
    State.paused = false;
    if (State.player) {
      State.player.hp = State.player.maxHp ?? 100;
      State.player.resetCombatState?.();
    }
    if (opts.showDialogue && orbRealmState.goldBoss) {
      orbRealmState.goldBoss.stage = "storm";
      orbRealmState.goldBoss.returnUnlocked = false;
    }
    const startStorm = State.startOrbLightStorm;
    if (typeof startStorm === "function") {
      startStorm(orbId);
    }
  }

function drawPlayerWithinOrbRealm(ctx) {
  if (!ctx || !State.player) return;
  State.player.draw(ctx);
}

function updateOrbRealmCamera(player) {
  const camera = State.camera;
    if (!camera || !player) return;
    const mapW = State.map?.w ?? camera.w;
    const mapH = State.map?.h ?? camera.h;
    const targetX = player.x - camera.w / 2;
    const targetY = player.y - camera.h / 2;
    const minX = Math.min(0, mapW - camera.w);
    const maxX = Math.max(0, mapW - camera.w);
    const minY = Math.min(0, mapH - camera.h);
    const maxY = Math.max(0, mapH - camera.h);
    const clampedX = Math.min(maxX, Math.max(minX, targetX));
    const clampedY = Math.min(maxY, Math.max(minY, targetY));
    const smooth = 0.12;
    camera.x += (clampedX - camera.x) * smooth;
    camera.y += (clampedY - camera.y) * smooth;
}

function processOrbRealmInputs({ player, map, dashPressed, moveVector, pointerData }) {
  if (!player || !map || !dashPressed) return;
  const pointerVector = pointerData
    ? { x: pointerData.x - player.x, y: pointerData.y - player.y }
    : null;
  const pointerValid =
    pointerVector && (Math.abs(pointerVector.x) > 0.01 || Math.abs(pointerVector.y) > 0.01);
  const moveVectorValid =
    moveVector && (Math.abs(moveVector.x) > 0.01 || Math.abs(moveVector.y) > 0.01);
  const dashDir = pointerValid
    ? pointerVector
    : moveVectorValid
    ? { x: moveVector.x, y: moveVector.y }
    : undefined;
  player.tryDash(map, dashDir);
}

function drawPlayerDashTrail(ctx) {
  const trail = State.playerDashTrail;
  if (!Array.isArray(trail) || trail.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  trail.forEach((node) => {
    const ratio = Math.max(
      0,
      Math.min(1, (node.life ?? 0) / Math.max(0.0001, node.maxLife ?? 1))
    );
    const radius = 16 + (1 - ratio) * 26;
    const alpha = 0.2 + ratio * 0.4;
    const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius);
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(0.4, `rgba(255,200,140,${alpha * 0.7})`);
    grad.addColorStop(1, "rgba(255,120,80,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = "rgba(255,235,190,0.9)";
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function enforceOrbBarrier(player) {
  if (!orbRealmState.active || !player || !State.map) return;
  const mapH = State.map.h ?? 0;
  const baseY = mapH * (1 - ORB_BARRIER_RATIO);
  const barrierY = Math.min(mapH, baseY + ORB_BARRIER_OFFSET);
  if (player.y > barrierY) {
    player.y = barrierY;
  }
}

function drawOrbReturnZone(ctx) {
  if (!ctx || !orbRealmState.active || !ORB_RETURN_ZONE_VISIBLE) return;
  const storm = orbRealmState.activeStorm;
  const effect = (storm?.teleportEffect) ?? orbRealmState.teleportEffect;
  if (!effect) return;
  effect.phase = (effect.phase + 0.035) % (Math.PI * 2);
  const origin = (storm && storm.origin) ?? effect.origin ?? ORB_REALM_CENTER;
  const centerX = origin.x;
  const centerY = origin.y;
  const baseRadius = Math.max(1, ORB_REALM_RETURN_RADIUS + ORB_RETURN_ZONE_RADIUS_EXTRA);
  const pulse = 1 + Math.sin(effect.phase * 2.4) * 0.22;
  const radius = Math.max(1, baseRadius * pulse);
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.4);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.6, "rgba(255,214,148,0.45)");
  gradient.addColorStop(1, "rgba(97, 146, 255, 0.06)");

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.stroke();
  ctx.restore();

  ctx.save();
  const ringCount = 3;
  for (let i = 0; i < ringCount; i++) {
    const ringRadius = radius + 12 + i * 18;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.28 - i * 0.06})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 10]);
    ctx.lineDashOffset = -effect.phase * 12 * (i + 1);
    ctx.beginPath();
    const startAngle = effect.phase * (i + 1) * 0.45;
    ctx.arc(centerX, centerY, ringRadius, startAngle, startAngle + Math.PI * 1.4);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.font = "600 14px 'Inter', system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const descriptor = effect.descriptor ?? ORB_STORM_DESCRIPTORS[storm?.orbId ?? 1];
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillText(`${descriptor.colorLabel} : retour disponible`, centerX, centerY + radius + 20);
  ctx.restore();
}

function drawOrbBarrier(ctx, camX, camY, camera) {
  if (!ctx || !orbRealmState.active || !State.map || !ORB_BARRIER_VISIBLE) return;
  const mapH = State.map.h ?? 0;
  const baseY = mapH * (1 - ORB_BARRIER_RATIO);
  const barrierY = Math.min(mapH, baseY + ORB_BARRIER_OFFSET);
  const startY = barrierY - camY;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = ORB_BARRIER_COLOR;
  ctx.fillRect(0, startY, camera.w, State.map.h - barrierY);
  ctx.restore();
}

function drawGoldBossAura(ctx) {
  if (!ctx || orbRealmState.id !== 1) return;
  const goldState = orbRealmState.goldBoss;
  const boss = orbRealmState.kaelReplica;
  if (!goldState || !boss || goldState.stage === "resolved" || goldState.stage === "storm") return;
  const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
  const radius = GOLD_BOSS_AURA_RADIUS + Math.sin(now * 2.1) * 12;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.35;
  const gradient = ctx.createRadialGradient(boss.x, boss.y, 0, boss.x, boss.y, radius);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.55)");
  gradient.addColorStop(0.5, "rgba(200, 170, 255, 0.25)");
  gradient.addColorStop(1, "rgba(100, 80, 180, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(boss.x, boss.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(180, 200, 255, 0.45)";
  ctx.beginPath();
  ctx.arc(boss.x, boss.y, radius * 0.6, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const angle = now * 0.9 + (Math.PI * 2 * i) / 3;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, radius * (0.7 + i * 0.08), angle, angle + 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawOrbBossHealth(ctx) {
  const ghost = orbRealmState.id === 1 && orbRealmState.kaelReplica ? orbRealmState.kaelReplica : orbRealmState.orbGhost;
  if (orbRealmState.id === 1 && !(orbRealmState.goldBoss?.combatActive)) return;
  if (!ctx || !ghost || typeof ghost.hp !== "number" || typeof ghost.maxHp !== "number") return;
  const current = Math.max(0, ghost.hp);
  const maxHp = Math.max(1, ghost.maxHp);
  const ratio = Math.min(1, current / maxHp);
  const width = Math.min(Math.max(220, $canvas.width * 0.5), 360);
  const height = 26;
  const padding = 8;
  const x = ($canvas.width - width) / 2;
  const y = 24;
  const bgColor = "rgba(0,0,0,0.55)";
  const fillColor = ghost.realmColor ?? "rgba(255,255,255,0.85)";
  const drawRoundedRect = (xPos, yPos, w, h, r) => {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(xPos + radius, yPos);
    ctx.lineTo(xPos + w - radius, yPos);
    ctx.arcTo(xPos + w, yPos, xPos + w, yPos + radius, radius);
    ctx.lineTo(xPos + w, yPos + h - radius);
    ctx.arcTo(xPos + w, yPos + h, xPos + w - radius, yPos + h, radius);
    ctx.lineTo(xPos + radius, yPos + h);
    ctx.arcTo(xPos, yPos + h, xPos, yPos + h - radius, radius);
    ctx.lineTo(xPos, yPos + radius);
    ctx.arcTo(xPos, yPos, xPos + radius, yPos, radius);
    ctx.closePath();
    ctx.fill();
  };
  ctx.save();
  ctx.fillStyle = bgColor;
  drawRoundedRect(x, y, width, height, 10);
  ctx.fillStyle = fillColor;
  drawRoundedRect(x + padding / 2, y + padding / 2, Math.max(4, (width - padding) * ratio), height - padding, 6);
  ctx.font = "400 18px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${ghost.realmLabel ?? "Hantise"} — ${Math.round(current)} / ${Math.round(maxHp)}`,
    $canvas.width / 2,
    y + height / 2
  );
  ctx.restore();
}

function drawKaelDashTrail(ctx) {
  const trail = State.kaelDashTrail;
  if (!Array.isArray(trail) || trail.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  trail.forEach((node) => {
    const ratio = Math.max(
      0,
      Math.min(1, (node.life ?? 0) / Math.max(0.0001, node.maxLife ?? 1))
    );
    const radius = 16 + (1 - ratio) * 26;
    const alpha = 0.2 + ratio * 0.35;
    const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius);
    grad.addColorStop(0, `rgba(255,160,160,${alpha})`);
    grad.addColorStop(0.4, `rgba(255,80,80,${alpha * 0.8})`);
    grad.addColorStop(1, "rgba(255,40,40,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha * 0.65;
    ctx.fillStyle = "rgba(255,130,130,0.9)";
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}


function drawKaelMechanicIndicator(ctx, boss) {
  if (!ctx || !boss) return;
  const now = State.time ?? 0;
  const queue = (State.kaelMechanicAlerts ?? []).filter((alert) => alert.dueAt > now);
  State.kaelMechanicAlerts = queue;
  if (!queue.length) return;
  const alert =
    queue.find((entry) => now >= (entry.startAt ?? 0) && now <= entry.dueAt) ?? queue[0];
  if (!alert) return;
  const start = alert.startAt ?? (alert.dueAt - 2);
  const total = Math.max(0.01, alert.dueAt - start);
  const remaining = Math.max(0, alert.dueAt - now);
  const progress = Math.min(1, remaining / total);
  const accent = alert.accent ?? alert.color ?? "#ffffff";
  const label = alert.label ?? "Kael";
  const ringRadius = (boss.hitRadius ?? 30) + 28;
  const cx = boss.x;
  const cy = boss.y;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineWidth = 6;
  ctx.strokeStyle = hexToRgba(accent, 0.9);
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  const startAngle = -Math.PI / 2;
  const sweep = Math.PI * 2 * (1 - progress);
  ctx.arc(0, 0, ringRadius, startAngle, startAngle + sweep);
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.strokeStyle = hexToRgba(accent, 0.4);
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.font = "600 14px 'Inter', system-ui";
  ctx.fillStyle = hexToRgba(accent, 0.95);
  const labelY = cy - (boss.hitRadius ?? 30) - 12;
  ctx.fillText(label, cx, labelY);
  // no timer text, label only
  ctx.restore();
}

function drawPlayerAttackTrail(ctx) {
  const trail = State.playerAttackTrail;
  if (!Array.isArray(trail) || trail.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  trail.forEach((node) => {
    const ratio = Math.max(
      0,
      Math.min(1, (node.life ?? 0) / Math.max(0.0001, node.maxLife ?? 1))
    );
    const radius = (node.radius ?? 18) * (1 + (1 - ratio) * 0.4);
    const alpha = 0.25 + ratio * 0.45;
    const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius);
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(0.4, `rgba(255,170,140,${alpha * 0.8})`);
    grad.addColorStop(1, "rgba(255,100,60,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
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
    {
      id: 0,
      x: leftX,
      y: topY,
      radius,
      color: "#f94144",
      name: ORB_NAMES[0],
      activated: false,
      repeatUsed: false,
    },
    {
      id: 1,
      x: rightX,
      y: topY,
      radius,
      color: "#f9c74f",
      name: ORB_NAMES[1],
      activated: false,
      repeatUsed: false,
    },
    {
      id: 2,
      x: leftX,
      y: bottomY,
      radius,
      color: "#43aa8b",
      name: ORB_NAMES[2],
      activated: false,
      repeatUsed: false,
    },
    {
      id: 3,
      x: rightX,
      y: bottomY,
      radius,
      color: "#577590",
      name: ORB_NAMES[3],
      activated: false,
      repeatUsed: false,
    },
  ];
}

function drawPuzzleOrb(ctx, orb) {
  if (!ctx || !orb) return;
  const time = State.time ?? 0;
  ctx.save();
  const glowColor = orb.color ?? "#ffffff";
  const activated = Boolean(orb.activated);
  const radius = orb.radius ?? 9;
  const center = { x: orb.x, y: orb.y };
  const pulse = Math.sin(time * 3 + (orb.id ?? 0) * 1.3) * 0.25 + 0.75;
  if (!activated) {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.7;
    const subtle = hexToRgba(glowColor, 0.35);
    ctx.fillStyle = subtle;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = hexToRgba("#ffffff", 0.18);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const haloRadius = radius + 6 + pulse * 4;
  const accent = hexToRgba(glowColor, 1);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.85;
  const gradient = ctx.createRadialGradient(
    center.x,
    center.y,
    radius * 0.25,
    center.x,
    center.y,
    haloRadius
  );
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.3, hexToRgba(glowColor, 0.9));
  gradient.addColorStop(1, hexToRgba(glowColor, 0.25));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = hexToRgba(glowColor, 0.7);
  ctx.stroke();
  ctx.shadowColor = accent;
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.arc(center.x, center.y, haloRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  const shineCount = 5;
  for (let i = 0; i < shineCount; i++) {
    const angle = time * 1.1 + i * (Math.PI * 2) / shineCount;
    const lx = center.x + Math.cos(angle) * (radius + 3 + pulse * 3);
    const ly = center.y + Math.sin(angle) * (radius + 3 + pulse * 3);
    ctx.strokeStyle = hexToRgba(glowColor, 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(
      center.x + Math.cos(angle) * (radius - 2),
      center.y + Math.sin(angle) * (radius - 2)
    );
    ctx.lineTo(lx, ly);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = hexToRgba(glowColor, 0.95);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = hexToRgba("#ffffff", 0.65);
  ctx.moveTo(center.x, center.y - radius * 0.15);
  ctx.lineTo(center.x, center.y + radius * 0.15);
  ctx.moveTo(center.x - radius * 0.15, center.y);
  ctx.lineTo(center.x + radius * 0.15, center.y);
  ctx.stroke();
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

  function drawKaelAllyHpBar(ctx, kael) {
    if (!ctx || !kael) return;
    const maxHp = Math.max(1, kael.maxHp ?? kael.hp ?? 1);
    const current = Math.max(0, Math.min(maxHp, kael.hp ?? 0));
    if (maxHp <= 0) return;
    const ratio = current / maxHp;
    const width = 33;
    const height = 3;
    const offset = (kael.hitRadius ?? 30) + 16;
    const x = kael.x - width / 2;
    const y = kael.y - offset;
    const hue = Math.round(Math.max(0, Math.min(120, ratio * 120)));
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(x - 1, y - 1, width + 2, height + 2);
    ctx.fillStyle = `hsl(${hue}, 78%, 49%)`;
    ctx.fillRect(x, y, width * ratio, height);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, width, height);
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
