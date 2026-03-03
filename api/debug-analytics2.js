module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const KEY = process.env.ABSCAN_API_KEY;
  const base = async (params) => {
    try {
      const qs = new URLSearchParams({ chainid: '2741', apikey: KEY, ...params }).toString();
      const r = await fetch(`https://api.etherscan.io/v2/api?${qs}`);
      return await r.json();
    } catch(e) { return { error: e.message }; }
  };
  const saleTxHash = '0x27c5616cc9a8b3e4b3f1c32d58f4718ac8b12665bcbd1250440a1f26c63fdbe6';
  const arr = (x) => Array.isArray(x) ? x : [];

  const receipt = await base({ module: 'proxy', action: 'eth_getTransactionReceipt', txhash: saleTxHash });
  const txFull = await base({ module: 'proxy', action: 'eth_getTransactionByHash', txhash: saleTxHash });
  const internalByHash = await base({ module: 'account', action: 'txlistinternal', txhash: saleTxHash });
  const txTo = txFull.result?.to;
  const marketplaceInternal = txTo ? await base({ module: 'account', action: 'txlistinternal', address: txTo, page: 1, offset: 10, sort: 'desc' }) : null;

  return res.status(200).json({
    txTo,
    txValue: txFull.result?.value,
    receipt_logs: arr(receipt.result?.logs).slice(0, 8).map(l => ({ address: l.address, topics: l.topics, data: l.data?.slice(0, 66) })),
    internalByHash: { status: internalByHash.status, count: arr(internalByHash.result).length },
    marketplaceInternal: { status: marketplaceInternal?.status, count: arr(marketplaceInternal?.result).length, sample: arr(marketplaceInternal?.result).slice(0, 3) },
  });
};