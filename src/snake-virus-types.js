import { VIRUS_TYPES as UPSTREAM_TYPES } from "./snake-upstream-v029/rewards.js";

// Keep upstream world generation unchanged; giants only come from poisoning.
export const GIANT_VIRUS_SIZE = 864;
export const VIRUS_TYPES = Object.freeze([...UPSTREAM_TYPES, Object.freeze({
  tier: "giant", label: "超级大病毒", size: GIANT_VIRUS_SIZE,
  valueKey: "superVirusValue", asset: "virusGiant", encircle: true,
})]);
export const virusType = virus => VIRUS_TYPES.find(type => type.tier === virus.tier);
