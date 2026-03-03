module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { contract, wallet } = req.query;
  if (!contract || !/^0x[a-fA-F0-9]{40}$/.test(contract))
    return res.status(400).json({ error: 'Invalid contract address' });
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet))
    return res.status(400).json({ error: 'Invalid wallet address' });

  const API_KEY = process.env.ABSCAN_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'ABSCAN_API_KEY not configured' });

  try {
    const url = `https://api.etherscan.io/v2/api?chainid=2741&module=account&action=tokennfttx&contractaddress=${contract}&address=${wallet}&page=1&offset=1000&sort=asc&apikey=${API_KEY}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();

    if (data.status !== '1' || !Array.isArray(data.result)) {
      return res.status(200).json({ wallet, totalSpent: 0, totalEarned: 0, realizedPnl: 0, nftsOwned: 0, nftsSold: 0, avgHoldDays: 0, trades: [], unrealized: [] });
    }

    const txs = data.result;
    const walletLower = wallet.toLowerCase();
    const now = Math.floor(Date.now() / 1000);
    const tokenBuyPrice = {};
    const trades = [];
    let totalSpent = 0, totalEarned = 0;
    const currentlyOwned = new Set();

    for (const tx of txs) {
      const isBuy = tx.to.toLowerCase() === walletLower;
      const isSell = tx.from.toLowerCase() === walletLower;
      const ethValue = parseFloat(tx.value || 0) / 1e18;
      const ts = Number(tx.timeStamp);
      const tokenId = tx.tokenID;

      if (isBuy) {
        currentlyOwned.add(tokenId);
        tokenBuyPrice[tokenId] = { price: ethValue, timestamp: ts };
        if (ethValue > 0) totalSpent += ethValue;
      }
      if (isSell) {
        currentlyOwned.delete(tokenId);
        const buyInfo = tokenBuyPrice[tokenId];
        const buyPrice = buyInfo?.price || 0;
        const buyTs = buyInfo?.timestamp || ts;
        const holdDays = Math.round((ts - buyTs) / 86400);
        const pnl = ethValue - buyPrice;
        if (ethValue > 0) totalEarned += ethValue;
        trades.push({ tokenId, buyPrice: parseFloat(buyPrice.toFixed(4)), sellPrice: parseFloat(ethValue.toFixed(4)), pnl: parseFloat(pnl.toFixed(4)), holdDays, soldAt: ts });
        delete tokenBuyPrice[tokenId];
      }
    }

    const unrealizedTrades = [];
    for (const tokenId of currentlyOwned) {
      const buyInfo = tokenBuyPrice[tokenId];
      if (buyInfo) unrealizedTrades.push({ tokenId, buyPrice: buyInfo.price, holdDays: Math.round((now-buyInfo.timestamp)/86400), unrealized: true });
    }

    const realizedPnl = trades.reduce((s,t) => s+t.pnl, 0);
    const avgHoldDays = trades.length ? Math.round(trades.reduce((s,t)=>s+t.holdDays,0)/trades.length) : 0;

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json({
      wallet,
      totalSpent: parseFloat(totalSpent.toFixed(4)),
      totalEarned: parseFloat(totalEarned.toFixed(4)),
      realizedPnl: parseFloat(realizedPnl.toFixed(4)),
      nftsOwned: currentlyOwned.size,
      nftsSold: trades.length,
      avgHoldDays,
      trades: trades.slice(-10).reverse(),
      unrealized: unrealizedTrades,
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}