export const COLLECTIONS = [
  { name: "Pengztracted",      slug: "pengztracted-abstract",    chain: "abstract", verified: true },
  { name: "OCH Genesis Hero",  slug: "genesishero-abstract",     chain: "abstract", verified: true },
  { name: "Abstract Universe", slug: "abstra-universe-abstract", chain: "abstract", verified: true },
  { name: "Gigaverse ROMs",    slug: "gigaverse-roms-abstract",  chain: "abstract", verified: true },
  { name: "Final Bosu",        slug: "finalbosu",                chain: "abstract", verified: true },
];

export const API_BASE = "/api";

export function computeScore(floor, volume) {
  const momentum = volume / (floor + 0.001);
  return parseFloat((floor * 10 + momentum * 0.005).toFixed(2));
}