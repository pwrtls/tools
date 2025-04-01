import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App';
import './index.css';
import reportWebVitals from './reportWebVitals';

// Use mock PowerTools in development for local testing
// Set this to true to enable mock PowerTools for local testing
const ENABLE_MOCK = false;

if (ENABLE_MOCK && process.env.NODE_ENV === 'development') {
  console.log('Enabling mock PowerTools for development');
  import('./utils/mockPowerTools').then(module => {
    module.setupMockPowerTools();
    renderApp();
  });
} else {
  renderApp();
}

// Debug PowerTools availability
console.log('Index.tsx loaded');
console.log('PowerTools available:', typeof window.PowerTools !== 'undefined');
if (typeof window.PowerTools !== 'undefined') {
  console.log('PowerTools methods:', Object.keys(window.PowerTools));
  console.log('PowerTools version:', window.PowerTools.version);
  try {
    console.log('PowerTools isLoaded:', window.PowerTools.isLoaded());
  } catch (e) {
    console.error('Error calling PowerTools.isLoaded():', e);
  }
}

function renderApp() {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  root.render(
    <React.StrictMode>
      <ConfigProvider>
        <App />
      </ConfigProvider>
    </React.StrictMode>
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
reportWebVitals(); 