import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import Layout from '../components/Layout';
import { COLLECTIONS, API_BASE, computeScore } from '../config';

function getScoreColor(score, max) {
  const pct = score / max;
  if (pct > 0.7) return 'var(--green)';
  if (pct > 0.4) return 'var(--cyan)';
  if (pct > 0.2) return 'var(--yellow)';
  return 'var(--muted)';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    if (!isConnected) navigate('/connect');
  }, [isConnected, navigate]);

  async function fetchCollection(c) {
    const r = await fetch(`${API_BASE}/stats?slug=${c.slug}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const floor = d.total?.floor_price || 0;
    const volume = d.total?.volume || 0;
    return { ...c, floor, volume, score: computeScore(floor, volume), ok: true };
  }

  async function loadAll() {
    setLoading(true);
    const results = await Promise.allSettled(COLLECTIONS.map(fetchCollection));
    const rows = results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { ...COLLECTIONS[i], floor: 0, volume: 0, score: 0, ok: false }
    );
    rows.sort((a, b) => b.score - a.score);
    setData(rows);
    setLastUpdate(new Date().toLocaleTimeString());
    setLoading(false);
  }

  useEffect(() => {
    if (isConnected) loadAll();
  }, [isConnected]);

  const okData = data.filter(d => d.ok);
  const totalVol = okData.reduce((s, d) => s + d.volume, 0);
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 24 }}>
        {[
          { label: 'Total Volume', value: loading ? '—' : totalVol.toFixed(2), sub: 'ETH cumulé', color: 'var(--white)' },
          { label: 'Floor Moyen', value: loading ? '—' : avgFloor.toFixed(4), sub: 'ETH', color: 'var(--cyan)' },
          { label: 'Collections', value: COLLECTIONS.length, sub: 'trackées', color: 'var(--yellow)' },
          { label: 'Top Scorer', value: loading || !data[0] ? '—' : data[0].name, sub: data[0] ? `Score : ${data[0].score}` : '—', color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', padding: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

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
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#', 'Collection', 'Floor', 'Volume', 'Score', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: 400 }}>{h}</th>
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
                    <Link to={`/collection/${d.slug}?name=${encodeURIComponent(d.name)}`} style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, color: 'var(--white)', textDecoration: 'none' }}>
                      {d.name}
                    </Link>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{d.chain}</div>
                  </td>
                  <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                    {d.ok ? <><span style={{ color: 'var(--white)' }}>{d.floor.toFixed(4)}</span> <span style={{ color: 'var(--dim)' }}>ETH</span></> : '—'}
                  </td>
                  <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                    {d.ok ? <><span style={{ color: 'var(--text)' }}>{d.volume.toFixed(2)}</span> <span style={{ color: 'var(--dim)' }}>ETH</span></> : '—'}
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
                    {d.ok ? (
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
                    ) : <span style={{ fontSize: 10, color: 'var(--red)' }}>Erreur API</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}