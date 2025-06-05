import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DataflowsView } from './views/DataflowsView';

export const AppRouter: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<DataflowsView />} />
                <Route path="*" element={<DataflowsView />} />
            </Routes>
        </Router>
    );
}; 