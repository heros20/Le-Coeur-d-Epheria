import { CONFIG } from "../config.js";
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
    const baseRadius = CONFIG.actorRadius ?? 12;
    this.hitRadius = opts.hitRadius ?? opts.radius ?? baseRadius;
    this.hp = Number.isFinite(opts.hp) ? opts.hp : null;
    this.maxHp = Number.isFinite(opts.hp) ? opts.hp : null;
    this.attackDamage = opts.attackDamage ?? null;
    this.attackRange = opts.attackRange ?? null;
    this.attackCooldown = 0;
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
      const desiredDist = this.keepDistance * 0.35;
      if (dist > desiredDist) {
        const sprintMult = target?.isSprinting ? (CONFIG.sprintMult ?? 1.45) : 1;
        const dashMult = target?.isDashing ? 2.2 : 1;
        const step = this.speed * sprintMult * dashMult * dt * 1.25;
        const mx = (dx / dist) * step;
        const my = (dy / dist) * step;
        const nx = this.x + mx;
        const ny = this.y + my;
        let movedX = false;
        let movedY = false;
        if (!world.isBlocked(nx, this.y)) {
          this.x = nx;
          movedX = true;
        }
        if (!world.isBlocked(this.x, ny)) {
          this.y = ny;
          movedY = true;
        }
        moving = movedX || movedY;
        if (!moving) {
          this._tryUnstuck(world);
        }
      } else if (dist < desiredDist * 0.6 && !world.isBlocked(this.x - dx, this.y - dy)) {
        this.x -= (dx / dist) * this.speed * dt;
        this.y -= (dy / dist) * this.speed * dt;
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

  _tryUnstuck(world) {
    const attempts = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
    ];
    for (const dir of attempts) {
      const step = 12;
      const nx = this.x + dir.x * step;
      const ny = this.y + dir.y * step;
      if (!world.isBlocked(nx, ny)) {
        this.x = nx;
        this.y = ny;
        break;
      }
    }
  }

  applyDamage(dmg) {
    if (!Number.isFinite(this.hp)) return false;
    this.hp = Math.max(0, this.hp - Math.max(0, dmg || 0));
    return this.hp === 0;
  }
}
