import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

import { PowerToolsContextProvider } from 'powertools/context';

import AuditLogView from 'views/AuditLogView';
import AuditDetailsView from 'views/AuditDetailsView';

import './App.css';

const AppRouter: React.FC = () => (
    <PowerToolsContextProvider showNoConnection>
        <HashRouter>
            <Routes>
                <Route path="/audit-details/:auditId" element={<AuditDetailsView />} />
                <Route path="/" element={<AuditLogView />} />
            </Routes>
        </HashRouter>
    </PowerToolsContextProvider>
);

export default AppRouter; 