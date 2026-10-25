export const DEFAULT_BINDINGS = Object.freeze({vacuum:Object.freeze({key:"KeyF",button:2}),antidote:Object.freeze({key:"KeyG",button:1})});
const reservedKeys=new Set(["Space","Escape","Enter","Tab","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD","KeyQ","KeyE"]);
const reservedButtons=new Set([0,3,4,5,7,8,9,12,13,14,15,16]);
export function bindingError(bindings,action,device,value) {
  if (device==="key" && (!/^(Key[A-Z]|Digit\d|F[1-9]|F1[0-2]|Numpad\d|ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight)$/.test(value) || reservedKeys.has(value))) return "这个键已用于移动、暂停或页面操作，请换一个键。";
  if (device==="button" && (!Number.isInteger(value)||value<0||value>17||reservedButtons.has(value))) return "这个手柄键已用于移动、菜单或全屏，请换一个键。";
  const other=action==="vacuum"?"antidote":"vacuum";
  if (bindings[other][device]===value) return `这个键已用于${other==="vacuum"?"吸取":"解毒"}，请换一个键。`;
  return "";
}
export function normalizeBindings(saved) {
  const result=structuredClone(DEFAULT_BINDINGS);
  // Validate independently so saved swaps do not conflict with the other default.
  const empty={vacuum:{key:null,button:null},antidote:{key:null,button:null}};
  for (const action of ["vacuum","antidote"]) for (const device of ["key","button"]) {
    const value=saved?.[action]?.[device];
    if (value!==undefined && !bindingError(empty,action,device,value)) result[action][device]=value;
  }
  for (const device of ["key","button"]) if (result.vacuum[device]===result.antidote[device]) {
    for (const action of ["vacuum","antidote"]) result[action][device]=DEFAULT_BINDINGS[action][device];
  }
  return result;
}
export function keyLabel(code) { return code.replace(/^Key|^Digit/,"").replace(/^Numpad/,"数字键 "); }
export function buttonLabel(button) { return ({1:"B / ○",2:"X / □",6:"L2 / LT",10:"L3",11:"R3",17:"触摸板"})[button] || `按键 ${button}`; }
