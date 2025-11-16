export class Inventory {
  constructor(){ this.items = []; }
  add(item){ this.items.push(item); }
  has(name){ return this.items.some(i=>i.id===name); }
  use(name, ctx={}) {
    const idx=this.items.findIndex(i=>i.id===name);
    if (idx<0) return false;
    const it=this.items[idx];
    if (it.onUse) it.onUse(ctx);
    if (!it.keep) this.items.splice(idx,1);
    return true;
  }
}
