import Layout from '../components/Layout';

const WALLET = '0x994379ec467a2B9476C89c0b15d7Fe73588a732F';

export default function Submit() {
  function copyWallet() {
    navigator.clipboard.writeText(WALLET);
    alert('Address copied!');
  }

  return (
    <Layout title="Submit Collection">
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, color: 'var(--green)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>
            ◈ Collection listing
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 40, fontWeight: 800, color: 'var(--white)', letterSpacing: '-2px', lineHeight: 1, marginBottom: 16 }}>
            List your<br /><span style={{ color: 'var(--green)' }}>Collection</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.9 }}>
            ABSTRACK only lists collections that contribute to the ecosystem.
            To get featured, send at least <strong style={{ color: 'var(--white)' }}>1 NFT</strong> from your collection to the address below.
          </p>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>
            Receiving address
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--green)', wordBreak: 'break-all', marginBottom: 12 }}>
              {WALLET}
            </div>
            <button onClick={copyWallet} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', background: 'transparent',
              border: '1px solid var(--border2)', color: 'var(--muted)',
              fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer',
              borderRadius: 3, letterSpacing: 1, transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.color = 'var(--green)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--muted)'; }}
            >
              Copy address
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>
            How it works
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { step: '01', title: 'Send 1 NFT', desc: 'Transfer at least 1 NFT from your collection to the address above on Abstract Network.' },
              { step: '02', title: 'Contact us', desc: 'Send the transaction hash + your OpenSea collection slug via Twitter or Discord.' },
              { step: '03', title: 'Verification', desc: 'We verify on-chain receipt and add your collection within 24h with a Verified badge.' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 800, color: 'var(--border2)', minWidth: 40 }}>{s.step}</div>
                <div>
                  <div style={{ color: 'var(--white)', fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.7 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>
            What you get
          </div>
          <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 3, padding: '4px 10px', fontSize: 10, color: 'var(--green)', letterSpacing: 1 }}>
              ✓ VERIFIED
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>
              Badge displayed on your collection + permanent listing on ABSTRACK
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}