module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { contract } = req.query;
  if (!contract || !/^0x[a-fA-F0-9]{40}$/.test(contract))
    return res.status(400).json({ error: 'Invalid contract address' });

  const API_KEY = process.env.ABSCAN_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'ABSCAN_API_KEY not configured' });

  try {
    let allTxs = [];
    for (let page = 1; page <= 10; page++) {
      // ✅ Correct endpoint: api.abscan.org
      const url = `https://api.abscan.org/api?module=account&action=tokennfttx&contractaddress=${contract}&page=${page}&offset=1000&sort=desc&apikey=${API_KEY}`;
      const r = await fetch(url);
      if (!r.ok) break;
      const data = await r.json();
      if (data.status !== '1' || !Array.isArray(data.result) || data.result.length === 0) break;
      allTxs = allTxs.concat(data.result);
      if (data.result.length < 1000) break;
    }

    if (allTxs.length === 0) {
      return res.status(200).json({ owners: [], whaleCount: 0, top10Pct: '0', totalOwned: 0 });
    }

    const BURN = '0x0000000000000000000000000000000000000000';
    const latestByToken = {};
    for (const tx of allTxs) {
      if (!latestByToken[tx.tokenID]) {
        latestByToken[tx.tokenID] = tx.to.toLowerCase();
      }
    }

    const ownerMap = {};
    for (const owner of Object.values(latestByToken)) {
      if (owner === BURN) continue;
      ownerMap[owner] = (ownerMap[owner] || 0) + 1;
    }

    const sorted = Object.entries(ownerMap)
      .map(([address, quantity]) => ({ address, quantity }))
      .sort((a, b) => b.quantity - a.quantity);

    const totalOwned = sorted.reduce((s, o) => s + o.quantity, 0);
    const top10 = sorted.slice(0, 10);
    const top10Supply = top10.reduce((s, o) => s + o.quantity, 0);
    const top10Pct = totalOwned > 0 ? ((top10Supply / totalOwned) * 100).toFixed(1) : '0';
    const whaleCount = sorted.filter(o => o.quantity >= 5).length;

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=60');
    return res.status(200).json({ owners: top10, whaleCount, top10Pct, totalOwned });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}