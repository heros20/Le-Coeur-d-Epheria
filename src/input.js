export const Keys = new Set();
let _just = new Set();

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
export function endFrame(){ _just = new Set(); }
