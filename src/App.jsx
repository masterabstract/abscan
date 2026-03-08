/**
 * api.js — Proxy via fonctions serverless Vercel
 * Reservoir bloque les appels directs depuis le navigateur (CORS).
 * On passe par /api/* qui appellent Reservoir côté serveur.
 */

const EXPLORER  = 'https://abscan.org';

async function get(path) {
  const r = await fetch(path);
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`HTTP ${r.status} — ${text.slice(0, 100)}`);
  }
  return r.json();
}

export async function getTopCollections({ limit = 20, sortBy = 'allTimeVolume', offset = 0 } = {}) {
  return get(`/api/collections?limit=${limit}&sortBy=${sortBy}&offset=${offset}`);
}

export async function getCollection(slug) {
  return get(`/api/collection/${encodeURIComponent(slug)}`);
}

export async function getEvents({ collection, limit = 50 } = {}) {
  const qs = new URLSearchParams({ limit });
  if (collection) qs.set('collection', collection);
  return get(`/api/events?${qs}`);
}

export async function getListings({ collection, limit = 40 } = {}) {
  const qs = new URLSearchParams({ limit });
  if (collection) qs.set('collection', collection);
  return get(`/api/listings?${qs}`);
}

export async function getWhales(period = '24h') {
  return get(`/api/whales?period=${period}`);
}

export async function getWalletPortfolio(address) {
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error('Invalid address');
  return get(`/api/wallet/${address}`);
}

export async function getChainStats() {
  return get('/api/chain');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatEth(wei) {
  if (wei == null) return '—';
  const eth = Number(wei) / 1e18;
  if (eth === 0) return '0 ETH';
  if (eth < 0.001) return '< 0.001 ETH';
  if (eth < 1)   return `${eth.toFixed(3)} ETH`;
  if (eth < 100) return `${eth.toFixed(2)} ETH`;
  return `${Math.round(eth).toLocaleString()} ETH`;
}

export function formatAddress(addr, chars = 6) {
  if (!addr) return '—';
  return `${addr.slice(0, chars)}…${addr.slice(-4)}`;
}

export function formatNumber(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function explorerTx(hash)   { return `${EXPLORER}/tx/${hash}`; }
export function explorerAddr(addr) { return `${EXPLORER}/address/${addr}`; }
export { EXPLORER };
