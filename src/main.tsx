import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for Progressive Web Desktop App
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New Mandi Software update available.');
  },
  onOfflineReady() {
    console.log('Mandi Software ready for offline desktop usage.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
