import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryBuilder } from './views/QueryBuilder';

export const AppRouter: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<QueryBuilder />} />
            </Routes>
        </Router>
    );
}; 