module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { slug } = req.query;
  if (!slug || !/^[a-z0-9\-_]+$/.test(slug))
    return res.status(400).json({ error: 'Invalid slug' });

  const API_KEY = process.env.OPENSEA_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'API key not configured' });

  try {
    // Fetch up to 200 NFTs to reconstruct holder distribution
    let allNfts = [];
    let cursor = null;

    for (let i = 0; i < 2; i++) {
      const url = `https://api.opensea.io/api/v2/collection/${slug}/nfts?limit=100${cursor ? `&next=${cursor}` : ''}`;
      const r = await fetch(url, {
        headers: { 'X-API-KEY': API_KEY, 'Accept': 'application/json' }
      });
      if (!r.ok) break;
      const data = await r.json();
      const nfts = data.nfts || [];
      allNfts.push(...nfts);
      cursor = data.next || null;
      if (!cursor || nfts.length === 0) break;
    }

    if (allNfts.length === 0) {
      return res.status(200).json({ owners: [], whaleCount: 0, top10Pct: 0, totalOwned: 0 });
    }

    // Build owner map
    const ownerMap = {};
    for (const nft of allNfts) {
      const owner = nft.owners?.[0]?.address || nft.owner || null;
      if (owner && owner !== '0x0000000000000000000000000000000000000000') {
        ownerMap[owner] = (ownerMap[owner] || 0) + 1;
      }
    }

    const sorted = Object.entries(ownerMap)
      .map(([address, quantity]) => ({ address, quantity }))
      .sort((a, b) => b.quantity - a.quantity);

    const totalOwned = sorted.reduce((s, o) => s + o.quantity, 0);
    const top10 = sorted.slice(0, 10);
    const top10Supply = top10.reduce((s, o) => s + o.quantity, 0);
    const top10Pct = totalOwned > 0 ? ((top10Supply / totalOwned) * 100).toFixed(1) : 0;
    const whaleCount = sorted.filter(o => o.quantity >= 5).length;

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=60');
    return res.status(200).json({ owners: top10, whaleCount, top10Pct, totalOwned });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}