export const ACTION_LABELS = Object.freeze({vacuum:"吸取",antidote:"解毒",slow:"阅读减速"});
export const DEFAULT_BINDINGS = Object.freeze({vacuum:Object.freeze({key:"KeyF",button:2}),antidote:Object.freeze({key:"KeyG",button:1}),slow:Object.freeze({key:"KeyH",button:6})});
const reservedKeys=new Set(["Space","Escape","Enter","Tab","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD","KeyQ","KeyE"]);
const reservedButtons=new Set([0,3,4,5,7,8,9,12,13,14,15,16]);
export function bindingError(bindings,action,device,value) {
  if (device==="key" && (!/^(Key[A-Z]|Digit\d|F[1-9]|F1[0-2]|Numpad\d|ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight)$/.test(value) || reservedKeys.has(value))) return "这个键已用于移动、暂停或页面操作，请换一个键。";
  if (device==="button" && (!Number.isInteger(value)||value<0||value>17||reservedButtons.has(value))) return "这个手柄键已用于移动、菜单或全屏，请换一个键。";
  const other=Object.keys(ACTION_LABELS).find(other=>other!==action&&bindings[other]?.[device]===value);
  return other ? `这个键已用于${ACTION_LABELS[other]}，请换一个键。` : "";
}
export function normalizeBindings(saved) {
  const actions=Object.keys(ACTION_LABELS), empty=Object.fromEntries(actions.map(action=>[action,{key:null,button:null}]));
  const result=structuredClone(empty);
  for (const device of ["key","button"]) {
    const valid=actions.filter(action=>saved?.[action]?.[device]!==undefined&&!bindingError(empty,action,device,saved[action][device]));
    // Preserve unique existing user bindings before allocating the new action.
    for (const action of valid) if (!valid.some(other=>other!==action&&saved[other][device]===saved[action][device])) result[action][device]=saved[action][device];
    for (const action of actions) if (result[action][device]===null) {
      const candidates=device==="key"?[DEFAULT_BINDINGS[action].key,"KeyR","KeyT","KeyJ","KeyK"]:[DEFAULT_BINDINGS[action].button,10,11,17,6,2,1];
      result[action][device]=candidates.find(value=>!bindingError(result,action,device,value));
    }
  }
  return result;
}
export function keyLabel(code) { return code.replace(/^Key|^Digit/,"").replace(/^Numpad/,"数字键 "); }
export function buttonLabel(button) { return ({1:"B / ○",2:"X / □",6:"L2 / LT",10:"L3",11:"R3",17:"触摸板"})[button] || `按键 ${button}`; }
