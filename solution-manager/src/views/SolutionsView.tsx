import React, { useContext, useEffect, useState } from 'react';
import { Spin, Table } from 'antd';

import { IoDataResponse } from 'models/oDataResponse';
import { ISolution } from 'models/solutions';
import { usePowerToolsApi } from 'powertools/apiHook';

import { solutionsColumns } from 'utils/columns';

import { PowerToolsContext } from 'powertools/context';
import { useNavigate } from 'react-router-dom';

// Define constants for better clarity and maintainability
const PAGE_SIZE = 150;
const API_ENDPOINT = '/api/data/v9.0/solutions';

export const SolutionsView: React.FC = () => {
    const { get } = usePowerToolsApi();
    const { connectionName } = useContext(PowerToolsContext);
    const [loading, setLoading] = useState(true);
    const [solutions, setSolutions] = useState<ISolution[]>([]);

    useEffect(() => {
        setLoading(true);
        if (!get) {
            return;
        }

        const loadSolutions = () => {
            const query = new URLSearchParams();
            query.set('$select', 'friendlyname,uniquename,version,ismanaged,modifiedon');
            query.set('$expand', 'publisherid');
            query.set('$filter', '(isvisible eq true)');
            query.set('$orderby', 'modifiedon desc');

            return get(`${API_ENDPOINT}?${query.toString()}`)
                .then(res => res.asJson<IoDataResponse<ISolution>>())
                .then(js => setSolutions(js.value))
                .catch(error => {
                    console.error("Error fetching solutions:", error);
                    // Handle the error appropriately, e.g., show a notification or set an error state
                });
        };

        loadSolutions().then(() => setLoading(false));
    }, [connectionName]);

    const navigate = useNavigate();

    const onViewClick = (solutionId: string): void => {
        navigate(`/${solutionId}`);
    };

    return (
        <Spin spinning={loading}>
            <Table
                columns={solutionsColumns}
                loading={loading}
                dataSource={solutions}
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