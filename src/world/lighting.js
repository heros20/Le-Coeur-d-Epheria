// /src/world/lighting.js
import { CONFIG } from "../config.js";

/**
 * Brouillard épais : seule la zone autour du héros est visible.
 * Pas de mémoire : le voile est reconstruit à chaque frame.
 *
 * @param {CanvasRenderingContext2D} ctx - contexte du CANVAS PRINCIPAL (déjà avec la scène dessinée)
 * @param {"LIGHT"|"SHADOW"} mode
 * @param {number} px - x écran du héros
 * @param {number} py - y écran du héros
 * @param {boolean} torchOn
 */
export function applyLighting(ctx, mode, px, py, torchOn = true) {
  const { width: w, height: h } = ctx.canvas;

  // --- paramètres
  const fogAlphaLight  = CONFIG.fogBaseAlphaLight  ?? 1;
  const fogAlphaShadow = CONFIG.fogBaseAlphaShadow ?? 0.96;
  const penumbraRatio  = CONFIG.fogPenumbraRatio   ?? 0.55; // part du rayon en dégradé
  const torchR         = CONFIG.torchRadius        ?? 1;
  const baseR          = CONFIG.baseVisionRadius   ?? 1;
  const shadowR        = CONFIG.shadowVisionRadius ?? 1;
  const shadowMul      = CONFIG.shadowVisionMul    ?? 0.1;

  let R;
  if (mode === "LIGHT") R = torchOn ? torchR : baseR;
  else R = torchOn ? torchR * shadowMul : shadowR;
  R = Math.max(30, Math.min(60, R));

  const inner = Math.max(0, R * (1 - penumbraRatio));
  const outer = R;

  // --- masque offscreen (évite toute pollution d'état du ctx principal)
  const fog = getFogCanvas(w, h);
  const fctx = fog.getContext("2d");

  // 1) reset
  fctx.setTransform(1,0,0,1,0,0);
  fctx.globalCompositeOperation = "source-over";
  fctx.clearRect(0, 0, w, h);

  // 2) voile plein
  //const fogFill = (mode === "LIGHT")
  //  ? `rgba(0,0,0,${fogAlphaLight})`
  //  : `rgba(2,6,16,${fogAlphaShadow})`;
  //fctx.fillStyle = fogFill;
  //fctx.fillRect(0, 0, w, h);

  // 3) trou radial (destination-out)
  fctx.globalCompositeOperation = "destination-out";
  const g = fctx.createRadialGradient(px, py, inner, px, py, outer);
  // centre très opaque => on retire totalement au centre
  g.addColorStop(0.0, "rgba(0,0,0,1.0)");
  g.addColorStop(0.999, "rgba(0,0,0,0.0)");
  g.addColorStop(1.0, "rgba(0,0,0,0.0)");
  fctx.fillStyle = g;
  fctx.fillRect(0, 0, w, h);

  // 4) on pose le masque sur la scène
  ctx.save();
  ctx.globalCompositeOperation = "source-over"; // important !
  ctx.drawImage(fog, 0, 0);
  ctx.restore();
}

// --- cache du canvas de brouillard
let _fogCanvas = null;
function getFogCanvas(w, h) {
  if (!_fogCanvas || _fogCanvas.width !== w || _fogCanvas.height !== h) {
    _fogCanvas = (typeof OffscreenCanvas !== "undefined")
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement("canvas"), { width: w, height: h });
  }
  return _fogCanvas;
}
