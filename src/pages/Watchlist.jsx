import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { API_BASE, computeScore } from '../config';

function getScoreColor(score, max) {
  const pct = score / max;
  if (pct > 0.7) return 'var(--green)';
  if (pct > 0.4) return 'var(--cyan)';
  if (pct > 0.2) return 'var(--yellow)';
  return 'var(--muted)';
}

function Change({ value }) {
  if (value === null || value === undefined) return <span style={{ color: 'var(--dim)' }}>—</span>;
  const pos = value >= 0;
  return (
    <span style={{ color: pos ? 'var(--green)' : '#ff4d4d', fontSize: 11 }}>
      {pos ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('abstrack_watchlist') || '[]');
    setWatchlist(saved);
  }, []);

  useEffect(() => {
    if (watchlist.length === 0) { setData([]); return; }
    loadAll();
  }, [watchlist]);

  async function fetchCollection(c) {
    const r = await fetch(`${API_BASE}/stats?slug=${c.slug}`);
    if (!r.ok) throw new Error();
    const d = await r.json();
    const floor = d.total?.floor_price || 0;
    const numOwners = d.total?.num_owners || 0;
    const totalSupply = d.total?.total_supply || 0;
    const day = d.intervals?.find(i => i.interval === 'one_day') || {};
    const volume24h = day.volume || 0;
    const sales24h = day.sales || 0;
    const volumeChange = day.volume_change ? day.volume_change * 100 : null;
    return { ...c, floor, volume24h, sales24h, volumeChange, numOwners, totalSupply, score: computeScore(floor, volume24h, sales24h, totalSupply, numOwners), image_url: d.image_url || null, ok: true };
  }

  async function loadAll() {
    setLoading(true);
    const results = await Promise.allSettled(watchlist.map(fetchCollection));
    const rows = results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { ...watchlist[i], floor: 0, volume24h: 0, sales24h: 0, volumeChange: null, score: 0, image_url: null, ok: false }
    );
    setData(rows);
    setLoading(false);
  }

  function remove(slug) {
    const updated = watchlist.filter(c => c.slug !== slug);
    localStorage.setItem('abstrack_watchlist', JSON.stringify(updated));
    setWatchlist(updated);
  }

  const maxScore = Math.max(...data.map(d => d.score), 1);

  return (
    <Layout title="Watchlist">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 800, color: 'var(--white)', letterSpacing: '-1px' }}>My Watchlist</h1>
        {watchlist.length > 0 && (
          <button onClick={loadAll} disabled={loading} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            background: 'transparent', border: '1px solid var(--border2)', color: 'var(--muted)',
            fontFamily: 'var(--mono)', fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', borderRadius: 3, letterSpacing: 1,
          }}>↺ Refresh</button>
        )}
      </div>

      {watchlist.length === 0 ? (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>◈</div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>Your watchlist is empty</div>
          <Link to="/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px',
            background: 'transparent', border: '1px solid var(--green)', color: 'var(--green)',
            fontFamily: 'var(--mono)', fontSize: 12, borderRadius: 3, textDecoration: 'none',
          }}>Browse collections →</Link>
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Collection', 'Floor', '24h Vol', '24h Sales', 'Score', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: 400, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading...</td></tr>
                ) : data.map((d) => (
                  <tr key={d.slug}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 4, overflow: 'hidden', background: 'var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {d.image_url ? <img src={d.image_url} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 14, color: 'var(--border2)' }}>◈</span>}
                        </div>
                        <Link to={`/collection/${d.slug}?name=${encodeURIComponent(d.name)}`} style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, color: 'var(--white)', textDecoration: 'none' }}>{d.name}</Link>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {d.ok && d.floor > 0 ? (
                        <div>
                          <span style={{ color: 'var(--white)', fontFamily: 'var(--mono)' }}>{d.floor.toFixed(4)}</span> <span style={{ color: 'var(--dim)' }}>ETH</span>
                          <div style={{ marginTop: 2 }}><Change value={d.volumeChange} /></div>
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {d.ok ? <><span style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>{d.volume24h.toFixed(2)}</span> <span style={{ color: 'var(--dim)' }}>ETH</span></> : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>{d.ok ? d.sales24h : '—'}</span>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(d.score/maxScore*100).toFixed(1)}%`, background: getScoreColor(d.score, maxScore), borderRadius: 2 }} />
                        </div>
                        <span style={{ minWidth: 48, color: getScoreColor(d.score, maxScore), fontWeight: 700, fontFamily: 'var(--mono)' }}>{d.score}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                      <button onClick={() => remove(d.slug)} style={{
                        padding: '6px 14px', background: 'transparent', border: '1px solid var(--border2)',
                        color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11, borderRadius: 3, cursor: 'pointer',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4d4d'; e.currentTarget.style.color = '#ff4d4d'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--muted)'; }}
                      >Remove ✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}