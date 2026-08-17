import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { startPendingOrderSync } from './firebase/payment';
import { startPendingAdminSync } from './firebase/offlineAdminSync';

startPendingOrderSync();
startPendingAdminSync();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
