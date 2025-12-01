export class Inventory {
  constructor(opts = {}) {
    this.capacity = opts.capacity ?? 3;
    this.items = [];
  }

  add(item) {
    if (!item) return false;
    if (this.items.length >= this.capacity) return false;
    this.items.push(item);
    return true;
  }

  has(name) {
    return this.items.some((i) => i.id === name);
  }

  use(name, ctx = {}) {
    const idx = this.items.findIndex((i) => i.id === name);
    if (idx < 0) return false;
    const item = this.items[idx];
    if (item?.orbOnly && !ctx?.allowOrbUse) {
      ctx.notify?.("Cet objet ne sert qu'à activer une orbe.");
      return false;
    }
    const it = item;
    if (it.onUse) it.onUse(ctx);
    if (!it.keep) this.items.splice(idx, 1);
    return true;
  }

  list() {
    return [...this.items];
  }
}
