import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Collection from './pages/Collection';
import Submit from './pages/Submit';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/collection/:slug" element={<Collection />} />
        <Route path="/submit" element={<Submit />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}