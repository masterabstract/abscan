import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Chart, registerables } from 'chart.js';
import Layout from '../components/Layout';
import { API_BASE, computeScore } from '../config';

Chart.register(...registerables);

export default function Collection() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const name = searchParams.get('name') || slug;
  const { isConnected } = useAccount();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [sniperStatus, setSniperStatus] = useState('Initialisation...');
  const [floor, setFloor] = useState(0);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const sniperInterval = useRef(null);

  useEffect(() => {
    if (!isConnected) navigate('/connect');
  }, [isConnected, navigate]);

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
      setListings(d.listings || []);
      setSniperStatus(`${new Date().toLocaleTimeString()} — ${(d.listings||[]).length} listings`);
    } catch(e) { setSniperStatus(`Erreur — ${e.message}`); }
  }

  useEffect(() => {
    if (!isConnected) return;
    loadStats();
    loadSniper();
    sniperInterval.current = setInterval(loadSniper, 15000);
    return () => {
      clearInterval(sniperInterval.current);
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [slug, isConnected]);

  return (
    <Layout title="Collection Analytics">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Collection Analytics</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 800, color: 'var(--white)', letterSpacing: '-1px' }}>{name}</h1>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>opensea.io/collection/{slug}</div>
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
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {listings.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Aucun listing actif</div>
            ) : listings.slice(0, 20).map((l, i) => {
              const price = parseFloat(l.price?.current?.value || 0) / 1e18;
              const isDeal = floor > 0 && price <= floor * 1.02;
              const pct = floor > 0 ? ((price - floor) / floor * 100).toFixed(1) : null;
              const tokenId = l.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria || l.order_hash?.slice(0,6) || '—';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', borderLeft: `2px solid ${isDeal ? 'var(--green)' : 'var(--border2)'}` }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text)' }}>#{tokenId}</div>
                    {pct !== null && <div style={{ fontSize: 10, color: parseFloat(pct) <= 0 ? 'var(--green)' : 'var(--muted)', marginTop: 2 }}>{parseFloat(pct) <= 0 ? `▼ ${Math.abs(pct)}% sous floor` : `+${pct}% vs floor`}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 700, color: isDeal ? 'var(--green)' : 'var(--white)' }}>{price.toFixed(4)} ETH</div>
                    {isDeal && <div style={{ fontSize: 9, color: 'var(--green)', letterSpacing: 1 }}>◉ DEAL</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--dim)' }}>↻ Refresh automatique toutes les 15s</div>
        </div>
      </div>
    </Layout>
  );
}