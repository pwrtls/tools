import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

import { PowerToolsContextProvider } from 'powertools/context';

import { MainView } from 'views/MainView';
import { SolutionsView } from 'views/SolutionsView';
import { SolutionDetails } from 'views/Solution/Details';

import './App.css';

export const AppRouter: React.FC = () => (
    <PowerToolsContextProvider showNoConnection>
        <HashRouter>
            <Routes>
                <Route path="/" element={<MainView />}>
                    <Route index element={<SolutionsView />} />
                    <Route path="/:solutionId" element={<SolutionDetails />} />
                </Route>
            </Routes>
        </HashRouter>
    </PowerToolsContextProvider>
);
