import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children, title }) {
  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        borderBottom: '1px solid var(--border)',
        background: 'rgba(5,5,8,0.92)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px', maxWidth: 1280, margin: '0 auto',
        }}>
          <Link to="/" style={{
            fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18,
            color: 'var(--white)', letterSpacing: '-0.5px', textDecoration: 'none',
          }}>
            Abst<span style={{ color: 'var(--green)' }}>Scan</span>
          </Link>
          <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>
            {title || 'Abstract NFT Analytics'}
          </span>
          <Link to="/connect" style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'none' }}>
            Connect →
          </Link>
        </div>
      </nav>
      <main style={{ paddingTop: 65, maxWidth: 1280, margin: '0 auto', padding: '80px 24px 60px' }}>
        {children}
      </main>
    </>
  );
}