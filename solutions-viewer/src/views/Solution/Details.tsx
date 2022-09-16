import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spin } from 'antd';

import { usePowerToolsApi } from 'powertools/apiHook';

import { IoDataResponse } from 'models/oDataResponse';
import { ISolution } from 'models/solutions';

export const SolutionDetails: React.FC = () => {
    const { get } = usePowerToolsApi();
    const { solutionId } = useParams();
    const [ isLoading, setLoading ] = useState(true);
    const [ data, setData ] = useState<ISolution | undefined>();

    useEffect(() => {
        if (!get) {
            return;
        }

        const loadSolution = async () => {
            const query = new URLSearchParams();
            query.set(`$expand`, `publisherid`);
            query.set(`$filter`, `(solutionid eq ${ solutionId })`);

            const res = await window.PowerTools.get('/api/data/v9.0/solutions', query);
            const js = await res.asJson<IoDataResponse<ISolution>>();

            console.log('resulting json:', js);
            console.log('resulting array:', js.value);

            if (!js || !Array.isArray(js.value)) {
                return;
            }

            if (js.value.length !== 1) {
                return;
            }

            setData(js.value[0]);
        };

        loadSolution().then(() => setLoading(false));
    }, [get, solutionId]);

    return (
        <Spin spinning={isLoading}>
            <p>hi { solutionId }</p>

            { data?.friendlyname || '' }
        </Spin>
    );
}
