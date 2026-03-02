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
    // Fetch top owners
    const r = await fetch(
      `https://api.opensea.io/api/v2/collections/${slug}/owners?limit=100`,
      { headers: { 'X-API-KEY': API_KEY, 'Accept': 'application/json' } }
    );
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const data = await r.json();

    const owners = (data.owners || []).map(o => ({
      address: o.owner || '—',
      quantity: parseInt(o.quantity || 0),
    })).sort((a, b) => b.quantity - a.quantity);

    const totalOwned = owners.reduce((s, o) => s + o.quantity, 0);
    const whales = owners.filter(o => o.quantity >= 5);
    const top10 = owners.slice(0, 10);
    const top10Supply = top10.reduce((s, o) => s + o.quantity, 0);
    const top10Pct = totalOwned > 0 ? ((top10Supply / totalOwned) * 100).toFixed(1) : 0;

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=60');
    return res.status(200).json({
      owners: top10,
      whaleCount: whales.length,
      top10Pct,
      totalOwned,
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}