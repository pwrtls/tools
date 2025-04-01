import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

import { ConfigProvider, App } from 'antd';
import enUS from 'antd/es/locale/en_US';
import { StyleProvider } from '@ant-design/cssinjs';

import AppRouter from './AppRouter';

// Set up the root element
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Render the application
root.render(
  <React.StrictMode>
    <ConfigProvider locale={enUS}>
      <StyleProvider hashPriority="high">
        <App>
          <AppRouter />
        </App>
      </StyleProvider>
    </ConfigProvider>
  </React.StrictMode>
); 