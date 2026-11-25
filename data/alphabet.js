// One learning item per letter; upper and lower case share a single record.
export const ALPHABET_ITEMS = Object.freeze(Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ", upper =>
  Object.freeze({ id: `alphabet-${upper.toLowerCase()}`, upper, lower: upper.toLowerCase(),
    symbol: `${upper} ${upper.toLowerCase()}`, title: "英文字母" })));
