import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow { 0%,100%{text-shadow:0 0 20px rgba(0,255,136,0.3)} 50%{text-shadow:0 0 40px rgba(0,255,136,0.6)} }
        .hero-title { animation: fadeUp 0.8s ease forwards; }
        .hero-sub { animation: fadeUp 0.8s 0.2s ease forwards; opacity:0; }
        .hero-actions { animation: fadeUp 0.8s 0.4s ease forwards; opacity:0; }
        .hero-stats { animation: fadeUp 0.8s 0.6s ease forwards; opacity:0; }
        .feature-card:hover { transform: translateY(-4px); background: var(--bg3) !important; }
        .feature-card { transition: all 0.2s; }
        .nav-link { font-size:11px; color:var(--muted); text-decoration:none; letter-spacing:1px; transition: color 0.15s; }
        .nav-link:hover { color: var(--white); }
      `}</style>

      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        borderBottom: '1px solid var(--border)',
        background: 'rgba(5,5,8,0.92)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', maxWidth: 1280, margin: '0 auto' }}>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, color: 'var(--white)', letterSpacing: '-0.5px' }}>
            ABS<span style={{ color: 'var(--green)' }}>TRACK</span>
          </span>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <Link to="/dashboard" className="nav-link">DASHBOARD</Link>
            <Link to="/watchlist" className="nav-link">WATCHLIST</Link>
            <Link to="/submit" className="nav-link">SUBMIT</Link>
            <Link to="/dashboard" style={{
              padding: '8px 20px', border: '1px solid var(--green)', color: 'var(--green)',
              fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, borderRadius: 3, textDecoration: 'none', transition: 'box-shadow 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(0,255,136,0.25)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >Launch App →</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 1280, margin: '0 auto', padding: '0 24px', paddingTop: 65 }}>
        <div style={{ maxWidth: 800 }}>
          <div className="hero-title" style={{ marginBottom: 8 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--green)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              Live on Abstract Network
            </div>
            <h1 style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 'clamp(56px, 9vw, 112px)', color: 'var(--white)', lineHeight: 0.92, letterSpacing: '-4px', marginBottom: 32 }}>
              The NFT<br />
              <span style={{ color: 'var(--green)', animation: 'glow 3s infinite' }}>Analytics</span><br />
              <span style={{ color: 'var(--dim)' }}>Edge.</span>
            </h1>
          </div>

          <p className="hero-sub" style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 2, maxWidth: 520, marginBottom: 40 }}>
            Floor tracking. Volume momentum. Real-time sniper.<br />
            Raw data for serious traders on <span style={{ color: 'var(--white)' }}>Abstract Network</span>.
          </p>

          <div className="hero-actions" style={{ display: 'flex', gap: 12, marginBottom: 80 }}>
            <Link to="/dashboard" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '16px 36px', background: 'var(--green)', color: '#000',
              fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: 1,
              borderRadius: 3, textDecoration: 'none', fontWeight: 700, transition: 'all 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 32px rgba(0,255,136,0.4)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >Open Dashboard →</Link>
            <Link to="/submit" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '16px 36px', background: 'transparent',
              border: '1px solid var(--border2)', color: 'var(--muted)',
              fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: 1,
              borderRadius: 3, textDecoration: 'none',
            }}>Submit a collection</Link>
          </div>

          <div className="hero-stats" style={{ display: 'flex', gap: 48, paddingTop: 40, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {[
              { num: '5', label: 'Tracked collections' },
              { num: '15s', label: 'Sniper refresh rate' },
              { num: '24/7', label: 'Live data' },
              { num: '100%', label: 'On-chain data' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 36, fontWeight: 700, color: 'var(--white)', lineHeight: 1 }}>{s.num}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '100px 24px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ fontSize: 10, color: 'var(--green)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>Features</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 40, fontWeight: 800, color: 'var(--white)', letterSpacing: '-2px' }}>
            Everything you need<br />to trade smarter
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          {[
            { icon: '◈', color: 'var(--green)', title: 'Live Floor & Volume', desc: 'Real-time OpenSea v2 data. Floor price, cumulative volume, 24h change, and momentum calculated automatically for each collection.' },
            { icon: '⚡', color: 'var(--cyan)', title: '15s Live Sniper', desc: 'Real-time listings sorted by price. Automatic detection of items at floor. Direct OpenSea link to buy instantly.' },
            { icon: '▦', color: 'var(--yellow)', title: 'Score & Ranking', desc: 'Algorithmic scoring based on floor, volume, sales and holder ratio. Automatic ranking to identify the most dynamic collections.' },
            { icon: '✓', color: 'var(--green)', title: 'Verified Collections', desc: 'Only collections that contributed to the ecosystem are listed. Each project sends 1 NFT to get featured and earn the Verified badge.' },
          ].map(f => (
            <div key={f.title} className="feature-card" style={{ background: 'var(--bg2)', padding: 36 }}>
              <div style={{ fontSize: 28, marginBottom: 20, color: f.color }}>{f.icon}</div>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 12 }}>{f.title}</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.8 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '100px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 52, fontWeight: 800, color: 'var(--white)', letterSpacing: '-3px', marginBottom: 24 }}>
          Ready to trade<br /><span style={{ color: 'var(--green)' }}>smarter</span>?
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 40 }}>Free access. Live data. No account required.</p>
        <Link to="/dashboard" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '18px 48px', background: 'var(--green)', color: '#000',
          fontFamily: 'var(--mono)', fontSize: 14, letterSpacing: 1,
          borderRadius: 3, textDecoration: 'none', fontWeight: 700,
        }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 40px rgba(0,255,136,0.4)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >Open Dashboard →</Link>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '32px 24px', maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 16, color: 'var(--white)' }}>
          ABS<span style={{ color: 'var(--green)' }}>TRACK</span>
        </span>
        <span style={{ fontSize: 11, color: 'var(--dim)' }}>Built for Abstract Network traders</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/dashboard" style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'none' }}>Dashboard</Link>
          <Link to="/watchlist" style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'none' }}>Watchlist</Link>
          <Link to="/submit" style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'none' }}>Submit</Link>
        </div>
      </div>
    </>
  );
}