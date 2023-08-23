import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

import { PowerToolsContextProvider } from './powertools/context';

import { MainView } from './views/MainView';
import { WorkflowList } from './components/WorkflowList';
import { WorkflowConversion } from './components/WorkflowConversion';

import './App.css';

export const AppRouter: React.FC = () => (
    <PowerToolsContextProvider showNoConnection>
        <HashRouter>
            <Routes>
                <Route path="/" element={<MainView />}>
                    <Route index element={<WorkflowList />} />
                    <Route path="/conversion" element={<WorkflowConversion />} />
                    {/* Add more routes as needed for other components */}
                </Route>
            </Routes>
        </HashRouter>
    </PowerToolsContextProvider>
);