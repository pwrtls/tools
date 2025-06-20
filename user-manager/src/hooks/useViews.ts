import { useState, useEffect, useContext, useMemo } from 'react';
import { IView } from '../models/view';
import { getViewsForEntity } from '../api/viewService';
import { PowerToolsContext } from '../powertools/context';

export const useViews = () => {
    const powerTools = useContext(PowerToolsContext);
    const [views, setViews] = useState<IView[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (powerTools.isLoaded) {
            setLoading(true);
            getViewsForEntity(powerTools, 'systemuser')
                .then(setViews)
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