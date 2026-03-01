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
      `https://api.opensea.io/api/v2/listings/collection/${slug}/all?limit=${Math.min(parseInt(limit), 50)}`,
      { headers: { 'X-API-KEY': API_KEY, 'Accept': 'application/json' } }
    );
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(await r.json());
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}