import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { SystemUsersView } from './views/SystemUsersView';

export class AppRouter extends React.PureComponent {
    render() {
        return (
            <HashRouter>
                <Routes>
                    <Route path="/" element={<SystemUsersView />} />
                </Routes>
            </HashRouter>
        );
    }
}
