import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Collection from './pages/Collection';
import Submit from './pages/Submit';
import Watchlist from './pages/Watchlist';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/collection/:slug" element={<Collection />} />
        <Route path="/submit" element={<Submit />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}