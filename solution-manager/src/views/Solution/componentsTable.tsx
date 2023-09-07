import React, { useEffect, useState } from 'react';
import { Button, Table } from 'antd';

import { usePowerToolsApi } from 'powertools/apiHook';
import { getSolutionComponentColumns } from 'utils/columns';

import { IoDataResponse } from 'models/oDataResponse';
import { ISolutionComponentSummary } from 'models/solutionComponentSummary';


export const ComponentsTable: React.FC<{ solutionId?: string }> = (props) => {
    const { get } = usePowerToolsApi();
    const [ isLoadingComponents, setLoadingComponents ] = useState(true);
    const [ isLoadingMore, setLoadingMore ] = useState(false);
    const [ skipToken, setSkipToken ] = useState('');
    const [ components, setComponents ] = useState<ISolutionComponentSummary[]>([]);

    const loadSolutionComponents = async (skipTokenValue?: string) => {
        if (!get) {
            return;
        }

        const query = new URLSearchParams();
        query.set(`$filter`, `(msdyn_solutionid eq ${ props.solutionId })`);
        query.set(`$orderby`, `msdyn_name asc`);

        if (skipTokenValue) {
            query.set('$skiptoken', skipTokenValue);
        }

        const res = await get('/api/data/v9.0/msdyn_solutioncomponentsummaries', query);
        const js = await res.asJson<IoDataResponse<ISolutionComponentSummary>>();

        if (!js || !Array.isArray(js.value)) {
            return;
        }

        const paginationToken = await res.getSkipToken();
        setSkipToken(paginationToken);

        console.log(js);
        setComponents(js.value);
    };

    useEffect(() => {
        if (!get || !props.solutionId) {
            return;
        }

        setLoadingComponents(true);

        loadSolutionComponents().then(() => setLoadingComponents(false));

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [get, props.solutionId]);

    const loadMore = () => {
        setLoadingMore(true);

        Promise.all([loadSolutionComponents(skipToken)]).then(() => setLoadingMore(false));
    };

    const footer = (data: readonly ISolutionComponentSummary[]) => {
        if (!Array.isArray(data) || data.length === 0 || !skipToken || isLoadingComponents) {
            return null;
        }

        return (
            <Button onClick={loadMore} disabled={isLoadingMore} loading={isLoadingMore}>Load more</Button>
        );
    };

      const [visible, setVisible] = useState (false);
      const [record, setRecord] = useState (null);
      

    return (
        <Table<ISolutionComponentSummary>
            loading={isLoadingComponents}
            columns={getSolutionComponentColumns(props.solutionId)}
            dataSource={components}
            rowKey="msdyn_objectid"
            pagination={false}
            footer={footer}
        />
    );
}
