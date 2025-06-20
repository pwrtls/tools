import { useState, useEffect, useContext, useMemo } from 'react';
import { IView } from '../models/view';
import { getViews } from '../api/viewService';
import { PowerToolsContext } from '../powertools/context';

export const useViews = () => {
    const powerTools = useContext(PowerToolsContext);
    const [views, setViews] = useState<IView[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (powerTools.isLoaded) {
            setLoading(true);
            getViews(powerTools, 'systemuser')
                .then(setViews)
                .catch(error => {
                    if (process.env.NODE_ENV === 'development') {
                        console.error('Failed to load views:', error);
                    }
                    setViews([]);
                })
                .finally(() => setLoading(false));
        }
    }, [powerTools]);

    const groupedViews = useMemo(() => {
        const personal = views.filter(v => v.type === 'personal');
        const system = views.filter(v => v.type === 'system');
        return { personal, system };
    }, [views]);

    return { views, groupedViews, loading };
}; 