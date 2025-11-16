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
    this.maxHp = this.hp;
    const baseAttackRadius = opts.attackRadius ?? CONFIG.playerAttackRadius ?? this.r * 2.2;
    this.attackRadius = baseAttackRadius;
    this.attackActiveDuration = opts.attackActiveDuration ?? CONFIG.playerAttackDuration ?? 0.25;
    this._attackTimer = 0;
    this._attackCanHit = false;

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
    const aim = inputs.aim;
    const hasAim =
      Boolean(inputs.aimValid) && Boolean(aim && Number.isFinite(aim.x) && Number.isFinite(aim.y));
    const moveVector = inputs.moveVector;
    const pointerMove = moveVector && Number.isFinite(moveVector.x) && Number.isFinite(moveVector.y);

    if (hasAim) this._setFacingTowards(aim.x, aim.y);

    if (this.hp <= 0) {
      this.animator.play("dead", { sticky: true });
    } else {
      if (attack) {
        this.animator.play("attack");
        this._attackTimer = this.attackActiveDuration;
        this._attackCanHit = true;
      }
      if (jump) this.animator.play("jump");
    }

    let vx = 0;
    let vy = 0;
    let usingMouseMove = false;
    const keyboardX =
      (Keys.has("d") || Keys.has("arrowright") ? 1 : 0) -
      (Keys.has("q") || Keys.has("arrowleft") ? 1 : 0);
    const keyboardY =
      (Keys.has("s") || Keys.has("arrowdown") ? 1 : 0) -
      (Keys.has("z") || Keys.has("arrowup") ? 1 : 0);
    const pointerDeadzone = inputs.pointerDeadzone ?? CONFIG.playerMouseDeadzone ?? 18;
    if (pointerMove && moveVector.dist > pointerDeadzone) {
      usingMouseMove = true;
      const dist = moveVector.dist || Math.hypot(moveVector.x, moveVector.y) || 1;
      vx = moveVector.x / dist;
      vy = moveVector.y / dist;
    } else if (keyboardX !== 0 || keyboardY !== 0) {
      const mag = Math.hypot(keyboardX, keyboardY) || 1;
      vx = keyboardX / mag;
      vy = keyboardY / mag;
    }

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
      if (moved && !(hasAim || usingMouseMove)) {
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
    if (this._attackTimer > 0) {
      this._attackTimer = Math.max(0, this._attackTimer - dt);
      if (this._attackTimer === 0) this._attackCanHit = false;
    }
  }

  _pickDirectionalAction(action) {
    if (action !== "walk" && action !== "run") return action;
    const directional = `${action}_${this.facing}`;
    return this.animator.animations[directional] ? directional : action;
  }

  _setFacingTowards(tx, ty) {
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;
    const dx = tx - this.x;
    if (Math.abs(dx) < 0.5) return;
    this.facing = dx >= 0 ? "right" : "left";
  }

  _getFacingVector() {
    return this.facing === "left" ? { x: -1, y: 0 } : { x: 1, y: 0 };
  }

  isAttackActive() {
    return this._attackTimer > 0;
  }

  canDealAttackDamage() {
    return this._attackTimer > 0 && this._attackCanHit;
  }

  confirmAttackHit() {
    this._attackCanHit = false;
  }

  resetCombatState() {
    this._attackTimer = 0;
    this._attackCanHit = false;
    this.hurtCooldown = 0;
    this.recoveryCooldown = 0;
    if (this.animator) {
      this.animator.setBase("idle");
      this.animator.reset();
      if (this.animator.blocking) this.animator.blocking = null;
    }
  }
  isTargetInAttackArc(tx, ty) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return true;
    const facingVec = this._getFacingVector();
    const nx = dx / dist;
    const ny = dy / dist;
    return nx * facingVec.x + ny * facingVec.y >= 0;
  }

  _getFacingVector() {
    return this.facing === "left" ? { x: -1, y: 0 } : { x: 1, y: 0 };
  }
}

function circleFree(world, x, y, r) {
  return world.circleFree(x, y, r);
}
