import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely register service worker for Progressive Web App only in production environments
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      try {
        registerSW({
          immediate: true,
          onNeedRefresh() {
            console.log('New Mandi Software update available.');
          },
          onOfflineReady() {
            console.log('Mandi Software ready for offline desktop usage.');
          },
        });
      } catch (err) {
        console.warn('SW registration skipped:', err);
      }
    })
    .catch(() => {
      // Ignore if virtual:pwa-register is unavailable
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
