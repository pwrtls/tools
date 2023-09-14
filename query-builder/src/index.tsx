import React from 'react';
import ReactDOM from 'react-dom/client';

import { ConfigProvider } from 'antd';
import enUS from 'antd/es/locale/en_US';

import './index.css';

import { App } from './App';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
    <React.StrictMode>
        <ConfigProvider locale={enUS}>
            <App />
        </ConfigProvider>
    </React.StrictMode>
);
