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
    this.baseAnimations = baseAnimations;
    this.dragonAnimations = filterBossAnimations(opts.dragonAnimations ?? animations ?? {});
    this.animator = new Animator(baseAnimations, "idle");
    this.scale = opts.scale ?? 0.35;
    this.baseScale = this.scale;
    this.dragonScale = opts.dragonScale ?? this.scale * 1.4;
    const baseRadius = (CONFIG.actorRadius ?? 12) * (this.scale / 0.35);
    this.hitRadius = opts.hitRadius ?? opts.radius ?? Math.max(12, baseRadius * 1.5);
    this.baseHitRadius = this.hitRadius;
    this.facing = "right";

    const cfg = CONFIG.kael ?? {};
    const phaseTwo = cfg.phaseTwo ?? {};
    const phaseThree = cfg.phaseThree ?? {};
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
        // Distances "confort" pour l'IA de Kael
    // distance où il arrête de reculer et accepte le corps-à-corps
    this.meleeComfort = cfg.meleeComfort ?? 60;
    // distance idéale où il aime rester (mid-range)
    this.retreatStopDistance = cfg.retreatStopDistance ?? (this.preferredDistance + 10);

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
    this.phase = 1;
    this.onPlaySound = typeof opts.onPlaySound === "function" ? opts.onPlaySound : null;
    this.currentAction = null;
    this.lastAction = null;
    this.lastMoveVector = { x: 0, y: 0 };
  }

  enterPhaseThree(opts = {}) {
    this.phase = 3;
    const multiplier = Number.isFinite(opts.hpMultiplier)
      ? opts.hpMultiplier
      : this.phaseThreeCfg.hpMultiplier;
    this.maxHp = Math.round(CONFIG.kael.hp * Math.max(1, multiplier));
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

      const minMelee = this.meleeComfort;           // zone où il accepte le close combat
      const ideal = this.preferredDistance;         // distance idéale (mid-range)

      if (dist < minMelee) {
        // Trop collé au joueur → petit recul, mais pas fuite infinie
        const backSpeed = this.speed * 0.7;
        moveX = -dirX;
        moveY = -dirY;
        const norm = Math.hypot(moveX, moveY) || 1;
        moveX = (moveX / norm) * backSpeed * dt;
        moveY = (moveY / norm) * backSpeed * dt;
      } else if (dist > ideal) {
        // Trop loin → il revient mettre la pression
        const chaseSpeed = this.speed * 1.05;
        moveX = dirX;
        moveY = dirY;
        const norm = Math.hypot(moveX, moveY) || 1;
        moveX = (moveX / norm) * chaseSpeed * dt;
        moveY = (moveY / norm) * chaseSpeed * dt;
      } else {
        // Zone idéale → il strafe autour de toi (duel)
        const sideSpeed = this.speed * 0.85;
        const sideX = -dirY;
        const sideY = dirX;
        const sideDir = (player.x < this.x) ? 1 : -1; // juste pour le faire tourner un peu
        const norm = Math.hypot(sideX, sideY) || 1;
        moveX = (sideX / norm) * sideSpeed * dt * sideDir;
        moveY = (sideY / norm) * sideSpeed * dt * sideDir;
      }

      this.lastMoveVector = { x: moveX, y: moveY };
      moved = this._move(world, moveX, moveY);

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
    } else if (this.phase === 3) {
      this._updateMeteors(dt, player);
      this._updateShockwaves(dt, player);
      this._updateStormBolts(dt, player);
      this._updateDragonBreath(dt, player);
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
    this.animator.setAnimations(this.baseAnimations);
    this.scale = this.baseScale;
    this.hitRadius = this.baseHitRadius;
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
    if (this.phase === 2) {
      this._drawSigils(ctx);
      this._drawClones(ctx);
      this._drawBeam(ctx);
    } else if (this.phase === 3) {
      this._drawMeteors(ctx);
      this._drawShockwaves(ctx);
      this._drawStormBolts(ctx);
      this._drawDragonBreath(ctx);
    }

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
    ctx.globalCompositeOperation = "lighter";
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
        const gradient = ctx.createRadialGradient(sigil.x, sigil.y, 0, sigil.x, sigil.y, radius);
        gradient.addColorStop(0, "rgba(255,255,255,0.65)");
        gradient.addColorStop(0.45, "rgba(255,140,120,0.35)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sigil.x, sigil.y, radius * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = "rgba(255, 200, 120, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 * i) / 6;
          const inner = radius * 0.3;
          ctx.moveTo(
            sigil.x + Math.cos(angle) * inner,
            sigil.y + Math.sin(angle) * inner
          );
          ctx.lineTo(
            sigil.x + Math.cos(angle) * radius,
            sigil.y + Math.sin(angle) * radius
          );
        }
        ctx.stroke();
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
    for (const clone of this.clones) {
      const lifeRatio = clone.life > 0 ? Math.max(0, clone.timer / clone.life) : 0;
      const radius = 18 + (1 - lifeRatio) * 16;
      const alpha = 0.2 + (1 - lifeRatio) * 0.6;
      const tailLength = 40 + (1 - lifeRatio) * 60;
      ctx.fillStyle = `rgba(140, 220, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(clone.x, clone.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(140, 220, 255, ${alpha * 0.8})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(clone.x, clone.y);
      ctx.lineTo(clone.x - clone.dirX * tailLength, clone.y - clone.dirY * tailLength);
      ctx.stroke();
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
    const gradient = ctx.createLinearGradient(0, 0, reach, 0);
    gradient.addColorStop(0, "rgba(255,255,255,0.4)");
    gradient.addColorStop(0.4, "rgba(255,160,120,0.7)");
    gradient.addColorStop(1, "rgba(255,90,60,0.1)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -width);
    ctx.lineTo(reach, -width * 0.35);
    ctx.lineTo(reach, width * 0.35);
    ctx.lineTo(0, width);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = beam.active ? 0.4 : 0.2;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(0, -width * 0.5);
    ctx.lineTo(reach, 0);
    ctx.lineTo(0, width * 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  _spawnMeteorRain(player) {
    const count = 6;
    this.meteors = [];
    for (let i = 0; i < count; i++) {
      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetDist = 60 + Math.random() * 160;
      const targetX = player.x + Math.cos(offsetAngle) * offsetDist;
      const targetY = player.y + Math.sin(offsetAngle) * offsetDist;
      this.meteors.push({
        targetX,
        targetY,
        telegraph: 0.9 + Math.random() * 0.4,
        fall: 0.6 + Math.random() * 0.2,
        state: "telegraph",
        blast: 0.45,
        radius: 45 + Math.random() * 15,
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
          this._playSound("kaelOrbLaunch");
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
        const pulse = Math.sin((meteor.telegraph + time) * 10) * 0.3 + 0.7;
        ctx.strokeStyle = `rgba(255,120,80,${pulse})`;
        ctx.lineWidth = 2 + pulse * 4;
        ctx.beginPath();
        ctx.arc(meteor.targetX, meteor.targetY, meteor.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (meteor.state === "fall") {
        ctx.strokeStyle = "rgba(255,180,120,0.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(meteor.targetX, meteor.targetY - 200);
        ctx.lineTo(meteor.targetX, meteor.targetY);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,220,120,0.6)";
        ctx.beginPath();
        ctx.arc(meteor.targetX, meteor.targetY - 20, 12, 0, Math.PI * 2);
        ctx.fill();
      } else if (meteor.state === "blast") {
        const ratio = meteor.blastTimer / meteor.blast;
        const radius = meteor.radius * (1 + (1 - ratio) * 0.5);
        const grad = ctx.createRadialGradient(
          meteor.targetX,
          meteor.targetY,
          0,
          meteor.targetX,
          meteor.targetY,
          radius
        );
        grad.addColorStop(0, "rgba(255,255,255,0.9)");
        grad.addColorStop(0.4, "rgba(255,170,90,0.5)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(meteor.targetX, meteor.targetY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  _spawnShockwaves() {
    const waves = [];
    const count = 3;
    for (let i = 0; i < count; i++) {
      waves.push({
        radius: 30 + i * 20,
        speed: 160 + i * 40,
        width: 28 + i * 8,
        timer: 2.2,
      });
    }
    this.shockwaves = waves;
    this._playSound("kaelJump");
  }

  _updateShockwaves(dt, player) {
    if (!this.shockwaves.length) return;
    for (const wave of this.shockwaves) {
      wave.radius += wave.speed * dt;
      wave.timer -= dt;
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      const halfWidth = wave.width * 0.5;
      if (Math.abs(dist - wave.radius) <= halfWidth) {
        player.applyDamage(this.phaseThreeCfg.shockwaveDamage * dt);
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
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = wave.width;
      ctx.beginPath();
      ctx.arc(this.x, this.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
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
        ctx.fillStyle = "rgba(120,180,255,0.6)";
        ctx.beginPath();
        ctx.arc(bolt.previewX ?? this.x, bolt.previewY ?? this.y, 12, 0, Math.PI * 2);
        ctx.fill();
      } else if (bolt.state === "dash") {
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bolt.x, bolt.y);
        ctx.lineTo(bolt.x - bolt.dirX * 25, bolt.y - bolt.dirY * 25);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,200,80,0.9)";
        ctx.beginPath();
        ctx.arc(bolt.x, bolt.y, 10, 0, Math.PI * 2);
        ctx.fill();
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
