module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { contract } = req.query;
  if (!contract) return res.status(400).json({ error: 'contract required' });
  const KEY = process.env.ABSCAN_API_KEY;
  const base = (params) => {
    const qs = new URLSearchParams({ chainid: '2741', apikey: KEY, ...params }).toString();
    return fetch(`https://api.etherscan.io/v2/api?${qs}`).then(r => r.json());
  };
  const saleTxHash = '0x27c5616cc9a8b3e4b3f1c32d58f4718ac8b12665bcbd1250440a1f26c63fdbe6';
  try {
    const receipt = await base({ module: 'proxy', action: 'eth_getTransactionReceipt', txhash: saleTxHash });
    const txFull = await base({ module: 'proxy', action: 'eth_getTransactionByHash', txhash: saleTxHash });
    const internalByHash = await base({ module: 'account', action: 'txlistinternal', txhash: saleTxHash });
    const blockNum = txFull.result?.blockNumber;
    let blockLogs = null;
    if (blockNum) {
      blockLogs = await base({ module: 'logs', action: 'getLogs', fromBlock: blockNum, toBlock: blockNum, txhash: saleTxHash });
    }
    const txTo = txFull.result?.to;
    let marketplaceInternal = null;
    if (txTo) {
      marketplaceInternal = await base({ module: 'account', action: 'txlistinternal', address: txTo, page: 1, offset: 10, sort: 'desc' });
    }
    return res.status(200).json({
      txTo,
      txValue: txFull.result?.value,
      txInput_prefix: txFull.result?.input?.slice(0, 10),
      receipt_logs_count: receipt.result?.logs?.length || 0,
      receipt_logs_sample: receipt.result?.logs?.slice(0, 8).map(l => ({
        address: l.address,
        topics: l.topics,
        data: l.data?.slice(0, 66),
      })),
      internalByHash: {
        status: internalByHash.status,
        count: internalByHash.result?.length || 0,
        sample: internalByHash.result?.slice(0, 5),
      },
      blockLogs: { status: blockLogs?.status, count: blockLogs?.result?.length || 0 },
      marketplaceInternal: {
        status: marketplaceInternal?.status,
        count: marketplaceInternal?.result?.length || 0,
        sample: marketplaceInternal?.result?.slice(0, 3).map(t => ({ hash: t.hash, value: t.value, from: t.from, to: t.to })),
      },
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};