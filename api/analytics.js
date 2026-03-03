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
      const url = `https://api.etherscan.io/v2/api?chainid=2741&module=account&action=tokennfttx&contractaddress=${contract}&page=${page}&offset=1000&sort=asc&apikey=${API_KEY}`;
      const r = await fetch(url);
      if (!r.ok) break;
      const data = await r.json();
      if (data.status !== '1' || !Array.isArray(data.result) || data.result.length === 0) break;
      allTxs = allTxs.concat(data.result);
      if (data.result.length < 1000) break;
    }

    if (allTxs.length === 0) {
      return res.status(200).json({ priceHistory: [], holderTypes: {}, washTrades: [], washScore: 0, totalSales: 0 });
    }

    const BURN = '0x0000000000000000000000000000000000000000';

    // ── 1. TRANSFER ACTIVITY ──
    const dailyMap = {};
    const saleTxs = [];

    for (const tx of allTxs) {
      const date = new Date(Number(tx.timeStamp) * 1000).toISOString().slice(0, 10);
      const isMint = tx.from.toLowerCase() === BURN;
      if (!dailyMap[date]) dailyMap[date] = { date, sales: 0 };
      if (!isMint) {
        dailyMap[date].sales++;
        saleTxs.push({ hash: tx.hash, tokenID: tx.tokenID, from: tx.from, to: tx.to, timestamp: tx.timeStamp });
      }
    }

    const priceHistory = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({ date: d.date, sales: d.sales, volume: null, avgPrice: null }))
      .slice(-30);

    // ── 2. HOLDER DISTRIBUTION ──
    const now = Math.floor(Date.now() / 1000);
    const walletSaleCount = {};
    const currentHolders = {};

    for (const tx of allTxs) {
      const to = tx.to.toLowerCase();
      const from = tx.from.toLowerCase();
      const ts = Number(tx.timeStamp);
      const tokenId = tx.tokenID;
      if (to !== BURN) {
        if (!currentHolders[to]) currentHolders[to] = {};
        currentHolders[to][tokenId] = ts;
      }
      if (from !== BURN) {
        if (currentHolders[from]) delete currentHolders[from][tokenId];
        walletSaleCount[from] = (walletSaleCount[from] || 0) + 1;
      }
    }

    let diamonds = 0, flippers = 0, traders = 0;
    const holdTimes = [];

    for (const [wallet, tokens] of Object.entries(currentHolders)) {
      const ownedCount = Object.keys(tokens).length;
      if (ownedCount === 0) continue;
      const avgAcquired = Object.values(tokens).reduce((a,b) => a+b, 0) / ownedCount;
      const holdDays = (now - avgAcquired) / 86400;
      holdTimes.push(holdDays);
      const sales = walletSaleCount[wallet] || 0;
      if (holdDays > 30 && sales === 0) diamonds++;
      else if (sales > 2 || holdDays < 3) flippers++;
      else traders++;
    }

    const avgHoldDays = holdTimes.length
      ? Math.round(holdTimes.reduce((a,b) => a+b, 0) / holdTimes.length)
      : 0;

    // ── 3. WASH TRADING ──
    const tokenHistory = {};
    for (const tx of allTxs) {
      if (!tokenHistory[tx.tokenID]) tokenHistory[tx.tokenID] = [];
      tokenHistory[tx.tokenID].push({
        from: tx.from.toLowerCase(),
        to: tx.to.toLowerCase(),
        ts: Number(tx.timeStamp),
        hash: tx.hash,
      });
    }

    const washTrades = [];
    for (const [tokenId, history] of Object.entries(tokenHistory)) {
      const pairs = {};
      for (let i = 0; i < history.length - 1; i++) {
        const a = history[i], b = history[i+1];
        if (a.to === b.from && b.to === a.from) {
          const key = [a.from, a.to].sort().join('-');
          if (!pairs[key]) pairs[key] = { tokenId, walletA: a.from, walletB: a.to, count: 0, hashes: [] };
          pairs[key].count++;
          pairs[key].hashes.push(a.hash, b.hash);
        }
      }
      for (const p of Object.values(pairs)) {
        if (p.count >= 1) washTrades.push(p);
      }
    }

    const pairMap = {};
    for (const w of washTrades) {
      const key = [w.walletA, w.walletB].sort().join('-');
      if (!pairMap[key]) pairMap[key] = { ...w, tokenIds: [w.tokenId], count: w.count };
      else { pairMap[key].tokenIds.push(w.tokenId); pairMap[key].count += w.count; }
    }
    const dedupedWash = Object.values(pairMap).sort((a,b) => b.count - a.count);

    const totalTransfers = saleTxs.length;
    const washScore = totalTransfers > 0
      ? Math.min(100, Math.round((dedupedWash.length / Math.sqrt(totalTransfers)) * 10))
      : 0;

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=120');
    return res.status(200).json({
      priceHistory,
      holderTypes: { diamonds, flippers, traders, avgHoldDays },
      washTrades: dedupedWash.slice(0, 20).map(w => ({
        tokenId: w.tokenIds.join(', #'),
        walletA: w.walletA,
        walletB: w.walletB,
        count: w.count,
        tokens: w.tokenIds.length,
      })),
      washScore,
      totalSales: totalTransfers,
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}