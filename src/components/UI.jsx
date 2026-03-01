// Composants UI réutilisables

export function Panel({ children, header, dotColor = 'var(--green)', style = {} }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 4, overflow: 'hidden', ...style
    }}>
      {header && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: dotColor, boxShadow: `0 0 8px ${dotColor}`,
          }} />
          {header}
        </div>
      )}
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

export function StatCard({ label, value, sub, color = 'var(--white)' }) {
  return (
    <div style={{
      background: 'var(--bg2)', padding: 20,
      transition: 'background 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg2)'}
    >
      <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function StatGrid({ children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: 1,
      background: 'var(--border)',
      border: '1px solid var(--border)',
      borderRadius: 4,
      overflow: 'hidden',
    }}>
      {children}
    </div>
  );
}

export function Btn({ children, onClick, variant = 'green', size = 'md', disabled, as: As = 'button', to, ...props }) {
  const colors = {
    green: { border: 'var(--green)', color: 'var(--green)', glow: 'rgba(0,255,136,0.2)' },
    cyan:  { border: 'var(--cyan)',  color: 'var(--cyan)',  glow: 'rgba(0,212,255,0.2)' },
    dim:   { border: 'var(--border2)', color: 'var(--muted)', glow: 'transparent' },
  };
  const c = colors[variant] || colors.green;
  const padding = size === 'lg' ? '14px 32px' : size === 'sm' ? '6px 14px' : '10px 20px';
  const fontSize = size === 'lg' ? 13 : size === 'sm' ? 11 : 12;

  const style = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding, background: 'transparent',
    border: `1px solid ${c.border}`, color: c.color,
    fontFamily: 'var(--mono)', fontSize, letterSpacing: 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 3, textDecoration: 'none',
    transition: 'all 0.15s',
    opacity: disabled ? 0.5 : 1,
  };

  if (As === 'a' || to) {
    const { Link } = require('react-router-dom');
    return (
      <Link to={to} style={style} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button style={style} onClick={onClick} disabled={disabled}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.boxShadow = `0 0 20px ${c.glow}`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
      {...props}
    >
      {children}
    </button>
  );
}

export function Loading({ text = 'Chargement...' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 12 }}>
      <div style={{
        width: 14, height: 14, border: '1px solid var(--border2)',
        borderTopColor: 'var(--green)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      {text}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function Tag({ children, color = 'green' }) {
  const colors = {
    green:  { bg: 'rgba(0,255,136,0.1)',  text: 'var(--green)',  border: 'rgba(0,255,136,0.2)'  },
    red:    { bg: 'rgba(255,51,85,0.1)',   text: 'var(--red)',    border: 'rgba(255,51,85,0.2)'   },
    cyan:   { bg: 'rgba(0,212,255,0.1)',   text: 'var(--cyan)',   border: 'rgba(0,212,255,0.2)'   },
    yellow: { bg: 'rgba(255,204,0,0.1)',   text: 'var(--yellow)', border: 'rgba(255,204,0,0.2)'   },
  };
  const c = colors[color] || colors.green;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 2,
      fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {children}
    </span>
  );
}