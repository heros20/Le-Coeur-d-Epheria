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

function escapeHtml(value = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showEpilogueScroll(text, theme) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "10005";
    overlay.style.display = "flex";
    overlay.style.alignItems = "flex-end";
    overlay.style.justifyContent = "center";
    overlay.style.background = theme?.background ?? "rgba(0, 0, 0, 0.95)";
    overlay.style.padding = "36px";
    overlay.style.overflow = "hidden";
    overlay.style.backdropFilter = "blur(8px)";

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
    document.body.appendChild(overlay);

    const duration = theme?.duration ?? EPILOGUE_SCROLL_DURATION;
    const animation = content.animate(
      [
        { transform: "translateY(120%)" },
        { transform: "translateY(-105%)" },
      ],
      {
        duration,
        easing: "linear",
        fill: "forwards",
      }
    );

    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      animation.cancel();
      overlay.remove();
      document.removeEventListener("keydown", handleKey);
      resolve();
    };
    const handleKey = (event) => {
      if (event.key === "Escape" || event.key === " ") {
        event.preventDefault();
        cleanup();
      }
    };
    animation.onfinish = cleanup;
    overlay.addEventListener("click", cleanup, { once: true });
    document.addEventListener("keydown", handleKey);
  });
}

export async function renderEpilogue(id, { choice } = {}) {
  const root = document.getElementById("ending");
  if (!root) return;
  root.classList.add("hidden");

  const resultText = {
    release:
      "Vous fuyez ensemble. Le monde sombre sous les tenebres : Aelya et Lioran devront s'entraider afin de le sauver.",
  }[id];

  const epilogueNarratives = {
    release: {
      agree:
        "Le monde va etre sauve grace au pouvoir du Coeur d'Epheria entre les mains d'Aelya ; Lioran et Aelya ne se quittent plus jamais et sauvent le monde ensemble.",
      refuse:
        "Le monde sombre peu a peu face aux tenebres, et Lioran devient de plus en plus instable et corrompu ; il succombe au murmure et finit par devaster le monde.",
      default:
        "Un avenir incertain s'ouvre selon les choix que vous avez faits.",
    },
  };
  const resolvedChoice = choice ?? "agree";
  const epilogueText =
    epilogueNarratives[id]?.[resolvedChoice] ??
    epilogueNarratives[id]?.default ??
    "Un avenir incertain s'ouvre selon les choix que vous avez faits.";

  const scrollText = [resultText, epilogueText].filter(Boolean).join("\n\n");
  const theme = EPILOGUE_THEMES[resolvedChoice] ?? EPILOGUE_THEMES.agree;
  await showEpilogueScroll(scrollText, theme);

  root.classList.remove("hidden");
  root.innerHTML = `
    <div class="card ending-card ending-final">
      <div class="ending-title">Le jeu est termine</div>
      <p class="ending-message">${resultText ?? "Merci d'avoir parcouru le Labyrinthe."}</p>
      <p class="ending-epilogue">${epilogueText}</p>
      <p class="ending-note">Merci d'avoir joue.</p>
      <div class="choices">
        <button data-retry>Retour a l'accueil</button>
      </div>
    </div>
  `;

  root
    .querySelector("[data-retry]")
    ?.addEventListener("click", () => location.reload(), { once: true });
}
