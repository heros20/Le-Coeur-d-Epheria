// Fog of War persistant avec un OffscreenCanvas de la taille du monde.
// On "punch" des trous transparents autour du joueur au fil du temps.
export class FogOfWar {
  constructor(worldWidth, worldHeight) {
    this.w = worldWidth;
    this.h = worldHeight;
    this.cvs = new OffscreenCanvas(this.w, this.h);
    this.ctx = this.cvs.getContext('2d');
    this.reset();
  }
  reset() {
    const c = this.ctx;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0,0,this.w,this.h);
    c.fillStyle = '#000';
    c.fillRect(0,0,this.w,this.h);
  }
  reveal(x, y, r=140) {
    const c = this.ctx;
    c.save();
    c.globalCompositeOperation = 'destination-out';
    const g = c.createRadialGradient(x,y, r*0.35, x,y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0.0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x,y,r,0,Math.PI*2);
    c.fill();
    c.restore();
  }
  drawTo(ctx, camX, camY, viewW, viewH) {
    // On ne dessine que la portion visible
    ctx.drawImage(
      this.cvs,
      camX, camY, viewW, viewH,  // src rect
      0, 0, viewW, viewH         // dest rect
    );
  }
}
