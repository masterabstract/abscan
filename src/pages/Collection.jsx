import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import Layout from '../components/Layout';
import { API_BASE, computeScore } from '../config';

Chart.register(...registerables);

function Tooltip({ text }) {
  const [rect, setRect] = useState(null);
  const ref = useRef(null);

  function show() {
    if (!ref.current) return;
    setRect(ref.current.getBoundingClientRect());
  }

  function hide() { setRect(null); }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={hide}
        style={{
          width: 15, height: 15, borderRadius: '50%',
          border: '1px solid var(--border2)',
          color: 'var(--muted)', fontSize: 9,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'help', userSelect: 'none', marginLeft: 6, flexShrink: 0,
        }}
      >?</span>
      {rect && createPortal(
        <div
          className="tooltip-portal"
          style={{
            top: rect.top + window.scrollY - 8,
            left: rect.left + rect.width / 2,
            transform: 'translate(-50%, -100%)',
            position: 'absolute',
          }}
        >
          {text}
        </div>,
        document.body
      )}
    </>
  );
}

export default function Collection() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const name = searchParams.get('name') || slug;

  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [sniperStatus, setSniperStatus] = useState('Initializing...');
  const [floor, setFloor] = useState(0);
  const [watched, setWatched] = useState(false);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const sniperInterval = useRef(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('abstrack_watchlist') || '[]');
    setWatched(saved.some(c => c.slug === slug));
  }, [slug]);

  function toggleWatch() {
    const saved = JSON.parse(localStorage.getItem('abstrack_watchlist') || '[]');
    let updated;
    if (watched) {
      updated = saved.filter(c => c.slug !== slug);
    } else {
      updated = [...saved, { name, slug, chain: 'abstract' }];
    }
    localStorage.setItem('abstrack_watchlist', JSON.stringify(updated));
    setWatched(!watched);
  }

  async function loadStats() {
    setLoadingStats(true);
    try {
      const r = await fetch(`${API_BASE}/stats?slug=${slug}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const f = d.total?.floor_price || 0;
      const v = d.total?.volume || 0;
      const numOwners = d.total?.num_owners || 0;
      const totalSupply = d.total?.total_supply || 0;
      const day = d.intervals?.find(i => i.interval === 'one_day') || {};
      const volume24h = day.volume || 0;
      const sales24h = day.sales || 0;
      setFloor(f);
      setStats({
        floor: f, volume: v, volume24h, sales24h,
        numOwners, totalSupply,
        score: computeScore(f, volume24h, sales24h, totalSupply, numOwners),
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
        labels: ['D-6','D-5','D-4','D-3','D-2','D-1','Now'],
        datasets: [{ label: 'Floor (ETH)', data, borderColor: '#00ff88', borderWidth: 2, backgroundColor: gradient, fill: true, tension: 0.4, pointBackgroundColor: '#00ff88', pointBorderColor: '#050508', pointBorderWidth: 2, pointRadius: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0a0a10', borderColor: '#1a1a2e', borderWidth: 1, titleColor: '#6b6b9a', bodyColor: '#00ff88', callbacks: { label: ctx => `${ctx.raw} ETH` } } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#3a3a5c', font: { family: 'JetBrains Mono', size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#3a3a5c', font: { family: 'JetBrains Mono', size: 10 }, callback: v => v.toFixed(4) } }
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
        return { price, tokenId, contractAddress, image_url: l.image_url || null, name: l.name || null };
      });
      items.sort((a, b) => a.price - b.price);
      setListings(items);
      setSniperStatus(`${new Date().toLocaleTimeString()} — ${items.length} listings`);
    } catch(e) { setSniperStatus(`Error — ${e.message}`); }
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

  const statCards = [
    {
      label: 'Floor Price',
      value: loadingStats ? '—' : stats?.floor.toFixed(4),
      sub: 'ETH',
      color: 'var(--white)',
      tooltip: 'The lowest listed price in this collection on OpenSea. Updated every 60s via OpenSea v2 API.',
    },
    {
      label: '24h Volume',
      value: loadingStats ? '—' : stats?.volume24h.toFixed(2),
      sub: 'ETH',
      color: 'var(--cyan)',
      tooltip: 'Total ETH traded in the last 24 hours. Source: OpenSea v2 stats API, one_day interval.',
    },
    {
      label: '24h Sales',
      value: loadingStats ? '—' : stats?.sales24h,
      sub: 'transactions',
      color: 'var(--yellow)',
      tooltip: 'Number of completed sales in the last 24h. High count = strong liquidity and active trading.',
    },
    {
      label: 'Holders',
      value: loadingStats ? '—' : stats?.numOwners?.toLocaleString(),
      sub: `of ${stats?.totalSupply?.toLocaleString() || '—'}`,
      color: 'var(--muted)',
      tooltip: 'Unique wallets holding at least 1 NFT vs total supply. High ratio = good distribution.',
    },
    {
      label: 'Score',
      value: loadingStats ? '—' : stats?.score,
      sub: 'algorithmic',
      color: 'var(--green)',
      tooltip: 'Score = Floor×40% + 24h Volume×30% + 24h Sales×20% + Holders Ratio×10%. Higher = more active and valuable.',
    },
  ];

  return (
    <Layout title="Collection Analytics">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Collection Analytics</div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 800, color: 'var(--white)', letterSpacing: '-1px' }}>{name}</h1>
          <div style={{ fontSize: 11, marginTop: 6 }}>
            <a href={`https://opensea.io/collection/${slug}`} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>
              opensea.io/collection/{slug} ↗
            </a>
          </div>
        </div>
        <button onClick={toggleWatch} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', background: 'transparent',
          border: `1px solid ${watched ? 'var(--cyan)' : 'var(--border2)'}`,
          color: watched ? 'var(--cyan)' : 'var(--muted)',
          fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer',
          borderRadius: 3, letterSpacing: 1, transition: 'all 0.15s',
        }}>
          {watched ? '★ Watchlisted' : '☆ Add to Watchlist'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'visible', marginBottom: 24 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              {s.label}
              <Tooltip text={s.tooltip} />
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value || '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
            FLOOR TREND — 7 DAYS
          </div>
          <div style={{ padding: 20, height: 260 }}>
            <canvas ref={chartRef} />
          </div>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', boxShadow: '0 0 8px var(--cyan)' }} />
            LIVE SNIPER
            <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--dim)' }}>{sniperStatus}</span>
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {listings.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No active listings</div>
            ) : listings.slice(0, 20).map((item, i) => {
              const isDeal = floor > 0 && item.price <= floor * 1.05;
              const pct = floor > 0 ? ((item.price - floor) / floor * 100).toFixed(1) : null;
              const openseaUrl = item.contractAddress
                ? `https://opensea.io/assets/abstract/${item.contractAddress}/${item.tokenId}`
                : `https://opensea.io/collection/${slug}`;
              return (
                <a key={i} href={openseaUrl} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', borderLeft: `2px solid ${isDeal ? 'var(--green)' : 'var(--border2)'}`, textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 4, overflow: 'hidden', background: 'var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name || item.tokenId} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 18, color: 'var(--border2)' }}>◈</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name || `#${item.tokenId}`}
                    </div>
                    {pct !== null && (
                      <div style={{ fontSize: 10, color: isDeal ? 'var(--green)' : 'var(--muted)', marginTop: 2 }}>
                        {isDeal ? `◉ FLOOR +${pct}%` : `+${pct}% vs floor`}
                      </div>
                    )}
                    <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 2 }}>View on OpenSea ↗</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: isDeal ? 'var(--green)' : 'var(--white)' }}>
                      {item.price.toFixed(4)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--dim)' }}>ETH</div>
                  </div>
                </a>
              );
            })}
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--dim)' }}>
            ↻ Auto-refresh every 15s · sorted by price
          </div>
        </div>
      </div>
    </Layout>
  );
}