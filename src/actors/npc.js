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
    this.hitFlash = 0;
    this._dashTimer = 0;
    this._dashDuration = 0;
    this._dashSpeed = 0;
    this._dashVector = { x: 1, y: 0 };
  }

  update(dt, target, world) {
    let moving = false;
    let dx = 0;
    let dy = 0;
    const prevX = this.x;
    const blockedAt = (xx, yy) => world?.isBlocked?.(xx, yy) ?? false;

    const tryMoveTo = (nx, ny) => {
      if (!world) return false;
      const radius = this.hitRadius ?? CONFIG.actorRadius ?? 12;
      const free = typeof world.circleFree === "function"
        ? world.circleFree(nx, ny, radius)
        : !blockedAt(nx, ny);
      if (!free) return false;
      this.x = nx;
      this.y = ny;
      return true;
    };

    if (this._dashTimer > 0) {
      const step = (this._dashSpeed || this.speed) * dt;
      const targetX = this.x + this._dashVector.x * step;
      const targetY = this.y + this._dashVector.y * step;
      const moved = tryMoveTo(targetX, targetY);
      moving = Boolean(moved);
      if (!moving && world) {
        const splitX = tryMoveTo(targetX, this.y);
        const splitY = tryMoveTo(this.x, targetY);
        moving = splitX || splitY;
      }
      dx = this._dashVector.x;
      dy = this._dashVector.y;
      this._dashTimer = Math.max(0, this._dashTimer - dt);
      if (!moving && world) {
        this._tryUnstuck(world, dx, dy);
      }
    } else if (this.follow && target && world) {
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
        if (!blockedAt(nx, this.y)) {
          this.x = nx;
          movedX = true;
        }
        if (!blockedAt(this.x, ny)) {
          this.y = ny;
          movedY = true;
        }
        moving = movedX || movedY;
        if (!moving) {
          this._tryUnstuck(world, dx, dy);
        }
      } else if (dist < desiredDist * 0.6 && !blockedAt(this.x - dx, this.y - dy)) {
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
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);
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
      if (this.hitFlash > 0) {
        const alpha = Math.min(0.6, this.hitFlash / 0.3);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(255,70,90,0.9)";
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, dw * 0.35, dh * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
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

  _tryUnstuck(world, dx = 0, dy = 0) {
    if (!world) return;
    const baseAttempts = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
    ];
    const step = Math.max(6, (world.cell ?? 12) * 0.6);
    const dist = Math.hypot(dx, dy);
    const normalized = dist > 0 ? { x: dx / dist, y: dy / dist } : null;
    const attempts = baseAttempts.map((dir) => ({ ...dir }));
    if (normalized) {
      attempts.sort((a, b) => {
        const scoreA = a.x * normalized.x + a.y * normalized.y;
        const scoreB = b.x * normalized.x + b.y * normalized.y;
        return scoreB - scoreA;
      });
    }
    for (const dir of attempts) {
      const nx = this.x + dir.x * step;
      const ny = this.y + dir.y * step;
      if (!world.isBlocked(nx, ny)) {
        this.x = nx;
        this.y = ny;
        break;
      }
    }
  }

  startPartnerDash(direction, opts = {}) {
    if (!direction) return false;
    const dx = Number(direction.x) || 0;
    const dy = Number(direction.y) || 0;
    const mag = Math.hypot(dx, dy);
    if (mag === 0) return false;
    const duration = Number.isFinite(opts.duration) ? opts.duration : (CONFIG.dashDuration ?? 0.25);
    const speedCandidate =
      Number.isFinite(opts.speed) && opts.speed > 0 ? opts.speed : this.speed * 2.5;
    if (duration <= 0 || speedCandidate <= 0) return false;
    this._dashVector = { x: dx / mag, y: dy / mag };
    this._dashSpeed = speedCandidate;
    this._dashDuration = duration;
    this._dashTimer = duration;
    return true;
  }

  isPartnerDashing() {
    return this._dashTimer > 0;
  }

  applyDamage(dmg) {
    if (!Number.isFinite(this.hp)) return false;
    this.hp = Math.max(0, this.hp - Math.max(0, dmg || 0));
    this.hitFlash = 0.3;
    return this.hp === 0;
  }
}
