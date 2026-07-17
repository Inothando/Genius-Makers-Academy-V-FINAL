import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

window.onerror = function (msg, url, lineNo, columnNo, error) {
  if (msg === 'Script error.' || String(msg).includes('Script error.')) {
    return true;
  }
  return false;
};

// Register global error interceptors
window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  if (msg && (
    msg.includes("measure' on 'Performance'") || 
    msg.includes("Data cannot be cloned") || 
    msg.includes("should not already be working") || 
    msg.includes("Should not already be working") ||
    msg === "Script error."
  )) {
    event.preventDefault();
    event.stopPropagation();
    console.warn("Resilience Interceptor: Muted iframe telemetry/scheduler warning:", msg);
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const msg = event?.reason?.message || event?.reason || '';
  const msgStr = typeof msg === 'string' ? msg : String(msg);
  if (msgStr && (
    msgStr.includes("measure' on 'Performance'") || 
    msgStr.includes("Data cannot be cloned") || 
    msgStr.includes("should not already be working") || 
    msgStr.includes("Should not already be working")
  )) {
    event.preventDefault();
    event.stopPropagation();
    console.warn("Resilience Interceptor: Muted iframe telemetry/scheduler rejection:", msgStr);
  }
}, true);

// Register service worker
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
