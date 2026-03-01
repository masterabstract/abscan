import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AbstractWalletProvider } from '@abstract-foundation/agw-react';
import './index.css';
import App from './App.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <AbstractWalletProvider chain="abstract">
      <App />
    </AbstractWalletProvider>
  </QueryClientProvider>
);
