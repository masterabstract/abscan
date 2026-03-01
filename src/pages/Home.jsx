import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function Home() {
  return (
    <Layout title="Abstract NFT Analytics">
      <div style={{ minHeight: 'calc(100vh - 65px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 48 }}>

        {/* Eyebrow */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--green)', letterSpacing: 3, textTransform: 'uppercase' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', boxShadow: '0 0 8px var(--green)' }} />
          Live on Abstract Network
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--display)', fontWeight: 800,
          fontSize: 'clamp(48px, 8vw, 96px)',
          color: 'var(--white)', lineHeight: 0.95, letterSpacing: '-3px',
        }}>
          NFT<br />
          <span style={{ color: 'var(--green)' }}>Analytics</span><br />
          <span style={{ color: 'var(--dim)' }}>Rebuilt.</span>
        </h1>

        {/* Description */}
        <p style={{ maxWidth: 480, color: 'var(--muted)', fontSize: 13, lineHeight: 1.9 }}>
          Floor tracking. Volume momentum. Real-time sniper.<br />
          Données on-chain brutes — pas de bullshit, pas de lag.<br />
          Conçu pour les traders sérieux sur Abstract.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/connect" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 32px', background: 'transparent',
            border: '1px solid var(--green)', color: 'var(--green)',
            fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: 1,
            borderRadius: 3, textDecoration: 'none', transition: 'all 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 24px rgba(0,255,136,0.25)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            Connect Wallet →
          </Link>
          <a href="#features" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 32px', background: 'transparent',
            border: '1px solid var(--cyan)', color: 'var(--cyan)',
            fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: 1,
            borderRadius: 3, textDecoration: 'none',
          }}>
            Voir les features
          </a>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 48, paddingTop: 48, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {[
            { num: '5', label: 'Collections trackées' },
            { num: '15s', label: 'Refresh rate sniper' },
            { num: '24/7', label: 'Live data' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 800, color: 'var(--white)' }}>{s.num}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section id="features" style={{ padding: '80px 0', borderTop: '1px solid var(--border)' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))',
          gap: 1, background: 'var(--border)', border: '1px solid var(--border)',
          borderRadius: 4, overflow: 'hidden',
        }}>
          {[
            { icon: '◈', color: 'var(--green)', title: 'Floor & Volume', desc: 'Données OpenSea v2 en temps réel. Floor price, volume cumulé, momentum calculé automatiquement.' },
            { icon: '⚡', color: 'var(--cyan)',  title: 'Sniper Live',    desc: 'Listings en dessous du floor détectés en temps réel. Alertes visuelles. Refresh toutes les 15 secondes.' },
            { icon: '▦', color: 'var(--yellow)', title: 'Score & Ranking', desc: 'Algorithme de scoring basé sur floor, volume et momentum. Classement automatique des collections.' },
          ].map(f => (
            <div key={f.title} style={{ background: 'var(--bg2)', padding: 32 }}>
              <div style={{ color: f.color, fontSize: 20, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--white)', marginBottom: 12 }}>{f.title}</h3>
              <p style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.8 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}