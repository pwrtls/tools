import React from 'react';
import ReactDOM from 'react-dom/client';

import { ConfigProvider, App as AntApp } from 'antd';
import enUS from 'antd/es/locale/en_US';
import { StyleProvider } from '@ant-design/cssinjs';

import { AppRouter } from './AppRouter';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
    <React.StrictMode>
        <ConfigProvider locale={enUS}>
            <StyleProvider hashPriority="high">
                <AntApp>
                    <AppRouter />
                </AntApp>
            </StyleProvider>
        </ConfigProvider>
    </React.StrictMode>
);