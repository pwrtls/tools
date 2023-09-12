// src/powertools/hooks/useFetchEntities.ts

import { useState, useEffect } from 'react';
import { usePowerTools } from '../context/PowerToolsContext';

const useFetchEntities = () => {
    const powerTools = usePowerTools();
    const [entities, setEntities] = useState([]);

    useEffect(() => {
        powerTools.get('/entities').then(data => {
            setEntities(data);
        });
    }, [powerTools]);

    return entities;
};

export default useFetchEntities;
