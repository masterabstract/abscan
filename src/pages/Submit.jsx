import Layout from '../components/Layout';

const WALLET = '0x994379ec467a2B9476C89c0b15d7Fe73588a732F';

export default function Submit() {
  function copyWallet() {
    navigator.clipboard.writeText(WALLET);
    alert('Address copied!');
  }

  return (
    <Layout title="Submit Collection">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, color: 'var(--green)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>◈ Collection listing</div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 40, fontWeight: 800, color: 'var(--white)', letterSpacing: '-2px', lineHeight: 1, marginBottom: 16 }}>
            List your<br /><span style={{ color: 'var(--green)' }}>Collection</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.9 }}>
            ABSTRACK only lists collections that contribute to the ecosystem.
            To get featured, send at least <strong style={{ color: 'var(--white)' }}>1 NFT</strong> from your collection to the address below.
          </p>
        </div>

        {/* Why list */}
        <div style={{ background: 'linear-gradient(135deg, rgba(0,255,136,0.05), rgba(0,212,255,0.05))', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 4, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(0,255,136,0.15)', fontSize: 10, color: 'var(--green)', letterSpacing: 2, textTransform: 'uppercase' }}>
            Why list on ABSTRACK?
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { icon: '◈', color: 'var(--green)', title: 'Targeted visibility', desc: 'ABSTRACK is used daily by active traders and collectors on Abstract Network. Getting listed means your collection appears directly in front of people ready to buy — not casual browsers, but serious NFT traders.' },
              { icon: '⚡', color: 'var(--cyan)', title: 'Live sniper exposure', desc: 'Every listing from your collection appears in our real-time sniper, updated every 15 seconds. Buyers can spot floor deals instantly and act fast — this directly drives volume and sales velocity.' },
              { icon: '▦', color: 'var(--yellow)', title: 'Algorithmic credibility', desc: 'Your collection gets a live score based on floor, volume, sales and holder distribution. A strong score puts you at the top of the ranking, building trust with new potential buyers organically.' },
              { icon: '✓', color: 'var(--green)', title: 'Verified badge', desc: 'Only collections that have contributed earn the Verified badge. This signal sets you apart from unverified projects and shows your team is committed to the Abstract ecosystem.' },
              { icon: '★', color: 'var(--cyan)', title: 'Watchlist feature', desc: 'Traders can add your collection to their personal watchlist and track your floor and volume in real time. This creates a loyal audience that stays informed and engaged with your project.' },
            ].map(f => (
              <div key={f.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 20, color: f.color, minWidth: 28, marginTop: 2 }}>{f.icon}</div>
                <div>
                  <div style={{ color: 'var(--white)', fontWeight: 600, marginBottom: 4 }}>{f.title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.8 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wallet */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>
            Receiving address — Abstract Network
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--green)', wordBreak: 'break-all', marginBottom: 12 }}>{WALLET}</div>
            <button onClick={copyWallet} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              background: 'transparent', border: '1px solid var(--border2)', color: 'var(--muted)',
              fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer', borderRadius: 3, letterSpacing: 1, transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.color = 'var(--green)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--muted)'; }}
            >Copy address</button>
          </div>
        </div>

        {/* Steps */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>How it works</div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { step: '01', title: 'Send 1 NFT', desc: 'Transfer at least 1 NFT from your collection to the address above on Abstract Network.' },
              { step: '02', title: 'Contact us', desc: 'Send the transaction hash + your OpenSea collection slug via Twitter or Discord.' },
              { step: '03', title: 'Verification', desc: 'We verify on-chain receipt and add your collection within 24h with a Verified badge.' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700, color: 'var(--border2)', minWidth: 40 }}>{s.step}</div>
                <div>
                  <div style={{ color: 'var(--white)', fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.7 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Badge */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>What you get</div>
          <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 3, padding: '4px 10px', fontSize: 10, color: 'var(--green)', letterSpacing: 1, whiteSpace: 'nowrap' }}>✓ VERIFIED</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>Verified badge + permanent listing + live sniper + watchlist tracking + algorithmic score</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}