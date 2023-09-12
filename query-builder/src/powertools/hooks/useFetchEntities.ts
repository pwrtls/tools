// src/powertools/hooks/useFetchEntities.ts

import { useState, useEffect } from 'react';
import { usePowerToolsApi } from './usePowerToolsApi';

export const useFetchEntities = () => {
    const powerTools = usePowerToolsApi();
    const [entities, setEntities] = useState<IHttpResult[]>([]);

    useEffect(() => {
        if (powerTools.get) {
            powerTools.get('/api/data/v9.2/entities').then((data: IHttpResult | IHttpResult[]) => {
                // todo: update this to get array from response
                if (Array.isArray(data)) {
                    setEntities(data);
                } else {
                    setEntities([data]);
                }
            });
        }
    }, [powerTools]);

    return entities;
}