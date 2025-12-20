import { State } from "../state.js";

export function showEndings({ onPick }) {
  const root = document.getElementById("ending");
  if (!root) return;
  root.classList.remove("hidden");


  root.querySelectorAll("[data-id]").forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        const id = btn.getAttribute("data-id");
        root.classList.add("hidden");
        onPick?.(id);
      },
      { once: true }
    );
  });
}

const EPILOGUE_THEMES = {
  agree: {
    background:
      "radial-gradient(circle at 60% 10%, rgba(199, 210, 254, 0.35), transparent 45%), radial-gradient(circle at 30% 60%, rgba(59, 130, 246, 0.4), transparent 55%), linear-gradient(180deg, rgba(2, 6, 23, 0.95), rgba(14, 165, 233, 0.8))",
    textColor: "#e0f2fe",
    accent: "#bfdbfe",
    duration: 30000,
  },
  refuse: {
    background:
      "radial-gradient(circle at 20% 20%, rgba(248, 113, 113, 0.35), transparent 55%), radial-gradient(circle at 80% 25%, rgba(220, 38, 38, 0.45), transparent 55%), linear-gradient(180deg, rgba(12, 12, 12, 0.95), rgba(67, 20, 14, 0.9))",
    textColor: "#fee2e2",
    accent: "#f87171",
    duration: 32000,
  },
};

const EPILOGUE_SCROLL_DURATION = 32000;
const EPILOGUE_SCROLL_SLOW_FACTOR = 4;
const THANK_YOU_DISPLAY_DURATION = 1800;
const CREDITS_SCROLL_DURATION = 90000;
const CREDITS_AUDIO_SRC = "./assets/sounds/Credit/Credit.mp3";
const THANK_YOU_LINE_TEXT = "MERCI D?AVOIR JOU?";
const CREDITS_HEADINGS = new Set([
  "🎮 CRÉDITS",
  "🌌 Univers & Monde d’Éphéria",
  "📜 Scénario, narration & fins multiples",
  "💻 Développement du jeu",
  "🎮 Programmation gameplay & systèmes",
  "🧩 Mécaniques, énigmes & défis",
  "🎨 Direction artistique",
  "🖌️ Création visuelle & intégration des assets",
  "🌫️ Ambiances, effets & mise en scène",
  "🎵 Direction sonore & intégration musicale",
  "🧪 Tests, équilibrage & itérations",
  "⚙️ Optimisation & stabilité",
  "🌌 Inspirations",
  "🖤 Remerciements",
  "🖋️ Note de l’auteur",
  "🌑 Épilogue",
]);

const CREDITS_TEXT = `
🎮 CRÉDITS
Le Cœur d’Éphéria

 Une œuvre née du silence et de la persévérance

 Concept original

Kevin Bigoni

 Univers & Monde d’Éphéria

Kevin Bigoni

📜 Scénario, narration & fins multiples

Kevin Bigoni

💻 Développement du jeu

Kevin Bigoni

🎮 Programmation gameplay & systèmes

Kevin Bigoni

 Mécaniques, énigmes & défis

Kevin Bigoni

 Direction artistique

Kevin Bigoni

 Création visuelle & intégration des assets

Kevin Bigoni

 Ambiances, effets & mise en scène

Kevin Bigoni

 Direction sonore & intégration musicale

Kevin Bigoni

 Tests, équilibrage & itérations

Kevin Bigoni

 Optimisation & stabilité

Kevin Bigoni

 Inspirations

Les mythes anciens  
Les labyrinthes oubliés  
Les récits où le héros peut tomber  
Et les mondes qui ne jugent pas vos choix,  
mais en assument les conséquences.

🖤 Remerciements

À celles et ceux qui ont suivi le développement,  
À ceux qui ont joué, exploré, douté, échoué, recommencé,  
À ceux qui ont compris que parfois,  
le plus grand danger n’est pas l’ombre…  
mais ce que l’on en fait.

 Note de l’auteur

Le Cœur d’Éphéria n’est ni bon, ni mauvais.  
Il ne fait qu’amplifier ce que vous portez déjà en vous.

 Épilogue

Un monde a été sauvé…  
ou condamné.

Le labyrinthe se referme.  
Mais certaines portes  
ne se ferment jamais vraiment.

MERCI D’AVOIR JOUÉ
`;

const MULTILINGUAL_EPILOGUES = {
  release: {
    agree: {
      fr: `Lorsque le Cœur d'Éphéria retrouva enfin les mains d'Aelya, le labyrinthe sembla retenir son souffle.
Les murs, témoins de siècles de murmures et de souffrances, se turent.

Aelya et Lioran quittèrent ensemble cet entrelacs de pierres et d'ombres, laissant derrière eux les mystères anciens et les voix obscures qui hantaient les profondeurs.
Kael, vaincu au terme du combat, disparut dans les salles noyées de ténèbres. Nul ne sut jamais s'il y trouva la mort... ou s'il devint autre chose.

Mais une chose était certaine.

Le Cœur avait retrouvé une âme digne de le porter.
Sous l'influence d'un cœur pur, sa puissance ne serait plus un poison, mais une lumière — une arme contre les ténèbres qui rongeaient le monde d'Éphéria.

Car si une paix fragile s'installait, le danger, lui, n'avait pas disparu.
De nouvelles menaces se profilaient déjà à l'horizon.

Lioran et Aelya le savaient. Leur combat ne faisait que commencer.

Mais ceci...
est une autre histoire.
Une histoire encore voilée par le temps,
écrite dans les brumes d'un avenir incertain.`,
      en: `When the Heart of Epheria finally returned to Aelya's hands, the labyrinth held its breath.
The walls, witnesses to centuries of whispers and pain, fell silent.

Aelya and Lioran left the maze of stones and shadows together, leaving behind the old mysteries and the dark voices that haunted the depths.
Kael, defeated at the end of the fight, vanished into the rooms drowned in darkness. No one ever knew if he found death there... or became something else.

But one thing was certain.

The Heart had found a soul worthy of bearing it.
Under the influence of a pure heart, its power would no longer be poison, but light — a weapon against the shadows eating at the world of Epheria.

Because even if a fragile peace settled, danger had not disappeared.
New threats already loomed on the horizon.

Lioran and Aelya knew it. Their fight had only just begun.

But this...
is another story.
A tale still veiled by time,
written in the mists of an uncertain tomorrow.`,
    },
    refuse: {
      fr: `Après la chute de Kael, Lioran fit son choix.

Au lieu de rendre le Cœur d'Éphéria, il le garda pour lui.
Sa puissance afflua aussitôt, brûlante, infinie... et profondément corruptrice. Les ombres qu'il avait combattues trouvèrent en lui un nouvel hôte.

Aelya tenta de l'arrêter.
De le raisonner.
De le sauver.

Mais déjà, Lioran ne voyait plus qu'à travers le voile des ténèbres.
Dans un instant de folie aveugle, il la frappa.
La lumière s'éteignit avec elle.

Seul, désormais, il quitta le labyrinthe.

Et le héros devint monstre.

Là où il passait, la terre se fendait, les royaumes brûlaient, et la peur précédait son nom. Le monde d'Éphéria ne gagna pas un sauveur... mais un fléau. Un être plus terrible encore que ceux qu'il avait juré de détruire.

Un jour, quelqu'un devra l'arrêter.
Un jour, peut-être.

Mais pour l'heure, le Cœur d'Éphéria bat en lui, déchaîné.
Et tant que sa pulsation résonnera,
Lioran sera... inarrêtable.`,
      en: `After Kael's fall, Lioran made his choice.

Instead of returning the Heart of Epheria, he kept it.
Its power surged through him at once—blazing, endless... and deeply corrupting. The shadows he had fought found in him a new host.

Aelya tried to stop him.
To reason with him.
To save him.

But by then, Lioran saw only through the veil of darkness.
In a moment of blind madness, he struck her.
The light went out with her.

Alone now, he left the labyrinth.

And the hero became a monster.

Wherever he passed, the earth cracked, kingdoms burned, and fear preceded his name. The world of Epheria did not gain a savior... but a scourge. A being more terrible than any he once swore to destroy.

One day, someone will have to stop him.
One day, maybe.

But for now, the Heart of Epheria beats within him, unleashed.
And as long as its pulse echoes,
Lioran will be... unstoppable.`,
    },
    default: {
      fr: "Un avenir incertain s'ouvre selon les choix que vous avez faits.",
      en: "An uncertain future unfolds based on the choices you made.",
    },
  },
};

function getEpilogueText(id, choice) {
  const lang = State.language ?? "fr";
  const entry = MULTILINGUAL_EPILOGUES[id] ?? MULTILINGUAL_EPILOGUES.release;
  const narrative = entry[choice];
  if (narrative) {
    return narrative[lang] ?? narrative.fr;
  }
  return entry.default[lang] ?? entry.default.fr;
}
function escapeHtml(value = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getGameViewportParent() {
  const canvas = document.getElementById("gameCanvas");
  const fallback = document.getElementById("ending")?.parentElement ?? document.body;
  return canvas?.parentElement ?? fallback ?? document.body;
}

function showEpilogueScroll(text, theme) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    const parent = getGameViewportParent();
    const useFixed = parent === document.body;
    overlay.style.position = useFixed ? "fixed" : "absolute";
    overlay.style.inset = "0";
    overlay.style.zIndex = "10005";
    overlay.style.display = "flex";
    overlay.style.alignItems = "flex-end";
    overlay.style.justifyContent = "center";
    overlay.style.background = theme?.background ?? "rgba(0, 0, 0, 0.95)";
    overlay.style.padding = "36px";
    overlay.style.overflow = "hidden";
    overlay.style.backdropFilter = "blur(8px)";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.pointerEvents = "auto";

    const content = document.createElement("div");
    content.style.maxWidth = "820px";
    content.style.width = "100%";
    content.style.fontFamily = "'Cardo', 'Times New Roman', serif";
    content.style.fontSize = "26px";
    content.style.fontWeight = "500";
    content.style.lineHeight = "2";
    content.style.color = theme?.textColor ?? "#fff";
    content.style.textAlign = "center";
    content.style.letterSpacing = "0.1em";
    content.style.textTransform = "uppercase";
    content.style.paddingBottom = "40px";
    content.style.textShadow = `0 0 20px ${theme?.accent ?? "#fff"}`;
    content.style.willChange = "transform";
    content.style.pointerEvents = "none";

    const paragraphs = (text ?? "")
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join("");
    content.innerHTML = paragraphs || "<p>Merci d'avoir joué.</p>";
    overlay.appendChild(content);
    parent.appendChild(overlay);

    const baseDuration = theme?.duration ?? EPILOGUE_SCROLL_DURATION;
    const duration = Math.max(baseDuration, EPILOGUE_SCROLL_DURATION) * EPILOGUE_SCROLL_SLOW_FACTOR;
    const animation = content.animate(
      [
        { transform: "translateY(95%)" },
        { transform: "translateY(-115%)" },
      ],
      {
        duration,
        easing: "linear",
        fill: "forwards",
      }
    );

    let finished = false;
    let thankYouElement = null;
    let thankYouTimeoutId = null;
    let skipButton = null;

    function finalize() {
      if (finished) return;
      finished = true;
      animation.cancel();
      if (thankYouTimeoutId) {
        clearTimeout(thankYouTimeoutId);
        thankYouTimeoutId = null;
      }
      skipButton?.remove();
      overlay.remove();
      document.removeEventListener("keydown", handleKey);
      resolve();
    }

    const showSkipButton = () => {
      if (skipButton) return;
      skipButton = document.createElement("button");
      skipButton.type = "button";
      skipButton.textContent = "Passer l'épilogue (E)";
      skipButton.style.position = "absolute";
      skipButton.style.top = "18px";
      skipButton.style.right = "18px";
      skipButton.style.padding = "0.35rem 0.9rem";
      skipButton.style.border = "1px solid rgba(255,255,255,0.8)";
      skipButton.style.borderRadius = "999px";
      skipButton.style.background = "rgba(3, 7, 21, 0.8)";
      skipButton.style.color = "#fff";
      skipButton.style.fontSize = "0.75rem";
      skipButton.style.letterSpacing = "0.12em";
      skipButton.style.textTransform = "uppercase";
      skipButton.style.cursor = "pointer";
      skipButton.style.zIndex = "10010";
      skipButton.addEventListener("click", finalize, { once: true });
      overlay.appendChild(skipButton);
    };

    showSkipButton();

    function handleKey(event) {
      const key = event.key?.toLowerCase?.();
      if (key === "escape" || key === " " || key === "e") {
        event.preventDefault();
        finalize();
      }
    }

    function showThankYouMessage() {
      if (finished || thankYouElement) return;
      thankYouElement = document.createElement("div");
      thankYouElement.textContent = "MERCI";
      thankYouElement.style.position = "absolute";
      thankYouElement.style.inset = "0";
      thankYouElement.style.display = "flex";
      thankYouElement.style.alignItems = "center";
      thankYouElement.style.justifyContent = "center";
      thankYouElement.style.fontSize = "clamp(3rem, 6vw, 4rem)";
      thankYouElement.style.fontWeight = "700";
      thankYouElement.style.letterSpacing = "0.2em";
      thankYouElement.style.textTransform = "uppercase";
      thankYouElement.style.color = theme?.textColor ?? "#fff";
      thankYouElement.style.textShadow = `0 0 30px ${theme?.accent ?? "#fff"}`;
      thankYouElement.style.pointerEvents = "none";
      content.remove();
      overlay.appendChild(thankYouElement);
      thankYouTimeoutId = window.setTimeout(finalize, THANK_YOU_DISPLAY_DURATION);
    }

    animation.onfinish = showThankYouMessage;
    overlay.addEventListener("click", finalize, { once: true });
    document.addEventListener("keydown", handleKey);
  });
}
function showCreditsSequence(theme) {
  return new Promise((resolve) => {
    const parent = getGameViewportParent();
    const overlay = document.createElement("div");
    const useFixed = parent === document.body;
    overlay.style.position = useFixed ? "fixed" : "absolute";
    overlay.style.inset = "0";
    overlay.style.zIndex = "10005";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.background =
      theme?.background ??
      "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.04), transparent 45%), radial-gradient(circle at 85% 0%, rgba(110, 118, 255, 0.05), transparent 50%), #000";
    overlay.style.backgroundSize = "220% 220%";
    overlay.style.padding = "48px";
    overlay.style.overflow = "hidden";
    overlay.style.backdropFilter = "blur(6px)";
    overlay.style.pointerEvents = "auto";
    overlay.style.width = "100%";
    overlay.style.height = "100%";

      const creditsTrack = document.createElement("div");
    creditsTrack.style.width = "100%";
    creditsTrack.style.maxWidth = "780px";
    creditsTrack.style.display = "flex";
    creditsTrack.style.flexDirection = "column";
    creditsTrack.style.gap = "1rem";
    creditsTrack.style.textAlign = "center";
    creditsTrack.style.color = "#fff";
    creditsTrack.style.pointerEvents = "none";
    creditsTrack.style.fontFamily =
      "'Space Grotesk', 'Segoe UI', 'Inter', system-ui, sans-serif";
    creditsTrack.style.letterSpacing = "0.08em";
    creditsTrack.style.lineHeight = "1.6";
    creditsTrack.style.textTransform = "none";
    creditsTrack.style.transform = "translateY(90%)";
    creditsTrack.style.willChange = "transform";

      const headings = CREDITS_HEADINGS;
      let thankYouLine = null;
      const THANK_YOU_REGEX = /merci/i;
      CREDITS_TEXT.split("\n").forEach((line) => {
        const trimmed = line.trim();
        const paragraph = document.createElement("p");
      paragraph.style.margin = "0";
      paragraph.style.padding = "0";
      paragraph.style.color = "#fff";
      paragraph.style.opacity = "0.95";
      paragraph.textContent = trimmed || " ";
      if (!trimmed) {
        paragraph.style.height = "1rem";
        paragraph.style.opacity = "0";
      } else if (headings.has(trimmed)) {
        paragraph.style.fontSize = "clamp(1.8rem, 4vw, 2.6rem)";
        paragraph.style.fontWeight = "700";
        paragraph.style.letterSpacing = "0.35em";
        paragraph.style.textTransform = "uppercase";
      } else if (trimmed === "Kevin Bigoni") {
        paragraph.style.fontSize = "clamp(1.2rem, 3vw, 1.5rem)";
        paragraph.style.fontWeight = "600";
        paragraph.style.letterSpacing = "0.45em";
        paragraph.style.textTransform = "uppercase";
        } else if (THANK_YOU_REGEX.test(trimmed)) {
          paragraph.style.fontSize = "clamp(2.4rem, 5vw, 3rem)";
          paragraph.style.fontWeight = "700";
          paragraph.style.letterSpacing = "0.5em";
          paragraph.style.textTransform = "uppercase";
          paragraph.dataset.thankYouLine = "true";
          thankYouLine = paragraph;
        } else {
          paragraph.style.fontSize = "clamp(1rem, 2vw, 1.15rem)";
          paragraph.style.fontWeight = "400";
        }
        creditsTrack.appendChild(paragraph);
      });

    overlay.appendChild(creditsTrack);
    parent.appendChild(overlay);
    const creditAudio =
      typeof Audio !== "undefined"
        ? new Audio(CREDITS_AUDIO_SRC)
        : null;
    if (creditAudio) {
      creditAudio.loop = true;
      creditAudio.volume = 1;
      creditAudio.play().catch(() => {});
    }

    const backgroundAnimation = overlay.animate(
      [
        { backgroundPosition: "0% 0%" },
        { backgroundPosition: "100% 100%" },
        { backgroundPosition: "0% 100%" },
      ],
      {
        duration: 160000,
        iterations: Infinity,
        easing: "ease-in-out",
      }
    );

    const animation = creditsTrack.animate(
      [
        { transform: "translateY(90%)" },
        { transform: "translateY(-110%)" },
      ],
      {
        duration: CREDITS_SCROLL_DURATION,
        easing: "linear",
        fill: "forwards",
      }
    );
        animation.playbackRate = 7;
    const boostTimeoutId = window.setTimeout(() => {
      animation.playbackRate = 1;
    },2000);

      const thankYouLineElement =
        thankYouLine ?? creditsTrack.querySelector("[data-thank-you-line]");
    let finished = false;
    let pausedForThankYou = false;
    let skipButton = null;
    let rafId = null;

    const showSkipButton = () => {
      if (skipButton) return;
      skipButton = document.createElement("button");
      skipButton.type = "button";
      skipButton.textContent = "Passer les crédits (E)";
      skipButton.style.position = "absolute";
      skipButton.style.top = "18px";
      skipButton.style.right = "18px";
      skipButton.style.padding = "0.45rem 1rem";
      skipButton.style.border = "1px solid rgba(255,255,255,0.6)";
      skipButton.style.borderRadius = "999px";
      skipButton.style.background = "rgba(4, 6, 20, 0.75)";
      skipButton.style.color = "#fff";
      skipButton.style.fontSize = "0.85rem";
      skipButton.style.letterSpacing = "0.12em";
      skipButton.style.textTransform = "uppercase";
      skipButton.style.cursor = "pointer";
      skipButton.addEventListener("click", cleanup, { once: true });
      overlay.appendChild(skipButton);
    };

    const stopAtCenter = () => {
      if (pausedForThankYou) return;
        if (!thankYouLineElement) {
          rafId = window.requestAnimationFrame(stopAtCenter);
          return;
        }
      const overlayRect = overlay.getBoundingClientRect();
        const lineRect = thankYouLineElement.getBoundingClientRect();
      const overlayCenter = overlayRect.top + overlayRect.height / 2;
      const lineCenter = lineRect.top + lineRect.height / 2;
      if (Math.abs(lineCenter - overlayCenter) <= 4) {
        pausedForThankYou = true;
        animation.pause();
        showSkipButton();
      } else {
        rafId = window.requestAnimationFrame(stopAtCenter);
      }
    };

    const cleanup = () => {
      if (finished) return;
      finished = true;
      animation.cancel();
      backgroundAnimation.cancel();
      if (creditAudio) {
        creditAudio.pause();
        creditAudio.currentTime = 0;
      }
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      overlay.remove();
      document.removeEventListener("keydown", handleKey);
      resolve();
    };

    const handleKey = (event) => {
      const key = event.key?.toLowerCase?.();
      if (key === "escape" || key === " " || (key === "e" && pausedForThankYou)) {
        event.preventDefault();
        cleanup();
      }
    };

    animation.onfinish = cleanup;
    overlay.addEventListener("click", cleanup, { once: true });
    document.addEventListener("keydown", handleKey);
    rafId = window.requestAnimationFrame(stopAtCenter);
  });
}
export async function launchCredits(theme = EPILOGUE_THEMES.agree) {
  await showCreditsSequence(theme);
}
export async function renderEpilogue(id, { choice } = {}) {
  const root = document.getElementById("ending");
  if (!root) return;
  root.classList.add("hidden");

  const resultText = {
    release: "",
  }[id];

  const resolvedChoice = choice ?? "agree";
  const targetId = id ?? "release";
  const epilogueText = getEpilogueText(targetId, resolvedChoice);

  const scrollText = [resultText, epilogueText].filter(Boolean).join("\n\n");
  const theme = EPILOGUE_THEMES[resolvedChoice] ?? EPILOGUE_THEMES.agree;
  const EPILOGUE_AUDIO = {
    "release": {
      agree: "./assets/sounds/Good_Ending/GE.mp3",
      refuse: "./assets/sounds/Bad_Ending/BE.mp3",
    },
  };
  const soundSrc =
    EPILOGUE_AUDIO[id]?.[resolvedChoice] ?? null;
  const endingAudio =
    soundSrc && typeof Audio !== "undefined"
      ? new Audio(soundSrc)
      : null;
  if (endingAudio) {
    endingAudio.loop = false;
    endingAudio.volume = 1;
    endingAudio.play().catch(() => {});
  }
  try {
    await showEpilogueScroll(scrollText, theme);
  } finally {
    if (endingAudio) {
      endingAudio.pause();
      endingAudio.currentTime = 0;
    }
  }

  await showCreditsSequence(theme);
  const goHome =
    typeof window !== "undefined" && typeof window.goToTitle === "function"
      ? () => window.goToTitle()
      : () => location.reload();
  goHome();
}
