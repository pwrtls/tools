// src/powertools/context/PowerToolsContext.tsx

import React, { createContext, useContext } from 'react';

const PowerToolsContext = createContext(window.PowerTools);

export const usePowerTools = () => {
    return useContext(PowerToolsContext);
};

interface Props {
    children: React.ReactNode;
}

export const PowerToolsProvider: React.FC<Props> = ({ children }) => {
    return (
        <PowerToolsContext.Provider value={window.PowerTools}>
            {children}
        </PowerToolsContext.Provider>
    );
};
