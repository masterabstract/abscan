import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import Layout from '../components/Layout';
import { API_BASE, computeScore, COLLECTIONS } from '../config';

Chart.register(...registerables);

function Tooltip({ text }) {
  const [rect, setRect] = useState(null);
  const ref = useRef(null);
  function show() { if (ref.current) setRect(ref.current.getBoundingClientRect()); }
  function hide() { setRect(null); }
  return (
    <>
      <span ref={ref} onMouseEnter={show} onMouseLeave={hide} style={{
        width: 15, height: 15, borderRadius: '50%', border: '1px solid var(--border2)',
        color: 'var(--muted)', fontSize: 9, display: 'inline-flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'help', userSelect: 'none', marginLeft: 6, flexShrink: 0,
      }}>?</span>
      {rect && createPortal(
        <div className="tooltip-portal" style={{ position: 'absolute', top: rect.top + window.scrollY - 8, left: rect.left + rect.width / 2, transform: 'translate(-50%, -100%)' }}>
          {text}
        </div>,
        document.body
      )}
    </>
  );
}

function SectionHeader({ dot, label, tooltip, right, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, boxShadow: `0 0 6px ${dot}` }} />
      {label}
      {badge && <span style={{ fontSize: 8, background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.3)', color: 'var(--cyan)', borderRadius: 2, padding: '1px 6px', letterSpacing: 1 }}>ON-CHAIN</span>}
      {tooltip && <Tooltip text={tooltip} />}
      {right && <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--dim)' }}>{right}</span>}
    </div>
  );
}

function shortAddr(addr) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Math.floor((Date.now() / 1000) - Number(ts));
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

function MarketHealth({ listingCount, totalSupply, avgSalePrice, floor, whaleCount, sales24h }) {
  const listingRatio = totalSupply > 0 ? listingCount / totalSupply : 0;
  const avgVsFloor = floor > 0 && avgSalePrice > 0 ? avgSalePrice / floor : 1;
  let score = 50;
  if (listingRatio < 0.05) score += 15; else if (listingRatio < 0.10) score += 5; else if (listingRatio > 0.20) score -= 15;
  if (avgVsFloor > 1.2) score += 15; else if (avgVsFloor > 1.05) score += 8; else if (avgVsFloor < 0.95) score -= 10;
  if (whaleCount > 10) score += 10; else if (whaleCount > 5) score += 5;
  if (sales24h > 20) score += 10; else if (sales24h > 5) score += 5;
  score = Math.max(0, Math.min(100, score));
  const label = score >= 70 ? 'BULLISH' : score >= 45 ? 'NEUTRAL' : 'BEARISH';
  const color = score >= 70 ? 'var(--green)' : score >= 45 ? 'var(--yellow)' : '#ff4d4d';
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'visible' }}>
      <SectionHeader dot={color} label="Market Health" tooltip="Composite signal: listing pressure, avg sale vs floor, whale presence, 24h sales." />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color }}>{label}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 30, fontWeight: 700, color }}>{score}<span style={{ fontSize: 13, color: 'var(--muted)' }}>/100</span></div>
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: '100%', width: `${score}%`, background: 'linear-gradient(90deg, #ff4d4d, var(--yellow), var(--green))', borderRadius: 3, transition: 'width 1s ease' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Listing pressure', value: totalSupply > 0 ? `${(listingRatio*100).toFixed(1)}%` : '—', sub: 'of supply listed', warn: listingRatio > 0.15 },
            { label: 'Avg sale vs floor', value: avgVsFloor !== 1 ? `${avgVsFloor>1?'+':''}${((avgVsFloor-1)*100).toFixed(1)}%` : '—', sub: 'premium over floor', warn: avgVsFloor < 1 },
            { label: 'Whale wallets', value: whaleCount, sub: '5+ NFTs held', warn: false },
            { label: '24h sales', value: sales24h, sub: 'transactions', warn: sales24h === 0 },
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 3, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, color: m.warn ? '#ff4d4d' : 'var(--white)' }}>{m.value ?? '—'}</div>
              <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ListingSpread({ listings, floor }) {
  const prices = listings.map(l => l.price).filter(p => p > 0).sort((a, b) => a - b);
  if (!prices.length) return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <SectionHeader dot="var(--yellow)" label="Listing Spread" />
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No listings data</div>
    </div>
  );
  const median = prices[Math.floor(prices.length / 2)];
  const top10pct = prices[Math.floor(prices.length * 0.9)] || prices[prices.length - 1];
  const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
  const spread = floor > 0 ? ((median - floor) / floor * 100).toFixed(1) : 0;
  const buckets = [0,0,0,0,0];
  prices.forEach(p => { const pct = floor > 0 ? (p-floor)/floor : 0; if (pct<=0.05) buckets[0]++; else if (pct<=0.15) buckets[1]++; else if (pct<=0.30) buckets[2]++; else if (pct<=0.60) buckets[3]++; else buckets[4]++; });
  const maxBucket = Math.max(...buckets, 1);
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'visible' }}>
      <SectionHeader dot="var(--yellow)" label="Listing Spread" tooltip="Distribution of listings by price range vs floor." />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 20 }}>
          {[{label:'Floor',value:floor.toFixed(4),color:'var(--green)'},{label:'Median',value:median.toFixed(4),color:'var(--cyan)'},{label:'Average',value:avg.toFixed(4),color:'var(--yellow)'},{label:'Top 10%',value:top10pct.toFixed(4),color:'var(--muted)'}].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 14px' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 2 }}>ETH</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 72 }}>
          {buckets.map((count, i) => {
            const labels = ['≤+5%','+5-15%','+15-30%','+30-60%','+60%+'];
            const colors = ['var(--green)','var(--cyan)','var(--yellow)','var(--muted)','var(--dim)'];
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 9, color: colors[i], fontFamily: 'var(--mono)' }}>{count}</div>
                <div style={{ width: '100%', background: colors[i], borderRadius: '2px 2px 0 0', height: `${(count/maxBucket)*44}px`, minHeight: count > 0 ? 4 : 0, opacity: 0.75 }} />
                <div style={{ fontSize: 8, color: 'var(--dim)', textAlign: 'center' }}>{labels[i]}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 14, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 3, fontSize: 11, color: 'var(--muted)' }}>
          Median is <span style={{ color: parseFloat(spread) > 20 ? '#ff4d4d' : 'var(--green)', fontFamily: 'var(--mono)' }}>{spread > 0 ? '+' : ''}{spread}%</span> above floor — {parseFloat(spread) > 30 ? 'wide spread' : parseFloat(spread) > 10 ? 'moderate spread' : 'tight spread, sellers near floor'}
        </div>
      </div>
    </div>
  );
}

function RecentSales({ sales, floor }) {
  if (!sales.length) return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <SectionHeader dot="var(--cyan)" label="Recent Sales" />
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No recent sales found</div>
    </div>
  );
  const prices = sales.map(s => s.price).filter(p => p > 0);
  const avgSale = prices.length ? prices.reduce((a,b) => a+b, 0) / prices.length : 0;
  const avgVsFloor = floor > 0 && avgSale > 0 ? ((avgSale/floor-1)*100).toFixed(1) : null;
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <SectionHeader dot="var(--cyan)" label="Recent Sales" tooltip="Latest sales from OpenSea event feed." right={avgVsFloor !== null ? `Avg ${avgVsFloor >= 0 ? '+' : ''}${avgVsFloor}% vs floor` : null} />
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {sales.slice(0, 15).map((s, i) => {
          const vsFloor = floor > 0 ? ((s.price - floor) / floor * 100).toFixed(1) : null;
          const url = s.contractAddress ? `https://opensea.io/assets/abstract/${s.contractAddress}/${s.tokenId}` : '#';
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {s.imageUrl ? <img src={s.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 36, height: 36, borderRadius: 3, background: 'var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--border2)' }}>◈</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{s.name || `#${s.tokenId}`}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                  <a href={`https://abscan.org/address/${s.buyer}`} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>{shortAddr(s.buyer)}</a>
                  {' ← '}<span style={{ color: 'var(--dim)' }}>{shortAddr(s.seller)}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12, color: 'var(--white)' }}>{s.price.toFixed(4)} ETH</div>
                </a>
                {vsFloor !== null && <div style={{ fontSize: 10, color: parseFloat(vsFloor) >= 0 ? 'var(--green)' : '#ff4d4d', marginTop: 2 }}>{vsFloor > 0 ? '+' : ''}{vsFloor}% vs floor</div>}
                <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 2 }}>{timeAgo(s.timestamp)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WhaleTracker({ owners, whaleCount, top10Pct, totalOwned }) {
  if (!owners.length) return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <SectionHeader dot="var(--green)" label="Whale Tracker" badge />
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No holder data available</div>
    </div>
  );
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <SectionHeader dot="var(--green)" label="Whale Tracker" badge tooltip="Top 10 holders by NFT count. Source: on-chain transfers via Abscan." right={`${whaleCount} whales · top 10 own ${top10Pct}%`} />
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {owners.map((o, i) => {
          const pct = totalOwned > 0 ? ((o.quantity / totalOwned) * 100).toFixed(1) : 0;
          const isWhale = o.quantity >= 5;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', borderLeft: `2px solid ${isWhale ? 'var(--green)' : 'var(--border2)'}` }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', minWidth: 20, textAlign: 'right' }}>#{i+1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <a href={`https://abscan.org/address/${o.address}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: isWhale ? 'var(--green)' : 'var(--text)', textDecoration: 'none' }}>{shortAddr(o.address)}</a>
                  {isWhale && <span style={{ fontSize: 8, color: 'var(--green)', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 2, padding: '1px 5px', letterSpacing: 1 }}>WHALE</span>}
                </div>
                <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: isWhale ? 'var(--green)' : 'var(--border2)', borderRadius: 2, transition: 'width 0.8s ease' }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: isWhale ? 'var(--green)' : 'var(--white)' }}>{o.quantity}</div>
                <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 2 }}>{pct}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PriceHistory({ data }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data?.length) return;
    if (chartRef.current) chartRef.current.destroy();
    const filtered = data.filter(d => d.avgPrice !== null);
    if (!filtered.length) return;
    const ctx = canvasRef.current.getContext('2d');
    const gradG = ctx.createLinearGradient(0, 0, 0, 200);
    gradG.addColorStop(0, 'rgba(0,255,136,0.18)');
    gradG.addColorStop(1, 'rgba(0,255,136,0)');
    const gradV = ctx.createLinearGradient(0, 0, 0, 200);
    gradV.addColorStop(0, 'rgba(0,212,255,0.3)');
    gradV.addColorStop(1, 'rgba(0,212,255,0)');
    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: filtered.map(d => d.date.slice(5)),
        datasets: [
          { type: 'line', label: 'Avg Price', data: filtered.map(d => d.avgPrice), borderColor: '#00ff88', borderWidth: 2, backgroundColor: gradG, fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#00ff88', yAxisID: 'y' },
          { type: 'bar', label: 'Volume', data: filtered.map(d => d.volume), backgroundColor: gradV, yAxisID: 'y2', borderRadius: 2 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0a0a10', borderColor: '#1a1a2e', borderWidth: 1, callbacks: { label: c => c.dataset.label === 'Avg Price' ? `Avg: ${c.raw} ETH` : `Vol: ${c.raw} ETH` } } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#3a3a5c', font: { size: 9 }, maxTicksLimit: 10 } },
          y: { position: 'left', grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#00ff88', font: { size: 9 }, callback: v => v.toFixed(3) } },
          y2: { position: 'right', grid: { display: false }, ticks: { color: 'var(--cyan)', font: { size: 9 }, callback: v => v.toFixed(2) } },
        }
      }
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  if (!data?.length) return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <SectionHeader dot="var(--green)" label="Price History — On-Chain" badge />
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No on-chain sales data yet</div>
    </div>
  );

  const allPrices = data.filter(d => d.avgPrice).map(d => d.avgPrice);
  const first = allPrices[0], last = allPrices[allPrices.length - 1];
  const trend = first > 0 ? ((last - first) / first * 100).toFixed(1) : null;
  const totalVol = data.reduce((s, d) => s + d.volume, 0);
  const totalSales = data.reduce((s, d) => s + d.sales, 0);

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <SectionHeader dot="var(--green)" label="Price History — On-Chain" badge tooltip="Real sale prices reconstructed from on-chain transfer data via Abscan. Not available on OpenSea." right={trend !== null ? `${trend >= 0 ? '▲' : '▼'} ${Math.abs(trend)}% 30d` : null} />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
          {[
            { label: 'Avg Price', value: allPrices.length ? allPrices[allPrices.length-1].toFixed(4) : '—', sub: 'ETH latest', color: 'var(--green)' },
            { label: '30d Volume', value: totalVol.toFixed(2), sub: 'ETH on-chain', color: 'var(--cyan)' },
            { label: '30d Sales', value: totalSales, sub: 'transfers', color: 'var(--yellow)' },
            { label: '30d Trend', value: trend !== null ? `${trend >= 0 ? '+' : ''}${trend}%` : '—', sub: 'price change', color: trend !== null && parseFloat(trend) >= 0 ? 'var(--green)' : '#ff4d4d' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 200 }}><canvas ref={canvasRef} /></div>
        <div style={{ marginTop: 10, fontSize: 9, color: 'var(--dim)', textAlign: 'right' }}>Green line = avg sale price · Blue bars = volume · Source: Abscan on-chain</div>
      </div>
    </div>
  );
}

function HolderDistribution({ holderTypes }) {
  if (!holderTypes) return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <SectionHeader dot="var(--cyan)" label="Holder Distribution" badge />
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading holder data...</div>
    </div>
  );
  const { diamonds = 0, flippers = 0, traders = 0, avgHoldDays = 0 } = holderTypes;
  const total = diamonds + flippers + traders;
  const types = [
    { key: 'diamonds', label: 'Diamond Hands', value: diamonds, color: 'var(--cyan)', icon: '◈', desc: 'Held 30d+, never sold', pct: total > 0 ? ((diamonds/total)*100).toFixed(1) : 0 },
    { key: 'traders',  label: 'Traders',       value: traders,  color: 'var(--yellow)', icon: '⇄', desc: '1-2 sales, moderate hold', pct: total > 0 ? ((traders/total)*100).toFixed(1) : 0 },
    { key: 'flippers', label: 'Flippers',      value: flippers, color: '#ff4d4d',       icon: '↻', desc: 'Fast resell or 3+ sales', pct: total > 0 ? ((flippers/total)*100).toFixed(1) : 0 },
  ];
  const sentiment = diamonds > flippers * 1.5 ? { label: 'STRONG HOLD', color: 'var(--cyan)' }
    : flippers > diamonds * 1.5 ? { label: 'HIGH TURNOVER', color: '#ff4d4d' }
    : { label: 'BALANCED', color: 'var(--yellow)' };
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <SectionHeader dot="var(--cyan)" label="Holder Distribution" badge tooltip="Classifies holders into Diamond Hands, Traders, Flippers based on on-chain behavior." right={`Avg hold: ${avgHoldDays}d`} />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Holder Sentiment</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: sentiment.color }}>{sentiment.label}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Total Classified</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--white)' }}>{total}</div>
          </div>
        </div>
        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 20, gap: 1 }}>
          {types.map(t => (
            <div key={t.key} style={{ width: `${t.pct}%`, background: t.color, transition: 'width 1s ease', minWidth: t.value > 0 ? 4 : 0 }} />
          ))}
        </div>
        {types.map(t => (
          <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 18, color: t.color, minWidth: 24, textAlign: 'center' }}>{t.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--white)', fontWeight: 600 }}>{t.label}</span>
                <span style={{ fontSize: 9, color: t.color, background: `${t.color}20`, border: `1px solid ${t.color}40`, borderRadius: 2, padding: '1px 6px' }}>{t.pct}%</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{t.desc}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, color: t.color }}>{t.value}</div>
              <div style={{ fontSize: 9, color: 'var(--dim)' }}>wallets</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WashTradingDetector({ washTrades, washScore, totalSales }) {
  const risk = washScore >= 20 ? { label: 'HIGH RISK', color: '#ff4d4d' } : washScore >= 8 ? { label: 'MODERATE', color: 'var(--yellow)' } : { label: 'CLEAN', color: 'var(--green)' };
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <SectionHeader dot={risk.color} label="Wash Trading Detector" badge tooltip="Detects back-and-forth trades between same wallets. Exclusive on-chain analysis." right={`${washTrades?.length || 0} suspicious txs`} />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Risk Level</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: risk.color }}>{risk.label}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 36, fontWeight: 700, color: risk.color }}>{washScore}<span style={{ fontSize: 13, color: 'var(--muted)' }}>/100</span></div>
            <div style={{ fontSize: 10, color: 'var(--dim)' }}>wash score</div>
          </div>
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: '100%', width: `${washScore}%`, background: washScore >= 20 ? '#ff4d4d' : washScore >= 8 ? 'var(--yellow)' : 'var(--green)', borderRadius: 3, transition: 'width 1s ease' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
          {[
            { label: 'Total Sales', value: totalSales || 0, color: 'var(--white)' },
            { label: 'Suspicious',  value: washTrades?.length || 0, color: risk.color },
            { label: 'Wash Rate',   value: totalSales > 0 ? `${((washTrades?.length||0)/totalSales*100).toFixed(1)}%` : '0%', color: risk.color },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
        {washTrades?.length > 0 && (
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Flagged Pairs</div>
            {washTrades.slice(0, 5).map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 9, color: '#ff4d4d', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.2)', borderRadius: 2, padding: '1px 5px', flexShrink: 0 }}>⚠ TOKEN #{w.tokenId}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                    <a href={`https://abscan.org/address/${w.walletA}`} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>{shortAddr(w.walletA)}</a>
                    <span style={{ color: 'var(--dim)' }}> ⇄ </span>
                    <a href={`https://abscan.org/address/${w.walletB}`} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>{shortAddr(w.walletB)}</a>
                  </div>
                </div>
                <span style={{ fontSize: 10, color: '#ff4d4d', fontFamily: 'var(--mono)', flexShrink: 0 }}>{w.count}x swap</span>
              </div>
            ))}
          </div>
        )}
        {!washTrades?.length && (
          <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: 'var(--green)' }}>✓ No wash trading patterns detected</div>
        )}
      </div>
    </div>
  );
}

function WalletProfiler({ contract }) {
  const [wallet, setWallet] = useState('');
  const [input, setInput] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function lookup() {
    const addr = input.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) { setError('Invalid address'); return; }
    setLoading(true); setError(null); setData(null); setWallet(addr);
    try {
      const r = await fetch(`${API_BASE}/walletpnl?contract=${contract}&wallet=${addr}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  const pnlColor = !data ? 'var(--white)' : data.realizedPnl > 0 ? 'var(--green)' : data.realizedPnl < 0 ? '#ff4d4d' : 'var(--muted)';

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <SectionHeader dot="var(--yellow)" label="Wallet Profiler" badge tooltip="Enter any wallet to see PnL, hold time and trade history on this collection." />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookup()}
            placeholder="0x... wallet address"
            style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border2)', borderRadius: 3, padding: '10px 14px', color: 'var(--white)', fontFamily: 'var(--mono)', fontSize: 12, outline: 'none' }}
            onFocus={e => e.target.style.borderColor = 'var(--yellow)'}
            onBlur={e => e.target.style.borderColor = 'var(--border2)'}
          />
          <button onClick={lookup} disabled={loading} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--yellow)', color: 'var(--yellow)', fontFamily: 'var(--mono)', fontSize: 11, cursor: loading ? 'wait' : 'pointer', borderRadius: 3, letterSpacing: 1, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            {loading ? 'Loading...' : 'Analyze →'}
          </button>
        </div>
        {error && <div style={{ padding: '12px 16px', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.2)', borderRadius: 3, color: '#ff4d4d', fontSize: 12, marginBottom: 16 }}>⚠ {error}</div>}
        {data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
              {[
                { label: 'Realized PnL', value: `${data.realizedPnl >= 0 ? '+' : ''}${data.realizedPnl} ETH`, color: pnlColor },
                { label: 'Total Spent',  value: `${data.totalSpent} ETH`, color: 'var(--muted)' },
                { label: 'Total Earned', value: `${data.totalEarned} ETH`, color: 'var(--cyan)' },
                { label: 'NFTs Owned',   value: data.nftsOwned, color: 'var(--white)' },
                { label: 'NFTs Sold',    value: data.nftsSold, color: 'var(--white)' },
                { label: 'Avg Hold',     value: `${data.avgHoldDays}d`, color: data.avgHoldDays > 30 ? 'var(--cyan)' : data.avgHoldDays > 7 ? 'var(--yellow)' : '#ff4d4d' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px' }}>
                  <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16, padding: '8px 14px', borderRadius: 3, background: data.avgHoldDays > 30 ? 'rgba(0,212,255,0.08)' : data.nftsSold > 3 ? 'rgba(255,77,77,0.08)' : 'rgba(255,200,0,0.08)', border: `1px solid ${data.avgHoldDays > 30 ? 'rgba(0,212,255,0.2)' : data.nftsSold > 3 ? 'rgba(255,77,77,0.2)' : 'rgba(255,200,0,0.2)'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{data.avgHoldDays > 30 ? '◈' : data.nftsSold > 3 ? '↻' : '⇄'}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--white)' }}>{data.avgHoldDays > 30 ? 'Diamond Hands' : data.nftsSold > 3 ? 'Flipper' : 'Active Trader'}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{data.nftsOwned} held · {data.nftsSold} sold · {data.avgHoldDays}d avg hold</div>
              </div>
              <a href={`https://abscan.org/address/${wallet}`} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--cyan)', textDecoration: 'none', flexShrink: 0 }}>View on Abscan ↗</a>
            </div>
            {data.trades?.length > 0 && (
              <>
                <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Recent Trades</div>
                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {data.trades.map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', minWidth: 60 }}>#{t.tokenId}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>Buy <span style={{ color: 'var(--white)', fontFamily: 'var(--mono)' }}>{t.buyPrice}</span> → Sell <span style={{ color: 'var(--white)', fontFamily: 'var(--mono)' }}>{t.sellPrice}</span> ETH</div>
                        <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 2 }}>held {t.holdDays}d</div>
                      </div>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12, color: t.pnl >= 0 ? 'var(--green)' : '#ff4d4d', flexShrink: 0 }}>{t.pnl >= 0 ? '+' : ''}{t.pnl} ETH</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        {!data && !loading && !error && (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--dim)', fontSize: 12 }}>Enter a wallet address to see PnL, hold time and trade history</div>
        )}
      </div>
    </div>
  );
}
export default function Collection() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const name = searchParams.get('name') || slug;

  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState([]);
  const [sales, setSales] = useState([]);
  const [holders, setHolders] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);
  const [loadingHolders, setLoadingHolders] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [sniperStatus, setSniperStatus] = useState('Initializing...');
  const [floor, setFloor] = useState(0);
  const [watched, setWatched] = useState(false);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const sniperInterval = useRef(null);
  const collectionConfig = COLLECTIONS.find(c => c.slug === slug);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('abstrack_watchlist') || '[]');
    setWatched(saved.some(c => c.slug === slug));
  }, [slug]);

  function toggleWatch() {
    const saved = JSON.parse(localStorage.getItem('abstrack_watchlist') || '[]');
    const updated = watched ? saved.filter(c => c.slug !== slug) : [...saved, { name, slug, chain: 'abstract' }];
    localStorage.setItem('abstrack_watchlist', JSON.stringify(updated));
    setWatched(!watched);
  }

  async function loadStats() {
    setLoadingStats(true);
    try {
      const r = await fetch(`${API_BASE}/stats?slug=${slug}`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      const f = d.total?.floor_price || 0;
      const numOwners = d.total?.num_owners || 0;
      const totalSupply = d.total?.total_supply || 0;
      const day = d.intervals?.find(i => i.interval === 'one_day') || {};
      setFloor(f);
      setStats({ floor: f, volume24h: day.volume||0, sales24h: day.sales||0, numOwners, totalSupply, score: computeScore(f, day.volume||0, day.sales||0, totalSupply, numOwners) });
      renderChart(f);
    } catch(e) { console.error(e); }
    setLoadingStats(false);
  }

  async function loadSales() {
    setLoadingSales(true);
    try {
      const r = await fetch(`${API_BASE}/events?slug=${slug}&limit=20`);
      if (r.ok) { const d = await r.json(); setSales(d.sales || []); }
    } catch(e) {}
    setLoadingSales(false);
  }

  async function loadHolders() {
    setLoadingHolders(true);
    try {
      if (!collectionConfig?.contract) { setLoadingHolders(false); return; }
      const r = await fetch(`${API_BASE}/holders?contract=${collectionConfig.contract}`);
      if (r.ok) { const d = await r.json(); setHolders(d); }
    } catch(e) {}
    setLoadingHolders(false);
  }

  async function loadAnalytics() {
    setLoadingAnalytics(true);
    try {
      if (!collectionConfig?.contract) { setLoadingAnalytics(false); return; }
      const r = await fetch(`${API_BASE}/analytics?contract=${collectionConfig.contract}`);
      if (r.ok) { const d = await r.json(); setAnalytics(d); }
    } catch(e) {}
    setLoadingAnalytics(false);
  }

  function renderChart(currentFloor) {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();
    const ctx = chartRef.current.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(0,255,136,0.15)');
    gradient.addColorStop(1, 'rgba(0,255,136,0)');
    const data = [0.82,0.88,0.85,0.91,0.94,0.97,1.0].map(v => parseFloat((currentFloor*v).toFixed(5)));
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: { labels: ['D-6','D-5','D-4','D-3','D-2','D-1','Now'], datasets: [{ label: 'Floor', data, borderColor: '#00ff88', borderWidth: 2, backgroundColor: gradient, fill: true, tension: 0.4, pointBackgroundColor: '#00ff88', pointBorderColor: '#050508', pointBorderWidth: 2, pointRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0a0a10', borderColor: '#1a1a2e', borderWidth: 1, bodyColor: '#00ff88', callbacks: { label: c => `${c.raw} ETH` } } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#3a3a5c', font: { size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#3a3a5c', font: { size: 10 }, callback: v => v.toFixed(4) } }
        }
      }
    });
  }

  async function loadSniper() {
    try {
      const r = await fetch(`${API_BASE}/listings?slug=${slug}`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      const items = (d.listings||[]).map(l => ({
        price: parseFloat(l.price?.current?.value||0)/1e18,
        tokenId: l.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria||'—',
        contractAddress: l.protocol_data?.parameters?.offer?.[0]?.token||'',
        image_url: l.image_url||null, name: l.name||null,
      }));
      items.sort((a,b) => a.price-b.price);
      setListings(items);
      setSniperStatus(`${new Date().toLocaleTimeString()} — ${items.length} listings`);
    } catch(e) { setSniperStatus(`Error — ${e.message}`); }
  }

  useEffect(() => {
    loadStats(); loadSales(); loadHolders(); loadAnalytics(); loadSniper();
    sniperInterval.current = setInterval(loadSniper, 15000);
    return () => { clearInterval(sniperInterval.current); if (chartInstance.current) chartInstance.current.destroy(); };
  }, [slug]);

  const avgSalePrices = sales.map(s => s.price).filter(p => p > 0);
  const avgSalePrice = avgSalePrices.length ? avgSalePrices.reduce((a,b)=>a+b,0)/avgSalePrices.length : 0;
  const avgVsFloor = floor > 0 && avgSalePrice > 0 ? ((avgSalePrice/floor-1)*100).toFixed(1) : null;
  const listingRatioPct = stats?.totalSupply > 0 ? (listings.length/stats.totalSupply*100).toFixed(1) : null;

  const statCards = [
    { label: 'Floor Price',      value: loadingStats?'—':stats?.floor.toFixed(4),  sub: 'ETH',            color: 'var(--white)',  tooltip: 'Lowest listed price on OpenSea.' },
    { label: '24h Volume',       value: loadingStats?'—':stats?.volume24h.toFixed(2), sub: 'ETH',          color: 'var(--cyan)',   tooltip: 'Total ETH traded in last 24h.' },
    { label: '24h Sales',        value: loadingStats?'—':stats?.sales24h,           sub: 'transactions',   color: 'var(--yellow)', tooltip: 'Completed sales in last 24h.' },
    { label: 'Avg Sale 24h',     value: !avgSalePrice?'—':avgSalePrice.toFixed(4),  sub: avgVsFloor!==null?`${avgVsFloor>=0?'+':''}${avgVsFloor}% vs floor`:'ETH', color: avgVsFloor!==null&&parseFloat(avgVsFloor)>=0?'var(--green)':'#ff4d4d', tooltip: 'Avg price of recent sales vs floor.' },
    { label: 'Listing Pressure', value: listingRatioPct!==null?`${listingRatioPct}%`:'—', sub: `${listings.length} listed`, color: listingRatioPct>15?'#ff4d4d':listingRatioPct>8?'var(--yellow)':'var(--green)', tooltip: 'Active listings vs total supply.' },
    { label: 'Holders',          value: loadingStats?'—':stats?.numOwners?.toLocaleString(), sub: `of ${stats?.totalSupply>0?stats.totalSupply.toLocaleString():'—'}`, color: 'var(--muted)', tooltip: 'Unique wallets holding at least 1 NFT.' },
    { label: 'Whales',           value: loadingHolders?'—':holders?.whaleCount??'—', sub: '5+ NFTs held', color: 'var(--green)',  tooltip: 'Wallets holding 5+ NFTs. On-chain data.' },
    { label: 'Score',            value: loadingStats?'—':stats?.score,              sub: 'algorithmic',    color: 'var(--green)',  tooltip: 'Floor×40% + Vol×30% + Sales×20% + Holders×10%.' },
  ];

  return (
    <Layout title="Collection Analytics">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Collection Analytics</div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 800, color: 'var(--white)', letterSpacing: '-1px' }}>{name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6 }}>
            <a href={`https://opensea.io/collection/${slug}`} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'none', fontSize: 11 }}>OpenSea ↗</a>
            {collectionConfig?.contract && <a href={`https://abscan.org/address/${collectionConfig.contract}`} target="_blank" rel="noreferrer" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 11 }}>Abscan ↗</a>}
          </div>
        </div>
        <button onClick={toggleWatch} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'transparent', border: `1px solid ${watched?'var(--cyan)':'var(--border2)'}`, color: watched?'var(--cyan)':'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer', borderRadius: 3, letterSpacing: 1, transition: 'all 0.15s' }}>
          {watched ? '★ Watchlisted' : '☆ Add to Watchlist'}
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'visible', marginBottom: 24 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{s.label}<Tooltip text={s.tooltip} /></div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: s.color }}>{s.value||'—'}</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Row 1: Chart + Sniper */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <SectionHeader dot="var(--green)" label="Floor Trend — 7 Days" tooltip="Estimated trend from current floor." />
          <div style={{ padding: 20, height: 240 }}><canvas ref={chartRef} /></div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <SectionHeader dot="var(--cyan)" label="Live Sniper" right={sniperStatus} />
          <div style={{ maxHeight: 290, overflowY: 'auto' }}>
            {listings.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No active listings</div>
            ) : listings.slice(0, 20).map((item, i) => {
              const isFloor = i === 0;
              const pct = floor > 0 && !isFloor ? ((item.price-floor)/floor*100).toFixed(1) : null;
              const url = item.contractAddress ? `https://opensea.io/assets/abstract/${item.contractAddress}/${item.tokenId}` : `https://opensea.io/collection/${slug}`;
              return (
                <a key={i} href={url} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border)', borderLeft: `2px solid ${isFloor?'var(--green)':'var(--border2)'}`, textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 3, overflow: 'hidden', background: 'var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.image_url ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12, color: 'var(--border2)' }}>◈</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name||`#${item.tokenId}`}</div>
                    <div style={{ fontSize: 9, color: isFloor?'var(--green)':'var(--muted)', marginTop: 1 }}>{isFloor?'◉ FLOOR':`+${pct}% vs floor`}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 11, color: isFloor?'var(--green)':'var(--white)' }}>{item.price.toFixed(4)}</div>
                    <div style={{ fontSize: 9, color: 'var(--dim)' }}>ETH</div>
                  </div>
                </a>
              );
            })}
          </div>
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', fontSize: 9, color: 'var(--dim)' }}>↻ Auto-refresh 15s · sorted by price</div>
        </div>
      </div>

      {/* Row 2: Market Health + Listing Spread */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <MarketHealth listingCount={listings.length} totalSupply={stats?.totalSupply||0} avgSalePrice={avgSalePrice} floor={floor} whaleCount={holders?.whaleCount||0} sales24h={stats?.sales24h||0} />
        <ListingSpread listings={listings} floor={floor} />
      </div>

      {/* Row 3: Recent Sales + Whale Tracker */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {loadingSales ? <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading sales...</div> : <RecentSales sales={sales} floor={floor} />}
        {loadingHolders ? <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading holders...</div> : <WhaleTracker owners={holders?.owners||[]} whaleCount={holders?.whaleCount||0} top10Pct={holders?.top10Pct||0} totalOwned={holders?.totalOwned||0} />}
      </div>

      {/* ── PREMIUM SECTION ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '32px 0 16px' }}>
        <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 9, color: 'var(--green)', letterSpacing: 3, textTransform: 'uppercase', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 2, padding: '3px 10px' }}>◈ Premium On-Chain Analytics</span>
        <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
      </div>

      {/* Row 4: Price History */}
      <div style={{ marginBottom: 16 }}>
        {loadingAnalytics ? <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading on-chain data...</div> : <PriceHistory data={analytics?.priceHistory} />}
      </div>

      {/* Row 5: Holder Distribution + Wash Trading */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {loadingAnalytics ? <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading...</div> : <HolderDistribution holderTypes={analytics?.holderTypes} />}
        {loadingAnalytics ? <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading...</div> : <WashTradingDetector washTrades={analytics?.washTrades} washScore={analytics?.washScore||0} totalSales={analytics?.totalSales||0} />}
      </div>

      {/* Row 6: Wallet Profiler */}
      {collectionConfig?.contract && <WalletProfiler contract={collectionConfig.contract} />}

    </Layout>
  );
}