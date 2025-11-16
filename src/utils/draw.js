export function drawSprite(ctx, img, x, y, w, h) {
  ctx.drawImage(img, Math.round(x - w/2), Math.round(y - h/2), w, h);
}

export function vignette(ctx, w, h, intensity=0.6) {
  const grd = ctx.createRadialGradient(w/2,h/2,Math.min(w,h)/2, w/2,h/2, Math.max(w,h));
  grd.addColorStop(0, `rgba(0,0,0,0)`);
  grd.addColorStop(1, `rgba(0,0,0,${intensity})`);
  ctx.fillStyle = grd;
  ctx.fillRect(0,0,w,h);
}

export function strokeText(ctx, text, x, y) {
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'black';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = 'white';
  ctx.fillText(text, x, y);
}
