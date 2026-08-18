import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Força atualização imediata do PWA sem reter cache antigo
registerSW({ immediate: true })

import { GoogleOAuthProvider } from '@react-oauth/google'

// PWA Install Logic Global Handler
window.deferredPrompt = null;
window.isAppInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e;
  window.dispatchEvent(new CustomEvent('pwa-prompt-ready', { detail: e }));
});

window.addEventListener('appinstalled', () => {
  window.deferredPrompt = null;
  window.isAppInstalled = true;
  window.dispatchEvent(new CustomEvent('pwa-installed'));
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1234567890-mockclientid.apps.googleusercontent.com';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)
