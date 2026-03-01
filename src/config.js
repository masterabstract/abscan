export const COLLECTIONS = [
  { name: "Pengztracted",      slug: "pengztracted-abstract",    chain: "abstract", verified: true },
  { name: "OCH Genesis Hero",  slug: "genesishero-abstract",     chain: "abstract", verified: false },
  { name: "Abstract Universe", slug: "abstra-universe-abstract", chain: "abstract", verified: false },
  { name: "Gigaverse ROMs",    slug: "gigaverse-roms-abstract",  chain: "abstract", verified: false },
  { name: "Final Bosu",        slug: "finalbosu",                chain: "abstract", verified: false },
];

export const API_BASE = "/api";

export function computeScore(floor, volume24h, sales24h, totalSupply, numOwners) {
  const floorScore = floor * 40;
  const volumeScore = Math.min(volume24h * 30, 30);
  const salesScore = Math.min(sales24h * 0.5, 20);
  const holdersRatio = totalSupply > 0 ? (numOwners / totalSupply) : 0;
  const holdersScore = holdersRatio * 10;
  return parseFloat((floorScore + volumeScore + salesScore + holdersScore).toFixed(2));
}