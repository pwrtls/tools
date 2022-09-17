import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

import { usePowerToolsApi } from 'powertools/apiHook';
import { getSolutionComponentColumns } from 'utils/columns';

import { IoDataResponse } from 'models/oDataResponse';
import { ISolutionComponentSummary } from 'models/solutionComponentSummary';

export const ComponentsTable: React.FC<{ solutionId?: string }> = (props) => {
    const { get } = usePowerToolsApi();
    const [ isLoadingComponents, setLoadingComponents ] = useState(true);
    const [ components, setComponents ] = useState<ISolutionComponentSummary[]>([]);

    useEffect(() => {
        if (!get || !props.solutionId) {
            return;
        }

        const loadSolutionComponents = async () => {
            setLoadingComponents(true);

            const query = new URLSearchParams();
            query.set(`$filter`, `(msdyn_solutionid eq ${ props.solutionId })`);
            query.set(`$orderby`, `msdyn_name asc`);

            const res = await window.PowerTools.get('/api/data/v9.0/msdyn_solutioncomponentsummaries', query);
            const js = await res.asJson<IoDataResponse<ISolutionComponentSummary>>();

            if (!js || !Array.isArray(js.value)) {
                return;
            }

            console.log(js);
            setComponents(js.value);
        };

        loadSolutionComponents().then(() => setLoadingComponents(false));
    }, [get, props.solutionId]);

    return (
        <Table<ISolutionComponentSummary>
            loading={isLoadingComponents}
            columns={getSolutionComponentColumns(props.solutionId)}
            dataSource={components}
            rowKey="msdyn_objectid"
            pagination={{
                hideOnSinglePage: true,
            }}
        />
    );
}
