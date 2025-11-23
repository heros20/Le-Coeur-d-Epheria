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

    const padding = 12;
    const boxW = Math.min(canvas.width - padding * 2, 800);
    const boxH = 110;
    const x = Math.round((canvas.width - boxW) / 2);
    const y = canvas.height - boxH - padding;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#111";
    ctx.fillRect(x, y, boxW, boxH);
    ctx.globalAlpha = 1;

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#B4F116";
    ctx.strokeRect(x, y, boxW, boxH);

    const line = this.lines[this.index];
    const shown =
      typeof line === "string"
        ? line.slice(0, Math.max(0, Math.floor(this.visibleChars)))
        : "";

    ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = "#eee";
    wrapText(ctx, shown, x + padding, y + padding + 6, boxW - padding * 2, 20);

    ctx.globalAlpha = 0.8;
    ctx.font = "13px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = "#aaa";

    const hint = this._isFullyShown()
      ? "Appuie sur E pour continuer - Echap pour afficher instantanement"
      : "E : afficher la phrase - Echap : afficher instantanement";

    ctx.fillText(hint, x + padding, y + boxH - 12);
    ctx.restore();
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
