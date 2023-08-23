import React, { useContext, useEffect, useState } from 'react';
import { Spin, Table } from 'antd';

import { IoDataResponse } from '../models/oDataResponse';
import { IWorkflow } from '../models/workflows';

import { workflowsColumns } from '../utils/columns';

import { PowerToolsContext } from '../powertools/context';
import { usePowerToolsApi } from '../powertools/apiHook';

export const WorkflowList: React.FC = () => {
    const { connectionName } = useContext(PowerToolsContext);
    const { get, isLoaded } = usePowerToolsApi();
    const [loading, setLoading] = useState(true);
    const [workflows, setWorkflows] = useState<IWorkflow[]>([]);

    useEffect(() => {
        setLoading(true);

        const loadWorkflows = async () => {
            const query = new URLSearchParams();
            query.set(`$select`, `name,category,primaryentity, status, createdon`);
            query.set(`$filter`, `(statecode eq 'Active')`);
            query.set(`$orderby`, `modifiedon desc`);

            const res = await window.PowerTools.get('/api/data/v9.0/workflows', query);
            const js = await res.asJson<IoDataResponse<IWorkflow>>();

            setWorkflows(js.value);
        }

        Promise.all([loadWorkflows()]).then(() => setLoading(false));
    }, [get, isLoaded, connectionName]);

    return (
        <Spin spinning={!isLoaded}>
            <Table
                columns={workflowsColumns}
                loading={loading}
                dataSource={workflows}
                rowKey="workflowid"
                pagination={{
                    hideOnSinglePage: true,
                    pageSize: 150,
                }}
            />
        </Spin>
    );
}
