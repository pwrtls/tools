import React, { useContext, useEffect, useState, useMemo } from 'react';
import { Spin, Table, message } from 'antd';

import { IoDataResponse } from 'models/oDataResponse';
import { ISolution } from 'models/solutions';
import { usePowerToolsApi } from 'powertools/apiHook';

import { solutionsColumns } from 'utils/columns';

import { PowerToolsContext } from 'powertools/context';
import { useNavigate } from 'react-router-dom';

// Define constants for better clarity and maintainability
const PAGE_SIZE = 150;
const API_ENDPOINT = 'api/data/v9.0/solutions';

export const SolutionsView: React.FC = () => {
    const { get } = usePowerToolsApi();
    const { connectionName } = useContext(PowerToolsContext);
    const [loading, setLoading] = useState(true);
    const [solutions, setSolutions] = useState<ISolution[]>([]);

    const loadSolutions = async (): Promise<void> => {
        const query = new URLSearchParams();
        query.set('$select', 'friendlyname,uniquename,version,ismanaged,modifiedon');
        query.set('$expand', 'publisherid');
        query.set('$filter', '(isvisible eq true)');
        query.set('$orderby', 'modifiedon desc');

        try {
            const response = await window.PowerTools.get(`${API_ENDPOINT}?${query.toString()}`);
            const data = await response.asJson<IoDataResponse<ISolution>>();
            setSolutions(data.value);
        } catch (error) {
            console.error("Error fetching solutions:", error);
            throw error;
        }
    };

    useEffect(() => {
        if (!get) return;

        setLoading(true);
        loadSolutions()
            .then(() => setLoading(false))
            .catch((error: Error) => {
                console.error("Error fetching solutions:", error);
                setLoading(false);
                message.error('Failed to load solutions');
            });
    }, [get, connectionName]);

    const navigate = useNavigate();

    const onViewClick = (solutionId: string): void => {
        navigate(`/${solutionId}`);
    };

    const memoizedSolutions = useMemo(() => solutions, [solutions]);

    return (
        <Spin spinning={loading}>
            <Table
                columns={solutionsColumns}
                loading={loading}
                dataSource={memoizedSolutions}
                rowKey="solutionid"
                onRow={(record) => ({
                    onClick: () => onViewClick(record.solutionid),
                })}
                rowClassName={() => 'pointer-cursor'}  // Added this line for the cursor change
                pagination={{
                    hideOnSinglePage: true,
                    pageSize: PAGE_SIZE,
                }}
            />
        </Spin>
    );
};