import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { AppRouter } from './AppRouter';
import { PowerToolsContextProvider } from './powertools/context';
import { ErrorBoundary } from './components/ErrorBoundary';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <PowerToolsContextProvider>
        <ErrorBoundary>
          <AppRouter />
        </ErrorBoundary>
      </PowerToolsContextProvider>
    </ErrorBoundary>
  </React.StrictMode>
);