// src/systems/dialogue.js
class DialogueUI {
  constructor() {
    this.active = false;
    this.lines = [];
    this.index = 0;
    this.sourceId = null;
    this.onClose = null;
    this.visibleChars = 0;
    this.revealSpeed = 80; // characters per second

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
  destroy() { window.removeEventListener("keydown", this._onKeyDown); }

  _normalize(lines) {
    if (!Array.isArray(lines)) return [];
    return lines.map((l) => {
      if (typeof l === "string") return l;
      if (l && typeof l === "object") {
        const who = l.speaker ?? l.who ?? l.name ?? "";
        const txt = l.text ?? l.t ?? "";
        return ((who ? who + " : " : "") + String(txt));
      }
      return String(l ?? "");
    }).map(s => s.replace(/\s+/g, " ").trim())
      .filter(s => s.length > 0);
  }

  open({ lines, sourceId = null, onClose = null }) {
    const normalized = this._normalize(lines);
    if (normalized.length === 0) { this.close(); return; }
    this.active = true;
    this.lines = normalized;
    this.index = 0;
    this.sourceId = sourceId;
    this.onClose = onClose || null;
    this.visibleChars = 0;
  }
  show(lines, opts = {}) { this.open({ lines, ...opts }); }
  isOpen() { return this.active; }

  _hasCurrent() {
    return this.active &&
      Array.isArray(this.lines) &&
      this.index >= 0 &&
      this.index < this.lines.length &&
      typeof this.lines[this.index] === "string" &&
      this.lines[this.index].trim().length > 0;
  }

  _advanceToValid() {
    while (this.active && this.index < this.lines.length && !this._hasCurrent()) {
      this.index++;
    }
    if (!this._hasCurrent()) this.close();
    else this.visibleChars = 0;
  }

  next() {
    if (!this.active) return;
    if (!this._isFullyShown()) { this.skip(); return; }
    this.index++;
    this._advanceToValid();
  }

  update({ dt, isSourceStillValid } = {}) {
    if (!this.active) return;
    if (!this._hasCurrent()) { this.close(); return; }
    const line = this.lines[this.index];
    if (line) {
      this.visibleChars = Math.min(line.length, this.visibleChars + (this.revealSpeed * (dt ?? 0)));
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
    return typeof line === "string" ? this.visibleChars >= line.length : true;
  }

  close() {
    const was = this.active;
    this.active = false;
    this.lines = [];
    this.index = 0;
    const cb = this.onClose; this.onClose = null; this.sourceId = null;
    if (was && typeof cb === "function") cb();
  }

  draw(ctx, canvas) {
    // garde dure : si pas de contenu, on ne dessine pas et on ferme
    if (!this._hasCurrent()) { this.close(); return; }

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
    const shown = typeof line === "string"
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
      : "Echap : afficher la phrase instantanement";
    ctx.fillText(hint, x + padding, y + boxH - 12);
    ctx.restore();
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/);
  let line = "", yy = y;
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
