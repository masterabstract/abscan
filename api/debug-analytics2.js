const WETH = '0x3439153eb7af838ad19d56e1571fbd09333c2809';
const BURN = '0x0000000000000000000000000000000000000000';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { contract } = req.query;
  if (!contract) return res.status(400).json({ error: 'contract required' });

  const KEY = process.env.ABSCAN_API_KEY;
  const base = async (params) => {
    const qs = new URLSearchParams({ chainid: '2741', apikey: KEY, ...params }).toString();
    const r = await fetch(`https://api.etherscan.io/v2/api?${qs}`);
    return r.json();
  };
  const arr = (x) => Array.isArray(x) ? x : [];

  const nft = await base({ module: 'account', action: 'tokennfttx', contractaddress: contract, page: 1, offset: 20, sort: 'desc' });
  const nonMints = arr(nft.result).filter(t => t.from.toLowerCase() !== BURN).slice(0, 5);

  const results = await Promise.all(nonMints.map(async (tx) => {
    const seller = tx.from.toLowerCase();
    const weth = await base({ module: 'account', action: 'tokentx', contractaddress: WETH, address: seller, page: 1, offset: 50, sort: 'desc' });
    const arr2 = arr(weth.result);
    const matches = arr2.filter(t => t.hash === tx.hash);
    return {
      nftHash: tx.hash,
      seller,
      tokenID: tx.tokenID,
      wethStatus: weth.status,
      wethCount: arr2.length,
      hashMatch: matches.length,
      matchValues: matches.map(t => ({ value: parseFloat(t.value)/1e18, from: t.from, to: t.to })),
      nearbyWeth: arr2.slice(0, 3).map(t => ({ hash: t.hash, value: parseFloat(t.value)/1e18, from: t.from, to: t.to })),
    };
  }));

  return res.status(200).json({ results });
};