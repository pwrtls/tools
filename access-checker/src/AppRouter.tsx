import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

import { PowerToolsContextProvider } from 'powertools/context';
import { MainView } from 'views/MainView';

import './App.css';

export const AppRouter: React.FC = () => (
    <PowerToolsContextProvider showNoConnection>
        <HashRouter basename={document.location.pathname}>
            <Routes>
                <Route path="" element={<MainView />} />
            </Routes>
        </HashRouter>
    </PowerToolsContextProvider>
);
