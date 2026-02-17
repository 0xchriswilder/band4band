import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from './providers/WalletProvider';
import { FhevmProvider } from './providers/FhevmProvider';
import './index.css';
import App from './App';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <WalletProvider>
      <FhevmProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#FF8C00',
              color: '#fff',
            },
          }}
        />
      </FhevmProvider>
    </WalletProvider>
  </StrictMode>
);

