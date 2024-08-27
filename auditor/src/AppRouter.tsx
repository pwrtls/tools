import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

import { PowerToolsContextProvider } from 'powertools/context';

import { MainView } from 'views/MainView';
import { AuditView } from 'views/AuditView';
import { AuditDetailView } from 'views/AuditDetailView';

import './App.css';

export const AppRouter: React.FC = () => (
    <PowerToolsContextProvider showNoConnection>
        <HashRouter>
            <Routes>
                <Route path="/" element={<MainView />}>
                    <Route index element={<AuditView />} />
                    <Route path="audit/:auditId" element={<AuditDetailView />} />
                </Route>
            </Routes>
        </HashRouter>
    </PowerToolsContextProvider>
);