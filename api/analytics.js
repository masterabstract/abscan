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
      return res.status(200).json({ priceHistory: [], holderTypes: {}, washTrades: [], washScore: 0 });
    }

    // ── 1. PRICE HISTORY ──
    const dailyMap = {};
    const saleTxs = [];

    for (const tx of allTxs) {
      const ethValue = parseFloat(tx.value || 0) / 1e18;
      const date = new Date(Number(tx.timeStamp) * 1000).toISOString().slice(0, 10);
      if (!dailyMap[date]) dailyMap[date] = { date, sales: 0, volume: 0, prices: [] };
      dailyMap[date].sales++;
      if (ethValue > 0.0001) {
        dailyMap[date].volume += ethValue;
        dailyMap[date].prices.push(ethValue);
        saleTxs.push({ hash: tx.hash, tokenID: tx.tokenID, price: ethValue, from: tx.from, to: tx.to, timestamp: tx.timeStamp });
      }
    }

    const priceHistory = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        date: d.date,
        sales: d.sales,
        volume: parseFloat(d.volume.toFixed(4)),
        avgPrice: d.prices.length ? parseFloat((d.prices.reduce((a,b)=>a+b,0)/d.prices.length).toFixed(4)) : null,
        minPrice: d.prices.length ? parseFloat(Math.min(...d.prices).toFixed(4)) : null,
        maxPrice: d.prices.length ? parseFloat(Math.max(...d.prices).toFixed(4)) : null,
      }))
      .slice(-30);

    // ── 2. HOLDER DISTRIBUTION ──
    const now = Math.floor(Date.now() / 1000);
    const BURN = '0x0000000000000000000000000000000000000000';
    const walletFirstBuy = {};
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
        if (!walletFirstBuy[to] || ts < walletFirstBuy[to]) walletFirstBuy[to] = ts;
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
      const avgAcquired = Object.values(tokens).reduce((a,b)=>a+b,0) / ownedCount;
      const holdDays = (now - avgAcquired) / 86400;
      holdTimes.push(holdDays);
      const sales = walletSaleCount[wallet] || 0;
      if (holdDays > 30 && sales === 0) diamonds++;
      else if (sales > 2 || holdDays < 3) flippers++;
      else traders++;
    }

    const avgHoldDays = holdTimes.length ? Math.round(holdTimes.reduce((a,b)=>a+b,0)/holdTimes.length) : 0;

    // ── 3. WASH TRADING ──
    const tokenHistory = {};
    for (const tx of allTxs) {
      if (!tokenHistory[tx.tokenID]) tokenHistory[tx.tokenID] = [];
      tokenHistory[tx.tokenID].push({ from: tx.from.toLowerCase(), to: tx.to.toLowerCase(), ts: Number(tx.timeStamp), hash: tx.hash });
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
      for (const p of Object.values(pairs)) { if (p.count >= 1) washTrades.push(p); }
    }

    const washScore = Math.min(100, Math.round((washTrades.length / Math.max(saleTxs.length, 1)) * 1000));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=120');
    return res.status(200).json({
      priceHistory,
      holderTypes: { diamonds, flippers, traders, avgHoldDays },
      washTrades: washTrades.slice(0, 20),
      washScore,
      totalSales: saleTxs.length,
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}