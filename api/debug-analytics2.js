const WETH = '0x3439153eb7af838ad19d56e1571fbd09333c2809';
const MARKETPLACE = '0x0000000000000068f116a894984e2db1123eb395';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const KEY = process.env.ABSCAN_API_KEY;
  const base = async (params) => {
    const qs = new URLSearchParams({ chainid: '2741', apikey: KEY, ...params }).toString();
    const r = await fetch(`https://api.etherscan.io/v2/api?${qs}`);
    return r.json();
  };
  const arr = (x) => Array.isArray(x) ? x : [];

  const saleTxHash = '0x27c5616cc9a8b3e4b3f1c32d58f4718ac8b12665bcbd1250440a1f26c63fdbe6';
  const seller = '0x917c1aae361c00520d5afea7277338bbb7edd68c';

  const wethBySeller = await base({ module: 'account', action: 'tokentx', contractaddress: WETH, address: seller, page: 1, offset: 10, sort: 'desc' });
  const wethByMarket = await base({ module: 'account', action: 'tokentx', contractaddress: WETH, address: MARKETPLACE, page: 1, offset: 10, sort: 'desc' });

  const sellerMatch = arr(wethBySeller.result).filter(t => t.hash === saleTxHash);
  const marketMatch = arr(wethByMarket.result).filter(t => t.hash === saleTxHash);

  return res.status(200).json({
    saleTxHash,
    wethBySeller: { status: wethBySeller.status, count: arr(wethBySeller.result).length, matchesSaleTx: sellerMatch.length, sample: arr(wethBySeller.result).slice(0,3).map(t => ({ hash: t.hash, from: t.from, to: t.to, value: t.value })) },
    wethByMarket: { status: wethByMarket.status, count: arr(wethByMarket.result).length, matchesSaleTx: marketMatch.length, sample: arr(wethByMarket.result).slice(0,3).map(t => ({ hash: t.hash, from: t.from, to: t.to, value: t.value })) },
  });
};