const FALLBACK_ORDER = ["idle", "walk", "run", "attack", "jump", "hurt", "dead"];

export class Animator {
  constructor(animations = {}, baseAction = "idle") {
    this.animations = animations;
    this.baseAction = this._resolveAction(baseAction);
    this.blocking = null;
    this.frameIndex = 0;
    this.frameTimer = 0;
  }

  setAnimations(anims = {}) {
    this.animations = anims;
    this.baseAction = this._resolveAction(this.baseAction);
    this.blocking = null;
    this.reset();
  }

  play(action, opts = {}) {
    const resolved = this._resolveAction(action);
    if (!resolved) return;
    if (this.blocking?.sticky && !opts.force) return;
    if (this.blocking && this.blocking.name === resolved && !opts.force) return;
    const clip = this.animations[resolved];
    if (!clip) return;
    const sticky = Boolean(opts.sticky || clip.sticky);
    this.blocking = { name: resolved, elapsed: 0, sticky };
    this.reset();
  }

  setBase(action) {
    const resolved = this._resolveAction(action);
    if (!resolved || this.baseAction === resolved) return;
    this.baseAction = resolved;
    if (!this.blocking) this.reset();
  }

  update(dt) {
    const clip = this._getCurrentClip();
    if (!clip || !clip.frames || clip.frames.length === 0) return;
    const frameCount = clip.frames.length;
    const fps = clip.fps || 8;
    const frameDuration = 1 / fps;
    this.frameTimer += dt;

    while (this.frameTimer >= frameDuration) {
      this.frameTimer -= frameDuration;
      this.frameIndex++;
      if (this.frameIndex >= frameCount) {
        if (clip.loop !== false && !clip.sticky) {
          this.frameIndex = 0;
        } else {
          this.frameIndex = frameCount - 1;
          if (this.blocking && !this.blocking.sticky) {
            this.blocking = null;
            this.reset();
          }
          break;
        }
      }
    }

    if (this.blocking && clip.loop === false && !this.blocking.sticky) {
      const clipDuration = frameCount * frameDuration;
      this.blocking.elapsed += dt;
      if (this.blocking.elapsed >= clipDuration) {
        this.blocking = null;
        this.reset();
      }
    }
  }

  getFrame() {
    const clip = this._getCurrentClip();
    if (!clip || !clip.frames || clip.frames.length === 0) return null;
    const idx = Math.min(this.frameIndex, clip.frames.length - 1);
    return clip.frames[idx];
  }

  reset() {
    this.frameIndex = 0;
    this.frameTimer = 0;
  }

  _getCurrentClip() {
    const action = this.blocking?.name ?? this.baseAction;
    if (!action) return null;
    return this.animations[action] ?? null;
  }

  _resolveAction(action) {
    if (!action) action = "idle";
    if (this.animations[action]) return action;
    for (const name of FALLBACK_ORDER) {
      if (this.animations[name]) return name;
    }
    const keys = Object.keys(this.animations);
    return keys.length > 0 ? keys[0] : null;
  }
}
