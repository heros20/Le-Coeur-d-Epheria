// src/systems/dialogue.js
import { State } from "../state.js";

const DIALOGUE_TEXT_TRANSLATIONS = {
  en: {
    "Aaaah !": "Aaaah!",
    "Aelya n’aurait jamais dû le porter… pas plus que toi.": "Aelya should never have carried it... nor should you.",
    "Aelya sanglote.": "Aelya sobs.",
    "Ah ! je...": "Ah! I...",
    "Allons-y. Retrouvons la princesse et le Cœur.": "Let's go. Let's find the princess and the Heart.",
    "Alors laisse-moi t’en faire une DÉMONSTRATION !": "Then let me give you a DEMONSTRATION!",
    "As-tu ramassé le Cœur sur le corps de Kael ?": "Did you pick up the Heart from Kael's body?",
    "Attends… Cette vibration… C’est le Cœur ! Kael est toujours en vie !": "Wait... That vibration... It's the Heart! Kael is still alive!",
    "Avançons. Je t’expliquerai plus tard.": "Let's move. I'll explain later.",
    "C'est fini Kael.. Je suis désolé.": "It's over, Kael... I'm sorry.",
    "C'est terminé Lioran.": "It's over, Lioran.",
    "Ce Cœur est bien trop important. JE dois le garder !": "This Heart is far too important. I MUST keep it!",
    "Ce n’est rien. Juste un écho.": "It's nothing. Just an echo.",
    "Ce pouvoir m’appartient désormais.": "This power belongs to me now.",
    "Ce pouvoir n’était pas destiné à être rendu. Il devait être pris.": "This power was never meant to be returned. It was meant to be claimed.",
    "Comme d'autre avant toi, tu tombera, et tu rejoindra les rands des damnés.": "Like others before you, you will fall and join the ranks of the damned.",
    "Comment as-tu atteints ce lieu ?": "How did you reach this place?",
    "Comme… si quelque chose nous observait.": "Like... something was watching us.",
    "Comprends-moi… et rejoins-moi. Nous avons toujours été ensemble !": "Understand me... and join me. We've always been together!",
    "Des spectres à moins de cent pas. Essaie de ne pas mourir trop vite.": "Specters within a hundred paces. Try not to die too quickly.",
    "Donne la réponse à cette énigme, si tu te trompe, je ne serais plus jamais seul...": "Answer my riddle; if you fail, I'll never be alone again...",
    "Elles m’ont montré ce que le Cœur est vraiment… et ce qu’il peut m’offrir.": "They showed me what the Heart truly is... and what it can give me.",
    "Elles sont dans ma tête depuis notre arrivée ici. Elles me parlent… elles m’ordonnent.": "They've been in my head since we arrived. They speak to me... they command me.",
    "En garde.": "En garde.",
    "Encore un aventurier..": "Another adventurer...",
    "FAUX ! tu vas subir l'épreuve d'Epheria.": "WRONG! You will undergo the trial of Epheria.",
    "Gardien maudit, ni vivant, ni mort, souhaite-tu me rejoindre pour l'éternité ?": "Cursed guardian, neither living nor dead, will you join me for eternity?",
    "Hum.. Aelya n’est plus très loin. Je sens sa présence, quelque part dans les profondeurs d’Éphéria.": "Hmm... Aelya is not far. I feel her presence somewhere in the depths of Ç%phÇ¸ria.",
    "Il est à moi désormais… Le pouvoir du Cœur d’Éphéria, tout entier, dans la paume de ma main !": "It's mine now... The power of the Heart of Ç%phÇ¸ria, whole, in the palm of my hand!",
    "J'ai tué mon ami...": "I killed my friend...",
    "Je dois en finir.": "I must end it.",
    "Je ne le rendrai pas. Ce pouvoir m’appartient… prends garde !": "I won't give it back. This power belongs to me... beware!",
    "Je ne mourrai pas pour si peu, Lioran.": "I won't die for something so small, Lioran.",
    "Je ne souhaite pas ta mort Aelya, n'insiste pas.": "I don't wish for your death, Aelya, don't push me.",
    "Je n’ai jamais eu besoin d’un guide pour tenir ma route Kael.": "I've never needed a guide to stay on course, Kael.",
    "Je suis désolé, Aelya… Je dois prendre ce Cœur.": "I'm sorry, Aelya... I must take this Heart.",
    "Kael ! Tu as perdu la raison ?!": "Kael! Have you lost your mind?!",
    "Kael ?": "Kael?",
    "Kael s’empare de force du Cœur d’Éphéria.": "Kael forcefully seizes the Heart of Ç%phÇ¸ria.",
    "L'orbe ne doit pas être activé.. part d'ici !": "The orb must not be activated... get out of here!",
    "L'épreuve va bientôt débuter, prépare-toi !": "The trial is about to begin, prepare yourself!",
    "La faim est invisible, immatérielle, mais tout le monde la ressent. Elle n’a pas de forme, mais elle affaiblit, terrasse, et peut faire tomber même les plus puissantes nations.": "Hunger is invisible, immaterial, yet everyone feels it. It has no form, but it weakens, topples, and can bring down even the mightiest nations.",
    "La jalousie naît de l’amour, mais finit par le détruire. Elle agit comme un poison intérieur, transformant la passion en obsession et en souffrance.": "Jealousy is born from love, yet it destroys it. It acts like an inner poison, turning passion into obsession and suffering.",
    "La montagne est l’ossature de la terre, s’élève vers le ciel, et son sommet est recouvert de neige blanche pure.": "The mountain is the spine of the earth, rising toward the sky, and its peak is capped with pure white snow.",
    "La pierre s'est parfaitement inserer dans l'orbe.": "The stone has perfectly fitted into the orb.",
    "La verdure gronde, tu n'as pas su l'apaiser.": "The greenery rumbles; you failed to calm it.",
    "Le Cœur d’Éphéria est en ma possession. Il permet de repousser, ou de contrôler, les ténèbres qui envahissent le royaume.": "The Heart of Ç%phÇ¸ria is in my keeping. It can push back or harness the shadows consuming the kingdom.",
    "Le feu gronde, tu n'as pas su l'apaiser.": "The fire rumbles; you failed to calm it.",
    "Le royaume d’Éphéria tombera bientôt sous les ténèbres que le Cœur me permet de contrôler. Je vais devenir un dieu.": "The realm of Ç%phÇ¸ria will soon fall under the darkness this Heart lets me control. I will become a god.",
    "Le souffle de Kael s’est éteint.": "Kael's breath has faded.",
    "Les voix ? De quoi parles-tu ?": "The voices? What are you talking about?",
    "Lioran… Je sens la présence du coeur. J'ignore ce que nous faisons, mais cela semble fonctionner !": "Lioran... I feel the presence of the Heart. I don't know what we're doing, but it seems to be working!",
    "Lioran… Kael… Vous n’auriez jamais dû venir ici.": "Lioran... Kael... You should never have come here.",
    "Lioran… Lioran… Lioran… LIORAN !!!": "Lioran... Lioran... Lioran... LIORAN!!!",
    "Lioran… Te voilà enfin. J’ai cru que tu avais rebroussé chemin, terrifié à l’idée de te perdre sans Aelya pour te guider.": "Lioran... At last you are here. I thought you had turned back, terrified of losing yourself without Aelya to guide you.",
    "Lioran… Tu as fait ta part. Quittons cet endroit.": "Lioran... You did your part. Let's leave this place.",
    "Lioran… les voix ne se sont jamais tues.": "Lioran... the voices never went silent.",
    "Lioran… les voix… Je…": "Lioran... the voices... I...",
    "Mais il corrompt également l’âme de ceux qui le portent. Je me suis exilée ici pour supporter ce fardeau seule… Vous n’auriez pas dû venir.": "But it also corrupts the soul of those who bear it. I exiled myself here to bear this burden alone... You shouldn't have come.",
    "Mais si les ténèbres comptent nous arrêter, elles vont être déçues.": "But if the darkness thinks it can stop us, it will be disappointed.",
    "Non.": "No.",
    "Non.. Je t’en supplie… rends-le-moi. Sinon, je serai forcée de t’arrêter.": "No... I beg you... give it back. Otherwise, I will be forced to stop you.",
    "Nous n'avons pas de temps à perdre, décide toi vite.": "We have no time to waste, decide quickly.",
    "Nous sommes les gardiens de ce labyrinthe, emprisonnée à jamais.": "We are the guardians of this labyrinth, imprisoned forever.",
    "On n’est pas dans un endroit ordinaire.": "We're not in an ordinary place.",
    "On raconte que ces couloirs murmurent les voix et les ombres du passé…": "They say these corridors whisper the voices and shadows of the past...",
    "Oui… Je le sens. La présence du Cœur est plus forte.": "Yes... I feel it. The Heart's presence is stronger.",
    "Passe par ce portail, il activera l'une des clés du labyrinthe.": "Pass through that portal; it will activate one of the labyrinth's keys.",
    "Passe par ce portail, il libèrera une autre clé du labyrinthe.": "Pass through that portal; it will unlock another labyrinth key.",
    "Peux-tu me le rendre, s’il te plaît ? Son pouvoir est trop grand… Il te consumerait si tu le gardais.": "Can you give it back to me, please? Its power is too great... It would consume you if you kept it.",
    "Plus forte comment ?": "Stronger how?",
    "Princesse !": "Princess!",
    "Princesse Aelya ! Que voulez-vous dire ?!": "Princess Aelya! What do you mean?!",
    "Puisse-tu reposer en paix… Kael. Mage déchu, ayant sombré sous les voix de ce lieu maudit.": "May you rest in peace... Kael. Fallen mage, undone by the voices of this cursed place.",
    "Quoi ? Non !": "What? No!",
    "Rends le Cœur. Maintenant. Il est encore temps.": "Return the Heart. Now. There's still time.",
    "Répond à mon énigme, ou meurt en essayant.": "Answer my riddle, or die trying.",
    "Résous cette énigme ou subit en les conséquences.": "Solve this riddle, or suffer the consequences.",
    "Si quelque chose ne va pas, dis-le-moi.": "If something's wrong, tell me.",
    "Survis à la tempête et peu être que le chemin s'ouvrira.": "Survive the storm and maybe the path will open.",
    "Survis à la tempête, peut-être que la sortie s'éclairera.": "Survive the storm; maybe the exit will light up.",
    "TU NE ME LAISSE PAS LE CHOIX LORIAN ! LE COEUR M'A RENDU PLUS FORT QUE JAMAIS !!!": "YOU LEAVE ME NO CHOICE LIORAN! THE HEART HAS MADE ME STRONGER THAN EVER!!!",
    "Tiens le plus longtemps possible : chaque seconde te rapproche du record.": "Hold on as long as you can: each second brings you closer to the record.",
    "Si tu parviens à survivre, tu seras libre de poursuivre ta quête.": "If you manage to survive, you'll be free to continue your quest.",
    "Toi, tu n’y vois qu’un fardeau. Moi, j’y vois un avenir.": "You see only a burden. I see a future.",
    "Traverse ce portail, il activera une nouvelle clé du labyrinthe.": "Pass through this portal; it will activate a new labyrinth key.",
    "Traverse ce portail, il réveille une autre clé du labyrinthe.": "Pass through this portal; it awakens another labyrinth key.",
    "Tu as eu tort.": "You were wrong.",
    "Tu as frappé Aelya. Cet artefact maudit t’a fait perdre la raison. Arrête, avant qu’il ne soit trop tard !": "You struck Aelya. This cursed artifact has driven you mad. Stop before it's too late!",
    "Tu as remarqué ces étranges Orbes aux coins du Labyrinthe ?": "Have you noticed those strange Orbs at the corners of the Labyrinth?",
    "Tu entends ça ?": "Do you hear that?",
    "Tu es digne.": "You are worthy.",
    "Tu es vivant… Cesse cette folie et rends ce pouvoir !": "You're alive... Stop this madness and return this power!",
    "Tu ne devrait pas être ici.": "You should not be here.",
    "Tu ne me laisses pas le choix… Pardonne-moi. Mais je dois le reprendre, quitte à te blesser !": "You leave me no choice... Forgive me. But I must take it back, even if it hurts you!",
    "Tu ne peux pas le garder pour toi… Sa puissance est trop grande. Et qu’en ferais-tu ?": "You can't keep it for yourself... Its power is too great. And what would you even do with it?",
    "Tu ne sortira d'ici que si tu survis à mon défi.": "You will only leave here if you survive my challenge.",
    "Tu ne sortira pas à moins de résoudre cette énigme, si tu te trompe...": "You won't get out unless you solve this riddle; if you fail...",
    "Tu nous as tous… condamnés.": "You've condemned us all...",
    "Tu n’es pas comme d’habitude.": "You're not yourself.",
    "Tu n’imagines pas tout ce que ce Cœur permet de faire !": "You can't imagine everything this Heart can do!",
    "Tu viens de trahir tout ce pour quoi nous nous sommes battus.": "You've just betrayed everything we fought for.",
    "Tu étais mon ami… Comment, en si peu de temps, as-tu pu changer à ce point…": "You were my friend... How could you change so much in so little time...",
    "Vous entendez un rire s’élever depuis les profondeurs du labyrinthe.": "You hear laughter rising from the labyrinth's depths.",
    "les rêves naissent dans l’obscurité, sont faits de fragments flous entre passé et futur, ressemblent à nos pensées… et disparaissent au réveil, lorsque la lumière revient.": "Dreams are born in darkness, made of blurry fragments between past and future, resembling our thoughts... and fading upon waking when the light returns.",
    "Écarte-toi, Lioran. Je n’ai aucune envie de te tuer.": "Step aside, Lioran. I have no desire to kill you.",
    "…": "...",
  },
};
const DIALOGUE_SPEAKER_TRANSLATIONS = {
  en: {
    Princesse: "Princesse",
    Moi: "Moi",
    Kael: "Kael",
    Aelya: "Aelya",
    Fantome: "Phantom",
    Chuchotement: "Whisper",
    "???": "???",
  },
};

function translateDialogueText(text) {
  if (!text) return text;
  const lang = State.language ?? "fr";
  const dict = DIALOGUE_TEXT_TRANSLATIONS[lang];
  if (!dict) return text;
  return dict[text] ?? text;
}

function translateDialogueSpeaker(name) {
  if (!name) return name;
  const lang = State.language ?? "fr";
  const dict = DIALOGUE_SPEAKER_TRANSLATIONS[lang];
  if (!dict) return name;
  return dict[name] ?? name;
}
class DialogueUI {
  constructor() {
    this.active = false;
    this.lines = [];
    this.index = 0;
    this.sourceId = null;
    this.onClose = null;

    this.visibleChars = 0;
    this.revealSpeed = 80; // caractères par seconde

    // horloge interne pour calculer le dt sans dépendre de l'extérieur
    this._lastTime = null;

    this._onKeyDown = (e) => {
    if (e.repeat) return;
    if ((e.key === "e" || e.key === "E") && this.active) {
      if (State.animationPauseActive) {
        e.preventDefault();
        return;
      }
      this.next();
      e.preventDefault();
    } else if (e.key === "Escape" && this.active) {
      if (State.animationPauseActive) {
        e.preventDefault();
        return;
      }
      this.skip();
      e.preventDefault();
    }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }

  destroy() {
    window.removeEventListener("keydown", this._onKeyDown);
  }

  _normalize(lines) {
    if (!Array.isArray(lines)) return [];
    const result = [];
    for (const entry of lines) {
      let speaker = "";
      let text = "";
      if (typeof entry === "string") {
        text = entry;
      } else if (entry && typeof entry === "object") {
        speaker = String(entry.speaker ?? entry.who ?? entry.name ?? "").trim();
        text = String(entry.text ?? entry.t ?? "");
      } else {
        text = String(entry ?? "");
      }
      speaker = translateDialogueSpeaker(speaker);
      if (typeof text !== "string") text = String(text ?? "");
      const trimmedText = text.replace(/\s+/g, " ").trim();
      if (trimmedText.length === 0) continue;
      result.push({ speaker, text: translateDialogueText(trimmedText) });
    }
    return result;
  }

  open({ lines, sourceId = null, onClose = null }) {
    const normalized = this._normalize(lines);
    if (normalized.length === 0) {
      this.close();
      return;
    }
    this.active = true;
    this.lines = normalized;
    this.index = 0;
    this.sourceId = sourceId;
    this.onClose = onClose || null;

    // on repart de 0 à chaque nouvelle boîte
    this.visibleChars = 0;
    this._lastTime = null;
  }

  show(lines, opts = {}) {
    this.open({ lines, ...opts });
  }

  isOpen() {
    return this.active;
  }

  _hasCurrent() {
    const entry = this.lines?.[this.index];
    return (
      this.active &&
      Array.isArray(this.lines) &&
      this.index >= 0 &&
      this.index < this.lines.length &&
      entry &&
      typeof entry.text === "string" &&
      entry.text.trim().length > 0
    );
  }

  _advanceToValid() {
    while (this.active && this.index < this.lines.length && !this._hasCurrent()) {
      this.index++;
    }
    if (!this._hasCurrent()) {
      this.close();
    } else {
      this.visibleChars = 0;
      this._lastTime = null;
    }
  }

  next() {
    if (!this.active) return;

    // si la ligne n'est pas finie, E sert à la finir instantanément
    if (!this._isFullyShown()) {
      this.skip();
      return;
    }

    // sinon, on passe à la suite
    this.index++;
    this._advanceToValid();
  }

  update({ isSourceStillValid } = {}) {
    if (!this.active) return;
    if (!this._hasCurrent()) {
      this.close();
      return;
    }

    // horloge interne pour calculer dt
    const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
    if (this._lastTime == null) {
      this._lastTime = now;
    }
    let dt = now - this._lastTime;
    this._lastTime = now;

    // on évite les énormes dt (changement d'onglet, pause, etc.)
    if (!Number.isFinite(dt) || dt < 0 || dt > 1) {
      dt = 0;
    }

    const entry = this.lines[this.index];
    const line = entry?.text ?? "";
    const len = line.length;

    if (len > 0 && !this._isFullyShown()) {
      const speed = this.revealSpeed;
      if (speed > 0 && dt > 0) {
        this.visibleChars += speed * dt;
        if (this.visibleChars >= len) {
          this.visibleChars = len;
        }
      }
    }

    if (this.sourceId && typeof isSourceStillValid === "function") {
      if (!isSourceStillValid(this.sourceId)) this.close();
    }
  }

  skip() {
    if (!this.active || !this._hasCurrent()) return;
    const entry = this.lines[this.index];
    if (entry) this.visibleChars = entry.text.length;
  }

  _isFullyShown() {
    if (!this._hasCurrent()) return true;
    const entry = this.lines[this.index];
    const text = entry?.text ?? "";
    return this.visibleChars >= text.length;
  }

  close() {
    const was = this.active;
    this.active = false;
    this.lines = [];
    this.index = 0;
    this.visibleChars = 0;
    this._lastTime = null;
    const cb = this.onClose;
    this.onClose = null;
    this.sourceId = null;
    if (was && typeof cb === "function") cb();
  }

  draw(ctx, canvas) {
    if (!this._hasCurrent()) {
      this.close();
      return;
    }

    const padding = 18;
    const boxW = Math.min(canvas.width - padding * 2, 860);
    const boxH = 140;
    const x = Math.round((canvas.width - boxW) / 2);
    const y = canvas.height - boxH - padding;
    const radius = 18;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 12;
    const gradient = ctx.createLinearGradient(x, y, x, y + boxH);
    gradient.addColorStop(0, "rgba(6, 6, 8, 0.95)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.98)");
    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, x, y, boxW, boxH, radius);
    ctx.fill();

    ctx.save();
    drawRoundedRect(ctx, x, y, boxW, boxH, radius);
    ctx.clip();
    const highlight = ctx.createRadialGradient(
      x + boxW * 0.25,
      y + boxH * 0.15,
      0,
      x + boxW * 0.25,
      y + boxH * 0.15,
      boxH * 0.7
    );
    highlight.addColorStop(0, "rgba(255, 255, 255, 0.15)");
    highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = highlight;
    ctx.fillRect(x, y, boxW, boxH);
    ctx.restore();

    ctx.shadowColor = "transparent";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fbe7c6";
    drawRoundedRect(ctx, x, y, boxW, boxH, radius);
    ctx.stroke();
    ctx.restore();

    const entry = this.lines[this.index];
    const fullText = entry?.text ?? "";
    const speaker = (entry?.speaker ?? "").trim();
    const shown = fullText.slice(0, Math.max(0, Math.floor(this.visibleChars)));
    const portrait = getDialoguePortrait(speaker);
    const portraitSize = portrait ? Math.min(112, boxH - padding * 2) : 0;
    const portraitGap = portrait ? 12 : 0;
    const portraitAreaWidth = portrait ? portraitSize + portraitGap : 0;
    const textMaxWidth = Math.max(64, boxW - padding * 2 - portraitAreaWidth);
    const labelHeight = speaker ? 20 : 0;
    const labelSpacing = speaker ? 8 : 0;
    const textStartY = y + padding + labelHeight + labelSpacing + 6;
    const textX = x + padding + portraitAreaWidth;

    if (portrait) {
      const srcHeight = Math.max(1, portrait.height * 0.7);
      const destX = x + padding;
      const destY = y + padding;
      ctx.save();
      ctx.beginPath();
      ctx.rect(destX - 4, destY - 4, portraitSize + 8, portraitSize + 8);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fill();
      ctx.clip();
      ctx.drawImage(
        portrait,
        0,
        0,
        portrait.width,
        srcHeight,
        destX,
        destY,
        portraitSize,
        portraitSize
      );
      ctx.restore();
      ctx.globalAlpha = 0.65;
      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.lineWidth = 2;
      ctx.strokeRect(destX, destY, portraitSize, portraitSize);
      ctx.globalAlpha = 1;
    }

    if (speaker) {
      ctx.font = "600 16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillStyle = "#fbd38d";
      ctx.fillText(speaker, textX, y + padding + 16);
    }

    ctx.font = "18px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = "#ffffff";
    wrapText(ctx, shown, textX, textStartY, textMaxWidth, 26);

    ctx.globalAlpha = 0.85;
    ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = "#fbd38d";
    const hint = this._isFullyShown()
      ? "Appuie sur E pour continuer — Échap pour afficher instantanément"
      : "E : afficher la phrase — Échap : finir l'affichage";
    const hintY = y + boxH - 8;
    ctx.fillText(hint, x + padding, hintY);
    ctx.globalAlpha = 1;
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/);
  let line = "";
  let yy = y;
  for (let i = 0; i < words.length; i++) {
    const test = line + (line ? " " : "") + words[i];
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      ctx.fillText(line, x, yy);
      line = words[i];
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

const SPEAKER_PORTRAITS = {
  kael: "hero2",
  moi: "hero1",
  princesse: "hero3",
  princess: "hero3",
  aelya: "hero3",
  fantome: "ghost",
};

function normalizeSpeakerName(name) {
  if (!name) return "";
  const normalized = name.trim().toLowerCase();
  if (!normalized) return "";
  return normalized
    .normalize?.("NFD")
    .replace(/[\u0300-\u036f]/g, "") ?? normalized;
}

function getDialoguePortrait(speaker) {
  const key = normalizeSpeakerName(speaker);
  const portraitKey = SPEAKER_PORTRAITS[key] ?? SPEAKER_PORTRAITS[speaker];
  if (!portraitKey) return null;
  return State.dialoguePortraits?.[portraitKey] ?? null;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function createDialogueLayer() {
  const ui = new DialogueUI();
  return {
    isOpen: () => ui.isOpen(),
    show: (lines, opts) => ui.show(lines, opts),
    open: (opts) => ui.open(opts),
    next: () => ui.next(),
    close: () => ui.close(),
    update: (args) => ui.update(args),
    draw: (ctx, canvas) => ui.draw(ctx, canvas),
    destroy: () => ui.destroy(),
  };
}
