// /src/world/map.js
import { CONFIG } from "../config.js";

/**
 * WorldMap
 * - Deux modes possibles :
 *   1) Collisions depuis Tiled (recommandé)  → applyTiledCollisionFromJSON()
 *   2) Collisions par luminance (legacy)     → buildCollision() + constrainToWalkFrom()
 */
export class WorldMap {
  constructor(img) {
    this.img = img;
    this.w = img.width;
    this.h = img.height;

    this.cell = CONFIG.collisionCell || 6; // taille cellule en px
    this.cols = Math.ceil(this.w / this.cell);
    this.rows = Math.ceil(this.h / this.cell);

    this.collision = new Uint8Array(this.cols * this.rows);
    const offset = CONFIG.collisionOffset ?? {};
    this.collisionOffset = {
      x: Number.isFinite(offset.x) ? offset.x : 0,
      y: Number.isFinite(offset.y) ? offset.y : 0,
    };

    // features par cellule (utiles au mode luminance)
    this._bright = new Float32Array(this.cols * this.rows);
    this._mid    = new Float32Array(this.cols * this.rows);
    this._cand   = new Uint8Array(this.cols * this.rows); // 1 = “ressemble à un mur”

    this.usingTiled = false; // flag pour éviter d’appliquer une contrainte luminance par erreur
  }

  /** --------- MODE TILED : lit un JSON Tiled et génère la grille de collision --------- */
  async applyTiledCollisionFromJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Impossible de charger le JSON Tiled: ${url}`);
    const tmap = await res.json();

    this.usingTiled = true;
    this.collision.fill(0); // par défaut : ouvert

    const colliderLayer = (tmap.layers || []).find(
      (l) => l.type === "objectgroup" && l.name === "Colliders"
    );
    if (!colliderLayer) {
      console.warn("[Tiled] Aucun calque 'Colliders' trouvé — aucune collision ajoutée.");
      this._forceBorders();
      return;
    }

 for (const o of colliderLayer.objects) {
  if (o.ellipse || o.polygon || o.polyline) continue;
  const x = o.x || 0;
  const y = o.y || 0; // ✅ Rectangle = coin haut-gauche dans Tiled
  const w = o.width || 0;
  const h = o.height || 0;
  this._rasterizeRectToCollision(x, y, w, h);
}


    this._forceBorders();
    console.log(`[Tiled] Colliders: ${colliderLayer.objects.length} objets rasterisés.`);
  }

  _rasterizeRectToCollision(px, py, pw, ph) {
    const cs = this.cell;
    const x0 = Math.floor(px / cs);
    const y0 = Math.floor(py / cs);
    const x1 = Math.ceil((px + pw) / cs);
    const y1 = Math.ceil((py + ph) / cs);
    for (let y = Math.max(0, y0); y < Math.min(this.rows, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(this.cols, x1); x++) {
        this.collision[y * this.cols + x] = 1;
      }
    }
  }

  /** --------- MODE LUMINANCE (legacy – conservé si besoin) --------- */
  buildCollision() {
    const cvs = (typeof OffscreenCanvas !== "undefined")
      ? new OffscreenCanvas(this.w, this.h)
      : Object.assign(document.createElement("canvas"), { width: this.w, height: this.h });
    const ctx = cvs.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(this.img, 0, 0);
    const { data } = ctx.getImageData(0, 0, this.w, this.h);

    const PIX_MID = 135, PIX_BRIGHT = 160, GREEN_DELTA = 25, step = 2;
    const idxC = (x, y) => y * this.cols + x;

    for (let cy = 0; cy < this.rows; cy++) {
      const y0 = cy * this.cell, y1 = Math.min(y0 + this.cell, this.h);
      for (let cx = 0; cx < this.cols; cx++) {
        const x0 = cx * this.cell, x1 = Math.min(x0 + this.cell, this.w);
        let b=0, m=0, gDark=0, tot=0;
        for (let y = y0; y < y1; y += step) {
          for (let x = x0; x < x1; x += step) {
            const i = (y * this.w + x) * 4;
            const R = data[i], G = data[i+1], B = data[i+2];
            const L = 0.2126*R + 0.7152*G + 0.0722*B;
            if (L >= PIX_MID)    m++;
            if (L >= PIX_BRIGHT) b++;
            const greenDominant = (G - Math.max(R, B)) >= GREEN_DELTA;
            if (greenDominant && L < PIX_MID) gDark++;
            tot++;
          }
        }
        const k = idxC(cx, cy);
        const bf = b / Math.max(1, tot);
        const mf = m / Math.max(1, tot);
        const gdf = gDark / Math.max(1, tot);
        this._bright[k] = bf;
        this._mid[k]    = mf;
        const DARK_FRAC = 0.55;
        const MID_FLOOR_MIN = 0.48;
        this._cand[k] = (gdf >= DARK_FRAC || mf < MID_FLOOR_MIN) ? 1 : 0;
      }
    }

    this.collision.fill(1); // sera affiné par constrainToWalkFrom()
    this._forceBorders();
  }

  /**
   * Construit la collision finale à partir d'une graine (spawn).
   * ⚠️ À NE PAS utiliser quand usingTiled = true.
   */
  constrainToWalkFrom(px, py, opts = {}) {
    if (this.usingTiled) return; // on ne touche pas aux collisions Tiled

    const softRadiusPx = opts.softRadius || 220;
    const W = this.cols, H = this.rows, id = (x, y) => y * W + x;

    const sx = Math.max(
      0,
      Math.min(W - 1, Math.floor((px - this.collisionOffset.x) / this.cell))
    );
    const sy = Math.max(
      0,
      Math.min(H - 1, Math.floor((py - this.collisionOffset.y) / this.cell))
    );
    const r2 = (softRadiusPx / this.cell) ** 2;

    const visited = new Uint8Array(W * H);
    const q = [];

    const floorHard  = (k) => (this._mid[k] >= 0.60 || this._bright[k] >= 0.30);
    const floorSoft  = (k) => (this._mid[k] >= 0.48 || this._bright[k] >= 0.18);
    const floorUltra = (k) => (this._mid[k] >= 0.35);

    const push = (x, y) => {
      if (x <= 0 || y <= 0 || x >= W - 1 || y >= H - 1) return;
      const k = id(x, y);
      if (visited[k]) return;
      const near = ((x - sx) ** 2 + (y - sy) ** 2) <= r2;
      if (floorHard(k) || (near ? floorUltra(k) : floorSoft(k))) {
        visited[k] = 1; q.push([x, y]);
      }
    };

    push(sx, sy);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of dirs) push(x + dx, y + dy);
    }

    const thick = this._erode(this._dilate(this._cand, 3, true), 1, true);
    const out = new Uint8Array(W * H);
    for (let i = 0; i < out.length; i++) {
      out[i] = (visited[i] ? 0 : 1) | (thick[i] ? 1 : 0);
    }
    this.collision = out;
    this._forceBorders();
  }

  // ---------- API ----------
  isBlocked(px, py) {
    const rx = Math.floor((px - this.collisionOffset.x) / this.cell);
    const ry = Math.floor((py - this.collisionOffset.y) / this.cell);
    if (rx < 0 || ry < 0 || rx >= this.cols || ry >= this.rows) return true;
    return this.collision[ry * this.cols + rx] === 1;
  }

  circleFree(x, y, r) {
    return !(
      this.isBlocked(x - r, y) || this.isBlocked(x + r, y) ||
      this.isBlocked(x, y - r) || this.isBlocked(x, y + r) ||
      this.isBlocked(x - r, y - r) || this.isBlocked(x + r, y - r) ||
      this.isBlocked(x - r, y + r) || this.isBlocked(x + r, y + r)
    );
  }

  nearestOpen(px, py, r) {
    const clamp = (value, max) => Math.max(0, Math.min(max, value));
    const sx = clamp(Math.floor((px - this.collisionOffset.x) / this.cell), this.cols - 1);
    const sy = clamp(Math.floor((py - this.collisionOffset.y) / this.cell), this.rows - 1);
    const seen = new Uint8Array(this.cols * this.rows);
    const q = [[sx, sy]];
    const id = (x, y) => y * this.cols + x;
    seen[id(sx, sy)] = 1;

    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    while (q.length) {
      const [x, y] = q.shift();
      const cx = x * this.cell + this.cell * 0.5 + this.collisionOffset.x;
      const cy = y * this.cell + this.cell * 0.5 + this.collisionOffset.y;
      if (this.circleFree(cx, cy, r)) return { x: cx, y: cy };
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx>=0 && ny>=0 && nx<this.cols && ny<this.rows) {
          const k = id(nx, ny);
          if (!seen[k]) { seen[k] = 1; q.push([nx, ny]); }
        }
      }
    }
    return { x: px, y: py };
  }

  // ---------- Utils internes ----------
  _forceBorders() {
    for (let x = 0; x < this.cols; x++) {
      this.collision[x] = 1;
      this.collision[(this.rows - 1) * this.cols + x] = 1;
    }
    for (let y = 0; y < this.rows; y++) {
      this.collision[y * this.cols] = 1;
      this.collision[y * this.cols + (this.cols - 1)] = 1;
    }
  }

  _dilate(mask, passes = 1, diag = true) {
    const W = this.cols, H = this.rows;
    let cur = mask.slice();
    for (let p = 0; p < passes; p++) {
      const nxt = cur.slice();
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = y * W + x; if (!cur[i]) continue;
          nxt[i - 1] = 1; nxt[i + 1] = 1; nxt[i - W] = 1; nxt[i + W] = 1;
          if (diag) { nxt[i - W - 1] = 1; nxt[i - W + 1] = 1; nxt[i + W - 1] = 1; nxt[i + W + 1] = 1; }
        }
      }
      cur = nxt;
    }
    return cur;
  }

  _erode(mask, passes = 1, diag = true) {
    const W = this.cols, H = this.rows;
    let cur = mask.slice();
    for (let p = 0; p < passes; p++) {
      const nxt = cur.slice();
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = y * W + x; if (!cur[i]) continue;
          const a = cur[i - 1] && cur[i + 1] && cur[i - W] && cur[i + W];
          const b = !diag || (cur[i - W - 1] && cur[i - W + 1] && cur[i + W - 1] && cur[i + W + 1]);
          if (!(a && b)) nxt[i] = 0;
        }
      }
      cur = nxt;
    }
    return cur;
  }

  // Debug overlay (remplissage rouge des cellules-murs)
  drawCollisionDebug(ctx, camX, camY, viewW, viewH) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#ff4d4d";
    const ox = this.collisionOffset.x;
    const oy = this.collisionOffset.y;
    const x0 = Math.floor((camX - ox) / this.cell);
    const y0 = Math.floor((camY - oy) / this.cell);
    const x1 = Math.ceil((camX + viewW - ox) / this.cell);
    const y1 = Math.ceil((camY + viewH - oy) / this.cell);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (x<0||y<0||x>=this.cols||y>=this.rows) continue;
        if (this.collision[y*this.cols+x] === 1) {
          ctx.fillRect(
            x * this.cell + ox - camX,
            y * this.cell + oy - camY,
            this.cell,
            this.cell
          );
        }
      }
    }
    ctx.restore();
  }
}

/* ------------------------------
   Chargement simple (Tiled)
---------------------------------*/

export async function loadWorldMap() {
  // l’image de fond (même dossier que le JSON Tiled)
  const img = await loadImage("assets/maps.png");
  const world = new WorldMap(img);

  // ✅ collisions uniquement depuis Tiled
  await world.applyTiledCollisionFromJSON("assets/map/map.json");

  // pas de constrainToWalkFrom() ici (réservé au mode luminance)

  // spawn “par défaut” si le jeu en a besoin
  const spawn = { x: world.w * 0.5, y: 120 }; // nord léger

  return { image: img, world, spawn };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}
