import { CONFIG } from "../config.js";
import { Keys, consume } from "../input.js";
import { Animator } from "../utils/animator.js";

export class Player {
  constructor(img, x, y, animations = {}, opts = {}) {
    this.img = img;
    this.x = x;
    this.y = y;
    this.animator = new Animator(animations ?? {}, "idle");
    this.scale = opts.scale ?? 0.35;
    this.facing = "right";

    this.r = CONFIG.actorRadius ?? 8;
    this.speed = CONFIG.speed;
    this.hp = 100;

    this.staminaMax = CONFIG.staminaMax ?? 100;
    this.stamina = this.staminaMax;
    this.staminaDrain = CONFIG.staminaDrain ?? 25;
    this.staminaRegen = CONFIG.staminaRegen ?? 18;
    this.sprintMult = CONFIG.sprintMult ?? 1.45;
    this.shadowPenalty = CONFIG.shadowPenalty ?? 0.8;

    this.recoveryCooldown = 0;
    this.recoveryDelay = CONFIG.staminaDelay ?? 0.6;

    this.torchOn = true;
    this._torchCooldown = 0;

    this.hurtCooldown = 0;
  }

  update(dt, world, mode, inputs = {}) {
    this._tickCooldowns(dt);
    const attack = Boolean(inputs.attack);
    const jump = Boolean(inputs.jump);

    if (this.hp <= 0) {
      this.animator.play("dead", { sticky: true });
    } else {
      if (attack) this.animator.play("attack");
      if (jump) this.animator.play("jump");
    }

    let vx = 0;
    let vy = 0;
    if (Keys.has("z") || Keys.has("arrowup")) vy -= 1;
    if (Keys.has("s") || Keys.has("arrowdown")) vy += 1;
    if (Keys.has("q") || Keys.has("arrowleft")) vx -= 1;
    if (Keys.has("d") || Keys.has("arrowright")) vx += 1;
    const mag = Math.hypot(vx, vy) || 1;
    vx /= mag;
    vy /= mag;

    let sp = this.speed * (mode === "SHADOW" ? this.shadowPenalty : 1);
    const canSprint = this.stamina > 0.1 && this.recoveryCooldown <= 0;
    const wantsSprint = (Keys.has("shift") || Keys.has(" ")) && canSprint;
    if (wantsSprint) sp *= this.sprintMult;

    const prevX = this.x;
    const prevY = this.y;

    if (this.hp > 0) {
      const dx = vx * sp * dt;
      const dy = vy * sp * dt;

      const stepSize = Math.max(2, this.r * 0.75);
      const total = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(total / stepSize));
      let nx = this.x;
      let ny = this.y;

      for (let i = 0; i < steps; i++) {
        const sx = dx / steps;
        const sy = dy / steps;
        if (circleFree(world, nx + sx, ny + sy, this.r)) {
          nx += sx;
          ny += sy;
        } else {
          if (circleFree(world, nx + sx, ny, this.r)) nx += sx;
          if (circleFree(world, nx, ny + sy, this.r)) ny += sy;
        }
      }

      this.x = nx;
      this.y = ny;

      const moved = this.x !== prevX || this.y !== prevY;
      if (moved) {
        const dxMoved = this.x - prevX;
        if (Math.abs(dxMoved) > 0.5) {
          this.facing = dxMoved > 0 ? "right" : "left";
        } else if (vx !== 0) {
          this.facing = vx > 0 ? "right" : "left";
        }
      }
      if (wantsSprint && moved) {
        const before = this.stamina;
        this.stamina = Math.max(0, this.stamina - this.staminaDrain * dt);
        if (before > 0 && this.stamina === 0) this.recoveryCooldown = this.recoveryDelay;
      } else if (this.recoveryCooldown <= 0) {
        this.stamina = Math.min(this.staminaMax, this.stamina + this.staminaRegen * dt);
      }

      if (moved) {
        const base = wantsSprint ? "run" : "walk";
        this.animator.setBase(this._pickDirectionalAction(base));
      } else {
        this.animator.setBase("idle");
      }
    } else {
      this.animator.setBase("dead");
    }

    if (!circleFree(world, this.x, this.y, this.r * 0.9)) {
      const p = world.nearestOpen(this.x, this.y, this.r);
      this.x = p.x;
      this.y = p.y;
    }

    if (consume("t") && this._torchCooldown <= 0) {
      this.torchOn = !this.torchOn;
      this._torchCooldown = 0.2;
    }

    this.animator.update(dt);
  }

  applyDamage(amount) {
    if (amount <= 0 || this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) {
      this.animator.play("dead", { sticky: true, force: true });
      return;
    }
    if (this.hurtCooldown <= 0) {
      this.animator.play("hurt");
      this.hurtCooldown = 0.4;
    }
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
    } else if (this.img) {
      const baseW = 64 * this.scale;
      const baseH = 64 * this.scale;
      ctx.drawImage(
        this.img,
        Math.round(this.x - baseW / 2),
        Math.round(this.y - baseH / 2),
        baseW,
        baseH
      );
    }
  }

  _tickCooldowns(dt) {
    if (this._torchCooldown > 0) this._torchCooldown -= dt;
    if (this.recoveryCooldown > 0) this.recoveryCooldown -= dt;
    if (this.hurtCooldown > 0) this.hurtCooldown -= dt;
  }

  _pickDirectionalAction(action) {
    if (action !== "walk" && action !== "run") return action;
    const directional = `${action}_${this.facing}`;
    return this.animator.animations[directional] ? directional : action;
  }
}

function circleFree(world, x, y, r) {
  return world.circleFree(x, y, r);
}
