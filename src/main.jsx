import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

function startBackgroundSync() {
  const path = window.location.pathname || '';
  if (path.startsWith('/admin')) {
    import('./firebase/offlineAdminSync').then((mod) => mod.startPendingAdminSync());
  }

  import('./utils/offlineOrderQueue').then(async ({ getPendingOrders }) => {
    try {
      const pending = await getPendingOrders();
      if (!pending.length) return;
      const { startPendingOrderSync } = await import('./firebase/payment');
      startPendingOrderSync();
    } catch {
      // IndexedDB unavailable — skip until checkout queues an order
    }
  });
}

const scheduleIdle = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 2500));
scheduleIdle(startBackgroundSync, { timeout: 4000 });
