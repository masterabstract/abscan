import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/dashboard', label: 'DASHBOARD', color: 'var(--white)' },
  { to: '/watchlist',  label: 'WATCHLIST',  color: 'var(--cyan)'  },
  { to: '/submit',     label: '+ SUBMIT',   color: 'var(--green)' },
];

export default function Layout({ children, title }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        borderBottom: '1px solid var(--border)',
        background: 'rgba(5,5,8,0.95)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', maxWidth: 1280, margin: '0 auto' }}>
          <Link to="/" style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, color: 'var(--white)', letterSpacing: '-0.5px', textDecoration: 'none', flexShrink: 0 }}>
            ABS<span style={{ color: 'var(--green)' }}>TRACK</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }} className="nav-desktop">
            {NAV_LINKS.map(n => (
              <Link key={n.to} to={n.to} style={{
                fontSize: 11, color: location.pathname === n.to ? n.color : 'var(--muted)',
                textDecoration: 'none', letterSpacing: 1, transition: 'color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = n.color}
                onMouseLeave={e => e.currentTarget.style.color = location.pathname === n.to ? n.color : 'var(--muted)'}
              >{n.label}</Link>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span className="nav-title" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>
              {title || 'Abstract NFT Analytics'}
            </span>
            <button className="nav-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu" style={{
              display: 'none',
              flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              gap: 5, width: 36, height: 36, background: 'transparent',
              border: '1px solid var(--border2)', borderRadius: 4, cursor: 'pointer', padding: 0,
            }}>
              {menuOpen ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <line x1="1" y1="1" x2="13" y2="13" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="13" y1="1" x2="1" y2="13" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                  <line x1="0" y1="1" x2="16" y2="1" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="0" y1="6" x2="16" y2="6" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="0" y1="11" x2="16" y2="11" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div style={{ borderTop: '1px solid var(--border)', background: 'rgba(5,5,8,0.98)', padding: '8px 0 16px' }}>
            {NAV_LINKS.map(n => (
              <Link key={n.to} to={n.to} style={{
                display: 'block', padding: '14px 24px',
                fontSize: 13, letterSpacing: 1, fontFamily: 'var(--mono)',
                color: location.pathname === n.to ? n.color : 'var(--muted)',
                textDecoration: 'none', borderBottom: '1px solid var(--border)', transition: 'color 0.15s',
              }}>{n.label}</Link>
            ))}
            <div style={{ padding: '12px 24px 0', fontSize: 10, color: 'var(--dim)', letterSpacing: 2, textTransform: 'uppercase' }}>
              {title || 'Abstract NFT Analytics'}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom tab bar — mobile only */}
      <nav className="bottom-nav" style={{
        display: 'none',
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        background: 'rgba(5,5,8,0.97)',
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
      }}>
        {[
          { to: '/dashboard', label: 'Dashboard', icon: '◈' },
          { to: '/watchlist',  label: 'Watchlist',  icon: '★' },
          { to: '/submit',     label: 'Submit',     icon: '+' },
        ].map(t => {
          const active = location.pathname === t.to || (t.to === '/dashboard' && location.pathname === '/');
          return (
            <Link key={t.to} to={t.to} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '10px 0 8px', textDecoration: 'none',
              color: active ? 'var(--green)' : 'var(--muted)',
              borderTop: active ? '2px solid var(--green)' : '2px solid transparent',
              gap: 3,
            }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{t.icon}</span>
              <span style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}>{t.label}</span>
            </Link>
          );
        })}
      </nav>

      <main style={{ paddingTop: 65, maxWidth: 1280, margin: '0 auto', padding: '80px 16px 80px' }}>
        {children}
      </main>

      <style>{`
        @media (max-width: 640px) {
          .nav-desktop  { display: none !important; }
          .nav-title    { display: none !important; }
          .nav-hamburger { display: none !important; }
          .bottom-nav   { display: flex !important; }
          main { padding: 72px 12px 80px !important; }
        }
        @media (min-width: 641px) {
          .nav-hamburger { display: none !important; }
          .bottom-nav    { display: none !important; }
        }
      `}</style>
    </>
  );
}