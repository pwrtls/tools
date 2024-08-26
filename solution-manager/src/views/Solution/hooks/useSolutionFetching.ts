import { useState, useCallback } from 'react';
import { message } from 'antd';
import { ISolution } from 'models/solutions';
import { IoDataResponse } from 'models/oDataResponse';

export const useSolutionFetching = (get: any) => {
    const [unmanagedSolutions, setUnmanagedSolutions] = useState<ISolution[]>([]);

    const fetchUnmanagedSolutions = useCallback(async () => {
        if (!get) {
            message.error('Fetch function is not available');
            return;
        }

        try {
            const query = new URLSearchParams({
                $select: 'friendlyname,uniquename,version,publisherid',
                $filter: '(isvisible eq true) and (ismanaged eq false)',
                $orderby: 'friendlyname asc'
            });

            const res = await get('api/data/v9.2/solutions', query);
            const js = await res.asJson() as IoDataResponse<ISolution>;

            if (js && Array.isArray(js.value)) {
                setUnmanagedSolutions(js.value);
            }
        } catch (error) {
            console.error('Failed to fetch unmanaged solutions:', error);
            message.error('Failed to fetch unmanaged solutions');
        }
    }, [get]);

    return { unmanagedSolutions, fetchUnmanagedSolutions };
};