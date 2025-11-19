import { CONFIG } from "../config.js";
import { Animator } from "../utils/animator.js";

export class BossKael {
  constructor(animations = {}, x, y, opts = {}) {
    this.x = x;
    this.y = y;
    this.hp = CONFIG.kael.hp;
    this.maxHp = this.hp;
    this.alive = true;
    const baseAnimations = filterBossAnimations(animations);
    this.animator = new Animator(baseAnimations, "idle");
    this.scale = opts.scale ?? 0.35;
    const baseRadius = (CONFIG.actorRadius ?? 12) * (this.scale / 0.35);
    this.hitRadius = opts.hitRadius ?? opts.radius ?? Math.max(12, baseRadius * 1.5);
    this.facing = "right";

    const cfg = CONFIG.kael ?? {};
    const phaseTwo = cfg.phaseTwo ?? {};
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
    this.phaseTwo = {
      hpMultiplier: phaseTwo.hpMultiplier ?? 1.5,
      sigilDamage: phaseTwo.sigilDamage ?? 36,
      cloneDamage: phaseTwo.cloneDamage ?? 40,
      beamDamage: phaseTwo.beamDamage ?? 48,
    };

    this.cooldownTimer = this.attackCooldown * 0.5;
    this.windupTimer = 0;
    this.dashTimer = 0;
    this.dashVector = { x: 0, y: 0 };
    this.lastTarget = { x, y };
    this.telegraph = null;
    this.dashHit = false;
    this.dashCanDamage = true;
    this._lastWorld = null;
    this.orbs = [];
    this.fissures = [];
    this.sigils = [];
    this.clones = [];
    this.beamAttack = null;
    this.phase = 1;
    this.onPlaySound = typeof opts.onPlaySound === "function" ? opts.onPlaySound : null;
    this.currentAction = null;
    this.lastAction = null;
    this.lastMoveVector = { x: 0, y: 0 };
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

    let stuckAgainstWall = false;

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
      if (!this.dashHit && currentDist < 42 && this.dashCanDamage) {
        player.applyDamage(this.dashDamage);
        this.dashHit = true;
      }
      if (this.dashTimer <= 0) {
        this.telegraph = null;
        this._finishAction("dash");
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
      this.lastMoveVector = { x: moveX, y: moveY };
      moved = this._move(world, moveX * step, moveY * step);
      if (!moved && dist < this.hitRadius + 20) {
        stuckAgainstWall = true;
      }
    }

    if (!this.windupTimer && !this.dashTimer && this.alive) {
      this.animator.setBase(moved ? this._directionalAction("run") : "idle");
    }
    this.animator.update(dt);

    this._updateOrbs(dt, player);
    this._updateFissures(dt, player);
    if (this.phase === 2) {
      this._updateSigils(dt, player);
      this._updateClones(dt, player);
      this._updateBeam(dt, player);
    }
    this._cleanupActions();
    if (stuckAgainstWall && !this.windupTimer && !this.dashTimer) {
      this._escapeFromWall(world, player);
    }
    this._tryScheduleAction(player);
  }

  resetForFight(spawn = {}) {
    if (spawn && typeof spawn === "object") {
      if (Number.isFinite(spawn.x)) this.x = spawn.x;
      if (Number.isFinite(spawn.y)) this.y = spawn.y;
    }
    this.maxHp = CONFIG.kael.hp;
    this.hp = this.maxHp;
    this.alive = true;
    this.phase = 1;
    this.cooldownTimer = this.attackCooldown * 0.5;
    this.windupTimer = 0;
    this.dashTimer = 0;
    this.dashVector = { x: 0, y: 0 };
    this.lastTarget = { x: this.x, y: this.y };
    this.telegraph = null;
    this.dashHit = false;
    this.orbs = [];
    this.fissures = [];
    this.sigils = [];
    this.clones = [];
    this.beamAttack = null;
    this.animator.setBase("idle");
    this.currentAction = null;
    this.lastAction = null;
  }

  enterPhaseTwo(opts = {}) {
    this.phase = 2;
    const multiplier = Number.isFinite(opts.hpMultiplier)
      ? opts.hpMultiplier
      : this.phaseTwo.hpMultiplier;
    this.maxHp = Math.round(CONFIG.kael.hp * Math.max(1, multiplier));
    this.hp = this.maxHp;
    this.alive = true;
    if (opts.position && Number.isFinite(opts.position.x) && Number.isFinite(opts.position.y)) {
      this.x = opts.position.x;
      this.y = opts.position.y;
    }
    this.cooldownTimer = this.attackCooldown * 0.35;
    this.windupTimer = 0;
    this.dashTimer = 0;
    this.dashVector = { x: 0, y: 0 };
    this.lastTarget = { x: this.x, y: this.y };
    this.telegraph = null;
    this.dashHit = false;
    this.orbs = [];
    this.fissures = [];
    this.sigils = [];
    this.clones = [];
    this.beamAttack = null;
    this.currentAction = null;
    this.lastAction = null;
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
    this._drawSigils(ctx);
    this._drawClones(ctx);
    this._drawBeam(ctx);

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
    this._playSound("kaelJump");
  }

  _beginDash() {
    const dx = this.lastTarget.x - this.x;
    const dy = this.lastTarget.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    this.dashVector = { x: dx / len, y: dy / len };
    this.dashTimer = this.dashDuration;
    this.dashHit = false;
    this.dashCanDamage = true;
  }

  _move(world, mx, my) {
    if (!world) return false;
    let moved = false;
    let collided = false;
    const prevX = this.x;
    if (mx !== 0) {
      if (!world.isBlocked(this.x + mx, this.y)) {
        this.x += mx;
        moved = true;
      } else {
        collided = true;
      }
    }
    if (my !== 0) {
      if (!world.isBlocked(this.x, this.y + my)) {
        this.y += my;
        moved = true;
      } else {
        collided = true;
      }
    }
    if (moved) {
      const deltaX = this.x - prevX;
      if (Math.abs(deltaX) > 0.5) {
        this.facing = deltaX > 0 ? "right" : "left";
      } else if (mx !== 0) {
        this.facing = mx > 0 ? "right" : "left";
      }
    }
    if (collided) {
      this._handleCollisionResponse(mx, my);
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
    this._playSound("kaelOrbCast");
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
          this._playSound("kaelOrbLaunch");
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

  _spawnSigils(player) {
    const base = Math.atan2(player.y - this.y, player.x - this.x);
    this.sigils = [];
    for (let i = 0; i < 3; i++) {
      const angle = base + (i - 1) * 0.45;
      const distance = 90 + i * 25;
      this.sigils.push({
        x: player.x + Math.cos(angle) * distance,
        y: player.y + Math.sin(angle) * distance,
        radius: 60 + i * 5,
        timer: 0.85 + i * 0.25,
        explode: 0.45,
        exploding: false,
        done: false,
      });
    }
    this._playSound("kaelOrbCast");
  }

  _updateSigils(dt, player) {
    if (!this.sigils.length) return;
    for (const sigil of this.sigils) {
      if (sigil.done) continue;
      if (!sigil.exploding) {
        sigil.timer -= dt;
        if (sigil.timer <= 0) {
          sigil.exploding = true;
          sigil.timer = sigil.explode;
          this._playSound("kaelOrbLaunch");
        }
      } else {
        sigil.timer -= dt;
        const progress = Math.max(0, sigil.timer) / sigil.explode;
        const blastRadius = sigil.radius + (1 - progress) * 35;
        if (Math.hypot(player.x - sigil.x, player.y - sigil.y) < blastRadius) {
          player.applyDamage(this.phaseTwo.sigilDamage * dt * 2.2);
        }
        if (sigil.timer <= 0) sigil.done = true;
      }
    }
    this.sigils = this.sigils.filter((s) => !s.done);
    if (this.currentAction === "sigil" && this.sigils.length === 0) {
      this._finishAction("sigil");
    }
  }

  _drawSigils(ctx) {
    if (!this.sigils.length) return;
    ctx.save();
    for (const sigil of this.sigils) {
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 10]);
      ctx.strokeStyle = sigil.exploding ? "rgba(255,255,255,0.9)" : "rgba(120, 200, 255, 0.7)";
      ctx.globalAlpha = sigil.exploding ? 0.75 : 0.5;
      const radius = sigil.radius + (sigil.exploding ? (1 - Math.max(0, sigil.timer) / sigil.explode) * 25 : 0);
      ctx.beginPath();
      ctx.arc(sigil.x, sigil.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      if (sigil.exploding) {
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.arc(sigil.x, sigil.y, radius * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  _spawnClones(player) {
    this.clones = [];
    const spreads = [-0.55, 0, 0.55];
    const base = Math.atan2(player.y - this.y, player.x - this.x);
    for (const spread of spreads) {
      const angle = base + spread;
      this.clones.push({
        x: this.x,
        y: this.y,
        dirX: Math.cos(angle),
        dirY: Math.sin(angle),
        speed: this.speed * 2.4,
        timer: 1.8,
        hit: false,
      });
    }
    this._playSound("kaelJump");
  }

  _updateClones(dt, player) {
    if (!this.clones.length) return;
    for (const clone of this.clones) {
      clone.timer -= dt;
      const step = clone.speed * dt;
      clone.x += clone.dirX * step;
      clone.y += clone.dirY * step;
      if (!clone.hit && Math.hypot(player.x - clone.x, player.y - clone.y) < 40) {
        player.applyDamage(this.phaseTwo.cloneDamage);
        clone.hit = true;
      }
    }
    this.clones = this.clones.filter((c) => c.timer > 0);
    if (this.currentAction === "clone" && this.clones.length === 0) {
      this._finishAction("clone");
    }
  }

  _drawClones(ctx) {
    if (!this.clones.length) return;
    ctx.save();
    ctx.fillStyle = "rgba(120, 200, 255, 0.35)";
    for (const clone of this.clones) {
      ctx.beginPath();
      ctx.arc(clone.x, clone.y, 26, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _startBeam(player) {
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.beamAttack = {
      angle,
      windup: 0.6,
      duration: 1.4,
      active: false,
      width: 55,
      reach: 420,
    };
    this._playSound("kaelFireCone");
  }

  _updateBeam(dt, player) {
    if (!this.beamAttack) return;
    const beam = this.beamAttack;
    if (!beam.active) {
      beam.windup -= dt;
      if (beam.windup <= 0) {
        beam.active = true;
        this._playSound("kaelOrbLaunch");
      }
    } else {
      beam.duration -= dt;
      const dirX = Math.cos(beam.angle);
      const dirY = Math.sin(beam.angle);
      const relX = player.x - this.x;
      const relY = player.y - this.y;
      const proj = relX * dirX + relY * dirY;
      if (proj > 0 && proj < beam.reach) {
        const perp = Math.abs(relX * -dirY + relY * dirX);
        if (perp < beam.width) {
          player.applyDamage(this.phaseTwo.beamDamage * dt);
        }
      }
      if (beam.duration <= 0) {
        this.beamAttack = null;
        this._finishAction("beam");
      }
    }
  }

  _drawBeam(ctx) {
    if (!this.beamAttack) return;
    const beam = this.beamAttack;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(beam.angle);
    const reach = beam.reach;
    const width = beam.width * (beam.active ? 1 : 0.5);
    ctx.globalAlpha = beam.active ? 0.65 : 0.35;
    ctx.fillStyle = beam.active ? "rgba(255, 120, 80, 0.8)" : "rgba(255, 255, 255, 0.45)";
    ctx.beginPath();
    ctx.moveTo(0, -width);
    ctx.lineTo(reach, -width * 0.35);
    ctx.lineTo(reach, width * 0.35);
    ctx.lineTo(0, width);
    ctx.closePath();
    ctx.fill();
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
    this._playSound("kaelFireCone");
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

  _cleanupActions() {
    if (this.currentAction === "dash" && this.windupTimer <= 0 && this.dashTimer <= 0) {
      this._finishAction("dash");
    }
    if (this.currentAction === "orb" && this.orbs.length === 0) {
      this._finishAction("orb");
    }
    if (this.currentAction === "fissure" && !this._hasActiveFissures()) {
      this._finishAction("fissure");
    }
    if (this.currentAction === "sigil" && this.sigils.length === 0) {
      this._finishAction("sigil");
    }
    if (this.currentAction === "clone" && this.clones.length === 0) {
      this._finishAction("clone");
    }
    if (this.currentAction === "beam" && !this.beamAttack) {
      this._finishAction("beam");
    }
  }

  _hasActiveFissures() {
    return this.fissures.some((f) => !f.completed);
  }

  _finishAction(name) {
    if (this.currentAction !== name) return;
    this.currentAction = null;
    this.lastAction = name;
    this.cooldownTimer = this.attackCooldown;
    this.dashCanDamage = true;
  }

  _tryScheduleAction(player) {
    if (this.currentAction || !this.alive) return;
    if (this.cooldownTimer > 0) return;
    if (this.windupTimer > 0 || this.dashTimer > 0) return;
    if (this.phase === 1 && (this.orbs.length > 0 || this._hasActiveFissures())) return;
    if (this.phase === 2 && (this.sigils.length > 0 || this.clones.length > 0 || this.beamAttack)) return;
    const actions = this.phase === 2 ? ["sigil", "clone", "beam"] : ["dash", "orb", "fissure"];
    const pool = actions.filter((a) => a !== this.lastAction);
    const choicePool = pool.length ? pool : actions;
    const action = choicePool[Math.floor(Math.random() * choicePool.length)];
    switch (action) {
      case "dash":
        this.currentAction = "dash";
        this._startWindup(player);
        break;
      case "orb":
        this._spawnOrbs(player);
        this.currentAction = "orb";
        break;
      case "fissure":
        this._spawnFissure(player);
        this.currentAction = "fissure";
        break;
      case "sigil":
        this._spawnSigils(player);
        this.currentAction = "sigil";
        break;
      case "clone":
        this._spawnClones(player);
        this.currentAction = "clone";
        break;
      case "beam":
        this.currentAction = "beam";
        this._startBeam(player);
        break;
    }
  }

  _escapeFromWall(world, player) {
    if (!world) return;
    const offset = (this.hitRadius ?? 20) + 6;
    const tests = [
      { x: 1, y: 0, blocked: world.isBlocked(this.x + offset, this.y) },
      { x: -1, y: 0, blocked: world.isBlocked(this.x - offset, this.y) },
      { x: 0, y: 1, blocked: world.isBlocked(this.x, this.y + offset) },
      { x: 0, y: -1, blocked: world.isBlocked(this.x, this.y - offset) },
    ];
    let escapeDir = null;
    for (const test of tests) {
      if (test.blocked) {
        escapeDir = { x: -test.x, y: -test.y };
        break;
      }
    }
    if (!escapeDir) {
      if (player) {
        escapeDir = { x: this.x - player.x, y: this.y - player.y };
      } else if (this.lastMoveVector) {
        escapeDir = { x: -this.lastMoveVector.x, y: -this.lastMoveVector.y };
      } else {
        escapeDir = { x: Math.random() - 0.5, y: Math.random() - 0.5 };
      }
    }
    this._forceEscapeDash(escapeDir, 200, false, false);
  }

  _handleCollisionResponse(mx, my) {
    if (this.dashTimer > 0 || this.windupTimer > 0) return;
    let dirX = mx;
    let dirY = my;
    if (Math.hypot(dirX, dirY) < 0.01) {
      dirX = this.lastMoveVector?.x ?? (this.facing === "left" ? -1 : 1);
      dirY = this.lastMoveVector?.y ?? 0;
    }
    if (Math.hypot(dirX, dirY) < 0.01) {
      dirX = Math.random() - 0.5;
      dirY = Math.random() - 0.5;
    }
    this._forceEscapeDash({ x: dirX, y: dirY }, 200, false, false);
  }

  _forceEscapeDash(direction, distance = null, markAction = true, canDamage = true) {
    if (!direction) return;
    const len = Math.hypot(direction.x, direction.y) || 1;
    const dashLength = distance ?? this.dashSpeed * this.dashDuration;
    const duration = Math.max(0.1, dashLength / Math.max(1, this.dashSpeed));
    if (markAction) this.currentAction = "dash";
    this.windupTimer = 0;
    this.telegraph = null;
    this.dashTimer = duration;
    this.dashVector = { x: direction.x / len, y: direction.y / len };
    this.dashHit = false;
    this.dashCanDamage = canDamage;
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

  _playSound(name) {
    if (this.onPlaySound) this.onPlaySound(name);
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
