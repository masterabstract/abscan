module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { contract } = req.query;
  if (!contract || !/^0x[a-fA-F0-9]{40}$/.test(contract))
    return res.status(400).json({ error: 'Invalid contract address' });

  const API_KEY = process.env.ABSCAN_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'ABSCAN_API_KEY not configured' });

  try {
    const url = `https://api.abscan.org/api?module=account&action=tokennfttx&contractaddress=${contract}&page=1&offset=10&sort=desc&apikey=${API_KEY}`;
    
    const r = await fetch(url);
    const rawText = await r.text();
    
    let parsed;
    try { parsed = JSON.parse(rawText); } catch(e) { parsed = null; }

    return res.status(200).json({
      debug: true,
      httpStatus: r.status,
      httpOk: r.ok,
      url_used: url.replace(API_KEY, 'REDACTED'),
      rawResponse: rawText.slice(0, 500),
      parsedStatus: parsed?.status,
      parsedMessage: parsed?.message,
      resultLength: Array.isArray(parsed?.result) ? parsed.result.length : typeof parsed?.result,
      firstTx: Array.isArray(parsed?.result) ? parsed.result[0] : null,
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}