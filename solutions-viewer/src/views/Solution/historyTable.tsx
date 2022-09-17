import React, { useEffect, useState } from 'react';
import { Empty, Table } from 'antd';

import { usePowerToolsApi } from 'powertools/apiHook';
import { solutionHistoryColumns } from 'utils/columns';

import { IoDataResponse } from 'models/oDataResponse';

export const HistoryTable: React.FC<{ solutionId?: string }> = (props) => {
    const { get } = usePowerToolsApi();
    const [ isLoadingHistories, setLoadingHistories ] = useState(true);
    const [ histories, setHistories ] = useState<any[]>([]);

    useEffect(() => {
        if (!get || !props.solutionId) {
            return;
        }

        const loadSolutionHistorys = async () => {
            setLoadingHistories(true);

            const query = new URLSearchParams();
            query.set(`$filter`, `(solutionid eq ${ props.solutionId })`);

            const headers: IHeaders = {
                Prefer: `odata.include-annotations=OData.Community.Display.V1.FormattedValue`,
            };

            const res = await window.PowerTools.get('/api/data/v9.0/solutionhistories', query, headers);
            const js = await res.asJson<IoDataResponse>();

            console.log(js);
            setHistories(js.value);
        };

        loadSolutionHistorys().then(() => setLoadingHistories(false));
    }, [get, props.solutionId]);

    return (
        <Table
            loading={isLoadingHistories}
            columns={solutionHistoryColumns}
            dataSource={histories}
            rowKey="activityid"
            pagination={{
                hideOnSinglePage: true,
            }}
            locale={{
                emptyText: <Empty description="Solution has no history" />,
            }}
        />
    );
}
