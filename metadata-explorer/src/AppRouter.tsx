import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

import { PowerToolsContextProvider } from 'powertools/context';

import EntityListView from 'views/EntityListView';
import EntityDetailView from 'views/EntityDetailView';
import OptionSetListView from 'views/OptionSetListView';
import RelationshipListView from 'views/RelationshipListView';

import './App.css';

const AppRouter: React.FC = () => (
    <PowerToolsContextProvider showNoConnection>
        <HashRouter>
            <Routes>
                <Route path="/entities/:entityId" element={<EntityDetailView />} />
                <Route path="/option-sets" element={<OptionSetListView />} />
                <Route path="/relationships" element={<RelationshipListView />} />
                <Route path="/" element={<EntityListView />} />
            </Routes>
        </HashRouter>
    </PowerToolsContextProvider>
);

export default AppRouter; 