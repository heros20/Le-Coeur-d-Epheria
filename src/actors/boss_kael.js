import { CONFIG } from "../config.js";
import { Animator } from "../utils/animator.js";

export class BossKael {
  constructor(animations = {}, x, y, opts = {}) {
    this.x = x;
    this.y = y;
    this.hp = CONFIG.kael.hp;
    this.alive = true;
    const baseAnimations = filterBossAnimations(animations);
    this.animator = new Animator(baseAnimations, "idle");
    this.scale = opts.scale ?? 0.35;
    const baseRadius = (CONFIG.actorRadius ?? 12) * (this.scale / 0.35);
    this.hitRadius = opts.hitRadius ?? opts.radius ?? Math.max(12, baseRadius * 1.5);
    this.facing = "right";

    const cfg = CONFIG.kael ?? {};
    this.speed = cfg.speed ?? 120;
    this.preferredDistance = cfg.preferredDistance ?? 120;
    this.attackRange = cfg.attackRange ?? 150;
    this.attackCooldown = cfg.attackCooldown ?? 2.4;
    this.windupDuration = cfg.attackWindup ?? 0.75;
    this.dashDuration = cfg.dashDuration ?? 0.35;
    this.dashSpeed = cfg.dashSpeed ?? this.speed * 3;
    this.dashDamage = cfg.dashDamage ?? 40;
    this.knockback = cfg.knockback ?? 24;
    this.knockbackResistance = cfg.knockbackResistance ?? 0.35;
    this.orbCooldown = cfg.orbCooldown ?? 7;
    this.orbCount = cfg.orbCount ?? 3;
    this.orbLifetime = cfg.orbLifetime ?? 3.5;
    this.orbOrbitRadius = cfg.orbOrbitRadius ?? 95;
    this.orbSpinSpeed = cfg.orbSpinSpeed ?? 2.4;
    this.orbLaunchSpeed = cfg.orbLaunchSpeed ?? 240;
    this.orbDamage = cfg.orbDamage ?? 25;
    this.fissureCooldown = cfg.fissureCooldown ?? 9;
    this.fissureWindup = cfg.fissureWindup ?? 0.9;
    this.fissureLength = cfg.fissureLength ?? 280;
    this.fissureSpeed = cfg.fissureSpeed ?? 280;
    this.fissureWidth = cfg.fissureWidth ?? 42;
    this.fissureDamage = cfg.fissureDamage ?? 32;

    this.cooldownTimer = this.attackCooldown * 0.5;
    this.windupTimer = 0;
    this.dashTimer = 0;
    this.dashVector = { x: 0, y: 0 };
    this.lastTarget = { x, y };
    this.telegraph = null;
    this.dashHit = false;
    this._lastWorld = null;
    this.orbTimer = this.orbCooldown * 0.5;
    this.orbs = [];
    this.fissureTimer = this.fissureCooldown * 0.7;
    this.fissures = [];
  }

  update(dt, player, world) {
    this._lastWorld = world;

    if (!this.alive) {
      this.animator.setBase("dead");
      this.animator.update(dt);
      return;
    }

    this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;
    let moved = false;

    if (this.windupTimer > 0) {
      this.windupTimer -= dt;
      if (this.telegraph) {
        const progress = 1 - this.windupTimer / this.windupDuration;
        this.telegraph.progress = progress;
      }
      this.animator.setBase("idle");
      if (this.windupTimer <= 0) this._beginDash();
    } else if (this.dashTimer > 0) {
      const step = this.dashSpeed * dt;
      moved = this._move(world, this.dashVector.x * step, this.dashVector.y * step) || moved;
      this.dashTimer -= dt;
      this.animator.setBase(this._directionalAction("run"));
      const currentDist = Math.hypot(player.x - this.x, player.y - this.y);
      if (!this.dashHit && currentDist < 42) {
        player.applyDamage(this.dashDamage);
        this.dashHit = true;
      }
      if (this.dashTimer <= 0) {
        this.cooldownTimer = this.attackCooldown;
        this.telegraph = null;
      }
    } else {
      let moveX = 0;
      let moveY = 0;
      const closeThreshold = this.preferredDistance - 20;
      const farThreshold = this.preferredDistance + 30;
      if (dist > farThreshold) {
        moveX = dirX;
        moveY = dirY;
      } else if (dist < closeThreshold) {
        moveX = -dirX;
        moveY = -dirY;
      } else {
        moveX = -dirY;
        moveY = dirX;
      }
      const norm = Math.hypot(moveX, moveY) || 1;
      moveX /= norm;
      moveY /= norm;
      const step = this.speed * (dist < closeThreshold ? 0.8 : 1) * dt;
      moved = this._move(world, moveX * step, moveY * step);

      const readyForDash = this.cooldownTimer <= 0 && !this.windupTimer && !this.dashTimer;
      if (readyForDash) {
        this._startWindup(player);
      }
    }

    if (!this.windupTimer && !this.dashTimer && this.alive) {
      this.animator.setBase(moved ? this._directionalAction("run") : "idle");
    }
    this.animator.update(dt);

    this._updateOrbs(dt, player);
    this._updateFissures(dt, player);

    this.orbTimer = Math.max(0, this.orbTimer - dt);
    this.fissureTimer = Math.max(0, this.fissureTimer - dt);

    if (
      this.orbTimer <= 0 &&
      this.orbs.length === 0 &&
      this.windupTimer <= 0 &&
      this.dashTimer <= 0 &&
      this.alive
    ) {
      this._spawnOrbs(player);
      this.orbTimer = this.orbCooldown;
    }

    if (
      this.fissureTimer <= 0 &&
      this.windupTimer <= 0 &&
      this.dashTimer <= 0 &&
      this.alive
    ) {
      this._spawnFissure(player);
      this.fissureTimer = this.fissureCooldown;
    }
  }

  resetForFight(spawn = {}) {
    if (spawn && typeof spawn === "object") {
      if (Number.isFinite(spawn.x)) this.x = spawn.x;
      if (Number.isFinite(spawn.y)) this.y = spawn.y;
    }
    this.hp = CONFIG.kael.hp;
    this.alive = true;
    this.cooldownTimer = this.attackCooldown * 0.5;
    this.windupTimer = 0;
    this.dashTimer = 0;
    this.dashVector = { x: 0, y: 0 };
    this.lastTarget = { x: this.x, y: this.y };
    this.telegraph = null;
    this.dashHit = false;
    this.orbTimer = this.orbCooldown * 0.5;
    this.orbs = [];
    this.fissureTimer = this.fissureCooldown * 0.7;
    this.fissures = [];
    this.animator.setBase("idle");
  }

  hit(amount = 10, source = null) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.animator.play("hurt");
    if (source) this._applyKnockback(source);
    if (this.hp <= 0) {
      this.alive = false;
      this.animator.play("dead", { sticky: true, force: true });
      this.telegraph = null;
      this.windupTimer = 0;
      this.dashTimer = 0;
    }
  }

  draw(ctx) {
    if (this.telegraph) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "rgba(255, 80, 64, 0.25)";
      ctx.beginPath();
      ctx.arc(this.lastTarget.x, this.lastTarget.y, this.telegraph.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 10]);
      ctx.strokeStyle = "rgba(255, 150, 90, 0.9)";
      ctx.stroke();
      ctx.restore();
    }

    this._drawFissures(ctx);
    this._drawOrbs(ctx);

    const frame = this.animator.getFrame();
    if (!frame) return;
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
  }

  _startWindup(player) {
    this.windupTimer = this.windupDuration;
    this.telegraph = {
      radius: Math.max(50, this.attackRange * 0.35),
      progress: 0,
    };
    this.lastTarget = { x: player.x, y: player.y };
    this.animator.setBase("idle");
  }

  _beginDash() {
    const dx = this.lastTarget.x - this.x;
    const dy = this.lastTarget.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    this.dashVector = { x: dx / len, y: dy / len };
    this.dashTimer = this.dashDuration;
    this.dashHit = false;
  }

  _move(world, mx, my) {
    if (!world) return false;
    let moved = false;
    const prevX = this.x;
    if (!world.isBlocked(this.x + mx, this.y)) {
      this.x += mx;
      moved = true;
    }
    if (!world.isBlocked(this.x, this.y + my)) {
      this.y += my;
      moved = true;
    }
    if (moved) {
      const deltaX = this.x - prevX;
      if (Math.abs(deltaX) > 0.5) {
        this.facing = deltaX > 0 ? "right" : "left";
      } else if (mx !== 0) {
        this.facing = mx > 0 ? "right" : "left";
      }
    }
    return moved;
  }

  _applyKnockback(source) {
    if (!this._lastWorld) return;
    const dx = this.x - source.x;
    const dy = this.y - source.y;
    const dist = Math.hypot(dx, dy) || 1;
    const strength = this.knockback * (1 - this.knockbackResistance);
    const mx = (dx / dist) * strength;
    const my = (dy / dist) * strength;
    this._move(this._lastWorld, mx, my);
  }

  _directionalAction(action) {
    const directional = `${action}_${this.facing}`;
    if (this.animator.animations[directional]) return directional;
    const walk = `walk_${this.facing}`;
    if (this.animator.animations[walk]) return walk;
    return action;
  }

  _spawnOrbs(player) {
    const baseAngle = Math.random() * Math.PI * 2;
    const count = this.orbCount;
    this.orbs = [];
    for (let i = 0; i < count; i++) {
      this.orbs.push({
        angle: baseAngle + (i / count) * Math.PI * 2,
        timer: this.orbLifetime,
        state: "orbit",
        x: this.x,
        y: this.y,
        dirX: 0,
        dirY: 0,
        color: `hsla(${(i / count) * 360}, 70%, 60%, 0.9)`,
      });
    }
  }

  _updateOrbs(dt, player) {
    if (this.orbs.length === 0) return;
    for (const orb of this.orbs) {
      if (orb.state === "orbit") {
        orb.angle += this.orbSpinSpeed * dt;
        orb.timer -= dt;
        orb.x = this.x + Math.cos(orb.angle) * this.orbOrbitRadius;
        orb.y = this.y + Math.sin(orb.angle) * this.orbOrbitRadius;
        if (orb.timer <= 0) {
          const dx = player.x - orb.x;
          const dy = player.y - orb.y;
          const d = Math.hypot(dx, dy) || 1;
          orb.dirX = dx / d;
          orb.dirY = dy / d;
          orb.state = "launch";
          orb.timer = 2.5;
        }
      } else if (orb.state === "launch") {
        const step = this.orbLaunchSpeed * dt;
        orb.x += orb.dirX * step;
        orb.y += orb.dirY * step;
        orb.timer -= dt;
        if (Math.hypot(player.x - orb.x, player.y - orb.y) < 30) {
          player.applyDamage(this.orbDamage);
          orb.timer = -1;
        }
        if (this._lastWorld && this._lastWorld.isBlocked(orb.x, orb.y)) {
          orb.timer = -1;
        }
      }
    }
    this.orbs = this.orbs.filter((o) => o.timer > 0);
  }

  _drawOrbs(ctx) {
    if (this.orbs.length === 0) return;
    ctx.save();
    for (const orb of this.orbs) {
      ctx.globalAlpha = orb.state === "orbit" ? 0.8 : 1;
      ctx.fillStyle = orb.color;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, 14, 0, Math.PI * 2);
      ctx.fill();
      if (orb.state === "launch") {
        ctx.strokeStyle = orb.color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, 20, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _spawnFissure(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.fissures.push({
      startX: this.x,
      startY: this.y,
      dirX: dx / d,
      dirY: dy / d,
      windup: this.fissureWindup,
      progress: 0,
      active: false,
      completed: false,
    });
  }

  _updateFissures(dt, player) {
    if (this.fissures.length === 0) return;
    for (const fissure of this.fissures) {
      if (fissure.completed) continue;
      if (!fissure.active) {
        fissure.windup -= dt;
        if (fissure.windup <= 0) {
          fissure.active = true;
          fissure.progress = 0;
        }
      } else {
        fissure.progress += this.fissureSpeed * dt;
        if (fissure.progress >= this.fissureLength) fissure.completed = true;
        const proj = this._projectOnLine(
          player.x,
          player.y,
          fissure.startX,
          fissure.startY,
          fissure.dirX,
          fissure.dirY
        );
        if (proj > 0 && proj < fissure.progress + 10) {
          const perp = this._distanceToLine(
            player.x,
            player.y,
            fissure.startX,
            fissure.startY,
            fissure.dirX,
            fissure.dirY
          );
          if (Math.abs(perp) < this.fissureWidth * 0.5) {
            player.applyDamage(this.fissureDamage * dt);
          }
        }
      }
    }
    this.fissures = this.fissures.filter((f) => !f.completed);
  }

  _drawFissures(ctx) {
    if (this.fissures.length === 0) return;
    ctx.save();
    ctx.lineWidth = this.fissureWidth;
    for (const fissure of this.fissures) {
      const maxLength = fissure.active ? fissure.progress : this.fissureLength;
      const endX = fissure.startX + fissure.dirX * maxLength;
      const endY = fissure.startY + fissure.dirY * maxLength;
      ctx.strokeStyle = fissure.active
        ? "rgba(255,120,20,0.65)"
        : "rgba(255,180,80,0.35)";
      ctx.globalAlpha = fissure.active ? 0.9 : 0.6;
      ctx.beginPath();
      ctx.moveTo(fissure.startX, fissure.startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      if (!fissure.active) {
        ctx.globalAlpha = 0.4;
        ctx.setLineDash([12, 14]);
        ctx.lineWidth = this.fissureWidth * 0.6;
        ctx.strokeStyle = "rgba(255, 200, 120, 0.8)";
        ctx.beginPath();
        ctx.moveTo(fissure.startX, fissure.startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  _projectOnLine(px, py, lx, ly, dx, dy) {
    const vx = px - lx;
    const vy = py - ly;
    return vx * dx + vy * dy;
  }

  _distanceToLine(px, py, lx, ly, dx, dy) {
    const vx = px - lx;
    const vy = py - ly;
    return (vx * -dy + vy * dx);
  }
}

function filterBossAnimations(animations = {}) {
  const result = {};
  if (!animations) return result;
  const allowedBase = new Set(["idle", "jump", "hurt", "dead"]);
  for (const [key, value] of Object.entries(animations)) {
    if (!value) continue;
    if (key.startsWith("walk") || key.startsWith("run")) {
      result[key] = value;
      continue;
    }
    if (allowedBase.has(key)) {
      result[key] = value;
    }
  }
  return result;
}
