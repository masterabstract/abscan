module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { contract } = req.query;
  if (!contract) return res.status(400).json({ error: 'contract required' });

  const KEY = process.env.ABSCAN_API_KEY;
  const base = (params) => {
    const qs = new URLSearchParams({ chainid: '2741', apikey: KEY, ...params }).toString();
    return fetch(`https://api.etherscan.io/v2/api?${qs}`).then(r => r.json());
  };

  try {
    const nftTx = await base({ module: 'account', action: 'tokennfttx', contractaddress: contract, page: 1, offset: 3, sort: 'desc' });

    let txDetail = null, internalTxs = null, tokenTx = null;

    if (nftTx.status === '1' && nftTx.result?.length > 0) {
      const hash = nftTx.result[0].hash;
      txDetail = await base({ module: 'proxy', action: 'eth_getTransactionByHash', txhash: hash });
      internalTxs = await base({ module: 'account', action: 'txlistinternal', address: contract, page: 1, offset: 5, sort: 'desc' });
      tokenTx = await base({ module: 'account', action: 'tokentx', contractaddress: contract, page: 1, offset: 3, sort: 'desc' });
    }

    const txList = await base({ module: 'account', action: 'txlist', address: contract, page: 1, offset: 3, sort: 'desc' });

    return res.status(200).json({
      nftTransfers: {
        status: nftTx.status, message: nftTx.message,
        count: nftTx.result?.length || 0,
        sample: nftTx.result?.slice(0, 2).map(t => ({ hash: t.hash, from: t.from, to: t.to, tokenID: t.tokenID, value: t.value, timeStamp: t.timeStamp })),
      },
      txDetail: txDetail ? {
        value_hex: txDetail.result?.value,
        value_eth: txDetail.result?.value ? parseInt(txDetail.result.value, 16) / 1e18 : null,
      } : null,
      internalTxs: internalTxs ? {
        status: internalTxs.status, count: internalTxs.result?.length || 0,
        sample: internalTxs.result?.slice(0, 2).map(t => ({ hash: t.hash, value: t.value, from: t.from, to: t.to })),
      } : null,
      tokenTransfers: tokenTx ? {
        status: tokenTx.status, count: tokenTx.result?.length || 0,
        sample: tokenTx.result?.slice(0, 2),
      } : null,
      txList: {
        status: txList.status, count: txList.result?.length || 0,
        sample: txList.result?.slice(0, 2).map(t => ({ hash: t.hash, value: t.value, from: t.from, to: t.to, methodId: t.methodId })),
      },
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};