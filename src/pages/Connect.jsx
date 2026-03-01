import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

export default function Connect() {
  const navigate = useNavigate();

  const features = [
    'Floor tracking live',
    'Sniper 15s',
    'Score & ranking',
    'Données historiques',
  ];

  function connectWallet() {
    // Stocke en session et redirige
    sessionStorage.setItem('connected', 'true');
    navigate('/dashboard');
  }

  useEffect(() => {
    if (sessionStorage.getItem('connected') === 'true') {
      navigate('/dashboard');
    }
  }, [navigate]);

  return (
    <Layout title="Authentication">
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 'calc(100vh - 65px)',
        textAlign: 'center', gap: 32,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--green)', letterSpacing: 3, textTransform: 'uppercase' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
          Accès sécurisé
        </div>

        <h1 style={{
          fontFamily: 'var(--display)', fontWeight: 800,
          fontSize: 'clamp(36px, 6vw, 72px)',
          color: 'var(--white)', lineHeight: 1, letterSpacing: '-2px',
        }}>
          Connect<br />your <span style={{ color: 'var(--green)' }}>Wallet</span>
        </h1>

        <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 400, lineHeight: 1.8 }}>
          Connecte ton Abstract Global Wallet pour accéder au dashboard analytics.
          Aucune transaction requise.
        </p>

        <button onClick={connectWallet} style={{
          display: 'inline-flex', alignItems: 'center', gap: 12,
          padding: '16px 40px', background: 'transparent',
          border: '1px solid var(--green)', color: 'var(--green)',
          fontFamily: 'var(--mono)', fontSize: 14, letterSpacing: 1,
          cursor: 'pointer', borderRadius: 3, transition: 'all 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 24px rgba(0,255,136,0.25)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
          <span>◉</span> Connect with Abstract
        </button>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {features.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--dim)' }}>
              <span style={{ color: 'var(--green)' }}>▸</span> {f}
            </div>
          ))}
        </div>

        <p style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: 1 }}>
          POWERED BY ABSTRACT GLOBAL WALLET
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}