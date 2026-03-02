export const COLLECTIONS = [
  { name: "Pengztracted",      slug: "pengztracted-abstract",    chain: "abstract", verified: true,  contract: "0xa6c46c07f7f1966d772e29049175ebba26262513" },
  { name: "OCH Genesis Hero",  slug: "genesishero-abstract",     chain: "abstract", verified: false, contract: "0x7c47ea32fd27d1a74fc6e9f31ce8162e6ce070eb" },
  { name: "Abstract Universe", slug: "abstra-universe-abstract", chain: "abstract", verified: false, contract: "0xe501994195b9951413411395ed1921a88eff694e" },
  { name: "Gigaverse ROMs",    slug: "gigaverse-roms-abstract",  chain: "abstract", verified: false, contract: "0x59eec556cef447e13edf4bfd3d4433d8dad8a7a5" },
  { name: "Final Bosu",        slug: "finalbosu",                chain: "abstract", verified: false, contract: "0x5fedb9a131f798e986109dd89942c17c25c81de3" },
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