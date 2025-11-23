// src/systems/dialogue.js
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
        this.next();
        e.preventDefault();
      } else if (e.key === "Escape" && this.active) {
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
    return lines
      .map((l) => {
        if (typeof l === "string") return l;
        if (l && typeof l === "object") {
          const who = l.speaker ?? l.who ?? l.name ?? "";
          const txt = l.text ?? l.t ?? "";
          return (who ? who + " : " : "") + String(txt);
        }
        return String(l ?? "");
      })
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter((s) => s.length > 0);
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
    return (
      this.active &&
      Array.isArray(this.lines) &&
      this.index >= 0 &&
      this.index < this.lines.length &&
      typeof this.lines[this.index] === "string" &&
      this.lines[this.index].trim().length > 0
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

    const line = this.lines[this.index] || "";
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
    const line = this.lines[this.index];
    if (line) this.visibleChars = line.length;
  }

  _isFullyShown() {
    if (!this._hasCurrent()) return true;
    const line = this.lines[this.index];
    if (typeof line !== "string") return true;
    return this.visibleChars >= line.length;
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

    const line = this.lines[this.index];
    const shown =
      typeof line === "string"
        ? line.slice(0, Math.max(0, Math.floor(this.visibleChars)))
        : "";

    ctx.font = "18px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = "#ffffff";
    wrapText(ctx, shown, x + padding, y + padding + 8, boxW - padding * 2, 26);

    ctx.globalAlpha = 0.85;
    ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = "#fbd38d";
    const hint = this._isFullyShown()
      ? "Appuie sur E pour continuer — Échap pour afficher instantanément"
      : "E : afficher la phrase — Échap : finir l'affichage";
    ctx.fillText(hint, x + padding, y + boxH - 16);
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
