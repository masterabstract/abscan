import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initToast } from './lib/toast.js';

import Nav          from './components/Nav.jsx';
import WalletModal  from './components/WalletModal.jsx';
import PageHome       from './components/PageHome.jsx';
import PageDashboard  from './components/PageDashboard.jsx';
import PageWatchlist  from './components/PageWatchlist.jsx';
import PageWallet     from './components/PageWallet.jsx';
import PageCollection from './components/PageCollection.jsx';
import PageSubmit     from './components/PageSubmit.jsx';

// ─── Contexts ─────────────────────────────────────────────────────────────────

export const WalletContext = createContext(null);
export const useWallet = () => useContext(WalletContext);

// ─── Toast component ──────────────────────────────────────────────────────────

function ToastContainer({ toasts }) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.type}`} role="alert">
          <span className="toast__icon">
            {t.type === 'success' && <IconCheck />}
            {t.type === 'error'   && <IconX />}
            {t.type === 'info'    && <IconInfo />}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Init toast system
  useEffect(() => {
    initToast(setToasts);
  }, []);

  // Restore wallet from session
  useEffect(() => {
    const saved = sessionStorage.getItem('abstrack_wallet');
    if (saved) setWalletAddress(saved);
  }, []);

  function connectWallet(address) {
    setWalletAddress(address);
    sessionStorage.setItem('abstrack_wallet', address);
    setWalletModalOpen(false);
  }

  function disconnectWallet() {
    setWalletAddress(null);
    sessionStorage.removeItem('abstrack_wallet');
  }

  const walletCtx = {
    address: walletAddress,
    connected: !!walletAddress,
    connect: () => setWalletModalOpen(true),
    disconnect: disconnectWallet,
  };

  return (
    <WalletContext.Provider value={walletCtx}>
      <BrowserRouter>
        <div className="app">
          <Nav onConnectWallet={() => setWalletModalOpen(true)} />

          <main className="page">
            <Routes>
              <Route path="/"                    element={<PageHome />} />
              <Route path="/dashboard"           element={<PageDashboard />} />
              <Route path="/watchlist"           element={<PageWatchlist />} />
              <Route path="/wallet"              element={<PageWallet />} />
              <Route path="/wallet/:address"     element={<PageWallet />} />
              <Route path="/collection/:slug"    element={<PageCollection />} />
              <Route path="/submit"              element={<PageSubmit />} />
              <Route path="*"                    element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {walletModalOpen && (
            <WalletModal
              onConnect={connectWallet}
              onClose={() => setWalletModalOpen(false)}
            />
          )}

          <ToastContainer toasts={toasts} />
        </div>
      </BrowserRouter>
    </WalletContext.Provider>
  );
}

// ─── Inline SVG icons ────────────────────────────────────────────────────────

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{display:'block'}}>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{display:'block'}}>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{display:'block'}}>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 7v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="currentColor"/>
    </svg>
  );
}
