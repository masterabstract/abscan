import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { COLLECTIONS, API_BASE, computeScore } from '../config';

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

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  async function fetchCollection(c) {
    const r = await fetch(`${API_BASE}/stats?slug=${c.slug}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const floor = d.total?.floor_price || 0;
    const volume = d.total?.volume || 0;
    const numOwners = d.total?.num_owners || 0;
    const totalSupply = d.total?.total_supply || 0;

    const day = d.intervals?.find(i => i.interval === 'one_day') || {};
    const volume24h = day.volume || 0;
    const sales24h = day.sales || 0;
    const volumeChange = day.volume_change ? day.volume_change * 100 : null;

    // Variation floor 24h estimée via volume change
    const floorChange = volumeChange;

    const score = computeScore(floor, volume24h, sales24h, totalSupply, numOwners);

    return { ...c, floor, volume, volume24h, sales24h, volumeChange, floorChange, numOwners, totalSupply, score, ok: true };
  }

  async function loadAll() {
    setLoading(true);
    const results = await Promise.allSettled(COLLECTIONS.map(fetchCollection));
    const rows = results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { ...COLLECTIONS[i], floor: 0, volume: 0, volume24h: 0, sales24h: 0, volumeChange: null, floorChange: null, score: 0, ok: false }
    );
    rows.sort((a, b) => b.score - a.score);
    setData(rows);
    setLastUpdate(new Date().toLocaleTimeString());
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  const okData = data.filter(d => d.ok);
  const totalVol24h = okData.reduce((s, d) => s + d.volume24h, 0);
  const avgFloor = okData.length ? okData.reduce((s, d) => s + d.floor, 0) / okData.length : 0;
  const maxScore = Math.max(...data.map(d => d.score), 1);

  return (
    <Layout title="Dashboard">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 800, color: 'var(--white)', letterSpacing: '-1px' }}>
            Collection Ranking
          </h1>
          {lastUpdate && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Dernière mise à jour : {lastUpdate}</div>}
        </div>
        <button onClick={loadAll} disabled={loading} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', background: 'transparent',
          border: '1px solid var(--border2)', color: 'var(--muted)',
          fontFamily: 'var(--mono)', fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer',
          borderRadius: 3, letterSpacing: 1,
        }}>
          ↺ Refresh
        </button>
      </div>

      {/* Stats globales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 24 }}>
        {[
          { label: 'Volume 24h', value: loading ? '—' : totalVol24h.toFixed(2), sub: 'ETH today', color: 'var(--white)' },
          { label: 'Floor Moyen', value: loading ? '—' : avgFloor.toFixed(4), sub: 'ETH', color: 'var(--cyan)' },
          { label: 'Collections', value: COLLECTIONS.length, sub: 'vérifiées', color: 'var(--yellow)' },
          { label: 'Top Scorer', value: loading || !data[0] ? '—' : data[0].name, sub: data[0] ? `Score : ${data[0].score}` : '—', color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', padding: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
          RANKING — SCORE ALGORITHMIQUE
        </div>

        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center', color: 'var(--muted)', fontSize: 12 }}>
            Chargement des collections...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['#', 'Collection', 'Floor', 'Vol 24h', 'Sales 24h', 'Holders', 'Score', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: 400, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((d, i) => (
                  <tr key={d.slug}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', color: 'var(--dim)', fontSize: 11, fontWeight: 700 }}>#{i+1}</td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Link to={`/collection/${d.slug}?name=${encodeURIComponent(d.name)}`} style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, color: 'var(--white)', textDecoration: 'none' }}>
                          {d.name}
                        </Link>
                        {d.verified && (
                          <span style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 3, padding: '2px 6px', fontSize: 9, color: 'var(--green)', letterSpacing: 1 }}>✓ VERIFIED</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{d.chain}</div>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {d.ok && d.floor > 0 ? (
                        <div>
                          <span style={{ color: 'var(--white)' }}>{d.floor.toFixed(4)}</span> <span style={{ color: 'var(--dim)' }}>ETH</span>
                          <div style={{ marginTop: 2 }}><Change value={d.floorChange} /></div>
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {d.ok ? (
                        <div>
                          <span style={{ color: 'var(--text)' }}>{d.volume24h.toFixed(2)}</span> <span style={{ color: 'var(--dim)' }}>ETH</span>
                          {d.volumeChange !== null && <div style={{ marginTop: 2 }}><Change value={d.volumeChange} /></div>}
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text)' }}>{d.ok ? d.sales24h : '—'}</span>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text)' }}>{d.ok && d.numOwners > 0 ? d.numOwners.toLocaleString() : '—'}</span>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', minWidth: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(d.score/maxScore*100).toFixed(1)}%`, background: getScoreColor(d.score, maxScore), borderRadius: 2, transition: 'width 1s ease' }} />
                        </div>
                        <span style={{ minWidth: 48, color: getScoreColor(d.score, maxScore), fontWeight: 700 }}>{d.score}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                      <Link to={`/collection/${d.slug}?name=${encodeURIComponent(d.name)}`} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', background: 'transparent',
                        border: '1px solid var(--border2)', color: 'var(--muted)',
                        fontFamily: 'var(--mono)', fontSize: 11, borderRadius: 3, textDecoration: 'none',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.color = 'var(--green)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--muted)'; }}
                      >
                        Analyser →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}