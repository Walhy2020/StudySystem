// StudySystem additions around the unchanged upstream movement parameters.
import { CONFIG_FIELDS as BASE_FIELDS, DEFAULT_CONFIG as BASE_DEFAULTS, normalizeConfig as normalizeBase } from "./snake-upstream-v029/config.js";
export { PRESETS } from "./snake-upstream-v029/config.js";
const boostField = Object.freeze({ key:"alignedSpeedBoost", group:"移动与转向", label:"同向加速比例", min:0, max:200, step:5, integer:true, value:50, unit:"%", help:"持续按住与当前行进方向一致的方向时加速。50 表示原速度的 1.5 倍，松开方向恢复原速；0 关闭加速。" });
const extraFields = [boostField,
  {key:"targetScale",group:"目标显示",label:"目标显示比例",min:.5,max:4,step:.1,value:2,unit:"倍",help:"左上角汉字或拼音的显示大小，默认放大到原来的2倍。"},
  {key:"vacuumRange",group:"吸取",label:"吸取范围",min:80,max:800,step:20,integer:true,value:260,unit:"单位",help:"按住吸取键时，前方这个范围内的小、中病毒会被吸过来，每次最多3秒。"},
  {key:"poisonInterval",group:"中毒与解毒",label:"中毒间隔",min:5,max:600,step:5,value:30,unit:"秒",help:"每次解毒或重新开始后，经过这段游玩时间会再次中毒。暂停时不计时。"},
  {key:"poisonTickInterval",group:"中毒与解毒",label:"中毒掉尾间隔",min:.25,max:10,step:.25,value:1,unit:"秒",help:"中毒后按这个间隔持续减少尾巴，直到解毒。"},
  {key:"poisonTailLoss",group:"中毒与解毒",label:"每次中毒掉尾",min:1,max:10,step:1,integer:true,value:1,unit:"节",help:"每次中毒伤害减少的身体节数。"},
  {key:"antidoteCost",group:"中毒与解毒",label:"解毒消耗星星",min:0,max:100,step:1,integer:true,value:5,unit:"颗",help:"按解毒键时消耗的星星数量；星星不够时无法解毒。"},
];
export const CONFIG_FIELDS = Object.freeze([...BASE_FIELDS.flatMap(field => field.key === "speed" ? [field, boostField] : [field]), ...extraFields.slice(1)]);
export const DEFAULT_CONFIG = Object.freeze({ ...BASE_DEFAULTS, ...Object.fromEntries(extraFields.map(f=>[f.key,f.value])) });
export function normalizeConfig(patch, base = DEFAULT_CONFIG) {
  return { ...normalizeBase(patch, base), ...Object.fromEntries(extraFields.map(field => {
    const value = typeof patch?.[field.key] === "number" && Number.isFinite(patch[field.key]) ? patch[field.key] : base[field.key] ?? field.value;
    const bounded = Math.max(field.min,Math.min(field.max,value));
    return [field.key,field.integer ? Math.round(bounded) : bounded];
  })) };
}
