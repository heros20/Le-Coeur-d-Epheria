// src/systems/dialogue.js
import { State } from "../state.js";
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
      if (typeof text !== "string") text = String(text ?? "");
      const trimmedText = text.replace(/\s+/g, " ").trim();
      if (trimmedText.length === 0) continue;
      result.push({ speaker, text: trimmedText });
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
