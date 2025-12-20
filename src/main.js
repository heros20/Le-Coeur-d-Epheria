// src/main.js
import { CONFIG } from "./config.js";
import { State } from "./state.js";
import { setupKeyboard, setupPointer, endFrame, consume, Keys, KeyCodes } from "./input.js";
import { loadWorldMap, WorldMap } from "./world/map.js";
import { applyLighting } from "./world/lighting.js";
import { FogOfWar } from "./world/fog.js";
import { Player } from "./actors/player.js";
import { NPC } from "./actors/npc.js";
import { BossKael } from "./actors/boss_kael.js";
import { Inventory } from "./systems/inventory.js";
import { createDialogueLayer } from "./systems/dialogue.js";
import { showEndings, renderEpilogue, launchCredits } from "./systems/endings-2.js";
import { vignette, strokeText } from "./utils/draw.js";
import { Animator } from "./utils/animator.js";
import { createHUD } from "./ui/hud.js";
console.log("### VERSION CURSOR OK ###");
const TRANSLATIONS = {
  fr: {
    bootTitle: "Le Cœur d’Éphéria",
    bootTag1:
      "Dans un monde oublié, où les ombres semblent respirer et où les couloirs murmurent d’anciens serments, s’élève un labyrinthe immense : Éphéria, une prison vivante qui dévore les faibles et éprouve les braves.",
    bootTag2:
      "Au centre de ce dédale bat un artefact mythique : le Cœur, une source de magie pure, capable d’effacer les ténèbres… ou de les déchaîner. Et c’est là que ton histoire commence.",
    heroLore1: "On raconte que Lioran connaît les murmures des pierres d’Éphéria.",
    heroLore2: "Il marche, lampe à la main, pour ceux qui n’ont plus la force d’avancer.",
    heroStatRoleLabel: "Rôle :",
    heroStatRoleValue: "Protecteur",
    heroStatForcesLabel: "Forces :",
    heroStatForcesValue: "Attaque Simple, Dash, Sprint",
    heroStatWeaknessLabel: "Failles :",
    heroStatWeaknessValue: "Trop confiant",
    menuModesTitle: "Modes de jeu",
    menuModesSub: "Choisis ton destin au cœur d’Éphéria.",
    newGameLabel: "Nouvelle partie",
    newGameHint: "Histoire principale",
    goldChallengeLabel: "Défi doré",
    goldChallengeHint: "Épreuve spéciale",
    goldScoreTitle: "Record défi",
    goldScoreSub: "Meilleur temps enregistré",
    goldBestScoreNone: "Aucun record",
    goldBestScoreOnlineNone: "Aucun record en ligne",
    goldBestScoreOnlineRecord: "Record en ligne : {time}",
    orbKeyRedLabel: "Clé rouge",
    orbKeyGoldLabel: "Clé dorée",
    orbKeyGreenLabel: "Clé verte",
    orbKeyBlueLabel: "Clé bleue",
    orbRealmRedLabel: "Orbe rouge",
    orbRealmRedStatus: "Exploration rouge",
    orbRealmGoldLabel: "Orbes d'Éphéria",
    orbRealmGoldStatus: "Exploration dorée",
    orbRealmGreenLabel: "Orbe verte",
    orbRealmGreenStatus: "Exploration verdoyante",
    orbRealmBlueLabel: "Orbe bleue",
    orbRealmBlueStatus: "Exploration bleue",
    "riddle.red.title": "Énigme rouge",
    "riddle.red.question":
      "Invisible et pourtant connue de tous. Plus légère que le vent, plus affûtée qu'une lame. Née de rien, mais capable de vaincre les plus grandes armées. Qui suis-je ?",
    "riddle.red.option.silence": "Le silence",
    "riddle.red.option.time": "Le temps",
    "riddle.red.option.sickness": "La maladie",
    "riddle.red.option.hunger": "La faim",
    "riddle.red.option.fatigue": "La fatigue",
    "riddle.red.success": "La flamme recule, un passage rouge s'illumine.",
    "riddle.red.failure": "Le feu gronde, une tempête rouge se lève.",
    "riddle.gold.title": "Énigme dorée",
    "riddle.gold.question":
      "Écho d'un royaume ténébreux, murmures d'un avenir encore flou. Étrange sœur de la pensée. Je séjourne dans la nuit et crains la lueur de l'aube. Qui suis-je ?",
    "riddle.gold.option.shadows": "Les ombres",
    "riddle.gold.option.memories": "Les souvenirs",
    "riddle.gold.option.dreams": "Les rêves",
    "riddle.gold.option.mirages": "Les mirages",
    "riddle.gold.option.illusions": "Les illusions",
    "riddle.gold.success": "La lumière dorée irradie, une porte lumineuse s'ouvre.",
    "riddle.gold.failure": "Les ombres brûlent, une tempête dorée se prépare.",
    "riddle.green.title": "Énigme verte",
    "riddle.green.question":
      "Ossature du monde, je cherche la caresse des cieux. Ma parure est blanche comme celle d'une vierge. Qui suis-je ?",
    "riddle.green.option.glacier": "Un glacier",
    "riddle.green.option.mountain": "Une montagne",
    "riddle.green.option.cloud": "Un nuage",
    "riddle.green.option.tree": "Un arbre",
    "riddle.green.option.cliff": "Une falaise",
    "riddle.green.success": "La montagne s'apaise, une porte verte s'ouvre.",
    "riddle.green.failure": "Les racines grondent, une tempête verte éclate.",
    "riddle.blue.title": "Énigme bleue",
    "riddle.blue.question":
      "Poison de l'âme, sombre masque de la passion. Fruit de l'amour, je cause inévitablement sa perte. Qui suis-je ?",
    "riddle.blue.option.betrayal": "La trahison",
    "riddle.blue.option.obsession": "L'obsession",
    "riddle.blue.option.desire": "Le désir",
    "riddle.blue.option.fear": "La peur",
    "riddle.blue.option.jalousie": "La jalousie",
    "riddle.blue.success": "L'onde s'apaise, une porte bleue se dévoile.",
    "riddle.blue.failure": "Les passions éclatent, une tempête bleue rugit.",
    goldRecordNew: "Nouveau record doré !",
    "orbStatus.presenceCrush": "Une présence écrase l'air...",
    "orbStatus.blueCalm": "Le calme bleu s'installe, la sortie se découvre.",
    "orbStatus.blueApproach": "Une présence aquatique glisse vers toi...",
    "orbStatus.greenCalm": "La verdure s'apaise, la sortie se découvre.",
    "orbStatus.greenApproach": "Une présence végétale glisse vers toi...",
    "orbStatus.redCalm": "Le rouge se retire, la sortie se dévoile.",
    "orbStatus.redApproach": "La flamme rouge s'approche de toi...",
    "orbStatus.arrowsStrike": "Les flèches de lumière s'abattent sur la carte !",
    "orbStatus.firstLightWall": "Des murs de lumière se forment autour de toi !",
    "orbStatus.secondLightWall": "Un second mur de lumière se manifeste !",
    "questAcceptedStatus": "Quête acceptée : aider Kael à retrouver la princesse.",
    "questAcceptedTitle": "Quête acceptée",
    "questAcceptedSubtitle": "Retrouver Aelya",
    "kaelQuestTitle": "Quête : Chercher le Cœur",
    "kaelQuestDescription":
      "Kael et toi cherchez Aelya et le Cœur d'Éphéria. Ensemble, vous pouvez percer le labyrinthe.",
    "kaelQuestAccept": "Accepter",
    "kaelQuestDecline": "Refuser",
    "kaelQuestDeclineSpeech": "Nous n'avons pas de temps à perdre, décide-toi vite.",
    "finalChoiceTitle": "Aelya te demande un choix",
    "finalChoiceMessage":
      "La princesse t'implore de lui remettre le Cœur d'Éphéria. Que lui réponds-tu ?",
    "finalChoiceAgree": "Oui",
    "finalChoiceDecline": "Non",
    "gameOverTitle": "Game Over",
    "gameOverKaelAllyText": "Kael n'a pas survécu. Le labyrinthe reprend sa colère.",
    "gameOverBossText": "Kael t'a vaincu. Relance le duel et reprends le dessus.",
    "gameOverAelyaText": "Aelya t'a repoussé. Relance le duel !",
    "gameOverRetryFight": "Retenter le combat",
    "gameOverRetryTrial": "Retenter l'épreuve",
    "gameOverRetryStart": "Recommencer",
    "gameOverAbandon": "Abandonner",
    "gameOverReturnTitle": "Les âmes défuntes t'emportent.",
    "gameOverReturnText": "Ton dernier souvenir disparaît dans la poussière d'Éphéria.",
    "gameOverReturnHome": "Retour à l'accueil",
    menuSettingsTitle: "Paramètres rapides",
    menuSoundLabel: "Musique menu : On",
    menuGameSoundLabel: "Son du jeu : On",
    menuCreditsTitle: "Crédits",
    menuCreditsBtn: "Lancer les crédits",
    langTitle: "Langue",
    langFr: "Français",
    langEn: "English",
    langButtonFr: "FR",
    langButtonEn: "EN",
    commandsTitle: "Commandes",
    commandsNote: "Sur mobile : utilise les boutons tactiles pour explorer Éphéria.",
    cmdMovementLabel: "Déplacement",
    cmdMovementDesc: "Se déplacer dans le labyrinthe",
    cmdPadLabel: "Pad numérique",
    cmdPadAttack: "Attaquer",
    cmdPadSprint: "Sprint",
    cmdPadRange: "Attaque distance",
    cmdPadItem: "Objet rapide",
    cmdKeyboardLabel: "Clavier",
    cmdKeyboardAttack: "Attaquer",
    cmdKeyboardSprint: "Sprint",
    cmdKeyboardRange: "Attaque distance",
    cmdKeyboardItem: "Objet rapide",
    cmdInteractionLabel: "Interaction",
    cmdInteractionPrimary: "Parler / Interagir",
    cmdInteractionDesc: "NPC,orbes, mystères…",
    cmdInteractionDash: "Dash",
    introParagraph1:
      "Dans les entrailles d'Éphéria, un labyrinthe ancien né d'une magie oubliée, le jeune héros Lioran s'avance, porté par l'espoir et l'inquiétude. À ses côtés, Kael, son compagnon d'armes, marche comme son ombre.",
    introParagraph2:
      "Ils sont venus pour retrouver Aelya, la princesse qui porte un Cœur mystérieux, une relique vivante capable de guérir un royaume ou de le réduire en poussière. Disparue dans les profondeurs du labyrinthe, elle semble appeler Lioran à travers des échos, des murmures et des traces dispersées comme des lucioles dans l'obscurité.",
    introParagraph3:
      "Mais Éphéria n'est pas qu'un dédale : c'est un esprit, un piège, un cimetière d'anciens voyageurs dont les voix hantent chaque orbe, chaque pierre, chaque recoin. Lioran et Kael avancent, percés par des énigmes sibyllines et des avertissements menaçants, tandis que quelque chose, dans les ténèbres, observe, grignote et s'insinue.",
    "speaker.princesse": "Princesse",
    "speaker.me": "Moi",
    "speaker.kael": "Kael",
    "dialogue.princessIntro.princessWarn": "Lioran… Kael… Vous n'auriez jamais dû venir ici.",
    "dialogue.princessIntro.meSurprise": "Princesse Aelya ! Que voulez-vous dire ?!",
    "dialogue.princessIntro.princessHeart": "Le Cœur d'Éphéria est en ma possession. Il permet de repousser, ou de contrôler, les ténèbres qui envahissent le royaume.",
    "dialogue.princessIntro.princessBurden": "Mais il corrompt également l'âme de ceux qui le portent. Je me suis exilée ici pour supporter ce fardeau seule… Vous n'auriez pas dû venir.",
    "dialogue.princessIntro.kaelVoices": "Lioran… les voix… Je…",
    "dialogue.princessIntro.meQuestion": "Les voix ? De quoi parles-tu ?",
    "dialogue.princessIntro.kaelWhispers": "Elles sont dans ma tête depuis notre arrivée ici. Elles me parlent… elles me murmurent.",
    "dialogue.princessIntro.kaelApology": "Je suis désolé, Aelya… Je dois prendre ce Cœur.",
    "dialogue.princessIntro.princessNo": "Quoi ? Non !",
    "dialogue.princessIntro.narrationKaelGrabs": "Kael s'empare de force du Cœur d'Éphéria.",
    "dialogue.princessIntro.princessCry": "Aaaah !",
    "dialogue.princessIntro.mePrincess": "Princesse !",
    "dialogue.princessIntro.meKael": "Kael ! Tu as perdu la raison ?!",
    introParagraph1:
      "Dans les entrailles d'Éphéria, un labyrinthe ancien né d'une magie oubliée, le jeune héros Lioran s'avance, porté par l'espoir et l'inquiétude. À ses côtés, Kael, son compagnon d'armes, marche comme son ombre.",
    introParagraph2:
      "Ils sont venus pour retrouver Aelya, la princesse qui porte un Cœur mystérieux, une relique vivante capable de guérir un royaume ou de le réduire en poussière. Disparue dans les profondeurs du labyrinthe, elle semble appeler Lioran à travers des échos, des murmures et des traces dispersées comme des lucioles dans l'obscurité.",
    introParagraph3:
      "Mais Éphéria n'est pas qu'un dédale : c'est un esprit, un piège, un cimetière d'anciens voyageurs dont les voix hantent chaque orbe, chaque pierre, chaque recoin. Lioran et Kael avancent, percés par des énigmes sibyllines et des avertissements menaçants, tandis que quelque chose, dans les ténèbres, observe, grignote et s'insinue.",
  },
  en: {
    bootTitle: "The Heart of Éphéria",
    bootTag1:
      "In a forgotten world where shadows breathe and corridors whisper forgotten vows, Éphéria rises as a living labyrinth that devours the weak and tests the brave.",
    bootTag2:
      "At the center of this maze beats a mythical artifact: the Heart, a source of pure magic that can banish darkness… or unleash it. This is where your story begins.",
    heroLore1: "Legends say Lioran hears the whispers of Éphéria’s stones.",
    heroLore2: "He walks, lantern in hand, for those who no longer find the strength to move.",
    heroStatRoleLabel: "Role :",
    heroStatRoleValue: "Protector",
    heroStatForcesLabel: "Strengths :",
    heroStatForcesValue: "Basic Attack, Dash, Sprint",
    heroStatWeaknessLabel: "Weaknesses :",
    heroStatWeaknessValue: "Overly confident",
    menuModesTitle: "Game Modes",
    menuModesSub: "Choose your destiny in the heart of Éphéria.",
    newGameLabel: "New Game",
    newGameHint: "Story Mode",
    goldChallengeLabel: "Golden Challenge",
    goldChallengeHint: "Special trial",
    goldScoreTitle: "Challenge Record",
    goldScoreSub: "Best recorded time",
    goldBestScoreNone: "No record yet",
    goldBestScoreOnlineNone: "No online record yet",
    goldBestScoreOnlineRecord: "Online record: {time}",
    orbKeyRedLabel: "Red key",
    orbKeyGoldLabel: "Golden key",
    orbKeyGreenLabel: "Green key",
    orbKeyBlueLabel: "Blue key",
    orbRealmRedLabel: "Red orb",
    orbRealmRedStatus: "Red exploration",
    orbRealmGoldLabel: "Orbs of Éphéria",
    orbRealmGoldStatus: "Golden exploration",
    orbRealmGreenLabel: "Green orb",
    orbRealmGreenStatus: "Green exploration",
    orbRealmBlueLabel: "Blue orb",
    orbRealmBlueStatus: "Blue exploration",
    "riddle.red.title": "Red riddle",
    "riddle.red.question":
      "Invisible yet known to all. Lighter than the wind, sharper than a blade. Born of nothing but capable of conquering the greatest armies. Who am I?",
    "riddle.red.option.silence": "Silence",
    "riddle.red.option.time": "Time",
    "riddle.red.option.sickness": "Illness",
    "riddle.red.option.hunger": "Hunger",
    "riddle.red.option.fatigue": "Fatigue",
    "riddle.red.success": "The flame retreats; a red passage lights up.",
    "riddle.red.failure": "The fire rages; a crimson storm rises.",
    "riddle.gold.title": "Golden riddle",
    "riddle.gold.question":
      "Echo of a shadowy realm, whispers of a still uncertain future. Strange sister of thought. I dwell in the night and dread the dawn's light. Who am I?",
    "riddle.gold.option.shadows": "Shadows",
    "riddle.gold.option.memories": "Memories",
    "riddle.gold.option.dreams": "Dreams",
    "riddle.gold.option.mirages": "Mirages",
    "riddle.gold.option.illusions": "Illusions",
    "riddle.gold.success": "Golden light radiates; a luminous gate opens.",
    "riddle.gold.failure": "Shadows flare; a golden storm brews.",
    "riddle.green.title": "Green riddle",
    "riddle.green.question":
      "Spine of the world, I seek the caress of the skies. My cloak is white like that of a maiden. Who am I?",
    "riddle.green.option.glacier": "A glacier",
    "riddle.green.option.mountain": "A mountain",
    "riddle.green.option.cloud": "A cloud",
    "riddle.green.option.tree": "A tree",
    "riddle.green.option.cliff": "A cliff",
    "riddle.green.success": "The mountain calms; a green gate opens.",
    "riddle.green.failure": "Roots rumble; a green storm erupts.",
    "riddle.blue.title": "Blue riddle",
    "riddle.blue.question":
      "Poison of the soul, dark mask of passion. Fruit of love, I inevitably bring about its fall. Who am I?",
    "riddle.blue.option.betrayal": "Betrayal",
    "riddle.blue.option.obsession": "Obsession",
    "riddle.blue.option.desire": "Desire",
    "riddle.blue.option.fear": "Fear",
    "riddle.blue.option.jalousie": "Jealousy",
    "riddle.blue.success": "The wave stills; a blue gate reveals itself.",
    "riddle.blue.failure": "Passions flare; a blue storm roars.",
    "orbStatus.presenceCrush": "A presence crushes the air...",
    "orbStatus.blueCalm": "Blue calm settles; the exit reveals itself.",
    "orbStatus.blueApproach": "A watery presence glides toward you...",
    "orbStatus.greenCalm": "The greenery calms, the exit unveils.",
    "orbStatus.greenApproach": "A vegetal presence drifts toward you...",
    "orbStatus.redCalm": "The red recedes, the exit unveils itself.",
    "orbStatus.redApproach": "The red flame draws near...",
    "orbStatus.arrowsStrike": "Light arrows rain down across the map!",
    "orbStatus.firstLightWall": "Walls of light form around you!",
    "orbStatus.secondLightWall": "A second wall of light appears!",
    questAcceptedStatus: "Quest accepted: help Kael find the princess.",
    questAcceptedTitle: "Quest accepted",
    questAcceptedSubtitle: "Find Aelya",
    kaelQuestTitle: "Quest: Seek the Heart",
    kaelQuestDescription:
      "Kael and you search for Aelya and the Heart of Epheria. Together, you can pierce the labyrinth.",
    kaelQuestAccept: "Accept",
    kaelQuestDecline: "Decline",
    kaelQuestDeclineSpeech: "We don't have time to waste, decide quickly.",
    finalChoiceTitle: "Aelya asks you for a choice",
    finalChoiceMessage:
      "The princess begs you to return the Heart of Epheria. How do you answer her?",
    finalChoiceAgree: "Yes",
    finalChoiceDecline: "No",
    gameOverTitle: "Game Over",
    gameOverKaelAllyText: "Kael did not survive. The labyrinth answers with wrath.",
    gameOverBossText: "Kael defeated you. Restart the duel and take the upper hand.",
    gameOverAelyaText: "Aelya drove you back. Restart the duel!",
    gameOverRetryFight: "Retry the fight",
    gameOverRetryTrial: "Retry the trial",
    gameOverRetryStart: "Restart",
    gameOverAbandon: "Abandon",
    gameOverReturnTitle: "The dead souls carry you away.",
    gameOverReturnText: "Your last memory fades into the dust of Epheria.",
    gameOverReturnHome: "Back to title",
    goldRecordNew: "New golden record!",
    menuSettingsTitle: "Quick Settings",
    menuSoundLabel: "Menu Music: On",
    menuGameSoundLabel: "Game Sound: On",
    menuCreditsTitle: "Credits",
    menuCreditsBtn: "Play Credits",
    langTitle: "Language",
    langFr: "Français",
    langEn: "English",
    langButtonFr: "FR",
    langButtonEn: "EN",
    commandsTitle: "Controls",
    commandsNote: "On mobile: use the touch buttons to roam Éphéria.",
    cmdMovementLabel: "Movement",
    cmdMovementDesc: "Move through the labyrinth",
    cmdPadLabel: "Numeric pad",
    cmdPadAttack: "Attack",
    cmdPadSprint: "Sprint",
    cmdPadRange: "Ranged attack",
    cmdPadItem: "Quick item",
    cmdKeyboardLabel: "Keyboard",
    cmdKeyboardAttack: "Attack",
    cmdKeyboardSprint: "Sprint",
    cmdKeyboardRange: "Ranged attack",
    cmdKeyboardItem: "Quick item",
    cmdInteractionLabel: "Interaction",
    cmdInteractionPrimary: "Talk / Interact",
    cmdInteractionDesc: "NPCs, orbs, mysteries…",
    cmdInteractionDash: "Dash",
    "speaker.princesse": "Princess",
    "speaker.me": "Lioran",
    "speaker.kael": "Kael",
    "dialogue.princessIntro.princessWarn": "Lioran… Kael… You should never have come here.",
    "dialogue.princessIntro.meSurprise": "Princess Aelya! What do you mean?!",
    "dialogue.princessIntro.princessHeart": "The Heart of Éphéria is in my keeping. It can push back or harness the shadows consuming the kingdom.",
    "dialogue.princessIntro.princessBurden": "But it also corrupts the soul of whoever bears it. I exiled myself here to shoulder this burden alone… You shouldn't have followed.",
    "dialogue.princessIntro.kaelVoices": "Lioran… the voices… I…",
    "dialogue.princessIntro.meQuestion": "The voices? What are you talking about?",
    "dialogue.princessIntro.kaelWhispers": "They've been in my head since we arrived. They speak to me… they whisper.",
    "dialogue.princessIntro.kaelApology": "I'm sorry, Aelya… I must take the Heart.",
    "dialogue.princessIntro.princessNo": "What? No!",
    "dialogue.princessIntro.narrationKaelGrabs": "Kael snatches the Heart of Éphéria by force.",
    "dialogue.princessIntro.princessCry": "Aaaah!",
    "dialogue.princessIntro.mePrincess": "Princess!",
    "dialogue.princessIntro.meKael": "Kael! Have you lost your mind?!",
    introParagraph1:
      "Deep within Éphéria, an ancient labyrinth born of forgotten magic, young hero Lioran moves forward, buoyed by hope and unease. Beside him walks Kael, his battle-brother, ever like a shadow.",
    introParagraph2:
      "They came seeking Aelya, the princess who carries a mysterious Heart, a living relic that can heal a kingdom or tear it apart. Lost in the maze's depths, she seems to call to Lioran through echoes, whispers, and traces scattered like fireflies in the dark.",
    introParagraph3:
      "But Éphéria is more than a maze; it is a spirit, a trap, a graveyard of travelers whose voices haunt every orb, every stone, every corner. Lioran and Kael press onward, pierced by riddles and ominous warnings, while something in the shadows watches, gnaws, and creeps closer.",
  },
};
const LANGUAGE_STORAGE_KEY = "gameLanguage";
const INTRO_CRAWL_KEYS = ["introParagraph1", "introParagraph2", "introParagraph3"];

function loadStoredLanguage() {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && TRANSLATIONS[stored]) {
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function saveLanguage(lang) {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // ignore storage errors
  }
}

State.language = State.language ?? loadStoredLanguage() ?? "fr";

function t(key) {
  const lang = State.language ?? "fr";
  return (
    TRANSLATIONS[lang]?.[key] ??
    TRANSLATIONS.fr?.[key] ??
    key
  );
}

function getIntroCrawlText() {
  return INTRO_CRAWL_KEYS.map((key) => t(key)).join("\n\n");
}

function tFmt(key, replacements = {}) {
  let text = t(key);
  for (const [name, value] of Object.entries(replacements)) {
    const placeholder = `{${name}}`;
    text = text.split(placeholder).join(value ?? "");
  }
  return text;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const label = el.getAttribute("data-i18n");
    if (!label) return;
    el.textContent = t(label);
  });
}

function updateLanguageButtons() {
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    const lang = btn.getAttribute("data-lang");
    if (!lang) return;
    btn.classList.toggle("menu-btn-active", lang === State.language);
    btn.setAttribute("aria-pressed", lang === State.language ? "true" : "false");
    const labelKey = lang === "fr" ? "langButtonFr" : "langButtonEn";
    btn.textContent = t(labelKey);
  });
}

function setLanguage(lang) {
  if (!TRANSLATIONS[lang]) {
    lang = "fr";
  }
  saveLanguage(lang);
  if (State.language === lang) {
    updateLanguageButtons();
    return;
  }
  State.language = lang;
  applyTranslations();
  updateLanguageButtons();
}

window.GameLanguage = {
  setLanguage,
  getLanguage: () => State.language,
};

function setupLanguageControls() {
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang");
      if (lang) {
        setLanguage(lang);
      }
    });
  });
  applyTranslations();
  updateLanguageButtons();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupLanguageControls);
} else {
  setupLanguageControls();
}

function getOrbRealmLabelText(config) {
  if (!config) return "";
  const key = config.labelKey;
  if (key) {
    return t(key);
  }
  return config.label ?? "";
}

function getOrbRealmStatusText(config) {
  if (!config) return "";
  const key = config.statusKey;
  if (key) {
    return t(key);
  }
  return config.statusMessage ?? "";
}
let heroAnimations = null;
let heroGoldAnimations = null;
let goldAnimActive = false;
let ghostAnimations = null;
let preQuestShrubTexture = null;
let preQuestShrubSprite = null;
let bagTexture = null;
let orbKeyTextures = {};
let bossMapActive = false;
let bossMapScaleBackup = null;
let bossMapSpeedBackup = null;
let skipNextOrbInteract = false;
let kaelEpicActive = false;
let heartTexture = null;
let supabase = null;

if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.supabase) {
  supabase = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );
} else {
  console.warn("[SUPABASE] Client non initialisé (URL/KEY manquants ?)");
}
const DRAGON_HEART_ASSET = "./assets/coeur/coeur.png";
const DRAGON_HEART_ITEM_ID = "coeur-epheria";
const DRAGON_HEART_SPRITE_SCALE = 0.675;
const DRAGON_HEART_RADIUS_MIN = 9;
const DRAGON_HEART_RADIUS_SCALE = 0.03;
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
    $introScrollContent.textContent = getIntroCrawlText();
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
  kaelEpic: "./assets/sounds/Kael_Spell/epic.mp3",
  gameOver: "./assets/sounds/game-over/Theme_game_over.mp3",
  gameOverPost: "./assets/sounds/game-over/game-over.mp3",
  ambient: "./assets/sounds/Ambiance/Ambiance.mp3",
  themeAmbient: "./assets/sounds/Ambiance/Theme_ambiance.mp3",
  orbActivate: "./assets/sounds/orbes/orbes.mp3",
  miniBoss: "./assets/sounds/mini-boss/mini-boss.mp3",
  miniBossExplosion: "./assets/sounds/mini-boss/explosion.mp3",
  miniBossAppear: "./assets/sounds/mini-boss/apparition.mp3",
  enigmeFailed: "./assets/sounds/enigmes/failed.mp3",
  success: "./assets/sounds/enigmes/success.mp3",
  failed: "./assets/sounds/enigmes/failed.mp3",
  princessCry: "./assets/sounds/princesse/crying_princesse.mp3",
  aelyaFight: "./assets/sounds/princesse/Aelya_fight.mp3",
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

const handleEpilogueShortcut = (event) => {
  if (event.repeat) return;
  if (event.key === "9" || event.key === "NumPad9") {
    event.preventDefault();
    void renderEpilogue("release", { choice: "agree" });
  } else if (event.key === "-" || event.key === "Subtract") {
    event.preventDefault();
    void renderEpilogue("release", { choice: "refuse" });
  }
};
window.addEventListener("keydown", handleEpilogueShortcut);

const ORB_NAMES = {
  0: "red",
  1: "gold",
  2: "green",
  3: "blue",
};
const ORB_KEY_ASSET_PATHS = {
  red: "./assets/key/red.png",
  gold: "./assets/key/gold.png",
  green: "./assets/key/green.png",
  blue: "./assets/key/blue.png",
};
const ORB_KEY_LABEL_KEYS = {
  red: "orbKeyRedLabel",
  gold: "orbKeyGoldLabel",
  green: "orbKeyGreenLabel",
  blue: "orbKeyBlueLabel",
};
function getOrbKeyLabel(color) {
  if (!color) return "Key";
  const key = ORB_KEY_LABEL_KEYS[color];
  const translated = key ? t(key) : null;
  if (translated && !translated.includes("orbKey")) {
    return translated;
  }
  return `${color[0].toUpperCase() + color.slice(1)} key`;
}
const ORB_KEY_COLORS = Object.keys(ORB_KEY_ASSET_PATHS);
const ORB_KEY_ITEM_PREFIX = "orb-key-";
function getOrbKeyItemId(color) {
  if (!color) return null;
  return `${ORB_KEY_ITEM_PREFIX}${color}`;
}
function getOrbKeyColorFromItemId(id) {
  if (!id || !id.startsWith(ORB_KEY_ITEM_PREFIX)) return null;
  return id.slice(ORB_KEY_ITEM_PREFIX.length);
}
const PRE_QUEST_SHRUB_WIDTH = 240;
const PRE_QUEST_SHRUB_SPREAD = { minRadius: 12, maxRadius: 18, yOffset: 6 };
const PRE_QUEST_SHRUB_SCALE = 0.45;
const PRE_QUEST_SHRUB_SCALE_FACTOR = 1.95;
const PRE_QUEST_SHRUB_LENGTH_FACTOR = 0.9;
const BOSS_MAP_PATH = "./assets/map/boss-map.png";
const BOSS_MAP_SPAWN_RATIO = 0.5;
const BOSS_MAP_DEZOOM = 0.5;
const BOSS_MAP_BOTTOM_WALL_HEIGHT = 330;
let bossMapResource = null;
const ORB_KEY_MISSING_TEXT = "Cette orbe semble attendre quelque chose...";
const ORB_REALM_CONFIG = {
  0: {
    labelKey: "orbRealmRedLabel",
    mapSrc: "./assets/map/Red_orb.png",
    statusKey: "orbRealmRedStatus",
  },
  1: {
    labelKey: "orbRealmGoldLabel",
    mapSrc: "./assets/map/Gold_orb.png",
    statusKey: "orbRealmGoldStatus",
  },
  2: {
    labelKey: "orbRealmGreenLabel",
    mapSrc: "./assets/map/Green-orb.png",
    statusKey: "orbRealmGreenStatus",
  },
  3: {
    labelKey: "orbRealmBlueLabel",
    mapSrc: "./assets/map/Blue_orb.png",
    statusKey: "orbRealmBlueStatus",
  },
};
const DESKTOP_ATTACK_KEYS = ["1", "&", "k"];
const ORB_MESSAGES = [
  "A toi qui n'a pas su écouter les voix, paye ton crime de ton âme.",
  "Vous n'êtes pas les bienvenus en ces lieux.",
  "Continuez et payer le prix.. Ou sortez et sacrifiez votre coeur.",
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
const GREEN_WALL_THICKNESS = 20;
const GREEN_WALL_LENGTH_RATIO = 0.39;
const GREEN_WALL_SPEED_RATIO = 0.5;
const GREEN_WALL_COOLDOWN = 4;
const RED_WALL_COOLDOWN = GREEN_WALL_COOLDOWN;
const GREEN_WALL_DAMAGE = 100;
const SPECIAL_ORB_RIDDLE_IDS = new Set([0, 1, 2, 3]);

function isSpecialBossReturnAllowed() {
  if (orbRealmState.id === 1) {
    return Boolean(orbRealmState.goldBoss?.returnUnlocked);
  }
  if (orbRealmState.id === 0) {
    return Boolean(orbRealmState.redBoss?.returnUnlocked);
  }
  if (orbRealmState.id === 2) {
    return Boolean(orbRealmState.greenBoss?.returnUnlocked);
  }
  if (orbRealmState.id === 3) {
    return Boolean(orbRealmState.blueBoss?.returnUnlocked);
  }
  return true;
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
  0: { hp: 320, attackDamage: 18, chaseSpeed: 120, scale: 0.34, color: "#ff6a4d", scaleMultiplier: 2 },
  1: { hp: 300, attackDamage: 16, chaseSpeed: 110, scale: 0.32, color: "#ffd98b", scaleMultiplier: 2.5, orbCount: 8 },
  2: { hp: 280, attackDamage: 14, chaseSpeed: 108, scale: 0.32, color: "#7bd68f", scaleMultiplier: 2 },
  3: { hp: 260, attackDamage: 15, chaseSpeed: 106, scale: 0.32, color: "#7fc0ff", scaleMultiplier: 2 },
};

const ORB_RIDDLE_METADATA = {
  0: {
    titleKey: "riddle.red.title",
    questionKey: "riddle.red.question",
    optionsKeys: [
      "riddle.red.option.silence",
      "riddle.red.option.time",
      "riddle.red.option.sickness",
      "riddle.red.option.hunger",
      "riddle.red.option.fatigue",
    ],
    successKey: "riddle.red.success",
    failureKey: "riddle.red.failure",
    answerIndex: 3,
  },
  1: {
    titleKey: "riddle.gold.title",
    questionKey: "riddle.gold.question",
    optionsKeys: [
      "riddle.gold.option.shadows",
      "riddle.gold.option.memories",
      "riddle.gold.option.dreams",
      "riddle.gold.option.mirages",
      "riddle.gold.option.illusions",
    ],
    successKey: "riddle.gold.success",
    failureKey: "riddle.gold.failure",
    answerIndex: 2,
  },
  2: {
    titleKey: "riddle.green.title",
    questionKey: "riddle.green.question",
    optionsKeys: [
      "riddle.green.option.glacier",
      "riddle.green.option.mountain",
      "riddle.green.option.cloud",
      "riddle.green.option.tree",
      "riddle.green.option.cliff",
    ],
    successKey: "riddle.green.success",
    failureKey: "riddle.green.failure",
    answerIndex: 1,
  },
  3: {
    titleKey: "riddle.blue.title",
    questionKey: "riddle.blue.question",
    optionsKeys: [
      "riddle.blue.option.betrayal",
      "riddle.blue.option.obsession",
      "riddle.blue.option.desire",
      "riddle.blue.option.fear",
      "riddle.blue.option.jalousie",
    ],
    successKey: "riddle.blue.success",
    failureKey: "riddle.blue.failure",
    answerIndex: 4,
  },
};

function buildRiddleFromMeta(meta) {
  return {
    title: t(meta.titleKey),
    question: t(meta.questionKey),
    options: meta.optionsKeys.map((key) => t(key)),
    answerIndex: meta.answerIndex,
    success: t(meta.successKey),
    failure: t(meta.failureKey),
  };
}

function getOrbRiddleConfig(orbId) {
  const meta = ORB_RIDDLE_METADATA[orbId];
  if (!meta) return null;
  return buildRiddleFromMeta(meta);
}

const ORB_BOSS_RIDDLE_IDS = {
  red: 0,
  gold: 1,
  green: 2,
  blue: 3,
};

const GOLD_BOSS_ENTRY_DURATION = 2.6;
const GOLD_BOSS_ENTRY_HEIGHT = 180;
const GOLD_BOSS_TRIGGER_DISTANCE = 20;
const GOLD_BOSS_APPROACH_SPEED = 110;
const GOLD_BOSS_AURA_RADIUS = 150;
const GOLD_BOSS_RIDDLE_ID = ORB_BOSS_RIDDLE_IDS.gold;
const BLUE_BOSS_ENTRY_DURATION = 2.6;
const BLUE_BOSS_ENTRY_HEIGHT = 180;
const BLUE_BOSS_TRIGGER_DISTANCE = 20;
const BLUE_BOSS_APPROACH_SPEED = 110;
const BLUE_BOSS_AURA_RADIUS = 150;
const BLUE_BOSS_RIDDLE_ID = ORB_BOSS_RIDDLE_IDS.blue;
const RED_BOSS_ENTRY_DURATION = 2.6;
const RED_BOSS_ENTRY_HEIGHT = 180;
const RED_BOSS_TRIGGER_DISTANCE = 20;
const RED_BOSS_APPROACH_SPEED = 110;
const RED_BOSS_RIDDLE_ID = ORB_BOSS_RIDDLE_IDS.red;
const GREEN_BOSS_ENTRY_DURATION = 2.6;
const GREEN_BOSS_ENTRY_HEIGHT = 180;
const GREEN_BOSS_TRIGGER_DISTANCE = 20;
const GREEN_BOSS_APPROACH_SPEED = 110;
const GREEN_BOSS_RIDDLE_ID = ORB_BOSS_RIDDLE_IDS.green;

const ORB_STORM_DESCRIPTORS = {
  0: { colorLabel: "rouge", spirit: "braise" },
  1: { colorLabel: "dorée", spirit: "lumière" },
  2: { colorLabel: "verte", spirit: "sève" },
  3: { colorLabel: "bleue", spirit: "onde" },
};

const ORB_LIGHT_STORM_DURATION = 25;
const ORB_LIGHT_STORM_BASE_SPEED = 240;
const ORB_LIGHT_STORM_MAX_SPEED = 560;
const ORB_LIGHT_STORM_START_INTERVAL = 0.7;
const ORB_LIGHT_STORM_END_INTERVAL = 0.18;
const ORB_PROJECTILE_DENSITY = 0.8; // 80% = -20%
const ORB_LIGHT_STORM_ARROW_RADIUS = 24;
const ORB_LIGHT_STORM_BURST_COUNT = 12;
const ORB_LIGHT_STORM_VERTICAL_OFFSET = 100;
const ORB_LIGHT_STORM_ZONE_SHIFT_X = 0;
const ORB_LIGHT_STORM_TARGET_SHIFT_X = 0;
const ORB_LIGHT_STORM_GHOST_APPROACH_SPEED = 360;
const GOLD_CHALLENGE_STORAGE_KEY = "goldChallengeBestTime";
const GOLD_CHALLENGE_RAMP_DURATION = 140;
const GOLD_CHALLENGE_GREEN_WALL_DELAY = 90;
const GOLD_CHALLENGE_EXPLOSION_DELAY = 45;
const GOLD_CHALLENGE_EXPLOSION_INTERVAL = 5;
const GOLD_CHALLENGE_RED_WALL_DELAY = 120;

function formatChallengeTime(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0.0s";
  }
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds.toFixed(1)}s`;
  }
  return `${seconds.toFixed(1)}s`;
}

function readGoldChallengeBestTime() {
  try {
    const raw = localStorage.getItem(GOLD_CHALLENGE_STORAGE_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function writeGoldChallengeBestTime(value) {
  if (!Number.isFinite(value) || value <= 0) return;
  try {
    localStorage.setItem(GOLD_CHALLENGE_STORAGE_KEY, value.toFixed(1));
  } catch {
    // ignore storage errors
  }
}

function updateGoldChallengeBestDisplay() {
  const el = document.getElementById("goldChallengeBestScore");
  if (!el) return;
  const best = readGoldChallengeBestTime();
  el.textContent = best ? formatChallengeTime(best) : t("goldBestScoreNone");
}
async function syncGoldChallengeBestFromSupabase() {
  const el = document.getElementById("goldChallengeBestScore");
  if (!el) return;

  // Fallback : record local si pas de Supabase
  if (!supabase) {
    updateGoldChallengeBestDisplay();
    return;
  }

  try {
    const { data, error } = await supabase
      .from("gold_challenge_scores")
      .select("score_seconds")
      .order("score_seconds", { ascending: false }) // plus haut = meilleure survie
      .limit(1);

    if (error) {
      console.error("[SUPABASE] Erreur fetch best score:", error);
      updateGoldChallengeBestDisplay();
      return;
    }

    if (!data || data.length === 0) {
      el.textContent = t("goldBestScoreOnlineNone");
      return;
    }

    const best = Number(data[0].score_seconds);
    if (!Number.isFinite(best) || best <= 0) {
      el.textContent = t("goldBestScoreOnlineNone");
      return;
    }

    el.textContent = tFmt("goldBestScoreOnlineRecord", {
      time: formatChallengeTime(best),
    });
  } catch (err) {
    console.error("[SUPABASE] Exception fetch best score:", err);
    updateGoldChallengeBestDisplay();
  }
}


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
  choice: null,
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
  goldBoss: null,
  blueBoss: null,
  greenBoss: null,
  greenWall: null,
  redWall: null,
  redBoss: null,
  animationPauseTimer: 0,
  animationPausePrevPaused: false,
  animationPauseActive: false,
};
let shakeTimeout = null;
let flashTimeout = null;
let flashHideTimeout = null;
let orbDisturbanceTimeout = null;
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
    // Sécurité: ne jamais laisser un SFX hériter d'un loop=true (ex: musiques).
    node.loop = false;
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
      themeTrack.volume = 0.1;
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

function fadeActiveBossMusic(targetVolume, duration = 1200) {
  const track = State.activeBossTrack;
  if (!track) return;
  if (track.paused) {
    track.play().catch(() => {});
  }
  fadeAudio(track, targetVolume, duration);
}

function restoreBossMusicVolume() {
  if (!State.activeBossTrack) {
    startBossMusic();
  } else {
    fadeActiveBossMusic(0.75, 1200);
  }
}

let orbChallengeAudioNode = null;
function startOrbChallengeSound(volume = 0.3, fadeDuration = 600) {
  const clip = State.sounds?.miniBoss;
  if (!clip) return;
  stopOrbChallengeSound(false);
  try {
    const node = clip.cloneNode();
    node.loop = true;
    node.volume = 0;
    node.play().catch(() => {});
    orbChallengeAudioNode = node;
    fadeAudio(node, volume, fadeDuration);
  } catch {
    orbChallengeAudioNode = null;
  }
}

function stopOrbChallengeSound(withFade = true, duration = 600) {
  const node = orbChallengeAudioNode;
  if (!node) return;
  orbChallengeAudioNode = null;
  const finalize = () => {
    try {
      node.pause();
      node.currentTime = 0;
    } catch {}
  };
  if (withFade) {
    fadeAudio(node, 0, duration, finalize);
  } else {
    finalize();
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

let aelyaFightAudioNode = null;
function startAelyaFightMusic(volume = 0.55, fadeDuration = 1500) {
  const clip = State.sounds?.aelyaFight;
  if (!clip) return;
  if (aelyaFightAudioNode) {
    try {
      if (!aelyaFightAudioNode.paused && !aelyaFightAudioNode.ended) {
        return;
      }
    } catch {
      // ignore
    }
    stopAelyaFightMusic(false);
  }
  try {
    const node = clip.cloneNode();
    node.loop = true;
    node.volume = 0;
    node.play().catch(() => {});
    aelyaFightAudioNode = node;
    fadeAudio(node, volume, fadeDuration);
  } catch {
    aelyaFightAudioNode = null;
  }
}

function stopAelyaFightMusic(withFade = true, duration = 1500) {
  const node = aelyaFightAudioNode;
  if (!node) return;
  aelyaFightAudioNode = null;
  const finalize = () => {
    try {
      node.pause();
      node.currentTime = 0;
    } catch {}
  };
  if (withFade) {
    fadeAudio(node, 0, duration, finalize);
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

let queuedOrbId = null;
let queuedOrbStorm = false;
let goldChallengeModeActive = false;

function setupBoot() {
  const cards = [...document.querySelectorAll(".hero-card")];
  const startBtn = document.getElementById("startBtn");
  const menuToggle = document.getElementById("toggleMenuSound");
  const gameToggle = document.getElementById("toggleGameSound");
  const goldChallengeBtn = document.getElementById("goldChallengeBtn");
  if (cards.length === 0) return;
  heroSelection = cards[0].getAttribute("data-src");
  cards.forEach((card) => {
    if (card !== cards[0]) card.classList.add("hidden");
    card.classList.add("selected");
  });
  startBtn.disabled = false;
  let startSequenceTriggered = false;
  const cleanupStartAnimation = (btn) => {
    if (!btn) return;
    btn.classList.remove("menu-btn-launching");
    btn.style.removeProperty("--launch-duration");
  };

  const animateMenuButtonLaunch = (button, clip) => {
    if (!button) return () => {};
    const applyDuration = () => {
      const duration = clip?.duration;
      if (Number.isFinite(duration) && duration > 0) {
        button.style.setProperty("--launch-duration", `${duration}s`);
      }
    };
    button.classList.add("menu-btn-launching");
    applyDuration();
    clip?.addEventListener("loadedmetadata", applyDuration, { once: true });
    clip?.addEventListener("error", applyDuration, { once: true });
    return () => {
      button.classList.remove("menu-btn-launching");
      button.style.removeProperty("--launch-duration");
    };
  };
  const runStartSequence = (options = {}, triggerButton = startBtn) => {
    if (startSequenceTriggered) return;
    startSequenceTriggered = true;
    const targetBtn = triggerButton ?? startBtn;
    if (targetBtn) targetBtn.disabled = true;
    menuThemeAudio.pause();
    menuThemeAudio.currentTime = 0;
    const clip = createMenuClip("start", 0.95);
    const finalize = (() => {
      let done = false;
      return () => {
        if (done) return;
        done = true;
        cleanupStartAnimation(targetBtn);
        if (targetBtn) targetBtn.disabled = false;
        startGame(options);
      };
    })();
    if (!clip) {
      finalize();
      return;
    }
    if (targetBtn) targetBtn.classList.add("menu-btn-launching");
    const applyDuration = () => {
      const duration = clip.duration;
      if (Number.isFinite(duration) && duration > 0 && targetBtn) {
        targetBtn.style.setProperty("--launch-duration", `${duration}s`);
      }
    };
    applyDuration();
    clip.addEventListener("loadedmetadata", applyDuration, { once: true });
    clip.addEventListener("ended", finalize, { once: true });
    clip.addEventListener("error", finalize, { once: true });
    clip.play().catch(() => finalize());
  };
  const handleStartClick = () => {
    goldChallengeModeActive = false;
    State.flags = State.flags ?? {};
    State.flags.goldChallengeActive = false;
    queuedOrbId = null;
    runStartSequence({}, startBtn);
  };
  const handleGoldChallengeClick = () => {
    playMenuClickSound();
    queuedOrbId = 1;
    queuedOrbStorm = true;
    State.flags = State.flags ?? {};
    State.flags.goldChallengeActive = true;
    goldChallengeModeActive = true;
    runStartSequence({ skipIntro: true }, goldChallengeBtn);
  };
  startBtn.addEventListener("click", handleStartClick);
  if (goldChallengeBtn) {
    goldChallengeBtn.addEventListener("click", handleGoldChallengeClick);
  }
  const creditsBtn = document.getElementById("creditsBtn");
  let creditsFlowActive = false;
  const handleCreditsClick = () => {
    if (!creditsBtn || creditsFlowActive) return;
    creditsFlowActive = true;
    playMenuClickSound();
    menuThemeAudio.pause();
    menuThemeAudio.currentTime = 0;
    const cleanupLaunchEffect = animateMenuButtonLaunch(
      creditsBtn,
      createMenuClip("start", 0.95)
    );
    creditsBtn.disabled = true;
    const restoreCreditsButton = () => {
      cleanupLaunchEffect();
      creditsBtn.disabled = false;
      creditsFlowActive = false;
    };
    const goHome = () => {
      if (typeof window !== "undefined" && typeof window.goToTitle === "function") {
        window.goToTitle();
      } else {
        location.reload();
      }
    };
    const runCreditsFlow = async () => {
      let completed = false;
      try {
        await startGame({ skipIntro: true });
        await launchCredits();
        completed = true;
      } finally {
        restoreCreditsButton();
        if (completed) {
          goHome();
        }
      }
    };
    void runCreditsFlow();
  };
  creditsBtn?.addEventListener("click", handleCreditsClick);
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
  syncGoldChallengeBestFromSupabase();
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

function startKaelEpicTheme() {
  if (State.flags?.kaelPhaseThreeDefeated) return;
  const audio = State.sounds?.kaelEpic;
  if (!audio) return;
  if (!audio.paused) {
    kaelEpicActive = true;
    return;
  }
  audio.loop = true;
  audio.volume = 0.65;
  audio.play().catch(() => {});
  kaelEpicActive = true;
}

function stopKaelEpicTheme() {
  const audio = State.sounds?.kaelEpic;
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  kaelEpicActive = false;
}

function fadeKaelEpicVolume(targetVolume, duration = 1200) {
  const audio = State.sounds?.kaelEpic;
  if (!audio) return;
  if (audio.paused) {
    audio.play().catch(() => {});
  }
  fadeAudio(audio, targetVolume, duration);
}

function restoreKaelEpicVolume() {
  fadeKaelEpicVolume(0.65, 1200);
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

async function startGame(options = {}) {
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
    ghostPortrait,
    heroAnimationsLoaded,
    heroGoldAnimationsLoaded,
    kaelAnimations,
    dragonKaelAnimations,
    princessAnimations,
    ghostAnimationsLoaded,
    potionImage,
    redKeyImage,
    goldKeyImage,
    greenKeyImage,
    blueKeyImage,
    bagImage,
    shrubImage,
    heartImage,
    soundBank,
  ] = await Promise.all([
    loadImage("./assets/hero1.png"),
    loadImage("./assets/hero2.png"),
    loadImage("./assets/hero3.png"),
    loadImage("./assets/ghost.png"),
    loadAnimations(HERO_ANIMATION_SOURCES),
    loadAnimations(HERO_GOLD_ANIMATION_SOURCES),
    loadAnimations(KAEL_ANIMATION_SOURCES),
    loadAnimations(KAEL_DRAGON_ANIMATION_SOURCES),
    loadAnimations(PRINCESS_ANIMATION_SOURCES),
    loadAnimations(GHOST_ANIMATION_SOURCES),
    loadImage(POTION_SPRITE),
    loadImage(ORB_KEY_ASSET_PATHS.red),
    loadImage(ORB_KEY_ASSET_PATHS.gold),
    loadImage(ORB_KEY_ASSET_PATHS.green),
    loadImage(ORB_KEY_ASSET_PATHS.blue),
    loadImage("./assets/key/bag.png"),
    loadImage("./assets/map/arbuste.png"),
    loadImage("./assets/coeur/coeur.png"),
    loadAudios(SOUND_SOURCES),
  ]);
  const byPath = {
    "./assets/hero1.png": h1,
    "./assets/hero2.png": h2,
    "./assets/hero3.png": h3,
    "./assets/ghost.png": ghostPortrait,
  };
  heroImg = byPath[heroSelection];
  potionTexture = potionImage;
  orbKeyTextures = {
    red: redKeyImage,
    gold: goldKeyImage,
    green: greenKeyImage,
    blue: blueKeyImage,
  };
    bagTexture = bagImage;
  preQuestShrubTexture = shrubImage;
  preQuestShrubSprite = createShrubSprite(shrubImage);
  heartTexture = heartImage;
  State.sounds = soundBank ?? {};
  const kaelDeadClip = kaelAnimations?.dead;
  if (kaelDeadClip?.frames?.length) {
    const lastFrame = kaelDeadClip.frames[kaelDeadClip.frames.length - 1];
    kaelAnimations.dead = {
      frames: [lastFrame],
      fps: kaelDeadClip.fps ?? 8,
      loop: false,
      sticky: true,
    };
  }
  const keepDeadLastFrame = (animations) => {
    const deadClip = animations?.dead;
    if (!deadClip?.frames?.length) return;
    const lastFrame = deadClip.frames[deadClip.frames.length - 1];
    animations.dead = {
      frames: [lastFrame],
      fps: deadClip.fps ?? 8,
      loop: false,
      sticky: true,
    };
  };
  keepDeadLastFrame(kaelAnimations);
  keepDeadLastFrame(dragonKaelAnimations);
  heroAnimations = heroAnimationsLoaded;
  heroGoldAnimations = heroGoldAnimationsLoaded;
  State.dialoguePortraits = {
    hero1: byPath["./assets/hero1.png"],
    hero2: byPath["./assets/hero2.png"],
    hero3: byPath["./assets/hero3.png"],
    ghost: byPath["./assets/ghost.png"],
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
    const flags = State.flags || {};
    if (
      State.flags.kaelDefeated &&
      State.princess.follow &&
      !State.flags.endingPending &&
      flags.dragonHeartCollected &&
      !State.flags.princessBossActive
    ) {
      if (Math.hypot(player.x - entrance.x, player.y - entrance.y) < entrance.r) {
        State.flags.endingPending = true;
        showOnlyEscapeEnding();
      }
    }
    if (player.hp <= 0) {
      State.flags = State.flags || {};
      if (State.flags.princessBossActive && !State.flags.princessBossDefeated) {
        if (!State.flags.princessBossDeathPending) {
          State.flags.princessBossDeathPending = true;
          State.flags.princessBossActive = false;
          State.princessMechanics = null;
          renderAelyaBossGameOver();
        }
        return true;
      }
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
      const waitingForDialogue =
        (State.flags?.goldChallengeActive || goldChallengeModeActive) &&
        State.dialogue?.isOpen?.();
      if (waitingForDialogue) {
        queueGoldChallengeGameOver();
        return true;
      }
      if (State.flags.betrayalHappened && !State.flags.kaelDefeated) {
        renderBossGameOver();
      } else {
        renderDeath();
      }
      finalizeDeathPendingState();
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
  State.inventory = new Inventory({ capacity: 6 });
  State.orbInventory = new Inventory({ capacity: ORB_KEY_COLORS.length });

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
  State.flags.kaelCorpseVisible = false;
  State.flags.dragonHeartDropped = false;
  State.flags.dragonHeartCollected = false;
  State.flags.finalEscapeChoice = null;

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
  assignGhostBagDrop();
  initPreQuestShrubs(heroStart.x, spawn.y + 200);
  State.ghostAnimations = ghostAnimationsLoaded;
  ghostAnimations = ghostAnimationsLoaded;

  State.fog = new FogOfWar(world.w, world.h);
  State.fog.reveal(State.player.x, State.player.y, 180);

  State.puzzleOrbs = createPuzzleOrbs(world);

  setupKeyboard();
  setupPointer($canvas);
  setupPointer($canvas);

  if (!options.skipIntro) {
    await showIntroCrawl();
  }
  if (typeof options.onReady === "function") {
    await Promise.resolve(options.onReady());
  }
  if (queuedOrbId != null) {
    const targetOrb = queuedOrbId;
    const shouldStorm = queuedOrbStorm && targetOrb === 1;
    queuedOrbId = null;
    queuedOrbStorm = false;
    enterOrbRealm(targetOrb, { skipEntryDialogue: true, forceGoldStorm: shouldStorm }).catch((error) => {
      console.error("Failed to enter queued orb realm", error);
    });
  }

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
  const orbKeyEntries = ORB_KEY_COLORS.map((color) => {
    const itemId = getOrbKeyItemId(color);
    return [
      itemId,
      () => ({
        id: itemId,
          name: getOrbKeyLabel(color),
        iconSrc: ORB_KEY_ASSET_PATHS[color],
        orbOnly: true,
        inventory: "orb",
      }),
    ];
  });
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
    [DRAGON_HEART_ITEM_ID]: () => ({
      id: DRAGON_HEART_ITEM_ID,
      name: "Coeur d'Éphéria",
      iconSrc: DRAGON_HEART_ASSET,
      keep: true,
      inventory: "main",
    }),
    ...Object.fromEntries(orbKeyEntries),
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

  function getPickupRadiusForTexture(texture, min = 2, scale = 0.02) {
    const size = Math.max(texture?.width ?? 0, texture?.height ?? 0);
    const scaled = size * scale;
    return Math.max(min, scaled || min);
  }

  function initPreQuestShrubs(centerX, boundaryY) {
    if (!Number.isFinite(centerX) || !Number.isFinite(boundaryY)) return;
    State.preQuestShrubs = [
      {
        x: centerX,
      y: boundaryY - PRE_QUEST_SHRUB_SPREAD.yOffset - 35,
        radius: Math.max((PRE_QUEST_SHRUB_WIDTH ?? 0) / 2, PRE_QUEST_SHRUB_SPREAD.minRadius),
        spriteScale: PRE_QUEST_SHRUB_SCALE,
      },
    ];
  }

function buildShrubCollider(shrub) {
  if (bossMapActive) return null;
  const sprite = preQuestShrubSprite ?? preQuestShrubTexture;
  if (!sprite) return null;
  const scale = shrub?.spriteScale ?? PRE_QUEST_SHRUB_SCALE;
  const w = (sprite.width * scale * PRE_QUEST_SHRUB_LENGTH_FACTOR) || 0;
  const h = (sprite.height * scale) || 0;
  const rad = Math.max(w, h) * 0.5;
  if (rad <= 0) return null;
  return { x: shrub.x, y: shrub.y, radius: rad };
}

function drawPreQuestShrubSprites(ctx) {
  if (bossMapActive) return;
  const shrubs = State.preQuestShrubs;
  if (!Array.isArray(shrubs) || shrubs.length === 0) return;
  const sprite = preQuestShrubSprite ?? preQuestShrubTexture;
  if (!sprite) return;
  ctx.save();
  shrubs.forEach((shrub) => {
    if (!shrub) return;
    const scale = shrub.spriteScale ?? PRE_QUEST_SHRUB_SCALE;
    const w = sprite.width * scale * PRE_QUEST_SHRUB_LENGTH_FACTOR;
    const h = sprite.height * scale;
    ctx.drawImage(sprite, shrub.x - w / 2, shrub.y - h / 2, w, h);
  });
  ctx.restore();
}

  function addBossMapBottomWall(world) {
    if (!world) return;
    const height = Math.max(1, Math.min(world.h, BOSS_MAP_BOTTOM_WALL_HEIGHT));
    world._rasterizeRectToCollision(0, Math.max(0, world.h - height), world.w, height);
  }

  async function ensureBossMapResource() {
    if (bossMapResource) return bossMapResource;
    try {
      const image = await loadImage(BOSS_MAP_PATH);
      const world = new WorldMap(image);
      world.collision.fill(0);
      world._forceBorders();
      addBossMapBottomWall(world);
      const spawn = {
        x: Math.max(60, world.w * 0.5),
        y: Math.max(60, world.h * BOSS_MAP_SPAWN_RATIO),
      };
      bossMapResource = { image, world, spawn };
    } catch (err) {
      console.error("Failed to load boss map:", err);
      bossMapResource = null;
    }
    return bossMapResource;
  }

  function applyBossMapScaling() {
    if (!bossMapScaleBackup) return;
    const heroScale = (bossMapScaleBackup.hero ?? 1) * 2;
    State.player.scale = heroScale;
    if (State.kael) State.kael.scale = heroScale;
    if (State.princess) State.princess.scale = (bossMapScaleBackup.princess ?? 1) * 2;
    if (State.boss) {
      State.boss.scale = heroScale;
      State.boss.hitRadius = (bossMapScaleBackup.bossHitRadius ?? State.boss.hitRadius ?? 0) * 2;
    }
  }

  function applyBossMapSpeedBoost() {
    if (!bossMapSpeedBackup) return;
    const boost = 1.5;
    State.player.speed = (bossMapSpeedBackup.hero ?? 0) * boost || (State.player?.speed ?? 0);
    if (State.kael) {
      State.kael.speed = (bossMapSpeedBackup.kael ?? 0) * boost || (State.kael?.speed ?? 0);
    }
  }

  async function transitionToBossMap() {
    const resource = await ensureBossMapResource();
    if (!resource) return;
    State.map = resource.world;
    mapImg = resource.image;
    State.puzzleOrbs = [];
    State.spawnPoint = { x: resource.spawn.x, y: resource.spawn.y };
    const heroX = resource.spawn.x;
    const heroY = resource.spawn.y;
    bossMapScaleBackup = bossMapScaleBackup ?? {
      hero: State.player?.scale ?? 1,
      kael: State.kael?.scale ?? 1,
      princess: State.princess?.scale ?? 1,
      boss: State.boss?.scale ?? 1,
      bossHitRadius: State.boss?.hitRadius ?? 0,
    };
    bossMapSpeedBackup = bossMapSpeedBackup ?? {
      hero: State.player?.speed ?? 0,
      kael: State.kael?.speed ?? 0,
    };
    applyBossMapScaling();
    applyBossMapSpeedBoost();
    State.player.x = heroX;
    State.player.y = heroY;
    State.kael.x = heroX + 60;
    State.kael.y = heroY;
    camera = makeCameraFor(resource.world);
    camera.w = Math.min(resource.world.w, camera.w / BOSS_MAP_DEZOOM);
    camera.h = Math.min(resource.world.h, camera.h / BOSS_MAP_DEZOOM);
    State.camera = camera;
    clampCameraToPlayer(heroX, heroY);
    State.princess.x = heroX - 50;
    State.princess.y = heroY + 30;
    State.pickups = [];
    State.ghosts = [];
    State.fog = new FogOfWar(resource.world.w, resource.world.h);
    State.fog.reveal(heroX, heroY, 180);
    if (State.princess) {
      const centerX = resource.world.w * 0.5;
      const centerY = resource.world.h * 0.5;
      State.princess.x = centerX + 30;
      State.princess.y = centerY - 140;
      State.princess.follow = false;
      State.princess.freed = true;
      State.flags.princessUnlocked = true;
      State.flags.princessQuestAccepted = true;
      State.flags.princessEscapeOffered = false;
    }
    bossMapActive = true;
    flashScreen(700);
    startScreenShake(1200);
    startKaelEpicTheme();
    triggerBetrayal();
  }

  function createShrubSprite(src) {
    if (!src) return null;
    const scaleFactor = PRE_QUEST_SHRUB_SCALE_FACTOR;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(src.width * scaleFactor));
    canvas.height = Math.max(1, Math.round(src.height * scaleFactor));
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    }
    return canvas;
  }

  function spawnPotion(x, y) {
    const radius = getPickupRadiusForTexture(potionTexture, 2, 0.008);
    State.pickups.push({
      type: "potion",
      x,
      y: y + 2,
      radius,
      blocking: true,
      collisionShape: "potion",
      texture: potionTexture,
      iconSrc: POTION_SPRITE,
    });
  }

  function spawnOrbKeyAt(color, x, y) {
    const texture = orbKeyTextures[color];
    if (!texture) return;
    const radius = getPickupRadiusForTexture(texture, 2);
    State.pickups.push({
      type: "orb-key",
      itemId: getOrbKeyItemId(color),
      color,
      name: getOrbKeyLabel(color),
      x,
      y,
      radius,
      blocking: true,
      collisionShape: "orb-key",
      texture,
      iconSrc: ORB_KEY_ASSET_PATHS[color],
    });
  }

  function spawnOrbBag(color, x, y, opts = {}) {
    if (!bagTexture) return;
    const radius = getPickupRadiusForTexture(
      bagTexture,
      typeof opts.minRadius === "number" ? opts.minRadius : 10,
      typeof opts.scale === "number" ? opts.scale : 0.012
    );
    const spriteScale = typeof opts.spriteScale === "number" ? opts.spriteScale : 0.45;
    State.pickups.push({
      type: "orb-bag",
      color,
      x,
      y,
      radius,
      spriteScale,
      blocking: true,
      collisionShape: "orb-bag",
      texture: bagTexture,
      iconSrc: ORB_KEY_ASSET_PATHS[color],
      source: opts.source ?? null,
    });
  }

  function spawnDragonHeartLoot(x, y) {
    if (!heartTexture || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const flags = State.flags || (State.flags = {});
    if (flags.dragonHeartDropped) return;
    const radius = Math.max(
      DRAGON_HEART_RADIUS_MIN,
      getPickupRadiusForTexture(heartTexture, DRAGON_HEART_RADIUS_MIN, DRAGON_HEART_RADIUS_SCALE)
    );
    State.pickups.push({
      type: "dragon-heart",
      itemId: DRAGON_HEART_ITEM_ID,
      name: "Coeur d'Éphéria",
      x,
      y,
      radius,
      spriteScale: DRAGON_HEART_SPRITE_SCALE,
      blocking: true,
      collisionShape: "dragon-heart",
      texture: heartTexture,
      iconSrc: DRAGON_HEART_ASSET,
    });
    flags.dragonHeartDropped = true;
    stopKaelEpicTheme();
  }

  function getRedBagPosition() {
    const orbs = State.puzzleOrbs;
    if (!Array.isArray(orbs)) return null;
    const goldOrb = orbs.find((orb) => orb?.id === 1);
    if (!goldOrb) return null;
    return {
      x: goldOrb.x - 100,
      y: goldOrb.y + 80,
    };
  }

  function spawnOrbBags(baseX, baseY) {
    const spacing = 64;
    const redPosition = getRedBagPosition();
    ORB_KEY_COLORS.forEach((color, index) => {
      let targetX = baseX + index * spacing;
      let targetY = baseY;
      if (color === "red" && redPosition) {
        targetX = redPosition.x;
        targetY = redPosition.y;
      }
      spawnOrbBag(color, targetX, targetY);
    });
  }

  function assignGhostBagDrop(color = "gold") {
    const ghosts = State.ghosts;
    if (!Array.isArray(ghosts) || ghosts.length === 0) return;
    const candidates = ghosts.filter((g) => g && !g.lootBagColor);
    if (!candidates.length) return;
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    selected.lootBagColor = color;
  }

  function maybeDropGhostBag(ghost) {
    if (!ghost || ghost.lootBagDropped) return;
    const color = ghost.lootBagColor;
    if (!color) return;
    spawnOrbBag(color, ghost.x, ghost.y, {
      spriteScale: 0.95,
      scale: 0.02,
      minRadius: 8,
      source: "ghost",
    });
    ghost.lootBagDropped = true;
  }

  function maybeDropGhostPotion(ghost) {
    if (!ghost || ghost.potionDropped) return;
    if (ghost.lootBagColor) return;
    if (Math.random() >= 0.05) return;
    spawnPotion(ghost.x, ghost.y);
    ghost.potionDropped = true;
  }

  function resetGhostsForOrbDrop(bagColor, count = 5) {
    const map = State.map;
    const spawnPoint = State.spawnPoint;
    if (!map || !spawnPoint || !ghostAnimations) return;
    State.ghosts = spawnGhosts(map, spawnPoint, ghostAnimations, count);
    clearKaelAggroTargets();
    assignGhostBagDrop(bagColor);
  }

  function handlePickups() {
    if (!State.pickups.length) return;
    State.pickups = State.pickups.filter((pickup) => !pickup.collected);
  }

  function getOrbInventorySnapshot() {
    return {
      orbInventory: State.orbInventory?.list?.() ?? [],
      orbCapacity: State.orbInventory?.capacity ?? ORB_KEY_COLORS.length,
    };
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
        const spriteScale = pickup.spriteScale ?? 1;
        const target = pickup.radius * 2.4 * spriteScale;
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
    updateAnimationPause(dt);
    if (processPendingGoldChallengeGameOver()) {
      return;
    }
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
    const specialMeleePressed = consume("+");
    const bossShortcutPressed = consume("9");
    const goldTeleportPressed = consume("8");
    const greenTeleportPressed = consume("4");
    const blueTeleportPressed = consume("7");
    const redTeleportPressed = consume("6");
    const jumpPressed = consume("j");
    const interactPressed = consume("e");
    const rangedPressed = consume("3") || consume("m");
    const bossMapShortcutPressed = consume("*");

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
      const orbSnapshot = getOrbInventorySnapshot();
      activeHud.update({
        ...orbSnapshot,
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
    if (specialMeleePressed && player) {
      player.queueAttack("special");
    }
    if (rangedPressed && player.rangedCooldown <= 0) {
      fireRangedAttack(player, currentAim);
    }
    if (bossShortcutPressed) {
      triggerBossFightShortcut();
    }
    if (bossMapShortcutPressed) {
      if (orbRealmState.active) {
        pushStatus("Impassable depuis une map d'orbe.");
      } else if (bossMapActive) {
        pushStatus("Kael est déjà affronté ici.");
      } else {
        void transitionToBossMap();
      }
    }

    const dashHold = Keys.has(" ") || (touchControlState.dashHeld ?? false);

    if (interactPressed && !State.dialogue.isOpen()) tryInteract();

    const shrubColliders = orbRealmState.active
      ? []
      : (State.preQuestShrubs?.map((shrub) => buildShrubCollider(shrub)).filter(Boolean) ?? []);

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
      colliders: [
        ...(State.puzzleOrbs ?? []),
        ...(State.pickups?.filter((p) => p.blocking) ?? []),
        ...shrubColliders,
      ],
      staminaDrainMult: bossMapActive ? 0.5 : 1,
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
    handlePickups();
    if (goldTeleportPressed && !orbRealmState.active) {
      enterOrbRealm(1);
    }
    if (greenTeleportPressed && !orbRealmState.active) {
      enterOrbRealm(2);
    }
    if (blueTeleportPressed && !orbRealmState.active) {
      enterOrbRealm(3);
    }
    if (redTeleportPressed && !orbRealmState.active) {
      enterOrbRealm(0);
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
        const orbSnapshot = getOrbInventorySnapshot();
        activeHud.update?.({
          ...orbSnapshot,
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
          if (orbRealmState.activeStorm?.challengeWallsActive) {
            updateGreenWall(dt, player);
          }
          if (orbRealmState.redWall?.enabled) {
            updateRedWall(dt, player);
          }
        } else if (orbRealmState.id === 0) {
          updateRedBossLifecycle(dt, player);
          updateGreenWall(dt, player);
          updateRedWall(dt, player);
        } else if (orbRealmState.id === 2) {
          updateGreenBossLifecycle(dt, player);
        } else if (orbRealmState.id === 3) {
          updateBlueBossLifecycle(dt, player);
          updateGreenWall(dt, player);
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
      if (dashed && isKaelAllyAlive() && State.flags.princessQuestAccepted && !bossMapActive) {
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
    if (!bossMapActive && isKaelAllyAlive()) {
      const kael = State.kael;
      if (kael) {
        let kaelTarget = player;
        const savedKeep = kael.keepDistance;
        if (State.flags.kaelAggro) {
          const nearbyGhost = findNearestAliveGhost(170);
          if (nearbyGhost) {
            kaelTarget = nearbyGhost;
            kael.keepDistance = 30;
          }
        }
        kael.update(dt, kaelTarget, map);
        const kaelDashTrailLife = 0.36;
        const kaelDashTrail = State.kaelDashTrail ?? [];
        if (kael.isPartnerDashing?.()) {
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
        kael.keepDistance = savedKeep;
      }
    }
    if (State.flags.princessUnlocked) {
      if (State.flags.princessBossActive && !State.flags.princessBossDefeated) {
        updateAelyaBossFight(dt, player, map);
      } else {
        State.princess.update(dt, player, map);
      }
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
        fadeActiveBossMusic(0.1, 1200);
        if (State.flags.kaelPhaseThreeStarted && !State.flags.kaelPhaseThreeDefeated) {
          State.flags.kaelPhaseThreeDefeated = true;
          // Coupe immédiatement la musique de phase 3 (epic.mp3)
          stopKaelEpicTheme();
          State.flags.princessEscapeOffered = false;
          State.flags.kaelCorpseVisible = true;
          State.flags.betrayalHappened = false;
          State.flags.kaelDown = true;
          // On laisse tomber directement le coeur d'Éphéria sans lancer de dialogue.
          spawnDragonHeartLoot(
            (State.boss?.x ?? State.player?.x ?? 0) + 30,
            State.boss?.y ?? State.player?.y ?? 0
          );
        } else if (State.flags.kaelPhaseTwoStarted && !State.flags.kaelPhaseTwoDefeated) {
          State.flags.kaelPhaseTwoDefeated = true;
          State.flags.kaelCorpseVisible = true;
          preparePrincessForPhaseTwo();
          fadeKaelEpicVolume(0.1, 1200);
        } else {
          fadeKaelEpicVolume(0.1, 1200);
        }
        if (!State.flags.kaelPhaseTwoStarted) {
          State.flags.phaseTwoDialoguePending = true;
          State.flags.kaelCorpseVisible = true;
          pauseForDialogue(
            [{ speaker: "Kael", text: "Ah ! je..." }],
            () => {}
          );
          pushStatus("Parle à Aelya pour poursuivre vers la phase deux.");
        } else {
          State.dialogue.show([{ speaker: "Moi", text: "C'est fini Kael.. Je suis désolé." }]);
        }
      }
    }
    damageGhostsFromPlayer();

    if (finalizeWorldLoop(dt)) return;

    // HUD
    const orbSnapshot = getOrbInventorySnapshot();
    activeHud.update({
      ...orbSnapshot,
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
    const item = items.find((entry) => !entry?.orbOnly);
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

  function findNearbyPickup({ type, threshold = 14 } = {}) {
    const player = State.player;
    const pickups = State.pickups;
    if (!player || !Array.isArray(pickups) || pickups.length === 0) return null;
    const baseReach = (player.r ?? 10) + (threshold ?? 0);
    let closest = null;
    let closestDist = Infinity;
    pickups.forEach((pickup) => {
      if (pickup.collected) return;
      if (type && pickup.type !== type) return;
      const reach = (pickup.radius ?? 10) + baseReach;
      const dist = Math.hypot(player.x - pickup.x, player.y - pickup.y);
      if (dist <= reach && dist < closestDist) {
        closestDist = dist;
        closest = pickup;
      }
    });
    return closest;
  }

  function tryInteractPickup() {
    const pickup = findNearbyPickup({ threshold: 16 });
    if (!pickup) return false;
    if (pickup.type === "orb-bag") {
      const color = pickup.color;
      if (!color) return false;
      spawnOrbKeyAt(color, pickup.x, pickup.y);
      pickup.collected = true;
      const label = getOrbKeyLabel(color);
      pushStatus(`${label} révélée`);
      handlePickups();
      return true;
    }
    const factoryKey = pickup.itemId ?? pickup.type;
    const itemFactory =
      typeof pickup.itemFactory === "function"
        ? pickup.itemFactory
        : factoryKey && typeof pickupFactory[factoryKey] === "function"
        ? pickupFactory[factoryKey]
        : null;
    if (!itemFactory) return false;
    const item = itemFactory(pickup);
    if (!item) return false;
    const destination = item.inventory ?? (item.orbOnly ? "orb" : "main");
    const targetInventory =
      destination === "orb" ? State.orbInventory : State.inventory;
    if (!targetInventory?.add?.(item)) {
      pushStatus(destination === "orb" ? "Inventaire d'orbes plein" : "Inventaire plein");
      return true;
    }
    pickup.collected = true;
    if (item.id === DRAGON_HEART_ITEM_ID) {
      const flags = State.flags || (State.flags = {});
      flags.dragonHeartCollected = true;
      flags.kaelCorpseVisible = false;
    }
    const name = item.name ?? pickup.name ?? item.id ?? "Objet";
    pushStatus(`${name} récupéré`);
    handlePickups();
    return true;
  }

  // ===== Interactions =====
function tryInteract() {
    if (State.animationPauseActive) return true;
    if (State.dialogue.isOpen()) return;
    if (State.orbPromptOpen || State.bossRiddleOpen) return;
    if (tryInteractOrb()) return;
    if (tryInteractPickup()) return;
    // Simple example: speak to Kael when close
    if (!bossMapActive) {
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
      if (State.flags.phaseTwoDialoguePending) {
        startPrincessEncounter();
        return;
      }
      if (!State.flags.princessUnlocked) {
        State.dialogue.show([
   {
  speaker: "Princesse",
  text: "Lioran… Kael… Vous n’auriez jamais dû venir ici.",
},
{
  speaker: "Moi",
  text: "Princesse Aelya ! Que voulez-vous dire ?!",
},
{
  speaker: "Princesse",
  text: "Le Cœur d’Éphéria est en ma possession. Il permet de repousser, ou de contrôler, les ténèbres qui envahissent le royaume.",
},
{
  speaker: "Princesse",
  text: "Mais il corrompt également l’âme de ceux qui le portent. Je me suis exilée ici pour supporter ce fardeau seule… Vous n’auriez pas dû venir.",
},
{
  speaker: "Kael",
  text: "Lioran… les voix… Je…",
},
{
  speaker: "Moi",
  text: "Les voix ? De quoi parles-tu ?",
},
{
  speaker: "Kael",
  text: "Elles sont dans ma tête depuis notre arrivée ici. Elles me parlent… elles m’ordonnent.",
},
{
  speaker: "Kael",
  text: "Je suis désolé, Aelya… Je dois prendre ce Cœur.",
},
{
  speaker: "Princesse",
  text: "Quoi ? Non !",
},
{
  speaker: "",
  text: "Kael s’empare de force du Cœur d’Éphéria.",
},
{
  speaker: "Princesse",
  text: "Aaaah !",
},
{
  speaker: "Moi",
  text: "Princesse !",
},
{
  speaker: "Moi",
  text: "Kael ! Tu as perdu la raison ?!",
},

        ]);
        return;
      }
      startPrincessEncounter();
      return;
    }
  }

  function startPrincessEncounter() {
    if (
      State.flags.kaelPhaseThreeDefeated &&
      !(State.inventory?.has?.(DRAGON_HEART_ITEM_ID) ?? false)
    ) {
      State.pushStatus?.("Retourne chercher le Coeur avant de parler à Aelya.");
      return;
    }
    if (State.flags.phaseTwoDialoguePending) {
      pauseForDialogue(
        [
          { speaker: "Moi", text: "J'ai tué mon ami..." },
          { speaker: "Aelya", text: "C'est terminé Lioran." },
        ],
        () => {
          State.flags.phaseTwoDialoguePending = false;
          startKaelPhaseTwoRequiem();
        }
      );
      return;
    }
    if (State.flags.betrayalHappened) return;
    pauseForDialogue(
      [
        
              {
  speaker: "Princesse",
  text: "Lioran… Kael… Vous n’auriez jamais dû venir ici.",
},
{
  speaker: "Moi",
  text: "Princesse Aelya ! Que voulez-vous dire ?!",
},
{
  speaker: "Princesse",
  text: "Le Cœur d’Éphéria est en ma possession. Il permet de repousser, ou de contrôler, les ténèbres qui envahissent le royaume.",
},
{
  speaker: "Princesse",
  text: "Mais il corrompt également l’âme de ceux qui le portent. Je me suis exilée ici pour supporter ce fardeau seule… Vous n’auriez pas dû venir.",
},
{
  speaker: "Kael",
  text: "Lioran… les voix… Je…",
},
{
  speaker: "Moi",
  text: "Les voix ? De quoi parles-tu ?",
},
{
  speaker: "Kael",
  text: "Elles sont dans ma tête depuis notre arrivée ici. Elles me parlent… elles m’ordonnent.",
},
{
  speaker: "Kael",
  text: "Je suis désolé, Aelya… Je dois prendre ce Cœur.",
},
{
  speaker: "Princesse",
  text: "Quoi ? Non !",
},
{
  speaker: "",
  text: "Kael s’empare de force du Cœur d’Éphéria.",
},
{
  speaker: "Princesse",
  text: "Aaaah !",
},
{
  speaker: "Moi",
  text: "Princesse !",
},
{
  speaker: "Moi",
  text: "Kael ! Tu as perdu la raison ?!",
},
        ],
      () => {
        State.princess.follow = true;
        State.princess.freed = true;
        transitionToBossMap();
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

  function hasRequiredOrbKey(orb) {
    if (!orb) return true;
    const color = ORB_NAMES[orb.id];
    if (!color) return true;
    const keyId = getOrbKeyItemId(color);
    if (!keyId || !State.orbInventory) return true;
    if (typeof State.orbInventory.has !== "function") return true;
    return State.orbInventory.has(keyId);
  }

function tryInteractOrb() {
  if (skipNextOrbInteract) {
    skipNextOrbInteract = false;
    return false;
  }
  if (State.animationPauseActive) {
    return true;
  }
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
  $orbPrompt.classList.remove("hero-targeted");
  hideOrbPrompt();
    State.orbPromptOpen = true;
    orbPromptState.orb = orb;
    orbPromptState.previousPaused = State.paused;
    orbPromptState.choice = null;
    State.paused = true;
    skipNextOrbInteract = true;
    const text = "Cette etrange orbe reagit a ma presence...";
    $orbPrompt.innerHTML = `
      <div class="prompt-card">
        <h4>Activer l'orbe ?</h4>
        <p>${text}</p>
        <div class="prompt-actions">
          <button type="button" data-orb-no>Non</button>
          <button type="button" data-orb-yes>Oui</button>
        </div>
      </div>`;
    $orbPrompt.style.display = "flex";
    $orbPrompt.style.display = "flex";
    $orbPrompt.classList.remove("hidden");
    requestAnimationFrame(() => $orbPrompt.classList.add("visible"));

    const yesBtn = $orbPrompt.querySelector("[data-orb-yes]");
    const noBtn = $orbPrompt.querySelector("[data-orb-no]");

    const handleYes = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (State.animationPauseActive) return;
      if (!hasRequiredOrbKey(orb)) {
        hideOrbPrompt();
        State.dialogue?.show?.([{ speaker: "Moi", text: ORB_KEY_MISSING_TEXT }]);
        pushStatus("L'orbe reste muette.");
        return;
      }
      const color = ORB_NAMES[orb?.id];
      const keyId = getOrbKeyItemId(color);
      const consumed =
        keyId &&
        State.orbInventory?.use?.(keyId, {
          player: State.player,
          notify: pushStatus,
          allowOrbUse: true,
        });
      if (!consumed) {
        pushStatus("La clé manque à l'appel.");
        return;
      }
      orbPromptState.choice = "yes";
      hideOrbPrompt();
      const runActivation = () => {
        if (ORB_REALM_CONFIG[orb?.id]) {
          requestAnimationFrame(() => handleOrbRealmActivation(orb));
          return;
        }
        const flashDuration = activateOrb(orb) || 0;
        triggerAnimationPause(flashDuration / 1000);
        startOrbDialogueSequence(orb, flashDuration);
      };
      pauseForDialogue(
        [
          {
            speaker: "Moi",
            text: "La pierre s'est parfaitement inserer dans l'orbe.",
          },
        ],
        runActivation
      );
    };

    const handleNo = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      orbPromptState.choice = "no";
      hideOrbPrompt();
    };
    const buttons = [yesBtn, noBtn].filter(Boolean);
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
        const btn = orbPromptState.buttons[orbPromptState.focusIndex];
        btn?.click();
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
  if (orbPromptState.choice !== "yes") return;
  orbPromptState.choice = null;
    hideOrbPrompt();
    const delay = Math.max(400, triggerOrbDisturbance() || 600);
    setTimeout(() => {
      hideOrbPrompt();
      enterOrbRealm(orb.id).then(() => {
        const flashDuration = activateOrb(orb) || 0;
        triggerAnimationPause(flashDuration / 1000);
        startOrbDialogueSequence(orb, flashDuration);
      });
    }, delay);
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

async function enterOrbRealm(orbId, options = {}) {
  const skipEntryDialogue = Boolean(options?.skipEntryDialogue);
  const entry = orbRealmEntries[orbId];
  if (!entry) return Promise.resolve();
  hideOrbPrompt();
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
  orbRealmState.blueBoss = null;
  orbRealmState.greenBoss = null;
  orbRealmState.redBoss = null;
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
  if (orbId === 3 && orbRealmState.orbGhost) {
    orbRealmState.blueBoss = {
      stage: "waiting",
      entranceTimer: 0,
      riddleShown: false,
      answered: false,
      combatActive: false,
      returnUnlocked: false,
    };
    const boss = orbRealmState.orbGhost;
    const baseScale = boss.baseScale ?? boss.scale ?? 1;
    boss.baseScale = baseScale;
    boss.x = ORB_REALM_CENTER.x;
    boss.y = ORB_REALM_CENTER.y - BLUE_BOSS_ENTRY_HEIGHT;
    boss.scale = baseScale * 0.6;
    boss.alive = true;
  }
  if (orbId === 2 && orbRealmState.orbGhost) {
    orbRealmState.greenBoss = {
      stage: "waiting",
      entranceTimer: 0,
      riddleShown: false,
      answered: false,
      combatActive: false,
      returnUnlocked: false,
    };
    const boss = orbRealmState.orbGhost;
    const baseScale = boss.baseScale ?? boss.scale ?? 1;
    boss.baseScale = baseScale;
    boss.x = ORB_REALM_CENTER.x;
    boss.y = ORB_REALM_CENTER.y - GREEN_BOSS_ENTRY_HEIGHT;
    boss.scale = baseScale * 0.6;
    boss.alive = true;
    boss.invulnerable = true;
  }
  if (orbId === 0 && orbRealmState.orbGhost) {
    orbRealmState.redBoss = {
      stage: "waiting",
      entranceTimer: 0,
      riddleShown: false,
      answered: false,
      combatActive: false,
      returnUnlocked: false,
    };
    const boss = orbRealmState.orbGhost;
    const baseScale = boss.baseScale ?? boss.scale ?? 1;
    boss.baseScale = baseScale;
    boss.scale = baseScale * 0.4;
    boss.x = ORB_REALM_CENTER.x;
    boss.y = ORB_REALM_CENTER.y - RED_BOSS_ENTRY_HEIGHT;
    boss.alive = true;
    boss.invulnerable = true;
  }
  if (!SPECIAL_ORB_RIDDLE_IDS.has(orbId)) {
    presentOrbRiddle(orbId);
  }
  const realmMap = createOrbRealmWorld(entry.image);
  State.map = realmMap;
  mapImg = entry.image;
  State.fog = new FogOfWar(State.map.w, State.map.h);
  State.fog.reveal(State.map.w / 2, State.map.h / 2, Math.max(State.map.w, State.map.h));
  player.x = Math.max(30, State.map.w / 2);
  player.y = ORB_REALM_START_Y;
  if (!skipEntryDialogue) {
    pauseForDialogue([
      { speaker: "???", text: "L'orbe ne doit pas être activé.. part d'ici !" },
    ]);
  }
  const forceGoldStorm = Boolean(options?.forceGoldStorm && orbId === 1);
  if (orbId === 1 && orbRealmState.kaelReplica) {
    orbRealmState.goldBoss = {
      stage: "waiting",
      entranceTimer: 0,
      riddleShown: false,
      answered: false,
      combatActive: false,
      returnUnlocked: false,
    };
    if (forceGoldStorm) {
      orbRealmState.goldBoss.stage = "storm";
      orbRealmState.goldBoss.riddleShown = true;
      orbRealmState.goldBoss.combatActive = false;
      orbRealmState.goldBoss.returnUnlocked = false;
      startOrbLightStorm(1, {
        challenge: true,
        challengeDuration: GOLD_CHALLENGE_RAMP_DURATION,
      });
    }
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
  const orbSnapshot = getOrbInventorySnapshot();
  activeHud.update?.({
    ...orbSnapshot,
    hp: player.hp,
    hpMax: player.maxHp ?? 100,
    stamina: player.stamina,
    staminaMax: player.staminaMax ?? 100,
    status: getOrbRealmStatusText(entry.config),
    dashCooldown: player.getDashCooldown?.() ?? 0,
    dashCooldownMax: player.dashCooldown ?? 1,
  });
  orbRealmState.active = true;
  orbRealmState.id = orbId;
  orbRealmState.teleportEffect = null;
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
  orbRealmState.teleportEffect = null;
  orbRealmState.greenBoss = null;
  orbRealmState.greenWall = null;
  orbRealmState.redBoss = null;
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
  orbRealmState.blueBoss = null;
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
  playSound("miniBossAppear", 0.3);

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
  const progress = 1 - goldState.entranceTimer / GOLD_BOSS_ENTRY_DURATION; // 0 → 1

  // Easing doux (smoothstep)
  const ease = progress * progress * (3 - 2 * progress);

  const height = GOLD_BOSS_ENTRY_HEIGHT;
  const baseScale = boss.baseScale ?? boss.scale ?? 1;

  // --- 1) POSITION : chute + petit rebond à la fin ---
  // position de base : il descend
  let y = ORB_REALM_CENTER.y - height * (1 - ease);

  // rebond léger quand il "touche" le centre
  const bounceStrength = 14; // px
  const normalizedProgress = Math.max(0, Math.min(1, progress));
  const bounce = Math.sin(normalizedProgress * Math.PI) * bounceStrength * (1 - normalizedProgress);
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
    const pulseAmp = 0.03; // amplitude
    const pulseSpeed = 9; // vitesse
    finalScale *= 1 + Math.sin(progress * Math.PI * pulseSpeed) * pulseAmp * (1 - progress);
  }

  boss.scale = finalScale;

  // --- 3) SHAKES / IMPACT à la fin de l'entrée ---
  if (progress > 0.75 && goldState.entryFx && !goldState.entryFx.playedImpact) {
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
    pushStatus && pushStatus(t("orbStatus.presenceCrush"));
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
  const riddle = getOrbRiddleConfig(GOLD_BOSS_RIDDLE_ID);
  if (!riddle) return;
  const showRiddle = () =>
    showBossRiddlePrompt({
      title: riddle.title,
      description: riddle.question,
      options: riddle.options,
      onSelect: handleGoldBossRiddleChoice,
    });
  pauseForDialogue(
    [
      { speaker: "Fantome", text: "Tu ne devrait pas être ici." },
      {
        speaker: "Fantome",
        text: "Tu ne sortira pas à moins de résoudre cette énigme, si tu te trompe...",
      },
    ],
    showRiddle
  );
}

function handleGoldBossRiddleChoice(choiceIndex) {
  const goldState = orbRealmState.goldBoss;
  if (!goldState) return;
  goldState.answered = true;
  const riddle = getOrbRiddleConfig(GOLD_BOSS_RIDDLE_ID);
  if (!riddle) return;
  if (choiceIndex === riddle.answerIndex) {
    goldState.correct = true;
    goldState.returnUnlocked = true;
    goldState.combatActive = false;
    goldState.stage = "resolved";
    playSound("success");
    stopOrbChallengeSound();
    pauseForDialogue([
      { speaker: "Fantome", text: "les rêves naissent dans l’obscurité, sont faits de fragments flous entre passé et futur, ressemblent à nos pensées… et disparaissent au réveil, lorsque la lumière revient." },
      { speaker: "Fantome", text: "Passe par ce portail, il activera l'une des clés du labyrinthe." },
    ]);
    orbRealmState.kaelReplica = null;
    pushStatus(riddle.success);
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
  playSound("enigmeFailed");
  stopOrbChallengeSound();
  pauseForDialogue([
    { speaker: "Fantome", text: "FAUX ! tu vas subir l'épreuve d'Epheria." },
    { speaker: "Fantome", text: "Tu ne sortira d'ici que si tu survis à mon défi." },
  ]);
  pushStatus(riddle.failure);
  goldState.stage = "storm";
  goldState.returnUnlocked = false;
  startOrbLightStorm(1);
}
function updateBlueBossLifecycle(dt, player) {
  const blueState = orbRealmState.blueBoss;
  const boss = orbRealmState.orbGhost;
  if (!blueState || !boss) return;
  if (blueState.stage === "waiting" && player) {
    const dist = Math.hypot(player.x - ORB_REALM_CENTER.x, player.y - ORB_REALM_CENTER.y);
    if (dist <= BLUE_BOSS_TRIGGER_DISTANCE) {
      startBlueBossEntrance();
    }
  } else if (blueState.stage === "enter") {
    updateBlueBossEntrance(dt);
  } else if (blueState.stage === "approach") {
    updateBlueBossApproach(dt, player);
  }
  if (blueState.combatActive && boss && !boss.alive) {
    blueState.combatActive = false;
    blueState.returnUnlocked = true;
    pushStatus(t("orbStatus.blueCalm"));
  }
}

function startBlueBossEntrance() {
  const blueState = orbRealmState.blueBoss;
  const boss = orbRealmState.orbGhost;
  if (!blueState || !boss || blueState.stage !== "waiting") return;
  playSound("miniBossAppear", 0.3);

  blueState.stage = "enter";
  blueState.entranceTimer = BLUE_BOSS_ENTRY_DURATION;
  boss.x = ORB_REALM_CENTER.x;
  boss.y = ORB_REALM_CENTER.y - BLUE_BOSS_ENTRY_HEIGHT;
  boss.hiddenForStorm = false;

  const baseScale = boss.baseScale ?? boss.scale ?? 1;
  boss.baseScale = baseScale;
  boss.scale = baseScale * 0.4;
  boss.alive = true;

  blueState.entryFx = {
    shake: true,
    pulse: true,
    playedImpact: false,
  };
}

function updateBlueBossEntrance(dt) {
  const blueState = orbRealmState.blueBoss;
  const boss = orbRealmState.orbGhost;
  if (!blueState || !boss || blueState.stage !== "enter") return;

  blueState.entranceTimer = Math.max(0, blueState.entranceTimer - dt);
  const progress = 1 - blueState.entranceTimer / BLUE_BOSS_ENTRY_DURATION;
  const normalizedProgress = Math.max(0, Math.min(1, progress));
  const ease = progress * progress * (3 - 2 * progress);

  const height = BLUE_BOSS_ENTRY_HEIGHT;
  const baseScale = boss.baseScale ?? boss.scale ?? 1;

  let y = ORB_REALM_CENTER.y - height * (1 - ease);
  const bounceStrength = 14;
  const bounce = Math.sin(normalizedProgress * Math.PI) * bounceStrength * (1 - normalizedProgress);
  y -= bounce;

  boss.x = ORB_REALM_CENTER.x;
  boss.y = y;

  const minScale = baseScale * 0.4;
  const maxScale = baseScale * 1.15;
  let finalScale = minScale + (maxScale - minScale) * ease;
  if (blueState.entryFx?.pulse) {
    const pulseAmp = 0.03;
    const pulseSpeed = 9;
    finalScale *=
      1 + Math.sin(normalizedProgress * Math.PI * pulseSpeed) * pulseAmp * (1 - normalizedProgress);
  }

  boss.scale = finalScale;

  if (progress > 0.75 && blueState.entryFx && !blueState.entryFx.playedImpact) {
    blueState.entryFx.playedImpact = true;
  }

  if (blueState.entranceTimer <= 0) {
    boss.x = ORB_REALM_CENTER.x;
    boss.y = ORB_REALM_CENTER.y;
    boss.scale = baseScale;

    blueState.stage = "approach";
    blueState.entryFx = null;
    pushStatus && pushStatus(t("orbStatus.blueApproach"));
  }
}

function updateBlueBossApproach(dt, player) {
  const blueState = orbRealmState.blueBoss;
  const boss = orbRealmState.orbGhost;
  if (!blueState || !boss || blueState.stage !== "approach" || !player) return;
  const dx = player.x - boss.x;
  const dy = player.y - boss.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.0001) {
    blueState.stage = "riddle";
    presentBlueBossRiddle();
    return;
  }
  const moveDist = Math.min(BLUE_BOSS_APPROACH_SPEED * dt, dist);
  boss.x += (dx / dist) * moveDist;
  boss.y += (dy / dist) * moveDist;
  if (dist <= 48) {
    blueState.stage = "riddle";
    presentBlueBossRiddle();
  }
}

function presentBlueBossRiddle() {
  const blueState = orbRealmState.blueBoss;
  if (!blueState || blueState.riddleShown) return;
  blueState.riddleShown = true;
  const riddle = getOrbRiddleConfig(BLUE_BOSS_RIDDLE_ID);
  if (!riddle) return;
  const showRiddle = () =>
    showBossRiddlePrompt({
      title: riddle.title,
      description: riddle.question,
      options: riddle.options,
      onSelect: handleBlueBossRiddleChoice,
    });
  pauseForDialogue(
    [
      { speaker: "Fantome", text: "Comment as-tu atteints ce lieu ?" },
      {
        speaker: "Fantome",
        text: "Nous sommes les gardiens de ce labyrinthe, emprisonnée à jamais.",
      },
      {
        speaker: "Fantome",
        text: "Résous cette énigme ou subit en les conséquences.",
      },
    ],
    showRiddle
  );
}

function handleBlueBossRiddleChoice(choiceIndex) {
  const blueState = orbRealmState.blueBoss;
  if (!blueState) return;
  blueState.answered = true;
  const orbId = orbRealmState.id;
  const riddle = getOrbRiddleConfig(BLUE_BOSS_RIDDLE_ID);
  if (!riddle) return;
  if (choiceIndex === riddle.answerIndex) {
    blueState.correct = true;
    blueState.returnUnlocked = true;
    blueState.combatActive = false;
    blueState.stage = "resolved";
    playSound("success");
    stopOrbChallengeSound();
    pauseForDialogue([
      { speaker: "Fantome", text: "La jalousie naît de l’amour, mais finit par le détruire. Elle agit comme un poison intérieur, transformant la passion en obsession et en souffrance." },
      { speaker: "Fantome", text: "Traverse ce portail, il réveille une autre clé du labyrinthe." },
    ]);
    const boss = orbRealmState.orbGhost;
    if (boss) {
      boss.hiddenForStorm = true;
    }
    if (orbId === 0 && orbRealmState.orbGhost) {
      orbRealmState.redBoss = {
        stage: "waiting",
        entranceTimer: 0,
        riddleShown: false,
        answered: false,
        combatActive: false,
        returnUnlocked: false,
      };
      const boss = orbRealmState.orbGhost;
      const baseScale = boss.baseScale ?? boss.scale ?? 1;
      boss.baseScale = baseScale;
      boss.x = ORB_REALM_CENTER.x;
      boss.y = ORB_REALM_CENTER.y - RED_BOSS_ENTRY_HEIGHT;
      boss.scale = baseScale * 0.6;
      boss.alive = true;
      boss.hiddenForStorm = true;
      boss.invulnerable = true;
    }
    State.ghosts = [];
    orbRealmState.orbGhost = null;
    pushStatus(riddle.success);
    orbRealmState.activeStorm = null;
    startTeleportEffect({
      orbId: 3,
      origin: { x: ORB_REALM_CENTER.x, y: ORB_REALM_CENTER.y },
      teleportEffect: { phase: 0 },
    });
    return;
  }
  blueState.correct = false;
  blueState.combatActive = false;
  playSound("enigmeFailed");
  stopOrbChallengeSound();
  pauseForDialogue([
    { speaker: "Fantome", text: "Tu as eu tort." },
    { speaker: "Fantome", text: "Survis à la tempête et peu être que le chemin s'ouvrira." },
  ]);
  pushStatus(riddle.failure);
  blueState.stage = "storm";
  blueState.returnUnlocked = false;
  startOrbLightStorm(3);
}
function updateGreenBossLifecycle(dt, player) {
  const greenState = orbRealmState.greenBoss;
  const boss = orbRealmState.orbGhost;
  if (!greenState || !boss) return;
  if (greenState.stage === "waiting" && player) {
    const dist = Math.hypot(player.x - ORB_REALM_CENTER.x, player.y - ORB_REALM_CENTER.y);
    if (dist <= GREEN_BOSS_TRIGGER_DISTANCE) {
      startGreenBossEntrance();
    }
  } else if (greenState.stage === "enter") {
    updateGreenBossEntrance(dt);
  } else if (greenState.stage === "approach") {
    updateGreenBossApproach(dt, player);
  }
  if (greenState.combatActive && boss && !boss.alive) {
    greenState.combatActive = false;
    greenState.returnUnlocked = true;
    pushStatus(t("orbStatus.greenCalm"));
  }
}

function startGreenBossEntrance() {
  const greenState = orbRealmState.greenBoss;
  const boss = orbRealmState.orbGhost;
  if (!greenState || !boss || greenState.stage !== "waiting") return;
  playSound("miniBossAppear", 0.3);
  greenState.stage = "enter";
  greenState.entranceTimer = GREEN_BOSS_ENTRY_DURATION;
  boss.x = ORB_REALM_CENTER.x;
  boss.y = ORB_REALM_CENTER.y - GREEN_BOSS_ENTRY_HEIGHT;
  boss.hiddenForStorm = false;
  const baseScale = boss.baseScale ?? boss.scale ?? 1;
  boss.baseScale = baseScale;
  boss.scale = baseScale * 0.4;
  boss.alive = true;
  greenState.entryFx = {
    shake: true,
    pulse: true,
    playedImpact: false,
  };
}

function updateGreenBossEntrance(dt) {
  const greenState = orbRealmState.greenBoss;
  const boss = orbRealmState.orbGhost;
  if (!greenState || !boss || greenState.stage !== "enter") return;

  greenState.entranceTimer = Math.max(0, greenState.entranceTimer - dt);
  const progress = 1 - greenState.entranceTimer / GREEN_BOSS_ENTRY_DURATION;
  const ease = progress * progress * (3 - 2 * progress);

  const height = GREEN_BOSS_ENTRY_HEIGHT;
  const baseScale = boss.baseScale ?? boss.scale ?? 1;

  let y = ORB_REALM_CENTER.y - height * (1 - ease);
  const bounceStrength = 14;
  const bounce = Math.sin(Math.min(1, progress) * Math.PI) * bounceStrength * (1 - progress);
  y -= bounce;

  boss.x = ORB_REALM_CENTER.x;
  boss.y = y;

  const minScale = baseScale * 0.4;
  const maxScale = baseScale * 1.15;
  let finalScale = minScale + (maxScale - minScale) * ease;
  if (greenState.entryFx?.pulse) {
    const pulseAmp = 0.03;
    const pulseSpeed = 9;
    finalScale *= 1 + Math.sin(progress * Math.PI * pulseSpeed) * pulseAmp * (1 - progress);
  }

  boss.scale = finalScale;

  if (progress > 0.75 && greenState.entryFx && !greenState.entryFx.playedImpact) {
    greenState.entryFx.playedImpact = true;
  }

  if (greenState.entranceTimer <= 0) {
    boss.x = ORB_REALM_CENTER.x;
    boss.y = ORB_REALM_CENTER.y;
    boss.scale = baseScale;

    greenState.stage = "approach";
    greenState.entryFx = null;
    pushStatus(t("orbStatus.greenApproach"));
  }
}

function updateGreenBossApproach(dt, player) {
  const greenState = orbRealmState.greenBoss;
  const boss = orbRealmState.orbGhost;
  if (!greenState || !boss || greenState.stage !== "approach" || !player) return;
  const dx = player.x - boss.x;
  const dy = player.y - boss.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.0001) {
    greenState.stage = "riddle";
    presentGreenBossRiddle();
    return;
  }
  const moveDist = Math.min(GREEN_BOSS_APPROACH_SPEED * dt, dist);
  boss.x += (dx / dist) * moveDist;
  boss.y += (dy / dist) * moveDist;
  if (dist <= 48) {
    greenState.stage = "riddle";
    presentGreenBossRiddle();
  }
}

function presentGreenBossRiddle() {
  const greenState = orbRealmState.greenBoss;
  if (!greenState || greenState.riddleShown) return;
  greenState.riddleShown = true;
  const riddle = getOrbRiddleConfig(GREEN_BOSS_RIDDLE_ID);
  if (!riddle) return;
  const showRiddle = () =>
    showBossRiddlePrompt({
      title: riddle.title,
      description: riddle.question,
      options: riddle.options,
      onSelect: handleGreenBossRiddleChoice,
    });
  pauseForDialogue(
    [
      { speaker: "Fantome", text: "Encore un aventurier.." },
      {
        speaker: "Fantome",
        text: "Comme d'autre avant toi, tu tombera, et tu rejoindra les rands des damnés.",
      },
      {
        speaker: "Fantome",
        text: "Répond à mon énigme, ou meurt en essayant.",
      },
    ],
    showRiddle
  );
}

function handleGreenBossRiddleChoice(choiceIndex) {
  const greenState = orbRealmState.greenBoss;
  if (!greenState) return;
  greenState.answered = true;
  const riddle = getOrbRiddleConfig(GREEN_BOSS_RIDDLE_ID);
  if (!riddle) return;
  if (choiceIndex === riddle.answerIndex) {
    greenState.correct = true;
    greenState.returnUnlocked = true;
    greenState.combatActive = false;
    greenState.stage = "resolved";
    playSound("success");
    stopOrbChallengeSound();
    pauseForDialogue(
      [
        { speaker: "Fantome", text: "La montagne est l’ossature de la terre, s’élève vers le ciel, et son sommet est recouvert de neige blanche pure." },
        { speaker: "Fantome", text: "Passe par ce portail, il libèrera une autre clé du labyrinthe." },
      ],
      () => {
        const boss = orbRealmState.orbGhost;
        if (boss) {
          boss.hiddenForStorm = true;
        }
        State.ghosts = [];
        orbRealmState.orbGhost = null;
        orbRealmState.activeStorm = null;
        pushStatus(riddle.success);
        startTeleportEffect({
          orbId: 2,
          origin: { x: ORB_REALM_CENTER.x, y: ORB_REALM_CENTER.y },
          teleportEffect: { phase: 0 },
        });
      }
    );
    return;
  }
  greenState.correct = false;
  greenState.combatActive = false;
  playSound("enigmeFailed");
  stopOrbChallengeSound();
  pauseForDialogue(
    [
      { speaker: "Fantome", text: "La verdure gronde, tu n'as pas su l'apaiser." },
      { speaker: "Fantome", text: "Survis à la tempête, peut-être que la sortie s'éclairera." },
    ],
    () => {}
  );
  pushStatus(riddle.failure);
  greenState.stage = "storm";
  greenState.returnUnlocked = false;
  startOrbLightStorm(2);
}
function updateRedBossLifecycle(dt, player) {
  const redState = orbRealmState.redBoss;
  const boss = orbRealmState.orbGhost;
  if (!redState || !boss) return;
  if (redState.stage === "waiting" && player) {
    const dist = Math.hypot(player.x - ORB_REALM_CENTER.x, player.y - ORB_REALM_CENTER.y);
    if (dist <= RED_BOSS_TRIGGER_DISTANCE) {
      startRedBossEntrance();
    }
  } else if (redState.stage === "enter") {
    updateRedBossEntrance(dt);
  } else if (redState.stage === "approach") {
    updateRedBossApproach(dt, player);
  }
  if (redState.combatActive && boss && !boss.alive) {
    redState.combatActive = false;
    redState.returnUnlocked = true;
    pushStatus(t("orbStatus.redCalm"));
  }
}

function startRedBossEntrance() {
  const redState = orbRealmState.redBoss;
  const boss = orbRealmState.orbGhost;
  if (!redState || !boss || redState.stage !== "waiting") return;
  playSound("miniBossAppear", 0.3);
  redState.stage = "enter";
  redState.entranceTimer = RED_BOSS_ENTRY_DURATION;
  boss.x = ORB_REALM_CENTER.x;
  boss.y = ORB_REALM_CENTER.y - RED_BOSS_ENTRY_HEIGHT;
  boss.hiddenForStorm = false;
  const baseScale = boss.baseScale ?? boss.scale ?? 1;
  boss.baseScale = baseScale;
  boss.scale = baseScale * 0.4;
  boss.alive = true;
  boss.invulnerable = true;
  redState.entryFx = {
    shake: true,
    pulse: true,
    playedImpact: false,
  };
}

function updateRedBossEntrance(dt) {
  const redState = orbRealmState.redBoss;
  const boss = orbRealmState.orbGhost;
  if (!redState || !boss || redState.stage !== "enter") return;

  redState.entranceTimer = Math.max(0, redState.entranceTimer - dt);
  const progress = 1 - redState.entranceTimer / RED_BOSS_ENTRY_DURATION;
  const ease = progress * progress * (3 - 2 * progress);

  const height = RED_BOSS_ENTRY_HEIGHT;
  const baseScale = boss.baseScale ?? boss.scale ?? 1;

  let y = ORB_REALM_CENTER.y - height * (1 - ease);
  const bounceStrength = 14;
  const bounce = Math.sin(Math.min(1, progress) * Math.PI) * bounceStrength * (1 - progress);
  y -= bounce;

  boss.x = ORB_REALM_CENTER.x;
  boss.y = y;

  const minScale = baseScale * 0.4;
  const maxScale = baseScale * 1.15;
  let finalScale = minScale + (maxScale - minScale) * ease;
  if (redState.entryFx?.pulse) {
    const pulseAmp = 0.03;
    const pulseSpeed = 9;
    finalScale *= 1 + Math.sin(progress * Math.PI * pulseSpeed) * pulseAmp * (1 - progress);
  }

  boss.scale = finalScale;

  if (progress > 0.75 && redState.entryFx && !redState.entryFx.playedImpact) {
    redState.entryFx.playedImpact = true;
  }

  if (redState.entranceTimer <= 0) {
    boss.x = ORB_REALM_CENTER.x;
    boss.y = ORB_REALM_CENTER.y;
    boss.scale = baseScale;

    redState.stage = "approach";
    redState.entryFx = null;
    pushStatus(t("orbStatus.redApproach"));
  }
}

function updateRedBossApproach(dt, player) {
  const redState = orbRealmState.redBoss;
  const boss = orbRealmState.orbGhost;
  if (!redState || !boss || redState.stage !== "approach" || !player) return;
  const dx = player.x - boss.x;
  const dy = player.y - boss.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.0001) {
    redState.stage = "riddle";
    presentRedBossRiddle();
    return;
  }
  const moveDist = Math.min(RED_BOSS_APPROACH_SPEED * dt, dist);
  boss.x += (dx / dist) * moveDist;
  boss.y += (dy / dist) * moveDist;
  if (dist <= 48) {
    redState.stage = "riddle";
    presentRedBossRiddle();
  }
}

function presentRedBossRiddle() {
  const redState = orbRealmState.redBoss;
  if (!redState || redState.riddleShown) return;
  redState.riddleShown = true;
  const riddle = getOrbRiddleConfig(RED_BOSS_RIDDLE_ID);
  if (!riddle) return;
  const showRiddle = () =>
    showBossRiddlePrompt({
      title: riddle.title,
      description: riddle.question,
      options: riddle.options,
      onSelect: handleRedBossRiddleChoice,
    });
  pauseForDialogue(
    [
      {
        speaker: "Fantome",
        text: "Gardien maudit, ni vivant, ni mort, souhaite-tu me rejoindre pour l'éternité ?",
      },
      {
        speaker: "Fantome",
        text: "Donne la réponse à cette énigme, si tu te trompe, je ne serais plus jamais seul...",
      },
    ],
    showRiddle
  );
}

function handleRedBossRiddleChoice(choiceIndex) {
  const redState = orbRealmState.redBoss;
  if (!redState) return;
  redState.answered = true;
  const riddle = getOrbRiddleConfig(RED_BOSS_RIDDLE_ID);
  if (!riddle) return;
  if (choiceIndex === riddle.answerIndex) {
    redState.correct = true;
    redState.returnUnlocked = true;
    redState.combatActive = false;
    redState.stage = "resolved";
    playSound("success");
    stopOrbChallengeSound();
    pauseForDialogue(
      [
        { speaker: "Fantome", text: "La faim est invisible, immatérielle, mais tout le monde la ressent. Elle n’a pas de forme, mais elle affaiblit, terrasse, et peut faire tomber même les plus puissantes nations." },
        { speaker: "Fantome", text: "Traverse ce portail, il activera une nouvelle clé du labyrinthe." },
      ],
      () => {
        const boss = orbRealmState.orbGhost;
        if (boss) boss.hiddenForStorm = true;
        State.ghosts = [];
        orbRealmState.orbGhost = null;
        orbRealmState.activeStorm = null;
        pushStatus(riddle.success);
        startTeleportEffect({
          orbId: 0,
          origin: { x: ORB_REALM_CENTER.x, y: ORB_REALM_CENTER.y },
          teleportEffect: { phase: 0 },
        });
      }
    );
    return;
  }
  redState.correct = false;
  redState.combatActive = false;
  playSound("enigmeFailed");
  stopOrbChallengeSound();
  pauseForDialogue(
    [
      { speaker: "Fantome", text: "Le feu gronde, tu n'as pas su l'apaiser." },
      { speaker: "Fantome", text: "Survis à la tempête, peut-être que la sortie s'éclairera." },
    ],
    () => {}
  );
  pushStatus(riddle.failure);
  redState.stage = "storm";
  redState.returnUnlocked = false;
  startOrbLightStorm(0);
}
function presentOrbRiddle(orbId) {
  if (orbId === 1) return;
  const config = getOrbRiddleConfig(orbId);
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
  const config = getOrbRiddleConfig(orbId);
  if (!config) return;
  const status = orbRealmState.orbRiddleStatus[orbId] ?? {};
  status.answered = true;
  status.correct = choiceIndex === config.answerIndex;
  orbRealmState.orbRiddleStatus[orbId] = status;
  if (status.correct) {
    pushStatus(config.success);
    playSound("success");
    stopOrbChallengeSound();
    return;
  }
  pushStatus(config.failure);
  playSound("enigmeFailed");
  startOrbLightStorm(orbId);
}

function startOrbLightStorm(orbId, opts = {}) {
  const map = State.map;
  if (!map) return;
  playSound("miniBossAppear", 0.3);
  startOrbChallengeSound(0.3);
  const status = orbRealmState.orbRiddleStatus[orbId] ?? {};
  if (status.stormTriggered) return;
  status.stormTriggered = true;
  orbRealmState.orbRiddleStatus[orbId] = status;
  const originX = map.w * 0.5 + ORB_LIGHT_STORM_ZONE_SHIFT_X;
  const originY = Math.max(0, map.h * 0.5 - ORB_LIGHT_STORM_VERTICAL_OFFSET);
  const descriptor = ORB_STORM_DESCRIPTORS[orbId] ?? ORB_STORM_DESCRIPTORS[1];
  const targetX = originX + ORB_LIGHT_STORM_TARGET_SHIFT_X;
  const challengeMode = Boolean(opts?.challenge);
  const dialogueLines = challengeMode
    ? [
        { speaker: "Fantome", text: "L'épreuve va bientôt débuter, prépare-toi !" },
        {
          speaker: "Fantome",
          text: "Tiens le plus longtemps possible : chaque seconde te rapproche du record.",
        },
      ]
    : [
        { speaker: "Fantome", text: "FAUX ! tu vas subir l'épreuve d'Epheria." },
      { speaker: "Fantome", text: "Si tu parviens à survivre, tu seras libre de poursuivre ta quête." },
      ];
  pauseForDialogue(dialogueLines, () => beginOrbLightStorm(orbId, targetX, originY, opts));
}
State.startOrbLightStorm = startOrbLightStorm;

function beginOrbLightStorm(orbId, originX, originY, opts = {}) {
  const challengeMode = Boolean(opts?.challenge);
  const explosionTimer = [0, 2, 3].includes(orbId) ? 5 : null;
  const storm = {
    orbId,
    timer: challengeMode ? null : ORB_LIGHT_STORM_DURATION,
    spawnAccumulator: 0,
    origin: { x: originX, y: originY },
    arrows: [],
    teleportEffect: null,
    congratulated: false,
    completed: false,
    waitingForGhost: true,
    explosionTimer,
    challengeMode,
    challengeDuration: Math.max(20, opts?.challengeDuration ?? GOLD_CHALLENGE_RAMP_DURATION),
    elapsed: 0,
    challengeRecorded: false,
    challengeExplosionTimer: challengeMode ? GOLD_CHALLENGE_EXPLOSION_DELAY : null,
    challengeExplosionsActive: false,
    challengeWallCountdown: challengeMode ? GOLD_CHALLENGE_GREEN_WALL_DELAY : null,
    challengeWallsActive: false,
    challengeRedWallCountdown: challengeMode ? GOLD_CHALLENGE_RED_WALL_DELAY : null,
    challengeRedWallsActive: false,
  };
  orbRealmState.activeStorm = storm;
  const bossEntity = orbRealmState.kaelReplica ?? orbRealmState.orbGhost;
  if (bossEntity?.animator) {
    bossEntity.hiddenForStorm = false;
    bossEntity.animator.setBase?.("idle");
    bossEntity.animator.play?.("idle", { loop: true, force: true });
  }
  pushStatus(t("orbStatus.arrowsStrike"));
  orbRealmState.teleportEffect = null;

  // 💀 Délai avant la première apparition des murs : 3 secondes
  const ORB_WALL_INITIAL_DELAY = 3;

  if (orbId === 0 || orbId === 3) {
    const wallState = orbRealmState.greenWall ?? {
      active: false,
      cooldown: 0,
      enabled: true,
    };
    wallState.enabled = true;
    wallState.active = false;
    wallState.cooldown = ORB_WALL_INITIAL_DELAY; // ⬅️ avant 0
    orbRealmState.greenWall = wallState;
  }

  if (orbId === 0) {
    const redWallState = orbRealmState.redWall ?? {
      active: false,
      cooldown: 0,
      enabled: true,
    };
    redWallState.enabled = true;
    redWallState.active = false;
    redWallState.cooldown = ORB_WALL_INITIAL_DELAY; // ⬅️ avant 0
    orbRealmState.redWall = redWallState;
  }
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
  const hero = player ?? State.player;
  if (storm.challengeMode) {
    storm.elapsed = (storm.elapsed ?? 0) + dt;
  } else {
    storm.timer = Math.max(0, (storm.timer ?? ORB_LIGHT_STORM_DURATION) - dt);
  }
  const baseDuration = storm.challengeMode
    ? Math.max(0.0001, storm.challengeDuration ?? GOLD_CHALLENGE_RAMP_DURATION)
    : Math.max(0.0001, ORB_LIGHT_STORM_DURATION);
  const progress = storm.challengeMode
    ? Math.min(1, (storm.elapsed ?? 0) / baseDuration)
    : Math.min(1, 1 - (storm.timer ?? 0) / baseDuration);
  const interval = Math.max(
    0.05,
    lerp(ORB_LIGHT_STORM_START_INTERVAL, ORB_LIGHT_STORM_END_INTERVAL, progress)
  );
  if (storm.challengeMode || (storm.timer ?? 0) > 0) {
    storm.spawnAccumulator += dt;
    while (storm.spawnAccumulator >= interval) {
      storm.spawnAccumulator -= interval;
const rawBurst =
  storm.orbId === 3
    ? ORB_LIGHT_STORM_BURST_COUNT * (2 / 3)
    : ORB_LIGHT_STORM_BURST_COUNT;

// 🧮 Applique le -20% ici aussi
const burstCount = Math.max(1, Math.round(rawBurst * ORB_PROJECTILE_DENSITY));

for (let i = 0; i < burstCount; i++) {
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
  if (!storm.challengeMode && !storm.completed && (storm.timer ?? 0) <= 0) {
    if (!hero || hero.hp > 0) {
      handleStormCompletion(storm);
    }
  }
  if (storm.challengeMode && hero && hero.hp <= 0) {
    finalizeGoldChallengeRecord(storm);
  }
  if (storm.challengeMode && hero && hero.hp > 0) {
    if (!storm.challengeExplosionsActive) {
      storm.challengeExplosionTimer = Math.max(
        0,
        (storm.challengeExplosionTimer ?? GOLD_CHALLENGE_EXPLOSION_DELAY) - dt
      );
      if (storm.challengeExplosionTimer <= 0) {
        storm.challengeExplosionsActive = true;
        storm.challengeExplosionTimer = GOLD_CHALLENGE_EXPLOSION_INTERVAL;
        triggerOrbExplosion(hero);
      }
    } else {
      storm.challengeExplosionTimer = Math.max(
        0,
        (storm.challengeExplosionTimer ?? GOLD_CHALLENGE_EXPLOSION_INTERVAL) - dt
      );
      if (storm.challengeExplosionTimer <= 0) {
        storm.challengeExplosionTimer = GOLD_CHALLENGE_EXPLOSION_INTERVAL;
        triggerOrbExplosion(hero);
      }
    }
  }
  if (storm.challengeMode && hero && hero.hp > 0 && !storm.challengeWallsActive) {
    storm.challengeWallCountdown = Math.max(
      0,
      (storm.challengeWallCountdown ?? GOLD_CHALLENGE_GREEN_WALL_DELAY) - dt
    );
    if (storm.challengeWallCountdown <= 0) {
      storm.challengeWallsActive = true;
      const wallState = orbRealmState.greenWall ?? { active: false, cooldown: 0, enabled: false };
      wallState.enabled = true;
      wallState.active = false;
      wallState.cooldown = 0;
      wallState.damageApplied = false;
      orbRealmState.greenWall = wallState;
      pushStatus?.(t("orbStatus.firstLightWall"));
    }
  }
  if (
    storm.challengeMode &&
    hero &&
    hero.hp > 0 &&
    storm.challengeWallsActive &&
    !storm.challengeRedWallsActive
  ) {
    storm.challengeRedWallCountdown = Math.max(
      0,
      (storm.challengeRedWallCountdown ?? GOLD_CHALLENGE_RED_WALL_DELAY) - dt
    );
    if (storm.challengeRedWallCountdown <= 0) {
      storm.challengeRedWallsActive = true;
      const wallState = orbRealmState.redWall ?? { active: false, cooldown: 0, enabled: false };
      wallState.enabled = true;
      wallState.active = false;
      wallState.cooldown = 0;
      wallState.damageApplied = false;
      orbRealmState.redWall = wallState;
      pushStatus?.(t("orbStatus.secondLightWall"));
    }
  }
  if (hero && hero.hp > 0 && typeof storm.explosionTimer === "number" && storm.explosionTimer != null) {
    storm.explosionTimer -= dt;
    if (storm.explosionTimer <= 0) {
      storm.explosionTimer = 5;
      triggerOrbExplosion(hero);
    }
  }
  updateOrbExplosionEffects(dt);
}

function triggerOrbExplosion(hero) {
  if (!hero) return;
  const effect = {
    x: hero.x,
    y: hero.y,
    timer: 2,
    duration: 2,
    radius: 0,
    damageApplied: false,
    target: hero,
  };
  orbExplosionEffects.push(effect);
}

const orbExplosionEffects = [];

function updateOrbExplosionEffects(dt) {
  const hero = State.player;
  for (const effect of orbExplosionEffects) {
    if (effect.timer <= 0) continue;
    effect.timer = Math.max(0, effect.timer - dt);
    effect.radius = lerp(40, 100, 1 - effect.timer / effect.duration);
    if (effect.timer <= 0 && !effect.damageApplied) {
      effect.damageApplied = true;
      const damage = 100;
      const target = hero;
      const distToTarget = target
        ? Math.hypot((target.x ?? 0) - effect.x, (target.y ?? 0) - effect.y)
        : Infinity;
      const withinArea = distToTarget <= Math.max(0, effect.radius);
      if (withinArea) {
        target?.applyDamage?.(damage);
        spawnFloatingText(-damage, effect.x, effect.y - 14, {
          color: "rgba(150, 230, 255, 1)",
          stroke: "rgba(0,0,0,0.75)",
        });
      }
      spawnOrbHazard(effect.x, effect.y, 90, 1.2, 0, {
        color: "rgba(210, 245, 255, 0.95)",
        cooldown: 0.2,
      });
      playSound("miniBossExplosion", 0.7);
    }
  }
  // remove finished
  const alive = orbExplosionEffects.filter((e) => e.timer > 0 || !e.damageApplied);
  orbExplosionEffects.length = 0;
  orbExplosionEffects.push(...alive);
}

function drawOrbExplosionEffects(ctx) {
  if (!ctx || !orbExplosionEffects.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const effect of orbExplosionEffects) {
    const progress = 1 - effect.timer / Math.max(1, effect.duration);
    const alpha = Math.sin(progress * Math.PI) * 0.6;
    const radius = effect.radius || lerp(20, 120, progress);
    const gradient = ctx.createRadialGradient(effect.x, effect.y, radius * 0.35, effect.x, effect.y, radius);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    gradient.addColorStop(0.6, "rgba(150,210,255,0.3)");
    gradient.addColorStop(1, "rgba(80,150,255,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectIntersectsCircle(rect, cx, cy, radius) {
  if (!rect || radius <= 0) return false;
  const closestX = clampValue(cx, rect.x, rect.x + rect.width);
  const closestY = clampValue(cy, rect.y, rect.y + rect.height);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

function isGreenWallOffScreen(rect, camera, direction) {
  if (!rect || !camera) return true;
  if (direction === 0) {
    return rect.x > camera.x + camera.w;
  }
  if (direction === 1) {
    return rect.x + rect.width < camera.x;
  }
  if (direction === 2) {
    return rect.y > camera.y + camera.h;
  }
  if (direction === 3) {
    return rect.y + rect.height < camera.y;
  }
  return true;
}

function spawnGreenWall() {
  const player = State.player;
  const camera = State.camera;
  if (!player || !camera) return;
  const canvasW = Math.max(1, $canvas.width);
  const canvasH = Math.max(1, $canvas.height);
  const scaleX = canvasW / Math.max(1, camera.w);
  const scaleY = canvasH / Math.max(1, camera.h);
  const thicknessX = GREEN_WALL_THICKNESS / scaleX;
  const thicknessY = GREEN_WALL_THICKNESS / scaleY;
  const lengthH = Math.max(32, (canvasH * GREEN_WALL_LENGTH_RATIO) / scaleY);
  const lengthV = Math.max(32, (canvasW * GREEN_WALL_LENGTH_RATIO) / scaleX);
  const wallState = orbRealmState.greenWall ?? { active: false, cooldown: 0 };
  orbRealmState.greenWall = wallState;
  const dir = Math.floor(Math.random() * 4);
  wallState.direction = dir;
  const rect = { x: 0, y: 0, width: 0, height: 0 };
  if (dir === 0) {
    rect.width = thicknessX;
    rect.height = Math.min(lengthH, camera.h);
    rect.y = clampValue(player.y - rect.height / 2, camera.y, camera.y + camera.h - rect.height);
    rect.x = camera.x - rect.width;
  } else if (dir === 1) {
    rect.width = thicknessX;
    rect.height = Math.min(lengthH, camera.h);
    rect.y = clampValue(player.y - rect.height / 2, camera.y, camera.y + camera.h - rect.height);
    rect.x = camera.x + camera.w;
  } else if (dir === 2) {
    rect.height = thicknessY;
    rect.width = Math.min(lengthV, camera.w);
    rect.x = clampValue(player.x - rect.width / 2, camera.x, camera.x + camera.w - rect.width);
    rect.y = camera.y - rect.height;
  } else {
    rect.height = thicknessY;
    rect.width = Math.min(lengthV, camera.w);
    rect.x = clampValue(player.x - rect.width / 2, camera.x, camera.x + camera.w - rect.width);
    rect.y = camera.y + camera.h;
  }
  wallState.rect = rect;
  wallState.active = true;
  wallState.damageApplied = false;
  wallState.cooldown = 0;
}

function spawnRedWall() {
  const player = State.player;
  const camera = State.camera;
  if (!player || !camera) return;
  const canvasW = Math.max(1, $canvas.width);
  const canvasH = Math.max(1, $canvas.height);
  const scaleX = canvasW / Math.max(1, camera.w);
  const scaleY = canvasH / Math.max(1, camera.h);
  const thicknessX = GREEN_WALL_THICKNESS / scaleX;
  const thicknessY = GREEN_WALL_THICKNESS / scaleY;
  const lengthH = Math.max(32, (canvasH * GREEN_WALL_LENGTH_RATIO) / scaleY);
  const lengthV = Math.max(32, (canvasW * GREEN_WALL_LENGTH_RATIO) / scaleX);
  const wallState = orbRealmState.redWall ?? { active: false, cooldown: 0 };
  orbRealmState.redWall = wallState;
  const dir = Math.floor(Math.random() * 4);
  wallState.direction = dir;
  const rect = { x: 0, y: 0, width: 0, height: 0 };
  if (dir === 0) {
    rect.width = thicknessX;
    rect.height = Math.min(lengthH, camera.h);
    rect.y = clampValue(player.y - rect.height / 2, camera.y, camera.y + camera.h - rect.height);
    rect.x = camera.x - rect.width;
  } else if (dir === 1) {
    rect.width = thicknessX;
    rect.height = Math.min(lengthH, camera.h);
    rect.y = clampValue(player.y - rect.height / 2, camera.y, camera.y + camera.h - rect.height);
    rect.x = camera.x + camera.w;
  } else if (dir === 2) {
    rect.height = thicknessY;
    rect.width = Math.min(lengthV, camera.w);
    rect.x = clampValue(player.x - rect.width / 2, camera.x, camera.x + camera.w - rect.width);
    rect.y = camera.y - rect.height;
  } else {
    rect.height = thicknessY;
    rect.width = Math.min(lengthV, camera.w);
    rect.x = clampValue(player.x - rect.width / 2, camera.x, camera.x + camera.w - rect.width);
    rect.y = camera.y + camera.h;
  }
  wallState.rect = rect;
  wallState.active = true;
  wallState.damageApplied = false;
  wallState.cooldown = 0;
}

function updateGreenWall(dt, player) {
  if (!player) return;
  const camera = State.camera;
  if (!camera) return;
  const wallState = orbRealmState.greenWall ?? { active: false, cooldown: 0 };
  orbRealmState.greenWall = wallState;
  if (!wallState.enabled) return;
  if (!wallState.active) {
    wallState.cooldown = Math.max(0, (wallState.cooldown ?? 0) - dt);
    if (wallState.cooldown <= 0) {
      spawnGreenWall();
    }
    return;
  }
  const heroSpeed = Math.max(0.01, player.speed ?? 120);
  const speed = heroSpeed * GREEN_WALL_SPEED_RATIO;
  const velocityX =
    wallState.direction === 0 ? speed : wallState.direction === 1 ? -speed : 0;
  const velocityY =
    wallState.direction === 2 ? speed : wallState.direction === 3 ? -speed : 0;
  const rect = wallState.rect;
  if (!rect) return;
  rect.x += velocityX * dt;
  rect.y += velocityY * dt;
  const heroRadius = Math.max(8, player.hitRadius ?? player.r ?? 16);
  if (!wallState.damageApplied && rectIntersectsCircle(rect, player.x, player.y, heroRadius)) {
    player.applyDamage(GREEN_WALL_DAMAGE);
    wallState.damageApplied = true;
  }
  if (isGreenWallOffScreen(rect, camera, wallState.direction)) {
    wallState.active = false;
    wallState.cooldown = GREEN_WALL_COOLDOWN;
  }
}

function drawGreenWall(ctx) {
  if (!ctx) return;
  const wallState = orbRealmState.greenWall;
  if (!wallState || !wallState.active || !wallState.rect) return;
  const isRed = orbRealmState.id === 0;
  ctx.save();
  ctx.fillStyle = isRed ? "rgba(255, 110, 40, 0.85)" : "rgba(28, 95, 150, 0.78)";
  ctx.fillRect(wallState.rect.x, wallState.rect.y, wallState.rect.width, wallState.rect.height);
  ctx.strokeStyle = isRed ? "rgba(255, 180, 90, 0.9)" : "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(wallState.rect.x, wallState.rect.y, wallState.rect.width, wallState.rect.height);
  ctx.restore();
}

function drawRedWall(ctx) {
  if (!ctx) return;
  const wallState = orbRealmState.redWall;
  if (!wallState || !wallState.active || !wallState.rect) return;
  ctx.save();
  ctx.fillStyle = "rgba(255, 60, 20, 0.9)";
  ctx.fillRect(wallState.rect.x, wallState.rect.y, wallState.rect.width, wallState.rect.height);
  ctx.strokeStyle = "rgba(255, 200, 120, 0.95)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(wallState.rect.x, wallState.rect.y, wallState.rect.width, wallState.rect.height);
  ctx.restore();
}

function updateRedWall(dt, player) {
  if (!player) return;
  const camera = State.camera;
  if (!camera) return;
  const wallState = orbRealmState.redWall ?? { active: false, cooldown: 0 };
  orbRealmState.redWall = wallState;
  if (!wallState.enabled) return;
  if (!wallState.active) {
    wallState.cooldown = Math.max(0, (wallState.cooldown ?? 0) - dt);
    if (wallState.cooldown <= 0) {
      spawnRedWall();
    }
    return;
  }
  const heroSpeed = Math.max(0.01, player.speed ?? 120);
  const speed = heroSpeed * GREEN_WALL_SPEED_RATIO;
  const velocityX =
    wallState.direction === 0 ? speed : wallState.direction === 1 ? -speed : 0;
  const velocityY =
    wallState.direction === 2 ? speed : wallState.direction === 3 ? -speed : 0;
  const rect = wallState.rect;
  if (!rect) return;
  rect.x += velocityX * dt;
  rect.y += velocityY * dt;
  const heroRadius = Math.max(8, player.hitRadius ?? player.r ?? 16);
  if (!wallState.damageApplied && rectIntersectsCircle(rect, player.x, player.y, heroRadius)) {
    player.applyDamage(GREEN_WALL_DAMAGE);
    wallState.damageApplied = true;
  }
  if (isGreenWallOffScreen(rect, camera, wallState.direction)) {
    wallState.active = false;
    wallState.cooldown = RED_WALL_COOLDOWN;
  }
}

function handleStormCompletion(storm) {
  if (!storm || storm.completed) return;
  storm.completed = true;
  stopOrbChallengeSound();
  hideOrbEntitiesForStorm(false);
  const descriptor = ORB_STORM_DESCRIPTORS[storm.orbId] ?? ORB_STORM_DESCRIPTORS[1];
  pushStatus(`Les flèches de ${descriptor.colorLabel} s'estompent, la sortie se dévoile.`);
  if (storm.orbId === 1) {
    const goldState = orbRealmState.goldBoss;
    if (goldState) {
      goldState.stage = "resolved";
      goldState.returnUnlocked = true;
    }
  } else if (storm.orbId === 0) {
    const redState = orbRealmState.redBoss;
    if (redState) {
      redState.stage = "resolved";
      redState.returnUnlocked = true;
    }
  } else if (storm.orbId === 2) {
    const greenState = orbRealmState.greenBoss;
    if (greenState) {
      greenState.stage = "resolved";
      greenState.returnUnlocked = true;
    }
  } else if (storm.orbId === 3) {
    const blueState = orbRealmState.blueBoss;
    if (blueState) {
      blueState.stage = "resolved";
      blueState.returnUnlocked = true;
    }
  }
  const wallState = orbRealmState.greenWall;
  if (wallState) {
    wallState.enabled = false;
    wallState.active = false;
  }
  const redWallState = orbRealmState.redWall;
  if (redWallState) {
    redWallState.enabled = false;
    redWallState.active = false;
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
  triggerOrbDisturbance();
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
  triggerAnimationPause(1.45);
}

function triggerAnimationPause(duration = 1.4) {
  if (!Number.isFinite(duration) || duration <= 0) return;
  if (!orbRealmState.animationPauseActive) {
    orbRealmState.animationPausePrevPaused = Boolean(State.paused);
  }
  orbRealmState.animationPauseTimer = Math.max(
    orbRealmState.animationPauseTimer ?? 0,
    duration
  );
  orbRealmState.animationPauseActive = true;
  State.paused = true;
  State.animationPauseActive = true;
}

function updateAnimationPause(dt) {
  if (!orbRealmState.animationPauseActive) return;
  orbRealmState.animationPauseTimer = Math.max(
    0,
    (orbRealmState.animationPauseTimer ?? 0) - dt
  );
  if (orbRealmState.animationPauseTimer <= 0) {
    orbRealmState.animationPauseActive = false;
    State.paused = Boolean(orbRealmState.animationPausePrevPaused);
    orbRealmState.animationPauseTimer = 0;
    orbRealmState.animationPausePrevPaused = false;
    State.animationPauseActive = false;
  }
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
  const value = storm.challengeMode ? Math.max(0, storm.elapsed ?? 0) : Math.max(0, storm.timer);
  const label = storm.challengeMode ? formatChallengeTime(value) : `${Math.ceil(value)}s`;
  const x = $canvas.width / 2;
  const baseY = 28;
  const boxWidth = 280;
  const boxHeight = 90;
  const textY = baseY + 12;
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "rgba(24, 24, 24, 0.94)";
  ctx.beginPath();
  const rectX = x - boxWidth / 2;
  const rectY = baseY - 18;
  const radius = 22;
  ctx.moveTo(rectX + radius, rectY);
  ctx.lineTo(rectX + boxWidth - radius, rectY);
  ctx.quadraticCurveTo(rectX + boxWidth, rectY, rectX + boxWidth, rectY + radius);
  ctx.lineTo(rectX + boxWidth, rectY + boxHeight - radius);
  ctx.quadraticCurveTo(
    rectX + boxWidth,
    rectY + boxHeight,
    rectX + boxWidth - radius,
    rectY + boxHeight
  );
  ctx.lineTo(rectX + radius, rectY + boxHeight);
  ctx.quadraticCurveTo(rectX, rectY + boxHeight, rectX, rectY + boxHeight - radius);
  ctx.lineTo(rectX, rectY + radius);
  ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.font = "700 34px 'Inter', system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffe066";
  ctx.strokeStyle = "#201e1a";
  ctx.lineWidth = 10;
  ctx.strokeText(label, x, textY);
  ctx.fillText(label, x, textY);
  if (storm.challengeMode) {
    ctx.font = "500 16px 'Inter', system-ui";
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
  }
  ctx.restore();
}

function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function checkOrbRealmReturn(player) {
  if (!orbRealmState.active || !player) return;
  if (!isSpecialBossReturnAllowed()) return;
  const dist = Math.hypot(player.x - ORB_REALM_CENTER.x, player.y - ORB_REALM_CENTER.y);
  if (dist <= ORB_REALM_RETURN_RADIUS) {
    exitOrbRealm();
  }
}

function getKaelQuestPromptPosition() {
  if (!$orbPrompt || !$canvas) {
    return { x: window.innerWidth / 2, y: window.innerHeight / 3 };
  }
  const player = State.player;
  const camera = State.camera;
  const overlayRect = $orbPrompt.getBoundingClientRect();
  const canvasRect = $canvas.getBoundingClientRect();
  if (!player || !camera || !overlayRect.width || !overlayRect.height || !canvasRect.width || !canvasRect.height) {
    return {
      x: (overlayRect.width || window.innerWidth) / 2,
      y: (overlayRect.height || window.innerHeight) * 0.35,
    };
  }
  const scaleX = canvasRect.width / Math.max(1, camera.w);
  const scaleY = canvasRect.height / Math.max(1, camera.h);
  const rawX = (player.x - camera.x) * scaleX + (canvasRect.left - overlayRect.left);
  const rawY = (player.y - camera.y) * scaleY + (canvasRect.top - overlayRect.top);
  const paddingX = Math.min(overlayRect.width * 0.1, 32);
  const paddingY = 60;
  const clampedX = Math.min(overlayRect.width - paddingX, Math.max(paddingX, rawX));
  const clampedY = Math.min(overlayRect.height - paddingY, Math.max(paddingY * 0.6, rawY));
  return { x: clampedX, y: clampedY };
}

function showKaelQuestPrompt() {
  if (!$orbPrompt) return;
  hideOrbPrompt();
  State.orbPromptOpen = true;
  State.questPromptCooldown = 0.8;
  orbPromptState.previousPaused = State.paused;
  State.paused = true;
  const title = t("kaelQuestTitle");
  const description = t("kaelQuestDescription");
  const acceptLabel = t("kaelQuestAccept");
  const declineLabel = t("kaelQuestDecline");
  $orbPrompt.innerHTML = `
      <div class="prompt-card hero-prompt-card">
        <h4>${title}</h4>
        <p>${description}</p>
        <div class="prompt-actions">
          <button data-orb-no>${declineLabel}</button>
          <button data-orb-yes class="btn-active">${acceptLabel}</button>
        </div>
      </div>`;
  $orbPrompt.style.display = "flex";
  $orbPrompt.classList.remove("hidden");
  $orbPrompt.classList.add("hero-targeted");
  requestAnimationFrame(() => {
    const overlayRect = $orbPrompt.getBoundingClientRect();
    const overlayWidth = overlayRect.width || window.innerWidth;
    const overlayHeight = overlayRect.height || window.innerHeight;
    const card = $orbPrompt.querySelector(".hero-prompt-card");
    if (!card) {
      $orbPrompt.classList.add("visible");
      return;
    }
    const cardWidth = Math.min(overlayWidth * 0.9, 320);
    const useModal = overlayHeight < 360 || overlayWidth < 360;
    $orbPrompt.classList.toggle("hero-modal", useModal);
    card.style.width = `${cardWidth}px`;
    card.style.maxWidth = `${cardWidth}px`;
    card.style.maxHeight = `${Math.max(overlayHeight - 40, 120)}px`;
    card.style.overflowY = "auto";
    if (useModal) {
      card.style.left = `${overlayWidth / 2}px`;
      card.style.top = `${overlayHeight / 2}px`;
      card.style.transform = "translate(-50%, -50%)";
    } else {
      const { x: heroX, y: heroY } = getKaelQuestPromptPosition();
      const cardHeight = card.getBoundingClientRect().height || 120;
      const aboveSpace = heroY - cardHeight - 12;
      const belowSpace = overlayHeight - heroY - 12;
      let top;
      let translateY;
      if (aboveSpace >= 0) {
        top = Math.max(16, heroY - 12);
        translateY = "-110%";
      } else if (belowSpace >= cardHeight) {
        top = Math.min(overlayHeight - cardHeight - 12, heroY + 12);
        translateY = "0%";
      } else {
        top = Math.min(Math.max(16, overlayHeight - cardHeight - 12), heroY);
        translateY = aboveSpace > belowSpace ? "-110%" : "0%";
      }
      card.style.left = `${heroX}px`;
      card.style.top = `${top}px`;
      card.style.transform = `translate(-50%, ${translateY})`;
    }
    $orbPrompt.classList.add("visible");
  });

  const yesBtn = $orbPrompt.querySelector("[data-orb-yes]");
  const noBtn = $orbPrompt.querySelector("[data-orb-no]");

  const handleYes = () => {
    hideOrbPrompt();
    acceptKaelQuest();
  };
  const handleNo = () => {
    hideOrbPrompt();
    State.questPromptCooldown = 1.2;
    State.kael.follow = false;
    const declineSpeech = t("kaelQuestDeclineSpeech");
    State.dialogue?.show?.([{ speaker: "Kael", text: declineSpeech }]);
  };
  const buttons = [yesBtn, noBtn].filter(Boolean);
  orbPromptState.buttons = buttons;
  orbPromptState.focusIndex = 0;
  updatePromptFocus();
  const handleKey = (event) => {
    if (!State.orbPromptOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      hideOrbPrompt();
    } else if (
      event.key === "e" ||
      event.key === "E" ||
      event.key === "Enter"
    ) {
      event.preventDefault();
      event.stopPropagation();
      const btn = orbPromptState.buttons[orbPromptState.focusIndex];
      btn?.click();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      rotatePromptFocus(event.key === "ArrowRight" ? 1 : -1);
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
  $orbPrompt.style.display = "none";
  State.orbPromptOpen = false;
  if (currentTarget && currentTarget.interacting) {
    currentTarget.interacting = false;
  }
  State.paused = orbPromptState.previousPaused;
  orbPromptState.previousPaused = false;
  $orbPrompt.classList.remove("hero-targeted");
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
  if (orb.id === 1) {
    resetGhostsForOrbDrop("green");
  } else if (orb.id === 2) {
    resetGhostsForOrbDrop("blue");
  } else if (orb.id === 3) {
    resetGhostsForOrbDrop("red");
  }

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

  function triggerOrbDisturbance() {
    hideOrbPrompt();
    const duration = startOrbFlash() || 1200;
    const body = document.body;
    if (!body) return duration;
    body.classList.add("orb-disturbance");
    if (orbDisturbanceTimeout) clearTimeout(orbDisturbanceTimeout);
    orbDisturbanceTimeout = setTimeout(() => {
      body.classList.remove("orb-disturbance");
      orbDisturbanceTimeout = null;
    }, duration);
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

  let goldChallengeGameOverQueued = false;

  function queueGoldChallengeGameOver() {
    if (goldChallengeGameOverQueued) return;
    goldChallengeGameOverQueued = true;
    State.flags = State.flags ?? {};
    State.flags.challengeGameOverPending = true;
  }

  function clearGoldChallengeGameOverQueue() {
    if (!goldChallengeGameOverQueued) return;
    goldChallengeGameOverQueued = false;
    State.flags = State.flags ?? {};
    State.flags.challengeGameOverPending = false;
  }

  function finalizeDeathPendingState() {
    State.flags = State.flags ?? {};
    State.flags.deathPending = false;
    State.deathPendingTimer = 0;
    State.flags.challengeGameOverPending = false;
  }

  function processPendingGoldChallengeGameOver() {
    if (!goldChallengeGameOverQueued) return false;
    State.paused = true;
    if (State.dialogue?.isOpen?.()) {
      return false;
    }
    clearGoldChallengeGameOverQueue();
    renderDeath();
    finalizeDeathPendingState();
    return true;
  }

function finalizeGoldChallengeRecord(storm) {
  if (!storm || !storm.challengeMode || storm.challengeRecorded) return;
  storm.challengeRecorded = true;
  const elapsed = Math.max(0, storm.elapsed ?? 0);
  const previousBest = readGoldChallengeBestTime();
  const isNewBest = previousBest == null || elapsed > previousBest;
  if (isNewBest) {
    writeGoldChallengeBestTime(elapsed);
  }
  updateGoldChallengeBestDisplay();

  // 🔁 Envoie en BDD (fire-and-forget)
  if (elapsed > 0) {
    saveGoldChallengeScoreToSupabase(elapsed);
  }

  stopOrbChallengeSound();
  const lines = [
    { speaker: "Fantome", text: `Tu as tenu ${formatChallengeTime(elapsed)}.` },
  ];
  if (isNewBest) {
    lines.push({ speaker: "Fantome", text: t("goldRecordNew") });
  }
  State.flags = State.flags ?? {};
  State.flags.goldChallengeDefeatDialogActive = true;
  State.flags.goldChallengeDefeatPendingOverlay = true;
  pauseForDialogue(lines, () => {
    State.flags.goldChallengeDefeatDialogActive = false;
    State.paused = true;
    renderDeath();
  });
  orbRealmState.activeStorm = null;
}

async function saveGoldChallengeScoreToSupabase(seconds) {
  if (!supabase) {
    console.warn("[SUPABASE] Pas de client, score non envoyé.");
    return;
  }
  try {
    const { error } = await supabase
      .from("gold_challenge_scores")
      .insert({ score_seconds: seconds });

    if (error) {
      console.error("[SUPABASE] Erreur insert score:", error);
    } else {
      console.log("[SUPABASE] Score défi doré enregistré:", seconds);
    }
  } catch (err) {
    console.error("[SUPABASE] Exception insert score:", err);
  }
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
          pushStatus("Parle à Aelya pour déclencher la phase deux.");
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
{ speaker: "Moi", text: "Tu es vivant… Cesse cette folie et rends ce pouvoir !" },

{ speaker: "Kael", text: "Ce Cœur est bien trop important. JE dois le garder !" },
{ speaker: "Kael", text: "Comprends-moi… et rejoins-moi. Nous avons toujours été ensemble !" },
{ speaker: "Moi", text: "Tu as frappé Aelya. Cet artefact maudit t’a fait perdre la raison. Arrête, avant qu’il ne soit trop tard !" },
{ speaker: "Kael", text: "..." },
{ speaker: "Kael", text: "Je ne le rendrai pas. Ce pouvoir m’appartient… prends garde !" },

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
    State.flags.princessBossActive = false;
    State.flags.princessBossDefeated = false;
    State.princessMechanics = null;
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
    State.flags.kaelCorpseVisible = false;
    State.flags.endingPending = false;
    State.flags.kaelPhaseTwoStarted = true;
    State.flags.kaelPhaseTwoDefeated = false;
    State.flags.kaelPhaseThreeStarted = false;
    State.flags.kaelPhaseThreeDefeated = false;
    State.flags.endingPending = false;
    State.flags.princessEscapeOffered = false;
    State.flags.princessBossActive = false;
    State.flags.princessBossDefeated = false;
    State.bossMusicPending = false;
    restoreBossMusicVolume();
    startKaelEpicTheme();
    restoreKaelEpicVolume();
    State.princessMechanics = null;
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
     { speaker: "Chuchotement", text: "Vous entendez un rire s’élever depuis les profondeurs du labyrinthe." },
{ speaker: "???", text: "Lioran… Lioran… Lioran… LIORAN !!!" },
{ speaker: "Kael", text: "Tu n’imagines pas tout ce que ce Cœur permet de faire !" },
{ speaker: "Kael", text: "Alors laisse-moi t’en faire une DÉMONSTRATION !" },
{ speaker: "Moi", text: "Tu étais mon ami… Comment, en si peu de temps, as-tu pu changer à ce point…" },
{ speaker: "Moi", text: "Je dois en finir." },

      ],
      () => {
        if (typeof onComplete === "function") onComplete();
      }
    );
  }

  function startPhaseThreeAwakening() {
    pauseForDialogue(
      [
   { speaker: "Princesse", text: "Lioran… Tu as fait ta part. Quittons cet endroit." },
{ speaker: "Princesse", text: "Attends… Cette vibration… C’est le Cœur ! Kael est toujours en vie !" },

      ],
      () => {
        playLabyrinthLaugh(() => {
          flashScreen(1200);
          startScreenShake(1200);
          pauseForDialogue(
            [{ speaker: "Kael", text: "TU NE ME LAISSE PAS LE CHOIX LORIAN ! LE COEUR M'A RENDU PLUS FORT QUE JAMAIS !!!" }],
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
    State.flags.princessBossActive = false;
    State.flags.princessBossDefeated = false;
    State.bossMusicPending = false;
    restoreBossMusicVolume();
    startKaelEpicTheme();
    restoreKaelEpicVolume();
    State.princessMechanics = null;
  }

  function offerFinalEscapeAfterDragon() {
      // ✅ Stoppe les musiques de combat dès la mort de Kael (phase 3)
  stopKaelEpicTheme();
  stopKaelEpicTheme();
if (State?.sounds?.kaelEpic) {
  State.sounds.kaelEpic.pause();
  State.sounds.kaelEpic.currentTime = 0;
}
    const hasHeart = State.inventory?.has?.(DRAGON_HEART_ITEM_ID) ?? false;
    if (!hasHeart) {
      State.pushStatus?.("Retourne chercher le Cœur avant de parler à Aelya.");
      return;
    }
    State.flags.princessEscapeOffered = true;
    State.flags.princessBossActive = false;
    State.flags.princessBossDefeated = false;
    pauseForDialogue(
      [
 {
  speaker: "Princesse",
  text: "Le souffle de Kael s’est éteint.",
},
{
  speaker: "Princesse",
  text: "Puisse-tu reposer en paix… Kael. Mage déchu, ayant sombré sous les voix de ce lieu maudit.",
},
{
  speaker: "Princesse",
  text: "As-tu ramassé le Cœur sur le corps de Kael ?",
},
{
  speaker: "Princesse",
  text: "Peux-tu me le rendre, s’il te plaît ? Son pouvoir est trop grand… Il te consumerait si tu le gardais.",
},

      ],
      () => {
        showFinalEscapeChoice();
      }
    );
  }

function showFinalEscapeChoice() {
  if (State.flags?.finalEscapeChoiceOpen) return;
  State.flags = State.flags || {};
  State.flags.finalEscapeChoiceOpen = true;
  State.paused = true;
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.6)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "9999";
  overlay.style.padding = "24px";
  const card = document.createElement("div");
  card.style.background = "#101020";
  card.style.border = "2px solid #fbd38d";
  card.style.borderRadius = "16px";
  card.style.padding = "24px";
  card.style.maxWidth = "420px";
  card.style.textAlign = "center";
  card.style.boxShadow = "0 8px 30px rgba(0,0,0,0.4)";
  const title = document.createElement("h3");
  title.textContent = t("finalChoiceTitle");
  title.style.marginBottom = "12px";
  const message = document.createElement("p");
  message.textContent = t("finalChoiceMessage");
  message.style.marginBottom = "18px";
  const buttons = document.createElement("div");
  buttons.style.display = "flex";
  buttons.style.justifyContent = "space-between";
  buttons.style.gap = "12px";
  const createButton = (text, choice) => {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.flex = "1";
    btn.style.padding = "10px 0";
    btn.style.border = "none";
    btn.style.borderRadius = "10px";
    btn.style.cursor = "pointer";
    btn.style.fontWeight = "600";
    btn.style.fontSize = "14px";
    btn.style.background = choice === "agree" ? "#38bdf8" : "#f87171";
    btn.style.color = "#fff";
    btn.addEventListener(
      "click",
      () => {
        cleanup(choice);
      },
      { once: true }
    );
    return btn;
  };
  buttons.append(createButton(t("finalChoiceAgree"), "agree"));
  buttons.append(createButton(t("finalChoiceDecline"), "refuse"));
  card.append(title, message, buttons);
  overlay.append(card);
  document.body.appendChild(overlay);

  const cleanup = (choice) => {
    overlay.remove();
    State.flags.finalEscapeChoiceOpen = false;
    State.flags.finalEscapeChoice = choice;
    State.paused = false;
    if (choice === "agree") {
      stopAelyaFightMusic(true);
      launchFinalEscape();
    } else {
      startAelyaFightMusic();
      State.pushStatus?.("Aelya refuse de te rendre le Cœur.");
      promptAelyaBossIntro();
    }
  };
}

  function launchFinalEscape() {
    const resolvedChoice = State.flags.finalEscapeChoice ?? "refuse";
    const continueToEpilogue = () =>
      void renderEpilogue("release", { choice: resolvedChoice });
    if (resolvedChoice === "agree") {
      playEscapeVideo(continueToEpilogue);
    } else {
      continueToEpilogue();
    }
  }

function promptAelyaBossIntro() {
    pauseForDialogue(
      [
    {
  speaker: "Aelya",
  text: "Tu ne peux pas le garder pour toi… Sa puissance est trop grande. Et qu’en ferais-tu ?",
},
{
  speaker: "Moi",
  text: "Il est à moi désormais… Le pouvoir du Cœur d’Éphéria, tout entier, dans la paume de ma main !",
},
{
  speaker: "Aelya",
  text: "Non.. Je t’en supplie… rends-le-moi. Sinon, je serai forcée de t’arrêter.",
},
{
  speaker: "Moi",
  text: "Je ne souhaite pas ta mort Aelya, n'insiste pas.",
},{
  speaker: "",
  text: "Aelya sanglote.",
},
{
  speaker: "Aelya",
  text: "Tu ne me laisses pas le choix… Pardonne-moi. Mais je dois le reprendre, quitte à te blesser !",
},

      ],
      () => {
        startAelyaBossBattle();
      }
    );
  }

  function startAelyaBossBattle() {
    if (!State.princess || State.flags.princessBossActive) return;
    const player = State.player;
    if (!player) return;
    const boss = State.princess;
    State.flags.princessBossActive = true;
    if (State.flags.finalEscapeChoice === "refuse") {
      startAelyaFightMusic();
    }
    State.flags.princessBossDefeated = false;
    State.flags.princessBossDeathPending = false;
    State.princessBossRetryShown = false;
    State.princessMechanics = {
      pulses: [],
      orbs: [],
      beams: [],
      telegraphs: [],
      explosions: [],
      zones: [],
      streaks: [],
      shockwaves: [],
      pillars: [],
      spiralOrbs: [],
      currentAction: null,
      cooldown: 0,
      lastAction: null,
      elapsed: 0,
      enrage: 0,
      glowTimer: 0,
      drift: { active: false, timer: 0, angle: 0, radius: 0, direction: 1 },
    };
const baseHp = boss.maxHp ?? 200;
const targetHp = Math.max(900, baseHp * 3);
// Boss final = grosse barre de vie (doublee)
boss.hp = boss.maxHp = Math.round(targetHp);

boss.attackDamage = 34;        // punition
boss.attackCooldown = 0.85;    // elle tape plus souvent
boss.speed = 175;
boss.keepDistance = 220;       // elle “kite” et cast

// la rendre moins “papier”
boss.damageTakenMultiplier = 0.85; // si ton dealDamageToTarget le respecte pour elle

    boss.follow = true;
    boss.hitRadius = Math.max(PLAYER_RADIUS, boss.hitRadius ?? PLAYER_RADIUS);
    boss.realmLabel = "Aelya";
    boss.realmColor = "rgba(255, 190, 190, 0.95)";
    const offset = player.facing === "left" ? -80 : 80;
    boss.x = player.x + offset;
    boss.y = player.y;
    State.flags.endingPending = false;
    pushStatus?.("Aelya te défie. Prépare-toi !");
    startBossMusic();
  }

  function spawnRadiantPulse(boss, mechanics) {
    if (!boss) return null;
    const enrageBonus = (mechanics?.enrage ?? 0) * 3;
    return {
      x: boss.x,
      y: boss.y,
      radius: 0,
      maxRadius: 210,
      thickness: 16,
      speed: 240,
      damage: 28 + enrageBonus,
      hit: false,
    };
  }

  function spawnLuminousOrbs(boss, mechanics) {
    if (!boss) return [];
    const count = 4;
    const speed = 150;
    const orbs = [];
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      orbs.push({
        x: boss.x,
        y: boss.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifetime: 1.8,
        radius: 10,
        damage: 18 + (mechanics?.enrage ?? 0) * 4,
        hit: false,
      });
    }
    return orbs;
  }

  function spawnCelestialBeam(boss, player, mechanics) {
    if (!boss || !player) return null;
    const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
    return {
      x: boss.x,
      y: boss.y,
      angle,
      dirX: Math.cos(angle),
      dirY: Math.sin(angle),
      length: 360,
      width: 18,
      timer: 0.85,
      damage: 34 + (mechanics?.enrage ?? 0) * 3,
      hitCooldown: 0,
    };
  }
function spawnAelyaExplosion(x, y, radius, damage) {
  return {
    x, y,
    radius,
    damage,
    timer: 0.35,   // petit délai après la télégraph pour le “BOOM”
    hit: false,
  };
}

function spawnAelyaZone(x, y, radius, duration, dps) {
  return {
    x, y,
    radius,
    duration,
    tick: 0,
    cooldown: 0.22,
    dps,
  };
}

function spawnAelyaPillars(mechanics, player) {
  if (!mechanics || !player) return;
  const offsets = [-140, -60, 60, 140];
  mechanics.pillars = mechanics.pillars ?? [];
  offsets.forEach((offset) => {
    mechanics.pillars.push({
      x: player.x + offset,
      y: player.y,
      timer: 0,
      duration: 1.5,
      radius: 58,
      damage: 32 + (mechanics?.enrage ?? 0) * 4,
      hit: false,
    });
  });
}

function spawnAelyaSpiral(mechanics, boss) {
  if (!mechanics || !boss) return;
  const count = 6;
  mechanics.spiralOrbs = mechanics.spiralOrbs ?? [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    mechanics.spiralOrbs.push({
      angle,
      speed: Math.PI * 0.7,
      timer: 0,
      release: 1.5,
      arcOffset: Math.random() * 0.4,
      baseRadius: 70,
      damage: 30 + (mechanics?.enrage ?? 0) * 3,
      hit: false,
      id: `${Date.now()}_${Math.random()}`,
    });
  }
}

function spawnAelyaShockwave(mechanics, options = {}) {
  if (!mechanics) return;
  const { radius = 200, duration = 1.2, color = "255, 200, 255" } = options;
  mechanics.shockwaves = mechanics.shockwaves ?? [];
  mechanics.shockwaves.push({
    radius,
    duration,
    timer: 0,
    color,
  });
}

function spawnAelyaStreaks(mechanics, boss, player, options = {}) {
  if (!mechanics || !boss) return;
  const { count = 10, length = 180 } = options;
  const palette = ["255, 210, 255", "255, 160, 220", "255, 140, 120"];
  mechanics.streaks = mechanics.streaks ?? [];
  for (let i = 0; i < count; i += 1) {
    mechanics.streaks.push({
      angle: Math.random() * Math.PI * 2,
      length: length * (0.75 + Math.random() * 0.5),
      speed: 1 + Math.random() * 1.3,
      progress: 0,
      thickness: 2 + Math.random() * 5,
      color: palette[Math.floor(Math.random() * palette.length)],
      offset: Math.random() * Math.PI * 2,
    });
  }
}

  function triggerAelyaActionVFX(mechanics, name, boss, player) {
    if (!mechanics || !boss) return;
    let baseColor = "255, 205, 235";
    if (name === "meteor") {
      baseColor = "255, 120, 140";
    } else if (name === "beam") {
      baseColor = "200, 230, 255";
    } else if (name === "pillar") {
      baseColor = "255, 130, 220";
    } else if (name === "spiral") {
      baseColor = "255, 210, 255";
    }
    spawnAelyaShockwave(mechanics, {
      radius: 190 + Math.random() * 40,
      duration: 1.1 + Math.random() * 0.4,
      color: baseColor,
    });
    spawnAelyaStreaks(mechanics, boss, player, {
      count: 6 + Math.floor(Math.random() * 6),
      length: 160 + (name === "meteor" ? 40 : name === "pillar" ? 20 : 0),
    });
    if (name === "meteor" || name === "pillar") {
      spawnAelyaShockwave(mechanics, {
        radius: 240,
        duration: 1.2,
        color: name === "pillar" ? "255, 150, 255" : "255, 190, 80",
      });
    }
  }

  function startAelyaDrift(boss, player, mechanics) {
    if (!boss || !player || !mechanics) return;
    const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
    mechanics.drift = {
      active: true,
      timer: AELYA_ACTIONS.drift.duration,
      angle,
      radius: 120 + Math.random() * 60,
      direction: Math.random() < 0.5 ? -1 : 1,
    };
  }

  function beginAelyaAction(mechanics, name, boss, player) {
    const config = AELYA_ACTIONS[name];
    if (!config || !mechanics) return;
    mechanics.currentAction = {
      name,
      config,
      phase: "telegraph",
      timer: config.telegraph,
    };
    if (name === "meteor") {
  // cercle au sol sur le joueur (position lock)
  ensureAelyaTelegraph(mechanics, name, config.telegraph, {
    x: player.x,
    y: player.y,
    radius: 95,
    id: `${Date.now()}_${Math.random()}`,
  });
} else if (name === "beam") {
  const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
  ensureAelyaTelegraph(mechanics, name, config.telegraph, { angle, length: 340 });
} else if (name === "pillar") {
  const offsets = [-140, -60, 60, 140];
  ensureAelyaTelegraph(mechanics, name, config.telegraph, {
    positions: offsets.map((offset) => ({
      x: player.x + offset,
      y: player.y,
      radius: 70,
    })),
    id: `${Date.now()}_pillar`,
  });
} else if (name === "spiral") {
  ensureAelyaTelegraph(mechanics, name, config.telegraph, {
    radius: 210,
    arc: 1.2,
    id: `${Date.now()}_spiral`,
  });
} else {
  ensureAelyaTelegraph(mechanics, name, config.telegraph);
}
    triggerAelyaActionVFX(mechanics, name, boss, player);

  }

  function finishAelyaAction(mechanics) {
    if (!mechanics?.currentAction) return;
    const { name, config } = mechanics.currentAction;
    mechanics.lastAction = name;
    const cooldownBase = Math.max(0.4, (config?.cooldown ?? 1.2) - (mechanics.enrage ?? 0) * 0.08);
    mechanics.cooldown = cooldownBase + Math.random() * 0.35;
    mechanics.currentAction = null;
    if (mechanics.drift) {
      mechanics.drift.active = false;
    }
  }

  function computeAelyaActionScore(name, dist, mechanics) {
    let score = 1 + (mechanics.enrage ?? 0) * 0.12;
    const close = dist <= 160;
    const mid = dist > 160 && dist < 240;
    const far = dist >= 240;
    switch (name) {
      case "pulse":
        score += close ? 1.6 : far ? 0.6 : 1.0;
        break;
      case "orb":
        score += far ? 1.3 : close ? 0.9 : 1.1;
        break;
      case "beam":
        score += far ? 1.8 : 0.5;
        break;
      case "drift":
        score += close ? 1.2 : 0.6;
        break;
      case "meteor":
        score += close ? 1.4 : 0.9;
        break;
      case "pillar":
        score += close ? 2.2 : 0.8;
        break;
      case "spiral":
        score += mid ? 2.0 : 1.1;
        break;
      default:
        score += 1;
    }
    if (mechanics.lastAction === name) {
      score *= 0.35;
    }
    return Math.max(0.2, score);
  }

  function tryQueueAelyaAction(mechanics, boss, player) {
    if (!mechanics || mechanics.currentAction) return;
    const dist = Math.hypot(player.x - boss.x, player.y - boss.y) || 1;
    const choices = Object.keys(AELYA_ACTIONS).map((name) => ({
      name,
      weight: computeAelyaActionScore(name, dist, mechanics),
    }));
    const totalWeight = choices.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) return;
    let roll = Math.random() * totalWeight;
    const pick = choices.find((entry) => {
      roll -= entry.weight;
      return roll <= 0;
    });
    const nextAction = pick?.name ?? choices[0].name;
    beginAelyaAction(mechanics, nextAction, boss, player);
  }

  function aelyaDealDamage(player, amount) {
    if (!player || amount <= 0) return;
    const dealt = dealDamageToTarget(player, amount);
    if (dealt > 0) {
      spawnFloatingText(Math.round(dealt), player.x, player.y - 20, {
        color: "rgba(255,220,220,0.95)",
        stroke: "rgba(0,0,0,0.6)",
      });
    }
  }

  function projectOnLine(px, py, lx, ly, dx, dy) {
    const vx = px - lx;
    const vy = py - ly;
    return vx * dx + vy * dy;
  }

  function distanceToLine(px, py, lx, ly, dx, dy) {
    const vx = px - lx;
    const vy = py - ly;
    return vx * -dy + vy * dx;
  }

  function updateAelyaMechanics(dt, player, boss) {
    const mechanics = State.princessMechanics;
    if (!mechanics || !player || !boss) return;
    mechanics.elapsed = (mechanics.elapsed ?? 0) + dt;
    mechanics.enrage = Math.min(3, Math.floor(mechanics.elapsed / 18));
// toutes les 18s -> +1 niveau (jusqu'à 3)
    mechanics.cooldown = Math.max(0, mechanics.cooldown - dt);
    const active = mechanics.currentAction;
    if (active) {
      active.timer -= dt;
      if (active.phase === "telegraph") {
        if (active.timer <= 0) {
          active.phase = "active";
          active.timer = active.config.duration;
          mechanics.telegraphs = (mechanics.telegraphs ?? []).filter(
            (tele) => tele.type !== active.name
          );
          active.config.effect?.(boss, player, mechanics);
        }
      } else if (active.phase === "active") {
        if (active.timer <= 0) {
          finishAelyaAction(mechanics);
        }
      }
    } else if (mechanics.cooldown <= 0) {
      tryQueueAelyaAction(mechanics, boss, player);
    }

    if (mechanics.drift?.active) {
      mechanics.drift.timer = Math.max(0, mechanics.drift.timer - dt);
      if (mechanics.drift.timer <= 0) {
        mechanics.drift.active = false;
      }
    }

    mechanics.pulses = mechanics.pulses
      .map((pulse) => {
        pulse.radius += pulse.speed * dt;
        const dist = Math.hypot(player.x - pulse.x, player.y - pulse.y);
        if (!pulse.hit && Math.abs(dist - pulse.radius) <= pulse.thickness) {
          aelyaDealDamage(player, pulse.damage);
          pulse.hit = true;
        }
        if (pulse.radius >= pulse.maxRadius + pulse.thickness) {
          return null;
        }
        return pulse;
      })
      .filter(Boolean);

    const playerReach = player.r ?? 10;
    mechanics.orbs = mechanics.orbs
      .map((orb) => {
        orb.x += orb.vx * dt;
        orb.y += orb.vy * dt;
        orb.lifetime -= dt;
        const dist = Math.hypot(player.x - orb.x, player.y - orb.y);
        if (!orb.hit && dist <= orb.radius + playerReach) {
          aelyaDealDamage(player, orb.damage);
          orb.hit = true;
        }
        if (orb.lifetime <= 0 || orb.hit) {
          return null;
        }
        return orb;
      })
      .filter(Boolean);

    mechanics.beams = mechanics.beams
      .map((beam) => {
        beam.timer -= dt;
        beam.hitCooldown = Math.max(0, beam.hitCooldown - dt);
        const dirX = Math.cos(beam.angle);
        const dirY = Math.sin(beam.angle);
        const relX = player.x - beam.x;
        const relY = player.y - beam.y;
        const proj = relX * dirX + relY * dirY;
        if (proj > 0 && proj < beam.length) {
          const perp = Math.abs(relX * -dirY + relY * dirX);
          if (Math.abs(perp) <= beam.width) {
            if (beam.hitCooldown <= 0) {
              aelyaDealDamage(player, beam.damage * dt);
              beam.hitCooldown = 0.18;
            }
          }
        }
        if (beam.timer <= 0) return null;
        return beam;
      })
      .filter(Boolean);
    mechanics.telegraphs = (mechanics.telegraphs ?? [])
      .map((tele) => {
        tele.remaining = Math.max(0, tele.remaining - dt);
        return tele.remaining > 0 ? tele : null;
      })
      .filter(Boolean);

    mechanics.pillars = (mechanics.pillars ?? [])
      .map((pillar) => {
        pillar.timer += dt;
        if (pillar.timer >= 0.7 && !pillar.hit) {
          const dist = Math.hypot(player.x - pillar.x, player.y - pillar.y);
          if (dist <= pillar.radius + (player.r ?? 10)) {
            aelyaDealDamage(player, pillar.damage);
            pillar.hit = true;
          }
        }
        return pillar.timer >= pillar.duration ? null : pillar;
      })
      .filter(Boolean);

    mechanics.spiralOrbs = (mechanics.spiralOrbs ?? [])
      .map((orb) => {
        orb.timer += dt;
        orb.angle += orb.speed * dt;
        const radius = orb.baseRadius + orb.timer * 45;
        const angle = orb.angle + orb.arcOffset;
        orb.x = boss.x + Math.cos(angle) * radius;
        orb.y = boss.y + Math.sin(angle) * radius;
        if (orb.timer >= orb.release && !orb.hit) {
          const dist = Math.hypot(player.x - orb.x, player.y - orb.y);
          if (dist <= 70 + (player.r ?? 10)) {
            aelyaDealDamage(player, orb.damage);
          }
          spawnAelyaShockwave(mechanics, {
            radius: radius * 0.8,
            duration: 1.4,
            color: "255, 230, 255",
          });
          orb.hit = true;
          return null;
        }
        return orb;
      })
      .filter(Boolean);

    mechanics.explosions = (mechanics.explosions ?? [])
      .map((e) => {
        e.timer -= dt;
        if (e.timer <= 0 && !e.hit) {
          const dist = Math.hypot(player.x - e.x, player.y - e.y);
          if (dist <= e.radius + (player.r ?? 10)) {
            aelyaDealDamage(player, e.damage);
          }
          e.hit = true;
          return null;
        }
        return e;
      })
      .filter(Boolean);

    mechanics.zones = (mechanics.zones ?? [])
      .map((z) => {
        z.duration -= dt;
        z.tick += dt;
        if (z.tick >= z.cooldown) {
          z.tick = 0;
          const dist = Math.hypot(player.x - z.x, player.y - z.y);
          if (dist <= z.radius + (player.r ?? 10)) {
            aelyaDealDamage(player, z.dps * z.cooldown);
          }
        }
        return z.duration > 0 ? z : null;
      })
      .filter(Boolean);

    mechanics.shockwaves = (mechanics.shockwaves ?? [])
      .map((wave) => {
        wave.timer += dt;
        return wave.timer >= wave.duration ? null : wave;
      })
      .filter(Boolean);

    mechanics.streaks = (mechanics.streaks ?? [])
      .map((streak) => {
        streak.progress += dt * streak.speed;
        return streak.progress >= 1 ? null : streak;
      })
      .filter(Boolean);

    mechanics.glowTimer = (mechanics.glowTimer ?? 0) + dt;
  }

  function drawAelyaMechanics(ctx) {
    if (!ctx || !State.princessMechanics) return;
    const mechanics = State.princessMechanics;
    const boss = State.princess;
    const player = State.player;
    if (!boss || !player) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    mechanics.pulses.forEach((pulse) => {
      const grad = ctx.createRadialGradient(
        pulse.x,
        pulse.y,
        Math.max(2, pulse.radius * 0.3),
        pulse.x,
        pulse.y,
        pulse.radius + 12
      );
      grad.addColorStop(0, "rgba(255,255,255,0.2)");
      grad.addColorStop(0.5, "rgba(255,210,180,0.4)");
      grad.addColorStop(1, "rgba(255,120,120,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
      ctx.stroke();
    });
    mechanics.orbs.forEach((orb) => {
      ctx.save();
      ctx.shadowColor = "rgba(255,210,170,0.9)";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "rgba(255,255,220,0.95)";
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.stroke();
      ctx.restore();
    });
    mechanics.beams.forEach((beam) => {
      ctx.save();
      ctx.translate(beam.x, beam.y);
      const angle = Math.atan2(beam.dirY, beam.dirX);
      ctx.rotate(angle);
      const gradient = ctx.createLinearGradient(0, -beam.width * 0.6, beam.length, beam.width * 0.6);
      gradient.addColorStop(0, "rgba(255,255,255,0.7)");
      gradient.addColorStop(0.3, "rgba(255,190,220,0.45)");
      gradient.addColorStop(1, "rgba(255,120,170,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, -beam.width, beam.length, beam.width * 2);
      ctx.restore();
    });
    ctx.restore();
    mechanics.telegraphs?.forEach((tele) => {
      const progress = tele.remaining / Math.max(0.0001, tele.duration);
      ctx.save();
      const alpha = 0.65 * progress;
      if (tele.type === "pulse") {
        ctx.strokeStyle = `rgba(255, 220, 200, ${alpha})`;
        ctx.lineWidth = 6 + (1 - progress) * 6;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, 200, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tele.type === "meteor") {
  // cercle qui se resserre + halo
  const p = 1 - progress; // 0 -> 1
  const r = (tele.radius ?? 90) * (0.6 + progress * 0.4);

  ctx.strokeStyle = `rgba(255, 120, 120, ${alpha})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(tele.x, tele.y, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 240, 240, ${alpha * 0.55})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(tele.x, tele.y, r * 0.55, 0, Math.PI * 2);
  ctx.stroke();}
      else if (tele.type === "orb") {
        ctx.strokeStyle = `rgba(255, 200, 255, ${alpha * 0.9})`;
        ctx.lineWidth = 3;
        const dotCount = 6;
        const radius = 180;
        for (let i = 0; i < dotCount; i += 1) {
          const angle = (i / dotCount) * Math.PI * 2 + tele.remaining * 2;
          ctx.beginPath();
          ctx.arc(
            boss.x + Math.cos(angle) * radius,
            boss.y + Math.sin(angle) * radius,
            4 + progress * 3,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        }
      } else if (tele.type === "beam" && player) {
        const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
        ctx.translate(boss.x, boss.y);
        ctx.rotate(angle);
        ctx.strokeStyle = `rgba(255, 240, 180, ${alpha * 0.6})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(280, -20);
        ctx.moveTo(0, 20);
        ctx.lineTo(280, 20);
        ctx.stroke();
      } else if (tele.type === "pillar" && Array.isArray(tele.positions)) {
        ctx.strokeStyle = `rgba(255, 140, 220, ${alpha})`;
        ctx.lineWidth = 10;
        tele.positions.forEach((pos) => {
          ctx.beginPath();
          ctx.moveTo(pos.x, boss.y - 220);
          ctx.lineTo(pos.x, boss.y + 220);
          ctx.stroke();
        });
      } else if (tele.type === "spiral") {
        const swirl = tele.radius ?? 210;
        const steps = 5;
        for (let i = 0; i < steps; i += 1) {
          const inner = swirl * (0.6 + (i / steps) * 0.4);
          ctx.strokeStyle = `rgba(255, 220, 255, ${alpha * 0.25 * (1 - i / steps)})`;
          ctx.lineWidth = 4 - (i * 0.5);
          ctx.beginPath();
          ctx.arc(boss.x, boss.y, inner, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      
      ctx.restore();
    });

    (mechanics.pillars ?? []).forEach((pillar) => {
      const pulse = Math.min(1, pillar.timer / pillar.duration);
      const glow = 0.6 + Math.sin(pulse * Math.PI) * 0.3;
      const height = 260;
      ctx.save();
      ctx.globalAlpha = 0.35 + glow * 0.25;
      const grad = ctx.createLinearGradient(pillar.x - 6, boss.y - height, pillar.x + 6, boss.y + height);
      grad.addColorStop(0, "rgba(255, 160, 255, 0)");
      grad.addColorStop(0.3, "rgba(255, 120, 220, 0.8)");
      grad.addColorStop(0.7, "rgba(255, 80, 200, 0.95)");
      grad.addColorStop(1, "rgba(255, 30, 140, 0.1)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(pillar.x, boss.y - height * (0.6 + pulse * 0.4));
      ctx.lineTo(pillar.x, boss.y + height * (0.6 + pulse * 0.4));
      ctx.stroke();
      ctx.restore();
    });

    (mechanics.spiralOrbs ?? []).forEach((orb) => {
      const glow = 0.55 + Math.sin(orb.timer * Math.PI * 4) * 0.25;
      const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, 18);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${glow})`);
      gradient.addColorStop(0.6, `rgba(255, 200, 255, ${glow * 0.8})`);
      gradient.addColorStop(1, "rgba(255, 120, 200, 0)");
      ctx.save();
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    const auraCycle = ((mechanics.glowTimer ?? 0) % 3) / 3;
    const auraRadius = 210 + Math.sin(auraCycle * Math.PI * 2) * 30;
    const auraGradient = ctx.createRadialGradient(
      boss.x,
      boss.y,
      auraRadius * 0.3,
      boss.x,
      boss.y,
      auraRadius
    );
    auraGradient.addColorStop(0, `rgba(255, 255, 255, ${0.45 - auraCycle * 0.1})`);
    auraGradient.addColorStop(1, "rgba(255, 180, 220, 0)");
    ctx.save();
    ctx.lineWidth = 8;
    ctx.strokeStyle = auraGradient;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, auraRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    (mechanics.shockwaves ?? []).forEach((wave) => {
      const ratio = wave.timer / Math.max(0.0001, wave.duration);
      ctx.save();
      ctx.lineWidth = 6 + (1 - ratio) * 14;
      ctx.strokeStyle = `rgba(${wave.color}, ${0.85 * (1 - ratio)})`;
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, wave.radius + ratio * 90, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    (mechanics.streaks ?? []).forEach((streak) => {
      const progress = Math.min(1, streak.progress);
      const head = streak.length * progress;
      const tail = Math.max(0, head - streak.length * 0.3);
      const startX = boss.x + Math.cos(streak.angle) * tail;
      const startY = boss.y + Math.sin(streak.angle) * tail;
      const endX = boss.x + Math.cos(streak.angle) * head;
      const endY = boss.y + Math.sin(streak.angle) * head;
      const grad = ctx.createLinearGradient(startX, startY, endX, endY);
      grad.addColorStop(0, `rgba(${streak.color}, 0)`);
      grad.addColorStop(0.4, `rgba(${streak.color}, 0.85)`);
      grad.addColorStop(1, `rgba(${streak.color}, 0)`);
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineWidth = streak.thickness;
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();
    });

    (mechanics.explosions ?? []).forEach((exp) => {
      const lifespan = 0.35;
      const progress = Math.min(1, (lifespan - exp.timer) / lifespan);
      const outer = exp.radius * (0.6 + progress * 1.2);
      const inner = outer * 0.45;
      const grad = ctx.createRadialGradient(exp.x, exp.y, inner, exp.x, exp.y, outer);
      grad.addColorStop(0, `rgba(255, 245, 220, ${0.8 * (1 - progress)})`);
      grad.addColorStop(0.4, `rgba(255, 170, 120, ${0.65 * (1 - progress)})`);
      grad.addColorStop(1, "rgba(255, 90, 90, 0)");
      ctx.save();
      ctx.globalAlpha = 0.9 * (1 - progress);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, outer, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    (mechanics.zones ?? []).forEach((z) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const zoneAlpha = 0.32 + Math.sin((mechanics.glowTimer ?? 0) * 3 + z.tick * 4) * 0.12;
      const grad = ctx.createRadialGradient(
        z.x,
        z.y,
        Math.max(4, z.radius * 0.2),
        z.x,
        z.y,
        z.radius
      );
      grad.addColorStop(0, `rgba(255, 180, 150, ${0.8 * zoneAlpha})`);
      grad.addColorStop(1, `rgba(255, 70, 70, 0)`);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 160, 160, 0.6)`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    });

  }

  function updateAelyaBossFight(dt, player, map) {
    if (!State.flags.princessBossActive || State.flags.princessBossDefeated) return;
    const boss = State.princess;
    if (!boss || !player) return;
    const mechanics = State.princessMechanics;
    boss.speed = 150;
    boss.follow = false;
    boss.keepDistance = 200;
    boss.update(dt, player, map);
    updateAelyaMechanics(dt, player, boss);
    const driftActive = Boolean(mechanics?.drift?.active);
    const previewActive = (mechanics?.telegraphs?.length ?? 0) > 0;
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;
    const desiredDistance = previewActive ? 90 : 200;
    const moveSpeed = previewActive ? 180 : 50;
    if (driftActive && mechanics?.drift) {
      const drift = mechanics.drift;
      drift.angle += drift.direction * Math.PI * 1.8 * dt;
      const targetX = player.x + Math.cos(drift.angle) * drift.radius;
      const targetY = player.y + Math.sin(drift.angle) * drift.radius;
      const diffX = targetX - boss.x;
      const diffY = targetY - boss.y;
      const diffNorm = Math.max(0.0001, Math.hypot(diffX, diffY));
      boss.x += (diffX / diffNorm) * 240 * dt;
      boss.y += (diffY / diffNorm) * 240 * dt;
    } else {
      let moveX = 0;
      let moveY = 0;
      if (previewActive) {
        if (dist > 120) {
          moveX = dirX * moveSpeed * dt;
          moveY = dirY * moveSpeed * dt;
        }
      } else {
        if (dist < desiredDistance - 18) {
          moveX = -dirX * moveSpeed * dt;
          moveY = -dirY * moveSpeed * dt;
        } else if (dist > desiredDistance + 18) {
          moveX = dirX * moveSpeed * dt;
          moveY = dirY * moveSpeed * dt;
        }
      }
      if (moveX !== 0 || moveY !== 0) {
        boss.x += moveX;
        boss.y += moveY;
      }
    }
    const newDx = player.x - boss.x;
    const newDy = player.y - boss.y;
    const newDist = Math.hypot(newDx, newDy) || 1;
    const attackRange = player.attackRadius ?? 70;
    if (
      player.canDealAttackDamage?.() &&
      newDist < attackRange &&
      player.isTargetInAttackArc?.(boss.x, boss.y)
    ) {
      const dmg = player.getCurrentAttackDamage?.() ?? 15;
      const defeated = boss.applyDamage?.(dmg);
      if (typeof spawnFloatingText === "function") {
        spawnFloatingText(dmg, boss.x, boss.y - 20, {
          color: "rgba(255,180,180,1)",
          stroke: "rgba(0,0,0,0.6)",
        });
      }
      player.confirmAttackHit?.();
      if (defeated) {
        handleAelyaBossDefeat();
      }
    }
  }

  function handleAelyaBossDefeat() {
    State.flags.finalEscapeChoice = State.flags.finalEscapeChoice ?? "refuse";
    State.flags.princessBossActive = false;
    State.flags.princessBossDefeated = true;
    if (State.princess) {
      State.princess.follow = true;
    }
    State.flags.endingPending = false;
    stopBossMusic(true);
    stopAelyaFightMusic(true);
    State.princessMechanics = null;
    pauseForDialogue(
      [
    {
  speaker: "Aelya",
  text: "Tu nous as tous… condamnés.",
},
{
  speaker: "Moi",
  text: "Ce pouvoir m’appartient désormais.",
},
{
  speaker: "Moi",
  text: "Le royaume d’Éphéria tombera bientôt sous les ténèbres que le Cœur me permet de contrôler. Je vais devenir un dieu.",
},

      ],
      () => {
        launchFinalEscape();
      }
    );
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

const AELYA_TELEGRAPH_WARN = {
  pulse: 0.85,
  orb: 1.1,
  beam: 1.4,
  drift: 0.9,
  meteor: 1.25,
  pillar: 1.7,
  spiral: 1.3,
};

const AELYA_ACTIONS = {
  pulse: {
    telegraph: 0.85,
    duration: 1.4,
    cooldown: 1.8,
    effect: (boss, player, mechanics) => {
      const pulse = spawnRadiantPulse(boss, mechanics);
      if (pulse) mechanics.pulses.push(pulse);
    },
  },
  orb: {
    telegraph: 1.0,
    duration: 1.6,
    cooldown: 2.2,
    effect: (boss, player, mechanics) => {
      mechanics.orbs.push(...spawnLuminousOrbs(boss, mechanics));
    },
  },
  beam: {
    telegraph: 0.7,
    duration: 1.2,
    cooldown: 1.9,
    effect: (boss, player, mechanics) => {
      const beam = spawnCelestialBeam(boss, player, mechanics);
      if (beam) {
        mechanics.beams.push(beam);
      }
    },
  },
  drift: {
    telegraph: 0.9,
    duration: 1.5,
    cooldown: 2.6,
    effect: (boss, player, mechanics) => {
      startAelyaDrift(boss, player, mechanics);
    },
  },
  meteor: {
  telegraph: 1.25,
  duration: 0.6,
  cooldown: 3.2,
  effect: (boss, player, mechanics) => {
    // Position lock au moment du cast (très lisible, très punitif)
    const tx = player.x;
    const ty = player.y;

    // Explosion principale
    mechanics.explosions.push(spawnAelyaExplosion(tx, ty, 90, 48 + mechanics.enrage * 6));

    // Petite explosion “anti panic” (offset aléatoire léger)
    const ox = tx + (Math.random() - 0.5) * 140;
    const oy = ty + (Math.random() - 0.5) * 110;
    mechanics.explosions.push(spawnAelyaExplosion(ox, oy, 70, 36 + mechanics.enrage * 4));

    // Zone au sol après explosion (punitif si tu restes)
    mechanics.zones.push(spawnAelyaZone(tx, ty, 95, 2.2, 10 + mechanics.enrage * 2));
  },
},
  pillar: {
    telegraph: 1.4,
    duration: 1.6,
    cooldown: 3.6,
    effect: (boss, player, mechanics) => {
      spawnAelyaPillars(mechanics, player);
    },
  },
  spiral: {
    telegraph: 1.2,
    duration: 1.8,
    cooldown: 2.8,
    effect: (boss, player, mechanics) => {
      spawnAelyaSpiral(mechanics, boss);
    },
  },

};

function ensureAelyaTelegraph(mechanics, type, duration, extra = {}) {
  if (!mechanics || !type) return;
  if ((mechanics.telegraphs ?? []).some((tele) => tele.type === type && tele.id === extra.id)) return;

  mechanics.telegraphs = mechanics.telegraphs ?? [];
  mechanics.telegraphs.push({
    type,
    remaining: duration,
    duration,
    ...extra, // x, y, radius, angle, length...
  });
}


function dealDamageToTarget(target, amount) {
  if (!target || !Number.isFinite(amount) || amount <= 0) return 0;
  if (target.realmId === 0 || target.realmId === 3) return 0;
  if (target.invulnerable) return 0;
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

  // 🧮 Réduction globale du nombre de projectiles
  const effectiveCount = Math.max(1, Math.round(count * ORB_PROJECTILE_DENSITY));

  for (let i = 0; i < effectiveCount; i += 1) {
    const angle = (i / effectiveCount) * Math.PI * 2;
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
  ghost.realmLabel = getOrbRealmLabelText(config);
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
  3: updateBlueOrbBoss,
};

function updateOrbBossMechanics(ghost, dt) {
  if (!ghost || !ghost.realmBoss) return;
  if (ghost.realmId === 3) return; // blue orb only handles riddle/storm
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

    if (orbRealmState.id === 3 && ghost.realmId === 3) {
      ghost.animator?.update?.(dt);
      continue;
    }
    if (orbRealmState.id === 0 && ghost.realmId === 0) {
      ghost.animator?.update?.(dt);
      continue;
    }
    if (orbRealmState.id === 2 && ghost.realmId === 2) {
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
    if (State.flags?.goldChallengeActive || goldChallengeModeActive) return;
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
    if (orbRealmState.id === 0 && ghost.realmId === 0) return;
    if (orbRealmState.id === 2 && ghost.realmId === 2) return;
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
        maybeDropGhostBag(ghost);
        maybeDropGhostPotion(ghost);
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
        maybeDropGhostBag(ghost);
        maybeDropGhostPotion(ghost);
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
{ speaker: "Kael", text: "Des spectres à moins de cent pas. Essaie de ne pas mourir trop vite." },
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
          { speaker: "Chuchotement", text: "Vous entendez un rire s’élever depuis les profondeurs du labyrinthe." },
{ speaker: "???", text: "Lioran… Lioran… Lioran… LIORAN !!!" },
{ speaker: "Kael", text: "Tu n’imagines pas tout ce que ce Cœur permet de faire !" },
{ speaker: "Kael", text: "Alors laisse-moi t’en faire une DÉMONSTRATION !" },
{ speaker: "Moi", text: "Tu étais mon ami… Comment, en si peu de temps, as-tu pu changer à ce point…" },
{ speaker: "Moi", text: "Je dois en finir." },
      ],
      () => {
        const finalChoice = State.flags.finalEscapeChoice ?? "refuse";
        const proceedToEpilogue = () =>
          void renderEpilogue("release", { choice: finalChoice });
        if (finalChoice === "agree") {
          playEscapeVideo(proceedToEpilogue);
        } else {
          proceedToEpilogue();
        }
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
  text: "Tu entends ça ?",
},
{
  speaker: "Kael",
  text: "Oui… Je le sens. La présence du Cœur est plus forte.",
},
{
  speaker: "Moi",
  text: "Plus forte comment ?",
},
{
  speaker: "Kael",
  text: "Comme… si quelque chose nous observait.",
},
{
  speaker: "Kael",
  text: "…",
},
{
  speaker: "Moi",
  text: "Kael ?",
},
{
  speaker: "Kael",
  text: "Ce n’est rien. Juste un écho.",
},
{
  speaker: "Moi",
  text: "Tu n’es pas comme d’habitude.",
},
{
  speaker: "Kael",
  text: "On n’est pas dans un endroit ordinaire.",
},
{
  speaker: "Moi",
  text: "Si quelque chose ne va pas, dis-le-moi.",
},
{
  speaker: "Kael",
  text: "Avançons. Je t’expliquerai plus tard.",
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
    if (bossMapActive) {
      applyBossMapScaling();
    }
    startBossMusic();
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
    const questAnnounceTitle = t("questAcceptedTitle");
    const questAnnounceSubtitle = t("questAcceptedSubtitle");
    pushStatus(t("questAcceptedStatus"));
    State.questAnnouncement = {
      title: questAnnounceTitle,
      subtitle: questAnnounceSubtitle,
      timer: 4,
      max: 4,
    };
    scheduleKaelOrbHint();
    State.preQuestShrubs = [];
  }

  function startKaelQuestDialogue() {
    if (State.flags?.goldChallengeActive || goldChallengeModeActive) return;
    if (
      State.dialogue.isOpen() ||
      State.orbPromptOpen ||
      State.bossRiddleOpen ||
      State.flags.kaelQuestRefused
    )
      return;
    if ((State.questPromptCooldown ?? 0) > 0) return;
    if (State.flags.princessQuestAccepted) return;
    pauseForDialogue(
      [
{
  speaker: "Kael",
  text: "Lioran… Te voilà enfin. J’ai cru que tu avais rebroussé chemin, terrifié à l’idée de te perdre sans Aelya pour te guider.",
},
{
  speaker: "Moi",
  text: "Je n’ai jamais eu besoin d’un guide pour tenir ma route Kael. ",
},
{
  speaker: "Kael",
  text: "Hum.. Aelya n’est plus très loin. Je sens sa présence, quelque part dans les profondeurs d’Éphéria.",
},
{
  speaker: "Kael",
  text: "On raconte que ces couloirs murmurent les voix et les ombres du passé…",
},
{
  speaker: "Kael",
  text: "Mais si les ténèbres comptent nous arrêter, elles vont être déçues.",
},
{
  speaker: "Kael",
  text: "Allons-y. Retrouvons la princesse et le Cœur.",
},

      ],
      () => {
        showKaelQuestPrompt();
      }
    );
    return true;
  }
  function triggerBetrayal() {
    if (State.flags.betrayalHappened) return;
    State.flags.betrayalHappened = true;
    State.flags.kaelCorpseVisible = false;
    State.flags.dragonHeartDropped = false;
    State.flags.dragonHeartCollected = false;
    State.flags.princessBossActive = false;
    State.flags.princessBossDefeated = false;
    State.princessMechanics = null;
    State.kael.follow = false;
    State.boss.resetForFight({ x: State.kael.x, y: State.kael.y });
    if (bossMapActive) {
      applyBossMapScaling();
    }
    State.bossCheckpoint = {
      player: { x: State.player.x, y: State.player.y },
      boss: { x: State.boss.x, y: State.boss.y },
    };
    State.bossMusicPending = true;
    State.questAnnouncement = null;
    pauseForDialogue(
      [
{ speaker: "Kael", text: "..." },

{ speaker: "Kael", text: "Lioran… les voix ne se sont jamais tues." },

{ speaker: "Kael", text: "Elles m’ont montré ce que le Cœur est vraiment… et ce qu’il peut m’offrir." },

{ speaker: "Kael", text: "Ce pouvoir n’était pas destiné à être rendu. Il devait être pris." },

{ speaker: "Kael", text: "Toi, tu n’y vois qu’un fardeau. Moi, j’y vois un avenir." },

{ speaker: "Kael", text: "Aelya n’aurait jamais dû le porter… pas plus que toi." },

{ speaker: "Kael", text: "Écarte-toi, Lioran. Je n’ai aucune envie de te tuer." },

{ speaker: "Moi", text: "Tu viens de trahir tout ce pour quoi nous nous sommes battus." },

{ speaker: "Moi", text: "Rends le Cœur. Maintenant. Il est encore temps." },

{ speaker: "Kael", text: "Non." },

{ speaker: "Kael", text: "En garde." },


      ],
      () => {
        if (bossMapActive) {
          applyBossMapScaling();
        }
        startKaelEpicTheme();
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
      drawOrbExplosionEffects(ctx);
      if (orbRealmState.id === 1) {
        const goldStage = orbRealmState.goldBoss?.stage;
        if (goldStage !== "waiting" && orbRealmState.kaelReplica && !orbRealmState.kaelReplica.hiddenForStorm) {
          orbRealmState.kaelReplica.draw(ctx);
          drawGoldBossAura(ctx);
        }
      } else if (orbRealmState.id === 3) {
        drawBlueBossAura(ctx);
      }
      if (orbRealmState.activeStorm) {
        drawActiveLightStorm(ctx);
        drawActiveLightStormTimer(ctx);
      }
      if (orbRealmState.greenWall?.enabled) {
        drawGreenWall(ctx);
      }
      if (orbRealmState.redWall?.enabled) {
        drawRedWall(ctx);
      }
  if (orbRealmState.id === 0) {
    drawRedWall(ctx);
  }
      ctx.restore();
      ctx.restore();
      if (orbRealmState.id !== 3) {
        drawOrbBossHealth(ctx);
      }
      State.fog.drawTo(ctx, camX, camY, camera.w, camera.h);
      applyLighting(ctx, State.mode, camX + camera.w / 2, camY + camera.h / 2, 0);
      vignette(ctx, $canvas.width, $canvas.height, 0.35);
      State.dialogue.draw(ctx, $canvas);
      return;
    }
    drawPreQuestShrubSprites(ctx);
    drawPickups(ctx);
    drawGhosts(ctx);
    drawPlayerDashTrail(ctx);
    drawKaelDashTrail(ctx);
    drawPlayerAttackTrail(ctx);

    if (State.flags.princessUnlocked) {
      State.princess.draw(ctx);
    }
    const kaelVisible = !bossMapActive && isKaelAllyAlive();
    if (kaelVisible) {
      State.kael.draw(ctx);
      if (State.flags.princessQuestAccepted) {
        drawKaelAllyHpBar(ctx, State.kael);
      }
      if (!State.flags.princessQuestAccepted) {
        drawQuestMarker(ctx, State.kael);
      }
    }
    const bossAlive = State.flags.betrayalHappened && !State.flags.kaelDefeated;
    const bossCorpse = State.flags.kaelCorpseVisible;
    if (bossAlive || bossCorpse) {
      State.boss.draw(ctx);
      if (bossAlive) {
        drawBossHpBar(ctx, boss);
        drawKaelMechanicIndicator(ctx, boss);
      }
    }
    if (State.flags.princessBossActive && !State.flags.princessBossDefeated) {
      drawBossHpBar(ctx, State.princess);
    }
    State.player.draw(ctx);
    drawAelyaMechanics(ctx);

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
    if (!State.flags.princessBossActive) {
      drawAtmosphericFog(ctx, $canvas.width, $canvas.height);
    }

    const playerScreenX = (player.x - camX) * scaleX;
    const playerScreenY = (player.y - camY) * scaleY;
    if ((!State.flags.betrayalHappened || State.flags.kaelDefeated) && !State.flags.princessBossActive) {
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
    const showRetryButton =
      isOrbRealmActive() && !goldChallengeModeActive && !Boolean(State.flags?.goldChallengeActive);
    el.innerHTML = `
      <div class="card">
        <h2>${t("gameOverTitle")}</h2>
        <p>${t("gameOverKaelAllyText")}</p>
        <div class="choices">
          <button data-retry-kael>${t("gameOverRetryStart")}</button>
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
    if (bossMapActive) {
      stopKaelEpicTheme();
    }
    State.bossMusicPending = false;
    State.bossRetryShown = true;
    State.paused = true;
    State.awaitingEndingButton = true;
    playGameOverSound();
    el.classList.remove("hidden");
    const ghostButton = bossMapActive
      ? ""
      : `<button data-retry-ghost>${t("gameOverRetryTrial")}</button>`;
    el.innerHTML = `
      <div class="card">
        <h2>${t("gameOverTitle")}</h2>
        <p>${t("gameOverBossText")}</p>
        <div class="choices">
          <button data-retry-boss>${t("gameOverRetryFight")}</button>
          ${ghostButton}
          <button data-abandon>${t("gameOverAbandon")}</button>
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

  function renderAelyaBossGameOver() {
    if (State.princessBossRetryShown) return;
    const el = document.getElementById("ending");
    if (!el) return;
    stopBossMusic(true);
    stopAelyaFightMusic(true);
    State.flags.princessBossActive = false;
    State.princessMechanics = null;
    State.flags.princessBossDeathPending = false;
    State.princessBossRetryShown = true;
    State.paused = true;
    State.awaitingEndingButton = true;
    el.classList.remove("hidden");
    el.innerHTML = `
      <div class="card">
        <h2>${t("gameOverTitle")}</h2>
        <p>${t("gameOverAelyaText")}</p>
        <div class="choices">
          <button data-retry-aelya>${t("gameOverRetryFight")}</button>
          <button data-abandon>${t("gameOverAbandon")}</button>
        </div>
      </div>`;
    const retryBtn = el.querySelector("[data-retry-aelya]");
    const abandonBtn = el.querySelector("[data-abandon]");
    retryBtn?.addEventListener(
      "click",
      () => {
        State.princessBossRetryShown = false;
        State.awaitingEndingButton = false;
        State.paused = false;
        el.classList.add("hidden");
        el.innerHTML = "";
        if (State.player) {
          State.player.hp = State.player.maxHp ?? 100;
          State.player.stamina = State.player.staminaMax;
          State.player.resetCombatState?.();
          State.player.animator?.setBase("idle");
          State.player.animator?.play?.("idle");
        }
        startAelyaBossBattle();
      },
      { once: true }
    );
    abandonBtn?.addEventListener(
      "click",
      () => {
        State.princessBossRetryShown = false;
        State.awaitingEndingButton = false;
        State.paused = false;
        goToTitle();
      },
      { once: true }
    );
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
    State.flags.dragonHeartDropped = false;
    State.flags.dragonHeartCollected = false;
    State.flags.princessBossActive = false;
    State.flags.princessBossDefeated = false;
    State.princessMechanics = null;
    if (checkpoint) {
      checkpoint.phase = 1;
      checkpoint.hpMultiplier = 1;
    }
    if (State.princess && !bossMapActive) {
      State.princess.x = (checkpoint?.player?.x ?? State.player.x) - 40;
      State.princess.y = (checkpoint?.player?.y ?? State.player.y) + 30;
      State.princess.follow = true;
    } else if (State.princess) {
      State.princess.follow = false;
    }
    State.flags.kaelDefeated = false;
    if (bossMapActive) {
      applyBossMapScaling();
    }
    State.dialogue.close();
    clampCameraToPlayer(State.player.x, State.player.y);
    State.fog.reveal(State.player.x, State.player.y, 170);
    State.bossMusicPending = false;
    startBossMusic();
    if (bossMapActive) {
      startKaelEpicTheme();
    }
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
  stopOrbChallengeSound();
  playGameOverSound();
    stopBossMusic(true);
    State.bossMusicPending = false;
    State.paused = true;
    State.awaitingEndingButton = true;
    el.classList.remove("hidden");
    const challengeDefeat =
      orbRealmState.active && Boolean(orbRealmState.activeStorm?.challengeMode);
    const isGoldChallengeActive =
      goldChallengeModeActive || Boolean(State.flags?.goldChallengeActive);
    const showRetryButton =
      isOrbRealmActive() && !challengeDefeat && !isGoldChallengeActive;
    el.innerHTML = `
      <div class="card">
        <h2>${t("gameOverReturnTitle")}</h2>
        <p>${t("gameOverReturnText")}</p>
        <div class="choices">
        ${showRetryButton ? `<button data-retry>${t("gameOverRetryTrial")}</button>` : ""}
          <button data-abandon>${t("gameOverReturnHome")}</button>
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
      // Reset HP / état combat
      State.player.hp = State.player.maxHp ?? 200;
      State.player.resetCombatState?.();

      // 🔁 Respawn au-dessus du centre de la map d’orbe
      State.player.x = ORB_REALM_CENTER.x;
      State.player.y = ORB_REALM_CENTER.y - 100; // 100px au-dessus du centre
    }

    if (opts.showDialogue && orbRealmState.goldBoss) {
      orbRealmState.goldBoss.stage = "storm";
      orbRealmState.goldBoss.returnUnlocked = false;
    }
    if (opts.showDialogue && orbRealmState.blueBoss) {
      orbRealmState.blueBoss.stage = "storm";
      orbRealmState.blueBoss.returnUnlocked = false;
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
  const centerX = Number.isFinite(boss.x) ? boss.x : null;
  const centerY = Number.isFinite(boss.y) ? boss.y : null;
  const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
  const radius = GOLD_BOSS_AURA_RADIUS + Math.sin(now * 2.1) * 12;
  if (!Number.isFinite(radius) || centerX == null || centerY == null || radius <= 0) {
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.35;
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.55)");
  gradient.addColorStop(0.5, "rgba(200, 170, 255, 0.25)");
  gradient.addColorStop(1, "rgba(100, 80, 180, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(180, 200, 255, 0.45)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const angle = now * 0.9 + (Math.PI * 2 * i) / 3;
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      radius * (0.7 + i * 0.08),
      angle,
      angle + 0.8
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawBlueBossAura(ctx) {
  if (!ctx || orbRealmState.id !== 3) return;
  const blueState = orbRealmState.blueBoss;
  const boss = orbRealmState.orbGhost;
  if (!blueState || !boss || blueState.stage === "resolved" || blueState.stage === "storm") return;
  const centerX = Number.isFinite(boss.x) ? boss.x : null;
  const centerY = Number.isFinite(boss.y) ? boss.y : null;
  const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
  const radius = BLUE_BOSS_AURA_RADIUS + Math.sin(now * 2.1) * 12;
  if (!Number.isFinite(radius) || centerX == null || centerY == null || radius <= 0) {
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.35;
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  gradient.addColorStop(0, "rgba(220, 240, 255, 0.55)");
  gradient.addColorStop(0.5, "rgba(170, 205, 255, 0.25)");
  gradient.addColorStop(1, "rgba(90, 130, 220, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(145, 185, 255, 0.45)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const angle = now * 0.9 + (Math.PI * 2 * i) / 3;
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      radius * (0.7 + i * 0.08),
      angle,
      angle + 0.8
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawOrbBossHealth(ctx) {
  const ghost = orbRealmState.id === 1 && orbRealmState.kaelReplica ? orbRealmState.kaelReplica : orbRealmState.orbGhost;
  if (orbRealmState.id === 1 && !(orbRealmState.goldBoss?.combatActive)) return;
  if (
    orbRealmState.id === 0 ||
    orbRealmState.id === 2 ||
    orbRealmState.id === 3 ||
    ghost?.realmId === 3
  ) {
    return;
  }
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
  const moveRight =
    KeyCodes.has("KeyD") ||
    KeyCodes.has("ArrowRight") ||
    Keys.has("d") ||
    Keys.has("arrowright");
  const moveLeft =
    KeyCodes.has("KeyA") ||
    KeyCodes.has("ArrowLeft") ||
    Keys.has("q") ||
    Keys.has("arrowleft");
  const moveDown =
    KeyCodes.has("KeyS") ||
    KeyCodes.has("ArrowDown") ||
    Keys.has("s") ||
    Keys.has("arrowdown");
  const moveUp =
    KeyCodes.has("KeyW") ||
    KeyCodes.has("ArrowUp") ||
    Keys.has("z") ||
    Keys.has("arrowup");
  const x = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);
  const y = (moveDown ? 1 : 0) - (moveUp ? 1 : 0);
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
    if (orbRealmState.active && orbRealmState.id === 3) return;
    if (boss.realmId === 3) return;
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
