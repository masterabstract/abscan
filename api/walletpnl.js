const WETH = '0x3439153eb7af838ad19d56e1571fbd09333c2809';
const BURN = '0x0000000000000000000000000000000000000000';
const FEE_ADDR = '0x0000a26b00c1f0df003000390027140000faa719';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { contract, wallet } = req.query;
  if (!contract || !/^0x[a-fA-F0-9]{40}$/.test(contract))
    return res.status(400).json({ error: 'Invalid contract address' });
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet))
    return res.status(400).json({ error: 'Invalid wallet address' });

  const KEY = process.env.ABSCAN_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'ABSCAN_API_KEY not configured' });

  const base = async (params) => {
    const qs = new URLSearchParams({ chainid: '2741', apikey: KEY, ...params }).toString();
    const r = await fetch(`https://api.etherscan.io/v2/api?${qs}`);
    return r.json();
  };
  const arr = (x) => Array.isArray(x) ? x : [];

  try {
    const walletLower = wallet.toLowerCase();

    // 1. NFT transfers for this wallet + contract
    const nftData = await base({
      module: 'account', action: 'tokennfttx',
      contractaddress: contract, address: wallet,
      page: 1, offset: 1000, sort: 'asc',
    });
    const txs = arr(nftData.result);

    if (!txs.length)
      return res.status(200).json({ wallet, totalSpent: 0, totalEarned: 0, realizedPnl: 0, nftsOwned: 0, nftsSold: 0, avgHoldDays: 0, trades: [], unrealized: [] });

    // 2. WETH transfers for this wallet
    const wethData = await base({
      module: 'account', action: 'tokentx',
      contractaddress: WETH, address: wallet,
      page: 1, offset: 1000, sort: 'asc',
    });

    const wethByHash = {};
    for (const tx of arr(wethData.result)) {
      const from = tx.from.toLowerCase();
      const to = tx.to.toLowerCase();
      if (to === FEE_ADDR || from === FEE_ADDR) continue;
      const val = parseFloat(tx.value) / 1e18;
      if (val < 0.0001) continue;
      if (!wethByHash[tx.hash]) wethByHash[tx.hash] = { spent: 0, earned: 0 };
      if (from === walletLower) wethByHash[tx.hash].spent += val;
      if (to === walletLower) wethByHash[tx.hash].earned += val;
    }

    // 3. Build trade history
    const now = Math.floor(Date.now() / 1000);
    const tokenBuyInfo = {};
    const trades = [];
    let totalSpent = 0, totalEarned = 0;
    const currentlyOwned = new Set();

    for (const tx of txs) {
      const isBuy = tx.to.toLowerCase() === walletLower;
      const isSell = tx.from.toLowerCase() === walletLower;
      const ts = Number(tx.timeStamp);
      const tokenId = tx.tokenID;
      const weth = wethByHash[tx.hash] || { spent: 0, earned: 0 };

      if (isBuy) {
        currentlyOwned.add(tokenId);
        tokenBuyInfo[tokenId] = { price: weth.spent, timestamp: ts };
        if (weth.spent > 0) totalSpent += weth.spent;
      }

      if (isSell) {
        currentlyOwned.delete(tokenId);
        const buyInfo = tokenBuyInfo[tokenId] || { price: 0, timestamp: ts };
        const holdDays = Math.round((ts - buyInfo.timestamp) / 86400);
        const pnl = weth.earned - buyInfo.price;
        if (weth.earned > 0) totalEarned += weth.earned;
        trades.push({
          tokenId,
          buyPrice: parseFloat(buyInfo.price.toFixed(4)),
          sellPrice: parseFloat(weth.earned.toFixed(4)),
          pnl: parseFloat(pnl.toFixed(4)),
          holdDays,
          soldAt: ts,
        });
        delete tokenBuyInfo[tokenId];
      }
    }

    // 4. Unrealized positions
    const unrealized = [];
    for (const tokenId of currentlyOwned) {
      const info = tokenBuyInfo[tokenId];
      if (info) unrealized.push({
        tokenId,
        buyPrice: parseFloat(info.price.toFixed(4)),
        holdDays: Math.round((now - info.timestamp) / 86400),
      });
    }

    const realizedPnl = trades.reduce((s,t) => s + t.pnl, 0);
    const avgHoldDays = trades.length
      ? Math.round(trades.reduce((s,t) => s + t.holdDays, 0) / trades.length) : 0;

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
      unrealized,
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};