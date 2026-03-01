import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import Layout from '../components/Layout';
import { API_BASE, computeScore } from '../config';

Chart.register(...registerables);

export default function Collection() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const name = searchParams.get('name') || slug;

  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [sniperStatus, setSniperStatus] = useState('Initialisation...');
  const [floor, setFloor] = useState(0);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const sniperInterval = useRef(null);

  async function loadStats() {
    setLoadingStats(true);
    try {
      const r = await fetch(`${API_BASE}/stats?slug=${slug}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const f = d.total?.floor_price || 0;
      const v = d.total?.volume || 0;
      setFloor(f);
      setStats({
        floor: f, volume: v,
        sales: d.total?.sales || 0,
        numOwners: d.total?.num_owners || 0,
        totalSupply: d.total?.total_supply || 0,
        momentum: (v / (f + 0.001)).toFixed(2),
        score: computeScore(f, v),
      });
      renderChart(f);
    } catch(e) { console.error(e); }
    setLoadingStats(false);
  }

  function renderChart(currentFloor) {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();
    const ctx = chartRef.current.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(0,255,136,0.15)');
    gradient.addColorStop(1, 'rgba(0,255,136,0)');
    const data = [0.82,0.88,0.85,0.91,0.94,0.97,1.0].map(v => parseFloat((currentFloor * v).toFixed(5)));
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['J-6','J-5','J-4','J-3','J-2','J-1','Maintenant'],
        datasets: [{ label: 'Floor (ETH)', data, borderColor: '#00ff88', borderWidth: 2, backgroundColor: gradient, fill: true, tension: 0.4, pointBackgroundColor: '#00ff88', pointBorderColor: '#050508', pointBorderWidth: 2, pointRadius: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0a0a10', borderColor: '#1a1a2e', borderWidth: 1, titleColor: '#6b6b9a', bodyColor: '#00ff88', callbacks: { label: ctx => `${ctx.raw} ETH` } } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#3a3a5c', font: { family: 'Space Mono', size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#3a3a5c', font: { family: 'Space Mono', size: 10 }, callback: v => v.toFixed(4) } }
        }
      }
    });
  }

  async function loadSniper() {
    try {
      const r = await fetch(`${API_BASE}/listings?slug=${slug}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const items = (d.listings || []).map(l => {
        const price = parseFloat(l.price?.current?.value || 0) / 1e18;
        const tokenId = l.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria || '—';
        const contractAddress = l.protocol_data?.parameters?.offer?.[0]?.token || '';
        return { price, tokenId, contractAddress };
      });
      items.sort((a, b) => a.price - b.price);
      setListings(items);
      setSniperStatus(`${new Date().toLocaleTimeString()} — ${items.length} listings`);
    } catch(e) { setSniperStatus(`Erreur — ${e.message}`); }
  }

  useEffect(() => {
    loadStats();
    loadSniper();
    sniperInterval.current = setInterval(loadSniper, 15000);
    return () => {
      clearInterval(sniperInterval.current);
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [slug]);

  return (
    <Layout title="Collection Analytics">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Collection Analytics</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 800, color: 'var(--white)', letterSpacing: '-1px' }}>{name}</h1>
        <div style={{ fontSize: 11, marginTop: 6 }}>
          <a href={`https://opensea.io/collection/${slug}`} target="_blank" rel="noreferrer"
            style={{ color: 'var(--cyan)', textDecoration: 'none' }}>
            opensea.io/collection/{slug} ↗
          </a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 24 }}>
        {[
          { label: 'Floor Price', value: loadingStats ? '—' : stats?.floor.toFixed(4), sub: 'ETH', color: 'var(--white)' },
          { label: 'Volume Total', value: loadingStats ? '—' : stats?.volume.toFixed(2), sub: 'ETH', color: 'var(--cyan)' },
          { label: 'Momentum', value: loadingStats ? '—' : stats?.momentum, sub: 'vol / floor', color: 'var(--yellow)' },
          { label: 'Score', value: loadingStats ? '—' : stats?.score, sub: 'algorithmique', color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', padding: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 800, color: s.color }}>{s.value || '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
            FLOOR TREND — 7 JOURS
          </div>
          <div style={{ padding: 20, height: 260 }}>
            <canvas ref={chartRef} />
          </div>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', boxShadow: '0 0 8px var(--cyan)' }} />
            SNIPER LIVE
            <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--dim)' }}>{sniperStatus}</span>
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {listings.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Aucun listing actif</div>
            ) : listings.slice(0, 20).map((item, i) => {
              const isFloor = floor > 0 && item.price <= floor * 1.05;
              const pct = floor > 0 ? ((item.price - floor) / floor * 100).toFixed(1) : null;
              const openseaUrl = item.contractAddress
                ? `https://opensea.io/assets/abstract/${item.contractAddress}/${item.tokenId}`
                : `https://opensea.io/collection/${slug}`;
              return (
                <a key={i} href={openseaUrl} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', borderLeft: `2px solid ${isFloor ? 'var(--green)' : 'var(--border2)'}`, textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text)' }}>#{item.tokenId}</div>
                    {pct !== null && (
                      <div style={{ fontSize: 10, color: isFloor ? 'var(--green)' : 'var(--muted)', marginTop: 2 }}>
                        {isFloor ? `◉ FLOOR (+${pct}%)` : `+${pct}% vs floor`}
                      </div>
                    )}
                    <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 2 }}>Voir sur OpenSea ↗</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 700, color: isFloor ? 'var(--green)' : 'var(--white)' }}>
                      {item.price.toFixed(4)} ETH
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--dim)' }}>
            ↻ Refresh 15s · trié par prix croissant
          </div>
        </div>
      </div>
    </Layout>
  );
}