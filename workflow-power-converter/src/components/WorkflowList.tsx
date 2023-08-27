import React, { useContext, useEffect, useState } from 'react';
import { Spin, Table, Alert, Input } from 'antd';

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
    const [filteredWorkflows, setFilteredWorkflows] = useState<IWorkflow[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);

        const loadWorkflows = async () => {
            try {
                const query = new URLSearchParams();
                const res = await window.PowerTools.get('/api/data/v9.0/workflows', query);
                const js = await res.asJson<IoDataResponse<IWorkflow>>();
                setWorkflows(js.value);
                setFilteredWorkflows(js.value);
                setError(null); // Clear any previous errors
            } catch (e) {
                console.error("Failed to load workflows:", e);
                setError("Failed to load workflows. Please try again later.");
            }
        };

        Promise.all([loadWorkflows()]).then(() => setLoading(false));
    }, [get, isLoaded, connectionName]);

    useEffect(() => {
        if (searchTerm) {
            const filtered = workflows.filter(workflow => 
                workflow.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredWorkflows(filtered);
        } else {
            setFilteredWorkflows(workflows);
        }
    }, [searchTerm, workflows]);

    const rowSelection = {
        selectedRowKeys,
        onChange: (selectedKeys: React.Key[]) => {
            setSelectedRowKeys(selectedKeys);
        },
    };

    return (
        <div>
            {error && <Alert message={error} type="error" />}
            <Input 
                placeholder="Search Workflows" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ marginBottom: '20px' }}
            />
            <Spin spinning={!isLoaded}>
                <Table
                    rowSelection={rowSelection}
                    columns={workflowsColumns}
                    loading={loading}
                    dataSource={filteredWorkflows}
                    rowKey="workflowid"
                    pagination={{
                        hideOnSinglePage: true,
                        pageSize: 5,
                    }}
                />
            </Spin>
        </div>
    );
};
