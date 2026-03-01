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
    const [statsRes, collectionRes] = await Promise.all([
      fetch(`https://api.opensea.io/api/v2/collections/${slug}/stats`, {
        headers: { 'X-API-KEY': API_KEY, 'Accept': 'application/json' }
      }),
      fetch(`https://api.opensea.io/api/v2/collections/${slug}`, {
        headers: { 'X-API-KEY': API_KEY, 'Accept': 'application/json' }
      })
    ]);

    if (!statsRes.ok) return res.status(statsRes.status).json({ error: await statsRes.text() });
    const statsData = await statsRes.json();
    const collectionData = collectionRes.ok ? await collectionRes.json() : {};

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json({
      ...statsData,
      image_url: collectionData.image_url || null,
      banner_image_url: collectionData.banner_image_url || null,
      collection_name: collectionData.name || null,
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}