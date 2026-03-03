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

  // Récupère jusqu'à 300 ventes OpenSea (source de vérité pour les prix)
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
    // ── 1. Tous les transfers on-chain en ASC (source de vérité pour holders) ──
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

    const nonMintTxs = allTxs.filter(tx => tx.from.toLowerCase() !== BURN);
    const mintCount = allTxs.length - nonMintTxs.length;

    // ── 2. Ventes OpenSea (source de vérité pour les prix) ──────────────────
    const osSales = await fetchOpenSeaSales();

    // ── 3. Price History — basé sur OpenSea (prix réels) ────────────────────
    const dailyMap = {};
    for (const sale of osSales) {
      const date = new Date(sale.timestamp * 1000).toISOString().slice(0, 10);
      if (!dailyMap[date]) dailyMap[date] = { date, sales: 0, volume: 0, prices: [] };
      dailyMap[date].sales++;
      dailyMap[date].volume += sale.price;
      dailyMap[date].prices.push(sale.price);
    }

    // ✅ Transfer Activity on-chain séparé (pour le graphique "Transfer Activity")
    const transferDailyMap = {};
    for (const tx of nonMintTxs) {
      const date = new Date(Number(tx.timeStamp) * 1000).toISOString().slice(0, 10);
      transferDailyMap[date] = (transferDailyMap[date] || 0) + 1;
    }

    const priceHistory = Object.keys({ ...dailyMap, ...transferDailyMap })
      .sort()
      .map(date => ({
        date,
        // Transfers on-chain réels (pour le graphique Transfer Activity)
        sales: transferDailyMap[date] || 0,
        // Données de prix OpenSea
        volume: dailyMap[date] ? parseFloat(dailyMap[date].volume.toFixed(4)) : 0,
        avgPrice: dailyMap[date]
          ? parseFloat((dailyMap[date].prices.reduce((a, b) => a + b, 0) / dailyMap[date].prices.length).toFixed(4))
          : null,
        minPrice: dailyMap[date] ? parseFloat(Math.min(...dailyMap[date].prices).toFixed(4)) : null,
        maxPrice: dailyMap[date] ? parseFloat(Math.max(...dailyMap[date].prices).toFixed(4)) : null,
        osSales: dailyMap[date]?.sales || 0,
      }))
      .slice(-30);

    // ── 4. Floor price & avg (20 dernières ventes OpenSea) ──────────────────
    const recentSalePrices = [...osSales]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)
      .map(s => s.price)
      .sort((a, b) => a - b);

    const floorPrice = recentSalePrices[0] || null;
    const avgPrice = recentSalePrices.length
      ? parseFloat((recentSalePrices.reduce((a, b) => a + b, 0) / recentSalePrices.length).toFixed(4))
      : null;

    // ── 5. Holder Distribution (100% on-chain) ───────────────────────────────
    // ✅ On reconstruit l'état actuel token par token (comme holders.js)
    const now = Math.floor(Date.now() / 1000);
    const tokenOwner = {};       // tokenId → owner actuel
    const tokenAcquired = {};    // tokenId → timestamp d'acquisition par owner actuel
    const walletSellCount = {};  // wallet → nb de transfers sortants (hors mint)

    for (const tx of allTxs) {
      const to = tx.to.toLowerCase();
      const from = tx.from.toLowerCase();
      const ts = Number(tx.timeStamp);

      // Mise à jour owner actuel
      if (to !== BURN) {
        tokenOwner[tx.tokenID] = to;
        tokenAcquired[tx.tokenID] = ts;
      } else {
        delete tokenOwner[tx.tokenID];
        delete tokenAcquired[tx.tokenID];
      }

      // ✅ Compte les ventes réelles (transfers sortants hors mint)
      if (from !== BURN) {
        walletSellCount[from] = (walletSellCount[from] || 0) + 1;
      }
    }

    // Regroupe par wallet
    const walletTokens = {};
    for (const [tokenId, owner] of Object.entries(tokenOwner)) {
      if (!walletTokens[owner]) walletTokens[owner] = [];
      walletTokens[owner].push({ tokenId, acquired: tokenAcquired[tokenId] || now });
    }

    let diamonds = 0, flippers = 0, traders = 0;
    const holdTimes = [];

    for (const [wallet, tokens] of Object.entries(walletTokens)) {
      if (!tokens.length) continue;
      const avgAcquired = tokens.reduce((s, t) => s + t.acquired, 0) / tokens.length;
      const holdDays = (now - avgAcquired) / 86400;
      holdTimes.push(holdDays);
      // ✅ sells = tous les transfers sortants on-chain (pas seulement OpenSea)
      const sells = walletSellCount[wallet] || 0;
      if (holdDays > 30 && sells === 0) diamonds++;
      else if (sells > 2 || holdDays < 3) flippers++;
      else traders++;
    }

    const avgHoldDays = holdTimes.length
      ? Math.round(holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length)
      : 0;

    // ── 6. Wash Trading (on-chain) ───────────────────────────────────────────
    const tokenHistory = {};
    for (const tx of allTxs) {
      if (!tokenHistory[tx.tokenID]) tokenHistory[tx.tokenID] = [];
      tokenHistory[tx.tokenID].push({
        from: tx.from.toLowerCase(),
        to: tx.to.toLowerCase(),
        ts: Number(tx.timeStamp),
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

    // ✅ washScore basé sur les transfers on-chain (pas les ventes OpenSea)
    const washScore = Math.min(100, Math.round(
      (washTrades.length / Math.max(nonMintTxs.length, 1)) * 1000
    ));

    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=60');
    return res.status(200).json({
      priceHistory,
      holderTypes: { diamonds, flippers, traders, avgHoldDays },
      washTrades: washTrades.slice(0, 20),
      washScore,
      totalSales: osSales.length,
      totalTransfers: nonMintTxs.length,
      mintCount,
      floorPrice,
      avgPrice,
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};