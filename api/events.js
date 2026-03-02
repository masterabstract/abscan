module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { slug, limit = '20' } = req.query;
  if (!slug || !/^[a-z0-9\-_]+$/.test(slug))
    return res.status(400).json({ error: 'Invalid slug' });

  const API_KEY = process.env.OPENSEA_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'API key not configured' });

  try {
    const r = await fetch(
      `https://api.opensea.io/api/v2/events/collection/${slug}?event_type=sale&limit=${Math.min(parseInt(limit), 50)}`,
      { headers: { 'X-API-KEY': API_KEY, 'Accept': 'application/json' } }
    );
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const data = await r.json();

    const sales = (data.asset_events || []).map(e => {
      const price = parseFloat(e.payment?.quantity || 0) / 1e18;
      const symbol = e.payment?.symbol || 'ETH';
      const tokenId = e.nft?.identifier || '—';
      const contractAddress = e.nft?.contract || '';
      const buyer = e.buyer || '—';
      const seller = e.seller || '—';
      const timestamp = e.closing_date || e.event_timestamp || null;
      const imageUrl = e.nft?.image_url || null;
      const name = e.nft?.name || null;
      return { price, symbol, tokenId, contractAddress, buyer, seller, timestamp, imageUrl, name };
    });

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');
    return res.status(200).json({ sales });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}