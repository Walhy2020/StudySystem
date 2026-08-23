export function displaySymbol(symbol) {
  const value = String(symbol ?? "");
  return value.length >= 2 && value.startsWith("/") && value.endsWith("/")
    ? value.slice(1, -1)
    : value;
}

export function exampleEntries(item, transcriptions) {
  return (item?.examples || []).map((word) => ({
    word,
    transcription: transcriptions?.[word] || "",
  }));
}
