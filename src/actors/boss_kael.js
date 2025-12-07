
import { CONFIG } from "../config.js";
const BOSS_KAEL_HP_MULT = 2;
const MECHANIC_DELAY_FACTOR = 0.5;
import { Animator } from "../utils/animator.js";

export class BossKael {
  
  constructor(animations = {}, x, y, opts = {}) {
    this.x = x;
    this.y = y;
    this.hp = CONFIG.kael.hp * BOSS_KAEL_HP_MULT;
    this.maxHp = this.hp;
    this.alive = true;
    const baseAnimations = filterBossAnimations(animations);
    this.baseAnimations = baseAnimations;
    this.dragonAnimations = filterBossAnimations(opts.dragonAnimations ?? animations ?? {});
    this.animator = new Animator(baseAnimations, "idle");
    this.scale = opts.scale ?? 0.35;
    this.baseScale = this.scale;
    this.dragonScale = opts.dragonScale ?? this.scale * 1.4;
    const baseRadius = (CONFIG.actorRadius ?? 12) * (this.scale / 0.35);
    this.hitRadius = opts.hitRadius ?? opts.radius ?? Math.max(12, baseRadius * 1.5);
    this.hitRadius *= 2;
    this.baseHitRadius = this.hitRadius;
    this.facing = "right";

    const cfg = CONFIG.kael ?? {};
    const phaseTwo = cfg.phaseTwo ?? {};
    const phaseThree = cfg.phaseThree ?? {};
    this.speed = cfg.speed ?? 120;
    this.preferredDistance = (cfg.preferredDistance ?? 120) * 0.5;
    this._defaultPreferredDistance = this.preferredDistance;
    this._phaseThreePreferredDistance = this._defaultPreferredDistance * 0.5;
    this.attackRange = cfg.attackRange ?? 150;
    this.attackCooldown = cfg.attackCooldown ?? 2.4;
    this.windupDuration = cfg.attackWindup ?? 0.75;
    this.dashDuration = cfg.dashDuration ?? 0.35;
    this.dashSpeed = cfg.dashSpeed ?? this.speed * 3;
    this.dashDamage = cfg.dashDamage ?? 25;
    this.knockback = cfg.knockback ?? 24;
    this.knockbackResistance = cfg.knockbackResistance ?? 0.35;
        // Distances "confort" pour l'IA de Kael
    // distance où il arrête de reculer et accepte le corps-à-corps
    this.meleeComfort = cfg.meleeComfort ?? 60;
    // distance idéale où il aime rester (mid-range)
    this.retreatStopDistance = cfg.retreatStopDistance ?? (this.preferredDistance + 10);
    this.orbitDirection = Math.random() < 0.5 ? 1 : -1;
    this._orbitSwitchTimer = 0;
    this._orbitJumpTimer = 0;
    this._orbitNoise = Math.random() * Math.PI * 2;

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
    this.phaseThreeCfg = {
      hpMultiplier: phaseThree.hpMultiplier ?? 2.1,
      dragonScale: phaseThree.dragonScale ?? this.dragonScale,
      meteorDamage: phaseThree.meteorDamage ?? 60,
      infernoDamage: phaseThree.infernoDamage ?? 58,
      shockwaveDamage: phaseThree.shockwaveDamage ?? 52,
      stormDamage: phaseThree.stormDamage ?? 58,
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
    this.meteors = [];
    this.shockwaves = [];
    this.stormBolts = [];
    this.dragonBreath = null;
    this.infernoStorms = [];
    this.phase = 1;
    this._pendingMechanic = null;
    this.onPlaySound = typeof opts.onPlaySound === "function" ? opts.onPlaySound : null;
    this.onMechanic = typeof opts.onMechanic === "function" ? opts.onMechanic : null;
    this.currentAction = null;
    this.lastAction = null;
    this.lastMoveVector = { x: 0, y: 0 };
    this._meteorLaunchActive = 0;
    this.dashZones = [];
    this._dashSequence = { active: false, points: [], index: 0 };
    this._closeTimer = 0;
    this._fleeing = false;
    this._fleeTimer = 0;
    this._fleeThreshold = 2;
    this._fleeDuration = 5;
  }

  enterPhaseThree(opts = {}) {
    this.phase = 3;
    this._pendingMechanic = null;
    const multiplier = Number.isFinite(opts.hpMultiplier)
      ? opts.hpMultiplier
      : this.phaseThreeCfg.hpMultiplier;
    this.maxHp = Math.round(CONFIG.kael.hp * BOSS_KAEL_HP_MULT * Math.max(1, multiplier));
    this.hp = this.maxHp;
    this.alive = true;
    if (opts.position && Number.isFinite(opts.position.x) && Number.isFinite(opts.position.y)) {
      this.x = opts.position.x;
      this.y = opts.position.y;
    }
    this.cooldownTimer = this.attackCooldown * 0.3;
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
    this.meteors = [];
    this.shockwaves = [];
    this.stormBolts = [];
    this.dragonBreath = null;
    this.scale = this.phaseThreeCfg.dragonScale ?? this.dragonScale;
    this.hitRadius = Math.max(this.baseHitRadius * 1.4, this.hitRadius);
    this.preferredDistance = this._phaseThreePreferredDistance;
    this.retreatStopDistance = this.preferredDistance + 10;
    this.currentAction = null;
    this.lastAction = null;
    this.animator.setAnimations(this.dragonAnimations);
    this.animator.setBase("idle");
    this.animator.play?.("idle", { force: true, sticky: true });
  }

  update(dt, player, world) {
    this._lastWorld = world;

    if (!this.alive) {
      this.animator.setBase("dead");
      const clip = this.animator.animations?.dead;
      const count = Math.max(1, clip?.frames?.length ?? 1);
      this.animator.frameIndex = count - 1;
      this.animator.frameTimer = 0;
      this.animator.blocking = null;
      return;
    }

    this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
      if (this._pendingMechanic) {
        this._pendingMechanic.timer -= dt;
        if (this._pendingMechanic.timer <= 0) {
          this._pendingMechanic = null;
          this._spawnClones(player);
          this.currentAction = "clone";
        } else {
          return;
        }
      }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.max(Math.hypot(dx, dy), 0.0001);
    const dirX = dx / dist;
    const dirY = dy / dist;
    let moved = false;
    let stuckAgainstWall = false;
    const fleeState = this._handleFleeState(dt, dist, dirX, dirY, world);

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
          if (!this._handleDashCompletion(world)) {
            this._finishAction("dash");
          }
        }
          } else if (!fleeState.handled) {
      let moveX = 0;
      let moveY = 0;

      const minMelee = this.meleeComfort;
      const ideal = this.preferredDistance;
      const tangentX = -dirY;
      const tangentY = dirX;
      const sideSpeed = this.speed * 0.9;
      const chaseSpeed = this.speed * 1.05;
      const nowTime = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
      const timeNoise = nowTime * 2 + this._orbitNoise;
      const jitter = Math.sin(timeNoise) * 0.4;

      if (dist < minMelee) {
        this._orbitSwitchTimer -= dt;
        const dirMul = this.orbitDirection * (1 + jitter * 0.5);
        moveX = tangentX * sideSpeed * dt * dirMul * 1.1;
        moveY = tangentY * sideSpeed * dt * dirMul * 1.1;
        const radialPush = ((minMelee - dist) / Math.max(0.1, minMelee)) * this.speed * 0.35;
        moveX += dirX * radialPush * dt;
        moveY += dirY * radialPush * dt;
      } else if (dist > ideal * 1.15) {
        moveX = dirX;
        moveY = dirY;
        const norm = Math.hypot(moveX, moveY) || 1;
        moveX = (moveX / norm) * chaseSpeed * dt;
        moveY = (moveY / norm) * chaseSpeed * dt;
      } else {
        this._orbitSwitchTimer -= dt;
        this._orbitJumpTimer -= dt;
        if (this._orbitSwitchTimer <= 0) {
          this._orbitSwitchTimer = 1.2 + Math.random() * 1.5;
          this.orbitDirection *= -1;
        }
        const dirMul = this.orbitDirection + jitter * 0.6;
        moveX = tangentX * sideSpeed * dt * dirMul;
        moveY = tangentY * sideSpeed * dt * dirMul;
        const radialCorrection = (dist - ideal) * 0.35;
        moveX += dirX * radialCorrection * dt;
        moveY += dirY * radialCorrection * dt;
        if (this._orbitJumpTimer <= 0) {
          this._orbitJumpTimer = 2 + Math.random() * 1.5;
          const impulse = (Math.random() * 2 - 1) * this.speed * 0.4;
          moveX += dirX * impulse * dt;
          moveY += dirY * impulse * dt;
        }
      }

      this.lastMoveVector = { x: moveX, y: moveY };
      moved = this._move(world, moveX, moveY);

      if (!moved && dist < this.hitRadius + 20) {
        stuckAgainstWall = true;
      }
    } else {
      moved = fleeState.moved;
      if (!moved && dist < this.hitRadius + 20) {
        stuckAgainstWall = true;
      }
    }


    if (!this.windupTimer && !this.dashTimer && this.alive) {
      this.animator.setBase(moved ? this._directionalAction("run") : "idle");
    }
    this.animator.update(dt);

    this._updateOrbs(dt, player);
    this._updateDashZones(dt, player);
    this._updateFissures(dt, player);
    if (this.phase === 2) {
      this._updateSigils(dt, player);
      this._updateClones(dt, player);
      this._updateBeam(dt, player);
    } else if (this.phase === 3) {
      this._updateMeteors(dt, player);
      this._updateShockwaves(dt, player);
      this._updateStormBolts(dt, player);
      this._updateInferno(dt, player);
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
    this.maxHp = CONFIG.kael.hp * BOSS_KAEL_HP_MULT;
    this.hp = this.maxHp;
    this.alive = true;
    this.phase = 1;
    this.animator.setAnimations(this.baseAnimations);
    this.scale = this.baseScale;
    this.hitRadius = this.baseHitRadius;
    this.preferredDistance = this._defaultPreferredDistance;
    this.retreatStopDistance = this.preferredDistance + 10;
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
    this.meteors = [];
    this.shockwaves = [];
    this.stormBolts = [];
    this.dragonBreath = null;
    this.animator.setBase("idle");
    this.animator.play?.("idle", { force: true, sticky: true });
    this.currentAction = null;
    this.lastAction = null;
    this._pendingMechanic = null;
  }

  enterPhaseTwo(opts = {}) {
    this.phase = 2;
    this._pendingMechanic = null;
    const multiplier = Number.isFinite(opts.hpMultiplier)
      ? opts.hpMultiplier
      : this.phaseTwo.hpMultiplier;
    this.maxHp = Math.round(CONFIG.kael.hp * BOSS_KAEL_HP_MULT * Math.max(1, multiplier));
    this.hp = this.maxHp;
    this.alive = true;
    this.preferredDistance = this._defaultPreferredDistance;
    this.retreatStopDistance = this.preferredDistance + 10;
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
    this.meteors = [];
    this.shockwaves = [];
    this.stormBolts = [];
    this.dragonBreath = null;
    this.currentAction = null;
    this.lastAction = null;
    this.animator.setBase("idle");
    this.animator.play?.("idle", { force: true, sticky: true });
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
      const radius = this.telegraph.radius;
      const progress = Math.max(0, Math.min(1, this.telegraph.progress ?? 0));
      const pulse = Math.sin((typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.008) * 0.08 + 0.9;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      const fillGrad = ctx.createRadialGradient(
        this.lastTarget.x,
        this.lastTarget.y,
        radius * 0.1,
        this.lastTarget.x,
        this.lastTarget.y,
        radius * 1.1
      );
      fillGrad.addColorStop(0, `rgba(255, 200, 150, ${0.9 * pulse})`);
      fillGrad.addColorStop(0.55, "rgba(255, 120, 60, 0.25)");
      fillGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.arc(this.lastTarget.x, this.lastTarget.y, radius * (1 + progress * 0.2), 0, Math.PI * 2);
      ctx.fill();

      const ringAlpha = 0.35 + progress * 0.5;
      ctx.lineWidth = 3 + progress * 2;
      ctx.setLineDash([6, 10]);
      ctx.strokeStyle = `rgba(255, 210, 140, ${ringAlpha})`;
      ctx.beginPath();
      ctx.arc(this.lastTarget.x, this.lastTarget.y, radius * (1 - progress * 0.1), 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + progress * 0.3})`;
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI * 0.5 * i) + progress * 1.8;
        ctx.beginPath();
        ctx.moveTo(
          this.lastTarget.x + Math.cos(angle) * radius * 0.6,
          this.lastTarget.y + Math.sin(angle) * radius * 0.6
        );
        ctx.lineTo(
          this.lastTarget.x + Math.cos(angle) * radius * 1.05,
          this.lastTarget.y + Math.sin(angle) * radius * 1.05
        );
        ctx.stroke();
      }

      ctx.restore();
    }

    this._drawFissures(ctx);
    this._drawOrbs(ctx);
    if (this.phase === 2) {
      this._drawSigils(ctx);
      this._drawClones(ctx);
      this._drawBeam(ctx);
    } else if (this.phase === 3) {
      this._drawMeteors(ctx);
      this._drawShockwaves(ctx);
      this._drawStormBolts(ctx);
      this._drawInferno(ctx);
    }
    this._drawDashZones(ctx);

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
    this._prepareDashSequence(player);
    const firstTarget = this._dashSequence.points?.[0];
    this.lastTarget = firstTarget
      ? { x: firstTarget.x, y: firstTarget.y }
      : { x: player.x, y: player.y };
    this.animator.setBase("idle");
    this._playSound("kaelJump");
  }

  _prepareDashSequence(player) {
    if (!player) return;
    const diag = this._mapDiagonal();
    const minSegment = Math.max(120, diag * 0.3);
    const maxSegment = Math.max(minSegment, diag * 0.6);
    const baseAngle = Math.random() * Math.PI * 2;
    const rotate = (Math.PI * 2) / 3;
    const points = [];
    for (let index = 0; index < 3; index += 1) {
      const angle = baseAngle + rotate * index;
      points.push(
        this._dashPointFrom(player, angle, minSegment, maxSegment)
      );
    }
    this._dashSequence.points = points;
    this._dashSequence.index = 0;
    this._dashSequence.active = true;
  }

  _dashPointFrom(origin, angle, minDistance, maxDistance) {
    const distance =
      minDistance + Math.random() * Math.max(0, maxDistance - minDistance);
    const point = {
      x: origin.x + Math.cos(angle) * distance,
      y: origin.y + Math.sin(angle) * distance,
    };
    return this._clampPointToWorld(point);
  }

  _clampPointToWorld(point) {
    const world = this._lastWorld;
    if (!world || !Number.isFinite(world.w) || !Number.isFinite(world.h)) {
      return point;
    }
    const margin = Math.max(40, this.hitRadius ?? 30);
    const clampedX = Math.max(margin, Math.min(world.w - margin, point.x));
    const clampedY = Math.max(margin, Math.min(world.h - margin, point.y));
    return { x: clampedX, y: clampedY };
  }

  _mapDiagonal() {
    const world = this._lastWorld;
    if (world && Number.isFinite(world.w) && Number.isFinite(world.h)) {
      return Math.max(1, Math.hypot(world.w, world.h));
    }
    return 640;
  }

  _beginDash() {
    const target = this._getCurrentDashTarget();
    if (!target) return;
    this._startDashToPoint(target);
  }

  _getCurrentDashTarget() {
    const points = this._dashSequence.points ?? [];
    if (this._dashSequence.active && points.length > this._dashSequence.index) {
      return points[this._dashSequence.index];
    }
    return this.lastTarget;
  }

  _startDashToPoint(point) {
    const dx = point.x - this.x;
    const dy = point.y - this.y;
    const len = Math.max(Math.hypot(dx, dy), 0.0001);
    this.dashVector = { x: dx / len, y: dy / len };
    this.dashTimer = this.dashDuration;
    this.dashHit = false;
    this.dashCanDamage = true;
    this.lastTarget = { x: point.x, y: point.y };
  }

  _handleDashCompletion(world) {
    this._spawnDashZone(this.x, this.y);
    if (!this._dashSequence.active) return false;
    this._dashSequence.index += 1;
    if (this._dashSequence.index < this._dashSequence.points.length) {
      const target = this._dashSequence.points[this._dashSequence.index];
      this._startDashToPoint(target);
      return true;
    }
    this._dashSequence.active = false;
    return false;
  }

  _move(world, mx, my) {
    if (!world) return false;

    const inside = (x, y) => {
      const w = world.w ?? Infinity;
      const h = world.h ?? Infinity;
      return x > 1 && y > 1 && x < w - 1 && y < h - 1;
    };

    // Collision plus “épaisse” : on vérifie un petit disque autour de Kael
    const canOccupy = (x, y) => {
      if (!inside(x, y)) return false;

      const r = this.hitRadius ?? 18;
      const edge = r * 0.9;
      const diag = r * 0.65;

      const samples = [
        { x: 0, y: 0 },          // centre
        { x: edge, y: 0 },
        { x: -edge, y: 0 },
        { x: 0, y: edge },
        { x: 0, y: -edge },
        { x: diag, y: diag },
        { x: -diag, y: diag },
        { x: diag, y: -diag },
        { x: -diag, y: -diag },
      ];

      for (const s of samples) {
        if (world.isBlocked(x + s.x, y + s.y)) {
          return false;
        }
      }
      return true;
    };

    const dist = Math.hypot(mx, my);
    if (dist < 0.0001) return false;

    let moved = false;
    const prevX = this.x;
    const prevY = this.y;

    // On découpe le mouvement en petits pas pour éviter de “sauter” par-dessus
    const stepSize = Math.max(2, (this.hitRadius ?? 18) * 0.25);
    const steps = Math.max(1, Math.ceil(dist / stepSize));
    const stepX = mx / steps;
    const stepY = my / steps;

    for (let i = 0; i < steps; i++) {
      let blockedThisStep = false;

      if (stepX !== 0) {
        const nx = this.x + stepX;
        if (canOccupy(nx, this.y)) {
          this.x = nx;
          moved = true;
        } else {
          blockedThisStep = true;
        }
      }

      if (stepY !== 0) {
        const ny = this.y + stepY;
        if (canOccupy(this.x, ny)) {
          this.y = ny;
          moved = true;
        } else {
          blockedThisStep = true;
        }
      }

      // Dès qu'on tape un mur, on arrête : pas de tunnel, pas de glissade sauvage
      if (blockedThisStep) {
        break;
      }
    }

    // Mise à jour de l'orientation
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

  _handleFleeState(dt, dist, dirX, dirY, world) {
    const result = { handled: false, moved: false };
    const retreatSpeed = this.speed * 0.95;
    if (dist <= 0) {
      dirX = 1;
      dirY = 0;
    }
    if (this._fleeing) {
      this._fleeTimer = Math.max(0, this._fleeTimer - dt);
      const moveX = -dirX * retreatSpeed * dt;
      const moveY = -dirY * retreatSpeed * dt;
      this.lastMoveVector = { x: moveX, y: moveY };
      result.moved = this._move(world, moveX, moveY);
      this.animator.setBase(this._directionalAction("run"));
      if (this._fleeTimer <= 0) {
        this._fleeing = false;
      }
      result.handled = true;
      return result;
    }
    if (dist <= 20) {
      this._closeTimer += dt;
      if (this._closeTimer >= this._fleeThreshold) {
        this._fleeing = true;
        this._fleeTimer = this._fleeDuration;
        this._closeTimer = 0;
        const moveX = -dirX * retreatSpeed * dt;
        const moveY = -dirY * retreatSpeed * dt;
        this.lastMoveVector = { x: moveX, y: moveY };
        result.moved = this._move(world, moveX, moveY);
        this.animator.setBase(this._directionalAction("run"));
        result.handled = true;
        return result;
      }
    } else {
      this._closeTimer = 0;
    }
    return result;
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
    ctx.globalCompositeOperation = "lighter";
    const time = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
    for (const orb of this.orbs) {
      const baseRadius = (orb.state === "orbit" ? 16 : 18) * 2;
      const glowRadius = baseRadius * 1.7;
      const fade = orb.state === "orbit" ? 0.7 : 1;
      const gradient = ctx.createRadialGradient(orb.x, orb.y, baseRadius * 0.3, orb.x, orb.y, glowRadius);
      gradient.addColorStop(0, `rgba(255,255,255,${0.9 * fade})`);
      gradient.addColorStop(0.45, `rgba(255,200,140,${0.75 * fade})`);
      gradient.addColorStop(1, "rgba(255,90,70,0)");
      ctx.fillStyle = gradient;
      ctx.globalAlpha = fade;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.8 * fade;
      ctx.fillStyle = orb.color;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, baseRadius, 0, Math.PI * 2);
      ctx.fill();

      if (orb.state === "orbit") {
        const spin = time * 2 + orb.angle * 0.5;
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(255,255,255,${0.35 + Math.sin(spin) * 0.15})`;
        ctx.beginPath();
        for (let s = 0; s < 3; s++) {
          const offset = spin + (Math.PI * 2 * s) / 3;
          ctx.arc(
            orb.x,
            orb.y,
            baseRadius + s * 5,
            offset,
            offset + Math.PI * 0.4
          );
        }
        ctx.stroke();
      } else if (orb.state === "launch") {
        ctx.strokeStyle = `rgba(255,220,185,${0.5 + Math.sin(time * 4) * 0.25})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, baseRadius + 12, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.45;
        const trailLength = 40;
        ctx.strokeStyle = `rgba(255,255,255,${0.8 * fade})`;
        ctx.beginPath();
        ctx.moveTo(orb.x - orb.dirX * trailLength, orb.y - orb.dirY * trailLength);
        ctx.lineTo(orb.x - orb.dirX * (trailLength * 0.3), orb.y - orb.dirY * (trailLength * 0.3));
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  _spawnSigils(player) {
    this.sigils = [];
    const spacing = 60;
    const rings = [0, 1, 2];
    const positions = [];
    rings.forEach((ring) => {
      if (ring === 0) {
        positions.push({ x: 0, y: 0 });
        return;
      }
      const segments = 6 * ring;
      const radius = spacing * ring;
      const offset = Math.random() * Math.PI * 2;
      for (let segment = 0; segment < segments; segment += 1) {
        const angle = offset + (segment / segments) * Math.PI * 2;
        positions.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        });
      }
    });
    const baseRadius = 18;
    const radiusVariance = 5;
    positions.forEach((offset) => {
      this.sigils.push({
        x: player.x + offset.x,
        y: player.y + offset.y,
        radius: baseRadius + Math.random() * radiusVariance,
        timer: 0.65 + Math.random() * 0.45,
        explode: 0.45 + Math.random() * 0.15,
        exploding: false,
        done: false,
      });
    });
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
    const time = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const sigil of this.sigils) {
      const pulse = Math.sin(time * 8 + (sigil.x + sigil.y) * 0.05) * 0.15 + 0.85;
      const radius =
        sigil.radius +
        (sigil.exploding ? (1 - Math.max(0, sigil.timer) / sigil.explode) * 35 : 0) +
        pulse * 3;
      ctx.lineWidth = sigil.exploding ? 4 : 2;
      ctx.setLineDash(sigil.exploding ? [12, 14] : [6, 8]);
      ctx.strokeStyle = sigil.exploding ? "rgba(255,220,160,0.9)" : `rgba(120, 200, 255, ${0.55 + pulse * 0.3})`;
      ctx.globalAlpha = sigil.exploding ? 0.8 : 0.6;
      ctx.beginPath();
      ctx.arc(sigil.x, sigil.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.globalAlpha = sigil.exploding ? 0.35 : 0.15;
      const glowRadius = radius * (sigil.exploding ? 1.1 : 0.9);
      const glow = ctx.createRadialGradient(
        sigil.x,
        sigil.y,
        glowRadius * 0.15,
        sigil.x,
        sigil.y,
        glowRadius
      );
      glow.addColorStop(0, "rgba(255,255,255,0.8)");
      glow.addColorStop(0.4, "rgba(255,160,110,0.35)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sigil.x, sigil.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      if (sigil.exploding) {
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = "rgba(255, 210, 150, 0.9)";
        ctx.lineWidth = 2;
        const ringCount = 5;
        for (let i = 0; i < ringCount; i++) {
          const controlRadius = radius * (0.6 + (i / ringCount) * 0.4);
          const offset = Math.sin(time * 6 + i) * 6;
          ctx.beginPath();
          ctx.arc(sigil.x, sigil.y, controlRadius + offset, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = "rgba(255, 235, 190, 0.7)";
        for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 * i) / 12 + time * 0.6;
          const inner = radius * 0.35;
          ctx.beginPath();
          ctx.moveTo(
            sigil.x + Math.cos(angle) * inner,
            sigil.y + Math.sin(angle) * inner
          );
          ctx.lineTo(
            sigil.x + Math.cos(angle) * (radius + 10),
            sigil.y + Math.sin(angle) * (radius + 10)
          );
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  _drawDashZones(ctx) {
    if (!this.dashZones.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const time = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
    for (const zone of this.dashZones) {
      const alpha = Math.max(0, Math.min(1, zone.timer / Math.max(zone.duration, 0.01)));
      const radius =
        zone.radius +
        (1 - alpha) * 12 +
        Math.sin(time * 3 + zone.x + zone.y) * 6;
      const gradient = ctx.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, radius);
      gradient.addColorStop(0, `rgba(255, 190, 70, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(255, 120, 40, ${alpha * 0.6})`);
      gradient.addColorStop(1, "rgba(255, 40, 40, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 220, 180, ${alpha * 0.7})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _spawnClones(player) {
    this.clones = [];
    const spreads = [-1.1, -0.7, -0.35, 0, 0.35, 0.7, 1.05];
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
        life: 1.8,
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
        player.applyDamage(this.phaseTwo.cloneDamage * 0.75);
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
    ctx.globalCompositeOperation = "lighter";
    const time = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
    for (const clone of this.clones) {
      const lifeRatio = clone.life > 0 ? Math.max(0, clone.timer / clone.life) : 0;
      const radius = 20 + (1 - lifeRatio) * 20;
      const alpha = 0.25 + (1 - lifeRatio) * 0.65;
      const tailLength = 50 + (1 - lifeRatio) * 70;
      const glow = ctx.createRadialGradient(clone.x, clone.y, radius * 0.15, clone.x, clone.y, radius * 1.4);
      glow.addColorStop(0, `rgba(180, 230, 255, ${alpha})`);
      glow.addColorStop(0.6, `rgba(100, 170, 255, ${alpha * 0.4})`);
      glow.addColorStop(1, "rgba(50, 100, 255, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(clone.x, clone.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(190, 235, 255, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(clone.x, clone.y);
      ctx.lineTo(clone.x - clone.dirX * tailLength, clone.y - clone.dirY * tailLength);
      ctx.stroke();

      ctx.globalAlpha = 0.6;
      const energy = ctx.createLinearGradient(
        clone.x,
        clone.y,
        clone.x - clone.dirX * tailLength,
        clone.y - clone.dirY * tailLength
      );
      energy.addColorStop(0, `rgba(255,255,255,${0.7 + lifeRatio * 0.2})`);
      energy.addColorStop(1, "rgba(50, 150, 255, 0)");
      ctx.strokeStyle = energy;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(clone.x, clone.y);
      ctx.lineTo(clone.x - clone.dirX * (tailLength * 0.65), clone.y - clone.dirY * (tailLength * 0.65));
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(
        clone.x - clone.dirX * (tailLength * 0.9),
        clone.y - clone.dirY * (tailLength * 0.9),
        6 + Math.sin(time * 12 + clone.dirX * 8) * 3,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  _startBeam(player) {
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    const duration = 1.4;
    this.beamAttack = {
      angle,
      windup: 0.6,
      duration,
      active: false,
      width: 55,
      reach: 420,
      baseAngle: angle,
      totalDuration: duration,
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
      const totalDuration = Math.max(beam.totalDuration ?? beam.duration, 0.0001);
      const remaining = Math.max(0, beam.duration);
      const progress = Math.min(1, (totalDuration - remaining) / totalDuration);
      beam.angle = beam.baseAngle + Math.PI * 2 * progress;
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
    const headRadius = Math.max(width * 2.8, 35);
    const bodyEnd = Math.max(0, reach - headRadius * 0.5);
    ctx.globalAlpha = beam.active ? 0.85 : 0.5;
    const gradient = ctx.createLinearGradient(0, 0, bodyEnd, 0);
    gradient.addColorStop(0, "rgba(255,255,255,0.8)");
    gradient.addColorStop(0.4, "rgba(255,200,140,0.9)");
    gradient.addColorStop(0.7, "rgba(255,150,80,0.7)");
    gradient.addColorStop(1, "rgba(255,90,45,0.05)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -width);
    ctx.lineTo(bodyEnd, -width * 0.5);
    ctx.lineTo(bodyEnd, width * 0.5);
    ctx.lineTo(0, width);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    const headCenter = bodyEnd + headRadius * 0.3;
    ctx.globalAlpha = beam.active ? 0.7 : 0.4;
    const headGradient = ctx.createRadialGradient(
      headCenter,
      0,
      headRadius * 0.2,
      headCenter,
      0,
      headRadius * 1.05
    );
    headGradient.addColorStop(0, "rgba(255,255,255,0.95)");
    headGradient.addColorStop(0.3, "rgba(255,210,140,0.6)");
    headGradient.addColorStop(0.7, "rgba(255,90,40,0.25)");
    headGradient.addColorStop(1, "rgba(255,60,30,0)");
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(headCenter, 0, headRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = beam.active ? 0.5 : 0.25;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(headCenter, 0, headRadius * 1.1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.globalAlpha = beam.active ? 0.35 : 0.2;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 12]);
    ctx.beginPath();
    ctx.moveTo(0, -width * 0.8);
    ctx.lineTo(bodyEnd, -width * 0.4);
    ctx.lineTo(headCenter, -width * 0.1);
    ctx.lineTo(headCenter, width * 0.1);
    ctx.lineTo(bodyEnd, width * 0.4);
    ctx.lineTo(0, width * 0.8);
    ctx.stroke();
    ctx.setLineDash([]);

    const ripple = ctx.createLinearGradient(0, 0, Math.max(bodyEnd, 200), 0);
    ripple.addColorStop(0, "rgba(255,255,255,0.8)");
    ripple.addColorStop(0.5, "rgba(255,200,130,0.25)");
    ripple.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = ripple;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -width * 0.2);
    ctx.quadraticCurveTo(bodyEnd * 0.5, 0, bodyEnd, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, width * 0.2);
    ctx.quadraticCurveTo(bodyEnd * 0.5, 0, bodyEnd, 0);
    ctx.stroke();
    ctx.restore();
  }

  _spawnMeteorRain(player) {
    const desiredCount = 36;
    const minSpacing = 60;
    const areaRadius = 240;
    this.meteors = [];
    const points = [];
    let attempts = 0;
    const maxAttempts = desiredCount * 14;
    while (points.length < desiredCount && attempts < maxAttempts) {
      attempts += 1;
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * (areaRadius - 80);
      const radius = 24 + Math.random() * 10;
      const candidate = {
        x: player.x + Math.cos(angle) * distance,
        y: player.y + Math.sin(angle) * distance,
        radius,
      };
      const tooClose = points.some((prev) => {
        const dx = prev.x - candidate.x;
        const dy = prev.y - candidate.y;
        const distBetween = Math.hypot(dx, dy);
        const requiredSpacing = minSpacing + prev.radius + candidate.radius;
        return distBetween < requiredSpacing;
      });
      if (tooClose) continue;
      points.push(candidate);
    }
    if (points.length < desiredCount) {
      for (let i = points.length; i < desiredCount; i += 1) {
        const fallbackAngle = (Math.PI * 2 * i) / desiredCount;
        const fallbackRadius = 24 + Math.random() * 10;
        points.push({
          x: player.x + Math.cos(fallbackAngle) * areaRadius * 0.7,
          y: player.y + Math.sin(fallbackAngle) * areaRadius * 0.7,
          radius: fallbackRadius,
        });
      }
    }
    for (const point of points) {
      this.meteors.push({
        targetX: point.x,
        targetY: point.y,
        telegraph: 0.9 + Math.random() * 0.4,
        fall: 0.6 + Math.random() * 0.2,
        state: "telegraph",
        blast: 0.45,
        radius: point.radius,
      });
    }
    this._playSound("kaelOrbCast");
  }

  _updateMeteors(dt, player) {
    if (!this.meteors.length) return;
    for (const meteor of this.meteors) {
      if (meteor.state === "telegraph") {
        meteor.telegraph -= dt;
        if (meteor.telegraph <= 0) {
          meteor.state = "fall";
          this._playMeteorLaunchSound();
        }
      } else if (meteor.state === "fall") {
        meteor.fall -= dt;
        if (meteor.fall <= 0) {
          meteor.state = "blast";
          meteor.blastTimer = meteor.blast;
          const dist = Math.hypot(player.x - meteor.targetX, player.y - meteor.targetY);
          if (dist < meteor.radius + 20) {
            player.applyDamage(this.phaseThreeCfg.meteorDamage);
          }
        }
      } else if (meteor.state === "blast") {
        meteor.blastTimer -= dt;
      }
    }
    this.meteors = this.meteors.filter((m) => m.state !== "blast" || m.blastTimer > 0);
    if (this.currentAction === "meteor" && this.meteors.length === 0) {
      this._finishAction("meteor");
    }
  }

  _drawMeteors(ctx) {
    if (!this.meteors.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const time = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
    for (const meteor of this.meteors) {
      if (meteor.state === "telegraph") {
        const pulse = Math.sin((meteor.telegraph + time) * 8) * 0.25 + 0.75;
        ctx.strokeStyle = `rgba(255,160,100,${pulse})`;
        ctx.lineWidth = 3 + pulse * 4;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.arc(meteor.targetX, meteor.targetY, meteor.radius + pulse * 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.35;
        const glow = ctx.createRadialGradient(
          meteor.targetX,
          meteor.targetY,
          meteor.radius * 0.2,
          meteor.targetX,
          meteor.targetY,
          meteor.radius * 1.5
        );
        glow.addColorStop(0, "rgba(255,230,180,0.6)");
        glow.addColorStop(0.5, "rgba(255,120,80,0.15)");
        glow.addColorStop(1, "rgba(255,120,80,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(meteor.targetX, meteor.targetY, meteor.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (meteor.state === "fall") {
        ctx.strokeStyle = "rgba(255,200,130,0.9)";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(meteor.targetX, meteor.targetY - 220);
        ctx.lineTo(meteor.targetX + Math.sin(time * 3) * 12, meteor.targetY);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,220,120,0.8)";
        ctx.beginPath();
        ctx.arc(meteor.targetX + Math.cos(time * 6) * 5, meteor.targetY - 30, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.beginPath();
        ctx.arc(meteor.targetX + Math.sin(time * 7) * 3, meteor.targetY - 50, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (meteor.state === "blast") {
        const ratio = meteor.blastTimer / Math.max(0.01, meteor.blast);
        const radius = meteor.radius * (1 + (1 - ratio) * 0.6);
        const grad = ctx.createRadialGradient(
          meteor.targetX,
          meteor.targetY,
          0,
          meteor.targetX,
          meteor.targetY,
          radius
        );
        grad.addColorStop(0, "rgba(255,255,255,0.95)");
        grad.addColorStop(0.3, "rgba(254,194,111,0.8)");
        grad.addColorStop(0.6, "rgba(255,120,75,0.4)");
        grad.addColorStop(1, "rgba(255,60,30,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(meteor.targetX, meteor.targetY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(meteor.targetX, meteor.targetY, radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  _spawnShockwaves() {
    const waves = [];
    const count = 3;
    for (let i = 0; i < count; i++) {
      const gapCount = 3;
      const gapWidth = Math.PI / 3;
      const gaps = Array.from({ length: gapCount }, (_, idx) => {
        const base = (Math.PI * 2 * idx) / gapCount;
        return {
          center: base + Math.random() * 0.25 - 0.125,
        };
      });
      waves.push({
        radius: 30 + i * 20,
        speed: (160 + i * 40) * 0.5,
        width: 20 + i * 4,
        timer: 2.4,
        gapWidth,
        gaps,
      });
    }
    this.shockwaves = waves;
    this._playSound("kaelJump");
  }

  _updateShockwaves(dt, player) {
    if (!this.shockwaves.length) return;
    const playerAngle = Math.atan2(player.y - this.y, player.x - this.x);
    const normalizedPlayerAngle = (playerAngle + Math.PI * 2) % (Math.PI * 2);
    for (const wave of this.shockwaves) {
      wave.radius += wave.speed * dt;
      wave.timer -= dt;
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      const halfWidth = wave.width * 0.5;
      if (Math.abs(dist - wave.radius) <= halfWidth) {
        const inGap = wave.gaps.some((gap) => {
          const center = gap.start ?? gap.center;
          const gapStart = (center - wave.gapWidth * 0.5 + Math.PI * 2) % (Math.PI * 2);
          const gapEnd = (center + wave.gapWidth * 0.5 + Math.PI * 2) % (Math.PI * 2);
          if (gapStart < gapEnd) {
            return normalizedPlayerAngle >= gapStart && normalizedPlayerAngle <= gapEnd;
          }
          return normalizedPlayerAngle >= gapStart || normalizedPlayerAngle <= gapEnd;
        });
        if (!inGap) {
          player.applyDamage(this.phaseThreeCfg.shockwaveDamage * dt);
        }
      }
    }
    this.shockwaves = this.shockwaves.filter((w) => w.timer > 0 && w.radius < 520);
    if (this.currentAction === "shockwave" && this.shockwaves.length === 0) {
      this._finishAction("shockwave");
    }
  }

  _drawShockwaves(ctx) {
    if (!this.shockwaves.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const wave of this.shockwaves) {
      const alpha = Math.max(0.2, Math.min(0.8, 1 - wave.radius / 520));
      const gradient = ctx.createRadialGradient(
        this.x,
        this.y,
        wave.radius - wave.width * 0.5,
        this.x,
        this.y,
        wave.radius + wave.width * 0.5
      );
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(0.3, `rgba(255, 255, 255, ${alpha * 0.6})`);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = wave.width;
      ctx.shadowColor = `rgba(255,235,190,${alpha * 0.6})`;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(this.x, this.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, wave.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  _spawnStormBolts() {
    const bolts = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      bolts.push({
        angle: (Math.PI * 2 * i) / count,
        radius: 80,
        state: "orbit",
        timer: 1.1 + Math.random() * 0.4,
        speed: 280 + Math.random() * 60,
      });
    }
    this.stormBolts = bolts;
    this._playSound("kaelFireCone");
  }

  _updateStormBolts(dt, player) {
    if (!this.stormBolts.length) return;
    for (const bolt of this.stormBolts) {
      if (bolt.state === "orbit") {
        bolt.timer -= dt;
        bolt.angle += 2.4 * dt;
        const px = this.x + Math.cos(bolt.angle) * bolt.radius;
        const py = this.y + Math.sin(bolt.angle) * bolt.radius;
        bolt.previewX = px;
        bolt.previewY = py;
        if (bolt.timer <= 0) {
          bolt.state = "dash";
          const dirX = Math.cos(bolt.angle);
          const dirY = Math.sin(bolt.angle);
          bolt.dirX = dirX;
          bolt.dirY = dirY;
          bolt.x = px;
          bolt.y = py;
        }
      } else if (bolt.state === "dash") {
        bolt.x += bolt.dirX * bolt.speed * dt;
        bolt.y += bolt.dirY * bolt.speed * dt;
        const dist = Math.hypot(player.x - bolt.x, player.y - bolt.y);
        if (dist < 36) {
          player.applyDamage(this.phaseThreeCfg.stormDamage);
          bolt.state = "done";
        }
        if (Math.hypot(bolt.x - this.x, bolt.y - this.y) > 520) {
          bolt.state = "done";
        }
      }
    }
    this.stormBolts = this.stormBolts.filter((b) => b.state !== "done");
    if (this.currentAction === "storm" && this.stormBolts.length === 0) {
      this._finishAction("storm");
    }
  }

  _drawStormBolts(ctx) {
    if (!this.stormBolts.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const bolt of this.stormBolts) {
      if (bolt.state === "orbit") {
        const pulse = Math.sin(bolt.angle * 4) * 0.5 + 1;
        const orbitRadius = 9 + pulse * 3;
        const glow = ctx.createRadialGradient(
          bolt.previewX ?? this.x,
          bolt.previewY ?? this.y,
          0,
          bolt.previewX ?? this.x,
          bolt.previewY ?? this.y,
          orbitRadius * 1.6
        );
        glow.addColorStop(0, "rgba(255,255,255,0.65)");
        glow.addColorStop(0.5, "rgba(115,180,255,0.45)");
        glow.addColorStop(1, "rgba(115,180,255,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(bolt.previewX ?? this.x, bolt.previewY ?? this.y, orbitRadius * 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = `rgba(120,180,255,${0.65 * pulse})`;
        ctx.beginPath();
        ctx.arc(bolt.previewX ?? this.x, bolt.previewY ?? this.y, orbitRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (bolt.state === "dash") {
        const trailGradient = ctx.createLinearGradient(
          bolt.x,
          bolt.y,
          bolt.x - bolt.dirX * 40,
          bolt.y - bolt.dirY * 40
        );
        trailGradient.addColorStop(0, "rgba(255,255,255,0.9)");
        trailGradient.addColorStop(1, "rgba(255,200,80,0)");
        ctx.strokeStyle = trailGradient;
        ctx.lineWidth = 6;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(bolt.x, bolt.y);
        ctx.lineTo(bolt.x - bolt.dirX * 45, bolt.y - bolt.dirY * 45);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(255,230,160,0.95)";
        ctx.beginPath();
        ctx.arc(bolt.x, bolt.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bolt.x, bolt.y, 12, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _spawnDragonBreath(player) {
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.dragonBreath = {
      angleStart: angle - Math.PI * 0.4,
      angleEnd: angle + Math.PI * 0.4,
      sweepDuration: 1.5,
      windup: 0.5,
      width: Math.PI / 10,
      active: false,
      progress: 0,
    };
    this._playSound("kaelOrbCast");
  }

  _updateDragonBreath(dt, player) {
    if (!this.dragonBreath) return;
    const breath = this.dragonBreath;
    if (!breath.active) {
      breath.windup -= dt;
      if (breath.windup <= 0) {
        breath.active = true;
        breath.timer = breath.sweepDuration;
        breath.progress = 0;
        this._playSound("kaelOrbLaunch");
      }
    } else {
      breath.timer -= dt;
      const ratio = 1 - breath.timer / Math.max(0.001, breath.sweepDuration);
      breath.progress = ratio;
      const currentAngle =
        breath.angleStart + (breath.angleEnd - breath.angleStart) * Math.min(1, Math.max(0, ratio));
      const dirX = Math.cos(currentAngle);
      const dirY = Math.sin(currentAngle);
      const toPlayerX = player.x - this.x;
      const toPlayerY = player.y - this.y;
      const dist = Math.hypot(toPlayerX, toPlayerY);
      if (dist < 420) {
        const normX = toPlayerX / (dist || 1);
        const normY = toPlayerY / (dist || 1);
        const angleDiff = Math.acos(Math.max(-1, Math.min(1, dirX * normX + dirY * normY)));
        if (angleDiff < breath.width) {
          player.applyDamage(this.phaseThreeCfg.infernoDamage * dt * 2.2);
        }
      }
      if (breath.timer <= 0) {
        this.dragonBreath = null;
        if (this.currentAction === "inferno") this._finishAction("inferno");
      }
    }
  }

  _updateInferno(dt, player) {
    this._updateDragonBreath(dt, player);
  }

  _drawDragonBreath(ctx) {
    if (!this.dragonBreath) return;
    const breath = this.dragonBreath;
    const angle =
      breath.active && breath.sweepDuration > 0
        ? breath.angleStart +
          (breath.angleEnd - breath.angleStart) * Math.min(1, Math.max(0, breath.progress))
        : breath.angleStart;
    const reach = 420;
    const width = breath.active ? Math.PI / 6 : Math.PI / 12;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.globalAlpha = breath.active ? 0.7 : 0.4;
    const gradient = ctx.createLinearGradient(0, 0, reach, 0);
    gradient.addColorStop(0, "rgba(255,255,255,0.35)");
    gradient.addColorStop(0.4, "rgba(255,180,90,0.65)");
    gradient.addColorStop(1, "rgba(255,60,30,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -reach * Math.tan(width));
    ctx.lineTo(reach, -reach * Math.tan(width * 0.35));
    ctx.lineTo(reach, reach * Math.tan(width * 0.35));
    ctx.lineTo(0, reach * Math.tan(width));
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = breath.active ? 0.5 : 0.25;
    ctx.strokeStyle = "rgba(255, 230, 180, 0.8)";
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 12]);
    ctx.beginPath();
    ctx.moveTo(0, -reach * Math.tan(width * 0.5));
    ctx.lineTo(reach * 0.6, 0);
    ctx.lineTo(0, reach * Math.tan(width * 0.5));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.4;
    const innerGlow = ctx.createRadialGradient(
      reach * 0.5,
      0,
      0,
      reach * 0.5,
      0,
      reach * 0.8
    );
    innerGlow.addColorStop(0, "rgba(255,255,255,0.8)");
    innerGlow.addColorStop(0.4, "rgba(255,160,80,0.5)");
    innerGlow.addColorStop(1, "rgba(255,40,20,0)");
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.moveTo(0, -reach * Math.tan(width * 0.3));
    ctx.lineTo(reach * 0.9, 0);
    ctx.lineTo(0, reach * Math.tan(width * 0.3));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  _drawInferno(ctx) {
    this._drawDragonBreath(ctx);
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

  _spawnDashZone(x, y) {
    const radius = 65;
    this.dashZones.push({
      x,
      y,
      radius,
      timer: 3.2,
      duration: 3.2,
      damage: this.dashDamage * 0.7,
      hitCooldown: 0,
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
    if (this.currentAction === "meteor" && this.meteors.length === 0) {
      this._finishAction("meteor");
    }
    if (this.currentAction === "shockwave" && this.shockwaves.length === 0) {
      this._finishAction("shockwave");
    }
    if (this.currentAction === "storm" && this.stormBolts.length === 0) {
      this._finishAction("storm");
    }
    if (this.currentAction === "inferno" && !this.dragonBreath) {
      this._finishAction("inferno");
    }
  }
  _updateDashZones(dt, player) {
    if (!this.dashZones.length || !player) return;
    const radiusModifier = player.r ?? 10;
    this.dashZones = this.dashZones
      .map((zone) => {
        zone.timer = Math.max(0, zone.timer - dt);
        zone.hitCooldown = Math.max(0, (zone.hitCooldown ?? 0) - dt);
        const dist = Math.hypot(player.x - zone.x, player.y - zone.y);
        if (dist <= zone.radius + radiusModifier && zone.hitCooldown <= 0) {
          player.applyDamage(zone.damage * dt);
          zone.hitCooldown = 0.5;
        }
        return zone;
      })
      .filter((zone) => zone.timer > 0);
  }

  _announceMechanic(action, delay = 0) {
    if (!this.onMechanic || !action) return;
    this.onMechanic(action, this.phase, Math.max(0, delay));
  }

  _getMechanicDelay(action) {
    if (!action) return 0;
    let base = 0;
    switch (action) {
      case "dash":
        base = this.windupDuration ?? 0.85;
        break;
      case "orb":
        base = this.orbLifetime ?? 3.5;
        break;
      case "fissure":
        base = this.fissureWindup ?? 1;
        break;
      case "sigil":
        base = 0.9;
        break;
      case "clone":
        base = 2.0;
        break;
      case "beam":
        base = 0.6;
        break;
      case "inferno":
        base = 0.5;
        break;
      case "meteor":
        base = 1;
        break;
      case "shockwave":
        base = 0.4;
        break;
      case "storm":
        base = 1.1;
        break;
      default:
        base = 0;
        break;
    }
    return base * MECHANIC_DELAY_FACTOR;
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
    this._dashSequence.active = false;
  }

  _tryScheduleAction(player) {
    if (this.currentAction || !this.alive) return;
    if (this.cooldownTimer > 0) return;
    if (this.windupTimer > 0 || this.dashTimer > 0) return;
    if (this.phase === 1 && (this.orbs.length > 0 || this._hasActiveFissures())) return;
    if (this.phase === 2 && (this.sigils.length > 0 || this.clones.length > 0 || this.beamAttack)) return;
    if (
      this.phase === 3 &&
      (this.meteors.length > 0 ||
        this.shockwaves.length > 0 ||
        this.stormBolts.length > 0 ||
        this.dragonBreath)
    )
      return;
    let actions;
    if (this.phase === 2) {
      actions = ["sigil", "clone", "beam"];
    } else if (this.phase === 3) {
      actions = ["inferno", "meteor", "shockwave", "storm"];
    } else {
      actions = ["dash", "orb", "fissure"];
    }
    const pool = actions.filter((a) => a !== this.lastAction);
    const choicePool = pool.length ? pool : actions;
    const action = choicePool[Math.floor(Math.random() * choicePool.length)];
    const mechanicDelay = this._getMechanicDelay(action);
    this._announceMechanic(action, mechanicDelay);
    if (action === "clone" && mechanicDelay > 0) {
      this._pendingMechanic = { action: "clone", timer: mechanicDelay };
      return;
    }
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
      case "inferno":
        this.currentAction = "inferno";
        this._spawnDragonBreath(player);
        break;
      case "meteor":
        this.currentAction = "meteor";
        this._spawnMeteorRain(player);
        break;
      case "shockwave":
        this.currentAction = "shockwave";
        this._spawnShockwaves();
        break;
      case "storm":
        this.currentAction = "storm";
        this._spawnStormBolts();
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

    const len = Math.hypot(escapeDir.x, escapeDir.y) || 1;
    const nX = escapeDir.x / len;
    const nY = escapeDir.y / len;

    // Petit déplacement local avec collisions, PAS un gros dash qui traverse tout
    const nudge = 40; // distance max du “désencastrement”
    this._move(world, nX * nudge, nY * nudge);
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
    ctx.globalCompositeOperation = "lighter";
    const time = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
    for (const fissure of this.fissures) {
      const maxLength = fissure.active ? fissure.progress : this.fissureLength;
      const endX = fissure.startX + fissure.dirX * maxLength;
      const endY = fissure.startY + fissure.dirY * maxLength;
      const baseColor = fissure.active ? "255,150,60" : "255,200,120";
      const alpha = fissure.active ? 0.95 : 0.6;

      if (!fissure.active) {
        ctx.lineWidth = this.fissureWidth * 0.8;
        ctx.shadowColor = `rgba(${baseColor}, ${0.65 * alpha})`;
        ctx.shadowBlur = 15;
        ctx.globalAlpha = 0.35;
        ctx.setLineDash([10, 16]);
        ctx.strokeStyle = `rgba(255, 205, 145, 0.7)`;
        ctx.beginPath();
        ctx.moveTo(fissure.startX, fissure.startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        continue;
      }

      const perpX = -fissure.dirY;
      const perpY = fissure.dirX;
      const halfWidth = (this.fissureWidth + 4) * 0.5;
      const headLength = Math.min(60, maxLength * 0.35);
      const shaftOffset = headLength * 0.3;
      const shaftEndX = endX - fissure.dirX * shaftOffset;
      const shaftEndY = endY - fissure.dirY * shaftOffset;
      const tipX = endX + fissure.dirX * headLength;
      const tipY = endY + fissure.dirY * headLength;
      const startLower = {
        x: fissure.startX - perpX * halfWidth,
        y: fissure.startY - perpY * halfWidth,
      };
      const startUpper = {
        x: fissure.startX + perpX * halfWidth,
        y: fissure.startY + perpY * halfWidth,
      };
      const shaftLower = {
        x: shaftEndX - perpX * halfWidth,
        y: shaftEndY - perpY * halfWidth,
      };
      const shaftUpper = {
        x: shaftEndX + perpX * halfWidth,
        y: shaftEndY + perpY * halfWidth,
      };

      const gradient = ctx.createLinearGradient(fissure.startX, fissure.startY, tipX, tipY);
      gradient.addColorStop(0, `rgba(${baseColor}, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.6})`);
      gradient.addColorStop(1, `rgba(${baseColor}, ${alpha * 0.6})`);

      ctx.shadowColor = `rgba(${baseColor}, ${Math.min(0.9, alpha)})`;
      ctx.shadowBlur = 28;
      ctx.globalAlpha = 1;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(startLower.x, startLower.y);
      ctx.lineTo(shaftLower.x, shaftLower.y);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(shaftUpper.x, shaftUpper.y);
      ctx.lineTo(startUpper.x, startUpper.y);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.stroke();

      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const offset = (i / 3) * maxLength;
        const px = fissure.startX + fissure.dirX * offset;
        const py = fissure.startY + fissure.dirY * offset;
        const sparkAngle = time * 4 + i * 1.2;
        const sparkLength = 10 + Math.sin(time * 6 + i) * 4;
        ctx.strokeStyle = `rgba(255,255,255,${0.35 + Math.sin(sparkAngle) * 0.25})`;
        ctx.beginPath();
        ctx.moveTo(px - fissure.dirX * sparkLength * 0.3, py - fissure.dirY * sparkLength * 0.3);
        ctx.lineTo(
          px + Math.cos(sparkAngle) * sparkLength,
          py + Math.sin(sparkAngle) * sparkLength
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
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

  _playMeteorLaunchSound() {
    if (this._meteorLaunchActive >= 3) return;
    this._meteorLaunchActive += 1;
    this._playSound("kaelOrbLaunch");
    setTimeout(() => {
      this._meteorLaunchActive = Math.max(0, this._meteorLaunchActive - 1);
    }, 900);
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
