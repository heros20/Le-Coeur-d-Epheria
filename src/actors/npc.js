import { Animator } from "../utils/animator.js";

export class NPC {
  constructor(animations = {}, x, y, name = "Kael", opts = {}) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.follow = opts.follow ?? false;
    this.speed = opts.speed ?? 90;
    this.keepDistance = opts.keepDistance ?? 80;
    this.scale = opts.scale ?? 0.35;
    this.moveAction = opts.moveAction ?? "walk";
    this.idleAction = opts.idleAction ?? "idle";
    this.animator = new Animator(animations ?? {}, this.idleAction);
    this.fallbackImage = opts.fallback ?? null;
    this.facing = opts.facing ?? "right";
  }

  update(dt, target, world) {
    let moving = false;
    let dx = 0;
    let dy = 0;
    const prevX = this.x;
    if (this.follow && target && world) {
      dx = target.x - this.x;
      dy = target.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > this.keepDistance) {
        const step = this.speed * dt;
        const mx = (dx / dist) * step;
        const my = (dy / dist) * step;
        let nx = this.x + mx;
        let ny = this.y + my;
        if (!world.isBlocked(nx, this.y)) this.x = nx;
        if (!world.isBlocked(this.x, ny)) this.y = ny;
        moving = true;
      }
    }
    if (moving) {
      const movedX = this.x - prevX;
      if (Math.abs(movedX) > 0.5) {
        this.facing = movedX > 0 ? "right" : "left";
      } else if (dx !== 0) {
        this.facing = dx > 0 ? "right" : "left";
      }
    }
    const baseAction = moving ? this._pickDirectionalAction(this.moveAction) : this.idleAction;
    this.animator.setBase(baseAction);
    this.animator.update(dt);
  }

  draw(ctx) {
    const frame = this.animator.getFrame();
    if (frame) {
      const dw = frame.sw * this.scale;
      const dh = frame.sh * this.scale;
      ctx.drawImage(
        frame.image,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
        Math.round(this.x - dw / 2),
        Math.round(this.y - dh / 2),
        dw,
        dh
      );
    } else if (this.fallbackImage) {
      const w = this.fallbackImage.width * this.scale;
      const h = this.fallbackImage.height * this.scale;
      ctx.drawImage(
        this.fallbackImage,
        Math.round(this.x - w / 2),
        Math.round(this.y - h / 2),
        w,
        h
      );
    }
  }

  _pickDirectionalAction(action) {
    const directional = `${action}_${this.facing}`;
    if (this.animator.animations[directional]) return directional;
    if (action !== "walk") {
      const fallbackWalk = `walk_${this.facing}`;
      if (this.animator.animations[fallbackWalk]) return fallbackWalk;
    }
    return action;
  }
}
