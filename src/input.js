export const Keys = new Set();
let _just = new Set();

export const Pointer = {
  x: 0,
  y: 0,
  worldX: 0,
  worldY: 0,
  buttons: new Set(),
  _just: new Set(),
  hasPosition: false,
};

const HANDLED = new Set([
  "z","q","s","d",
  "arrowup","arrowdown","arrowleft","arrowright",
  "shift","e","t","i"," ","r"   // ← ajouté "r"
]);

function norm(e){ return (e.key || "").toLowerCase(); }

export function setupKeyboard(){
  const onDown = (e)=>{
    const k = norm(e);
    if (HANDLED.has(k)) e.preventDefault();
    Keys.add(k); _just.add(k);
  };
  const onUp = (e)=> Keys.delete(norm(e));
  window.addEventListener("keydown", onDown, { passive:false });
  window.addEventListener("keyup", onUp, { passive:false });
  return ()=>{ window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
}
export function consume(k){ k=k.toLowerCase(); if(_just.has(k)){ _just.delete(k); return true; } return false; }

export function setupPointer(target){
  const el = target ?? document.body;
  const eventsTarget = window;
  const updateLocal = (clientX, clientY) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return false;
    }
    Pointer.x = clientX - rect.left;
    Pointer.y = clientY - rect.top;
    Pointer.hasPosition = true;
    return true;
  };
  const onMove = (e) => {
    updateLocal(e.clientX, e.clientY);
  };
  const onDown = (e) => {
    if (e.button === undefined) return;
    const inside = updateLocal(e.clientX, e.clientY);
    if (!inside) return;
    Pointer.buttons.add(e.button);
    Pointer._just.add(e.button);
    if (e.button === 0) e.preventDefault();
  };
  const onUp = (e) => {
    if (e.button === undefined) return;
    Pointer.buttons.delete(e.button);
  };
  const onLeave = () => {
    Pointer.buttons.clear();
  };
  eventsTarget.addEventListener("pointermove", onMove);
  eventsTarget.addEventListener("pointerdown", onDown);
  eventsTarget.addEventListener("pointerup", onUp);
  eventsTarget.addEventListener("pointerleave", onLeave);
  const onContext = (e) => e.preventDefault();
  el.addEventListener("contextmenu", onContext);
  const rect = el.getBoundingClientRect();
  Pointer.x = rect.width * 0.5;
  Pointer.y = rect.height * 0.5;
  Pointer.hasPosition = true;
  return () => {
    eventsTarget.removeEventListener("pointermove", onMove);
    eventsTarget.removeEventListener("pointerdown", onDown);
    eventsTarget.removeEventListener("pointerup", onUp);
    eventsTarget.removeEventListener("pointerleave", onLeave);
    el.removeEventListener("contextmenu", onContext);
  };
}

export function pointerDown(button = 0) {
  return Pointer.buttons.has(button);
}

export function consumePointer(button = 0) {
  if (Pointer._just.has(button)) {
    Pointer._just.delete(button);
    return true;
  }
  return false;
}

export function endFrame(){
  _just = new Set();
  Pointer._just.clear();
}
