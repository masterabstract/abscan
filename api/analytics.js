// v5
const WETH = '0x3439153eb7af838ad19d56e1571fbd09333c2809';
const BURN = '0x0000000000000000000000000000000000000000';
const FEE_ADDR = '0x0000a26b00c1f0df003000390027140000faa719';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { contract } = req.query;
  if (!contract || !/^0x[a-fA-F0-9]{40}$/.test(contract))
    return res.status(400).json({ error: 'Invalid contract address' });

  const KEY = process.env.ABSCAN_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'ABSCAN_API_KEY not configured' });

  const base = async (params) => {
    const qs = new URLSearchParams({ chainid: '2741', apikey: KEY, ...params }).toString();
    const r = await fetch(`https://api.etherscan.io/v2/api?${qs}`);
    return r.json();
  };
  const arr = (x) => Array.isArray(x) ? x : [];

  try {
    // 1. All NFT transfers
    let allTxs = [];
    for (let page = 1; page <= 10; page++) {
      const d = await base({ module: 'account', action: 'tokennfttx', contractaddress: contract, page, offset: 1000, sort: 'asc' });
      if (d.status !== '1' || !arr(d.result).length) break;
      allTxs = allTxs.concat(d.result);
      if (d.result.length < 1000) break;
    }

    if (!allTxs.length)
      return res.status(200).json({ priceHistory: [], holderTypes: {}, washTrades: [], washScore: 0, totalSales: 0, totalTransfers: 0, mintCount: 0 });

    const nonMintTxs = allTxs.filter(tx => tx.from.toLowerCase() !== BURN);

    // 2. Fetch WETH transfers for both sellers AND buyers
    const uniqueSellers = [...new Set(nonMintTxs.map(t => t.from.toLowerCase()))];
    const uniqueBuyers = [...new Set(nonMintTxs.map(t => t.to.toLowerCase()))];
    // Combine unique wallets, prioritize sellers first
    const allWallets = [...new Set([...uniqueSellers, ...uniqueBuyers])].slice(0, 50);

    const wethByHash = {};

    for (const wallet of allWallets) {
      try {
        await sleep(150);
        const d = await base({ module: 'account', action: 'tokentx', contractaddress: WETH, address: wallet, page: 1, offset: 1000, sort: 'asc' });
        if (d.status !== '1' || !arr(d.result).length) continue;
        for (const tx of d.result) {
          const to = tx.to.toLowerCase();
          const from = tx.from.toLowerCase();
          // Count WETH received by any non-fee address
          if (to !== FEE_ADDR && from !== FEE_ADDR) {
            const val = parseFloat(tx.value) / 1e18;
            if (val > 0.0001) {
              // Store as received by seller (to address)
              if (uniqueSellers.includes(to)) {
                wethByHash[tx.hash] = (wethByHash[tx.hash] || 0) + val;
              }
            }
          }
        }
      } catch(e) {}
    }

    const getPrice = (hash) => wethByHash[hash] || 0;

    // 3. Price History
    const now = Math.floor(Date.now() / 1000);
    const dailyMap = {};
    const saleTxs = [];
    const seenHashes = new Set();

    for (const tx of nonMintTxs) {
      const date = new Date(Number(tx.timeStamp) * 1000).toISOString().slice(0, 10);
      if (!dailyMap[date]) dailyMap[date] = { date, sales: 0, volume: 0, prices: [] };
      dailyMap[date].sales++;
      const price = getPrice(tx.hash);
      if (price > 0 && !seenHashes.has(tx.hash)) {
        seenHashes.add(tx.hash);
        dailyMap[date].volume += price;
        dailyMap[date].prices.push(price);
      }
      saleTxs.push({ hash: tx.hash, tokenID: tx.tokenID, price, from: tx.from, to: tx.to, timestamp: Number(tx.timeStamp) });
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

    // 4. Holder Distribution
    const walletSaleCount = {};
    const currentHolders = {};

    for (const tx of allTxs) {
      const to = tx.to.toLowerCase();
      const from = tx.from.toLowerCase();
      const ts = Number(tx.timeStamp);
      if (to !== BURN) {
        if (!currentHolders[to]) currentHolders[to] = {};
        currentHolders[to][tx.tokenID] = ts;
      }
      if (from !== BURN) {
        if (currentHolders[from]) delete currentHolders[from][tx.tokenID];
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

    const avgHoldDays = holdTimes.length
      ? Math.round(holdTimes.reduce((a,b)=>a+b,0) / holdTimes.length) : 0;

    // 5. Wash Trading
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
          if (!pairs[key]) pairs[key] = { tokenId, walletA: a.from, walletB: a.to, count: 0 };
          pairs[key].count++;
        }
      }
      for (const p of Object.values(pairs)) if (p.count >= 1) washTrades.push(p);
    }

    const salesWithPrice = saleTxs.filter(s => s.price > 0);
    const washScore = Math.min(100, Math.round((washTrades.length / Math.max(salesWithPrice.length, 1)) * 1000));
    const recentPrices = salesWithPrice.slice(-20).map(s => s.price).sort((a,b)=>a-b);

    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=60');
    return res.status(200).json({
      priceHistory,
      holderTypes: { diamonds, flippers, traders, avgHoldDays },
      washTrades: washTrades.slice(0, 20),
      washScore,
      totalSales: salesWithPrice.length,
      totalTransfers: allTxs.length,
      mintCount: allTxs.filter(t => t.from.toLowerCase() === BURN).length,
      onChainFloor: recentPrices[0] || null,
      onChainAvgRecent: recentPrices.length ? parseFloat((recentPrices.reduce((a,b)=>a+b,0)/recentPrices.length).toFixed(4)) : null,
      wethHashesFound: Object.keys(wethByHash).length,
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};