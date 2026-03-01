export const COLLECTIONS = [
  { name: "Pengztracted",      slug: "pengztracted-abstract",      chain: "abstract" },
  { name: "OCH Genesis Hero",  slug: "genesishero-abstract",       chain: "abstract" },
  { name: "Abstract Universe", slug: "abstra-universe-abstract",   chain: "abstract" },
  { name: "Gigaverse ROMs",    slug: "gigaverse-roms-abstract",    chain: "abstract" },
  { name: "Final Bosu",        slug: "finalbosu",                  chain: "abstract" },
];

export const API_BASE = "/api";

export function computeScore(floor, volume) {
  const momentum = volume / (floor + 0.001);
  return parseFloat((floor * 10 + momentum * 0.005).toFixed(2));
}