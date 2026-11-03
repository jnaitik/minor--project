// ============================================================================
// main.tsx — Application entry point
// ============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useCircuitStore } from './store/circuitStore';
import { useUIStore } from './store/uiStore';

// Expose stores for browser verification and diagnostics
if (typeof window !== 'undefined') {
  (window as any).__circuitStore = useCircuitStore;
  (window as any).__uiStore = useUIStore;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
