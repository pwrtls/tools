import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

export const MainView: React.FC = () => {
    const location = useLocation();

    useEffect(() => {
        console.log(location);
    }, [location]);

    return (
        <Outlet />
    );
}
