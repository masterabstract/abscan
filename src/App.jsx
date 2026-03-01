import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Connect from './pages/Connect';
import Dashboard from './pages/Dashboard';
import Collection from './pages/Collection';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/connect" element={<Connect />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/collection/:slug" element={<Collection />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}