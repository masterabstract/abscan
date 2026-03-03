// analytics.js — OpenSea (prix) + Abstract on-chain (holders, wash trading)
const BURN = '0x0000000000000000000000000000000000000000';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { contract, slug } = req.query;

  if (!contract || !/^0x[a-fA-F0-9]{40}$/.test(contract))
    return res.status(400).json({ error: 'Invalid contract address' });
  if (!slug || !/^[a-z0-9\-_]+$/.test(slug))
    return res.status(400).json({ error: 'Invalid OpenSea slug' });

  const ABSCAN_KEY = process.env.ABSCAN_API_KEY;
  const OS_KEY = process.env.OPENSEA_API_KEY;
  if (!ABSCAN_KEY) return res.status(500).json({ error: 'ABSCAN_API_KEY not configured' });
  if (!OS_KEY) return res.status(500).json({ error: 'OPENSEA_API_KEY not configured' });

  const arr = (x) => Array.isArray(x) ? x : [];

  const abscan = async (params) => {
    const qs = new URLSearchParams({ chainid: '2741', apikey: ABSCAN_KEY, ...params }).toString();
    const r = await fetch(`https://api.etherscan.io/v2/api?${qs}`);
    return r.json();
  };

  // Récupère jusqu'à 300 ventes OpenSea (6 pages x 50)
  const fetchOpenSeaSales = async () => {
    let sales = [];
    let next = null;
    for (let i = 0; i < 6; i++) {
      const url = next
        ? `https://api.opensea.io/api/v2/events/collection/${slug}?event_type=sale&limit=50&next=${next}`
        : `https://api.opensea.io/api/v2/events/collection/${slug}?event_type=sale&limit=50`;
      const r = await fetch(url, { headers: { 'X-API-KEY': OS_KEY, Accept: 'application/json' } });
      if (!r.ok) break;
      const data = await r.json();
      const events = arr(data.asset_events);
      for (const e of events) {
        const price = parseFloat(e.payment?.quantity || 0) / 1e18;
        const tokenId = e.nft?.identifier;
        const seller = (e.seller || '').toLowerCase();
        const buyer = (e.buyer || '').toLowerCase();
        const ts = e.closing_date || e.event_timestamp;
        const timestamp = ts ? Math.floor(new Date(ts).getTime() / 1000) : null;
        if (tokenId && price > 0 && timestamp) {
          sales.push({ tokenId: String(tokenId), price, seller, buyer, timestamp });
        }
      }
      next = data.next;
      if (!next || events.length < 50) break;
      await sleep(200);
    }
    return sales;
  };

  try {
    // 1. Transfers on-chain (pour holders + wash trading)
    let allTxs = [];
    for (let page = 1; page <= 10; page++) {
      const d = await abscan({
        module: 'account', action: 'tokennfttx',
        contractaddress: contract, page, offset: 1000, sort: 'asc',
      });
      if (d.status !== '1' || !arr(d.result).length) break;
      allTxs = allTxs.concat(d.result);
      if (d.result.length < 1000) break;
    }

    if (!allTxs.length)
      return res.status(200).json({
        priceHistory: [], holderTypes: {}, washTrades: [],
        washScore: 0, totalSales: 0, totalTransfers: 0, mintCount: 0,
        floorPrice: null, avgPrice: null,
      });

    // 2. Ventes OpenSea (source de vérité pour les prix)
    const osSales = await fetchOpenSeaSales();

    // 3. Price History basé sur OpenSea
    const dailyMap = {};
    for (const sale of osSales) {
      const date = new Date(sale.timestamp * 1000).toISOString().slice(0, 10);
      if (!dailyMap[date]) dailyMap[date] = { date, sales: 0, volume: 0, prices: [] };
      dailyMap[date].sales++;
      dailyMap[date].volume += sale.price;
      dailyMap[date].prices.push(sale.price);
    }

    const priceHistory = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        date: d.date,
        sales: d.sales,
        volume: parseFloat(d.volume.toFixed(4)),
        avgPrice: parseFloat((d.prices.reduce((a, b) => a + b, 0) / d.prices.length).toFixed(4)),
        minPrice: parseFloat(Math.min(...d.prices).toFixed(4)),
        maxPrice: parseFloat(Math.max(...d.prices).toFixed(4)),
      }))
      .slice(-30);

    // 4. Floor price & avg (20 dernières ventes OpenSea)
    const recentSalePrices = [...osSales]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)
      .map(s => s.price)
      .sort((a, b) => a - b);

    const floorPrice = recentSalePrices[0] || null;
    const avgPrice = recentSalePrices.length
      ? parseFloat((recentSalePrices.reduce((a, b) => a + b, 0) / recentSalePrices.length).toFixed(4))
      : null;

    // 5. Holder Distribution (on-chain)
    const now = Math.floor(Date.now() / 1000);
    const osSellerSet = new Set(osSales.map(s => s.seller));
    const currentHolders = {};
    const walletSellCount = {};

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
        if (osSellerSet.has(from)) {
          walletSellCount[from] = (walletSellCount[from] || 0) + 1;
        }
      }
    }

    let diamonds = 0, flippers = 0, traders = 0;
    const holdTimes = [];

    for (const [wallet, tokens] of Object.entries(currentHolders)) {
      const ownedCount = Object.keys(tokens).length;
      if (ownedCount === 0) continue;
      const avgAcquired = Object.values(tokens).reduce((a, b) => a + b, 0) / ownedCount;
      const holdDays = (now - avgAcquired) / 86400;
      holdTimes.push(holdDays);
      const sells = walletSellCount[wallet] || 0;
      if (holdDays > 30 && sells === 0) diamonds++;
      else if (sells > 2 || holdDays < 3) flippers++;
      else traders++;
    }

    const avgHoldDays = holdTimes.length
      ? Math.round(holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length)
      : 0;

    // 6. Wash Trading (on-chain)
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
        const a = history[i], b = history[i + 1];
        if (a.to === b.from && b.to === a.from) {
          const key = [a.from, a.to].sort().join('-');
          if (!pairs[key]) pairs[key] = { tokenId, walletA: a.from, walletB: a.to, count: 0 };
          pairs[key].count++;
        }
      }
      for (const p of Object.values(pairs)) if (p.count >= 1) washTrades.push(p);
    }

    const washScore = Math.min(100, Math.round(
      (washTrades.length / Math.max(osSales.length, 1)) * 1000
    ));

    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=60');
    return res.status(200).json({
      priceHistory,
      holderTypes: { diamonds, flippers, traders, avgHoldDays },
      washTrades: washTrades.slice(0, 20),
      washScore,
      totalSales: osSales.length,
      totalTransfers: allTxs.length,
      mintCount: allTxs.filter(t => t.from.toLowerCase() === BURN).length,
      floorPrice,
      avgPrice,
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};