import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import { PowerToolsContextProvider } from './powertools/context/PowerToolsContext'; // Update the path accordingly

import QueryBuilder from './components/QueryBuilder/QueryBuilder';

export const App: React.FC = () => (
  <PowerToolsContextProvider showNoConnection>
      <HashRouter>
          <Routes>
              <Route path="/" element={<QueryBuilder />} />
          </Routes>
      </HashRouter>
  </PowerToolsContextProvider>
);
