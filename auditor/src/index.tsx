import React from 'react';
import ReactDOM from 'react-dom/client';

import { ConfigProvider } from 'antd';
import enUS from 'antd/es/locale/en_US';

import './index.css';

import { AppRouter } from './AppRouter';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
    <React.StrictMode>
        <ConfigProvider locale={enUS}>
            <AppRouter />
        </ConfigProvider>
    </React.StrictMode>
);
