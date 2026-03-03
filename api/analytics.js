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

  // ✅ Parse timestamp robuste — gère string, number, ISO date
  const parseTs = (ts) => {
    if (!ts) return null;
    // Timestamp Unix (string ou number)
    const n = Number(ts);
    if (!isNaN(n) && n > 1000000000) return n;
    // ISO date string (OpenSea)
    const d = new Date(ts);
    if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000);
    return null;
  };

  const tsToDate = (ts) => {
    const t = parseTs(ts);
    if (!t || t < 1000000000) return null; // ✅ ignore timestamps invalides (0, négatifs, etc.)
    return new Date(t * 1000).toISOString().slice(0, 10);
  };

  // Récupère jusqu'à 300 ventes OpenSea
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
        const ts = parseTs(e.closing_date || e.event_timestamp);
        // ✅ Filtre les timestamps invalides
        if (tokenId && price > 0 && ts && ts > 1000000000) {
          sales.push({ tokenId: String(tokenId), price, seller, buyer, timestamp: ts });
        }
      }
      next = data.next;
      if (!next || events.length < 50) break;
      await sleep(200);
    }
    return sales;
  };

  try {
    // ── 1. Tous les transfers on-chain en ASC ────────────────────────────────
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

    const mintTxs = allTxs.filter(tx => tx.from.toLowerCase() === BURN);
    const nonMintTxs = allTxs.filter(tx => tx.from.toLowerCase() !== BURN);

    // ── 2. Ventes OpenSea ────────────────────────────────────────────────────
    const osSales = await fetchOpenSeaSales();

    // ── 3. Transfer Activity on-chain par jour (graphique) ───────────────────
    const transferDailyMap = {};
    for (const tx of nonMintTxs) {
      const date = tsToDate(tx.timeStamp);
      if (!date) continue; // ✅ ignore les timestamps invalides
      transferDailyMap[date] = (transferDailyMap[date] || 0) + 1;
    }

    // ── 4. Price History OpenSea par jour ────────────────────────────────────
    const priceDailyMap = {};
    for (const sale of osSales) {
      const date = tsToDate(sale.timestamp);
      if (!date) continue;
      if (!priceDailyMap[date]) priceDailyMap[date] = { sales: 0, volume: 0, prices: [] };
      priceDailyMap[date].sales++;
      priceDailyMap[date].volume += sale.price;
      priceDailyMap[date].prices.push(sale.price);
    }

    // ✅ Fusionne les deux maps sur les 30 derniers jours
    const allDates = [...new Set([...Object.keys(transferDailyMap), ...Object.keys(priceDailyMap)])]
      .filter(d => d >= new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
      .sort();

    const priceHistory = allDates.map(date => {
      const p = priceDailyMap[date];
      return {
        date,
        sales: transferDailyMap[date] || 0,   // transfers on-chain réels
        volume: p ? parseFloat(p.volume.toFixed(4)) : 0,
        avgPrice: p ? parseFloat((p.prices.reduce((a, b) => a + b, 0) / p.prices.length).toFixed(4)) : null,
        minPrice: p ? parseFloat(Math.min(...p.prices).toFixed(4)) : null,
        maxPrice: p ? parseFloat(Math.max(...p.prices).toFixed(4)) : null,
        osSales: p?.sales || 0,
      };
    });

    // ── 5. Floor & avg prix (20 dernières ventes OpenSea) ────────────────────
    const recentPrices = [...osSales]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)
      .map(s => s.price)
      .sort((a, b) => a - b);

    const floorPrice = recentPrices[0] || null;
    const avgPrice = recentPrices.length
      ? parseFloat((recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length).toFixed(4))
      : null;

    // ── 6. Holder Distribution (100% on-chain, robuste) ──────────────────────
    const now = Math.floor(Date.now() / 1000);

    // ✅ Reconstruit état exact : tokenId → { owner, acquiredAt }
    const tokenState = {};
    const walletSellCount = {};

    for (const tx of allTxs) {
      const to = tx.to.toLowerCase();
      const from = tx.from.toLowerCase();
      const ts = parseTs(tx.timeStamp) || now;

      if (to === BURN) {
        // Token brûlé → on le supprime
        delete tokenState[tx.tokenID];
      } else {
        tokenState[tx.tokenID] = { owner: to, acquiredAt: ts };
      }

      // Compte tous les transfers sortants (hors mint) comme "ventes potentielles"
      if (from !== BURN) {
        walletSellCount[from] = (walletSellCount[from] || 0) + 1;
      }
    }

    // Regroupe tokens par wallet
    const walletTokens = {};
    for (const { owner, acquiredAt } of Object.values(tokenState)) {
      if (!walletTokens[owner]) walletTokens[owner] = [];
      walletTokens[owner].push(acquiredAt);
    }

    let diamonds = 0, flippers = 0, traders = 0;
    const holdTimes = [];

    for (const [wallet, acquiredTimes] of Object.entries(walletTokens)) {
      if (!acquiredTimes.length) continue;
      const avgAcquired = acquiredTimes.reduce((s, t) => s + t, 0) / acquiredTimes.length;
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

    // ── 7. Wash Trading ──────────────────────────────────────────────────────
    const tokenHistory = {};
    for (const tx of allTxs) {
      if (!tokenHistory[tx.tokenID]) tokenHistory[tx.tokenID] = [];
      tokenHistory[tx.tokenID].push({
        from: tx.from.toLowerCase(),
        to: tx.to.toLowerCase(),
        ts: parseTs(tx.timeStamp) || 0,
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

    // ✅ Score sur 100 : % de tokens impliqués dans du wash trading
    const washTokenIds = new Set(washTrades.map(w => w.tokenId));
    const totalTokens = Object.keys(tokenState).length || 1;
    const washScore = Math.min(100, Math.round((washTokenIds.size / totalTokens) * 100));

    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=60');
    return res.status(200).json({
      priceHistory,
      holderTypes: { diamonds, flippers, traders, avgHoldDays },
      washTrades: washTrades.slice(0, 20),
      washScore,
      totalSales: osSales.length,
      totalTransfers: nonMintTxs.length,
      mintCount: mintTxs.length,
      floorPrice,
      avgPrice,
      totalTokensTracked: Object.keys(tokenState).length,
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};