export const COLLECTIONS = [
  { name: "Pengztracted", slug: "pengztracted", chain: "abstract" },
  { name: "OCH Genesis Hero", slug: "genesishero-abstract", chain: "abstract" },
  { name: "Abstract Universe", slug: "abstract-universe", chain: "abstract" },
  { name: "Gigaverse ROMs", slug: "gigaverse-roms", chain: "abstract" },
  { name: "Final Bosu", slug: "final-bosu", chain: "abstract" },
];

export const API_BASE = "/api";

export function computeScore(floor, volume) {
  const momentum = volume / (floor + 0.001);
  return parseFloat((floor * 10 + momentum * 0.005).toFixed(2));
}