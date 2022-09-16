import React, { useContext, useEffect, useState } from 'react';
import { Spin, Table } from 'antd';

import { IoDataResponse } from 'models/oDataResponse';
import { ISolution } from 'models/solutions';

import { solutionsColumns } from 'utils/columns';

import { PowerToolsContext } from 'powertools/context';
import { usePowerToolsApi } from 'powertools/apiHook';

export const SolutionsView: React.FC = () => {
    const { connectionName } = useContext(PowerToolsContext);
    const { get, isLoaded } = usePowerToolsApi();
    const [ loading, setLoading ] = useState(true);
    const [ solutions, setSolutions ] = useState<ISolution[]>([]);

    useEffect(() => {
        setLoading(true);

        const loadSolutions = async () => {
            const query = new URLSearchParams();
            query.set(`$select`, `friendlyname,uniquename,version,ismanaged,modifiedon`);
            query.set(`$expand`, `publisherid`);
            query.set(`$filter`, `(isvisible eq true)`);
            query.set(`$orderby`, `modifiedon desc`);

            const res = await window.PowerTools.get('/api/data/v9.0/solutions', query); //view history: /api/data/v9.0/solutionhistories
            const js = await res.asJson<IoDataResponse<ISolution>>();

            console.log(js.value);
            setSolutions(js.value);
        }

        Promise.all([loadSolutions()]).then(() => setLoading(false));
    }, [get, isLoaded, connectionName]);

    return (
        <Spin spinning={!isLoaded}>
            <Table
                columns={solutionsColumns}
                loading={loading}
                dataSource={solutions}
                rowKey="solutionid"
                pagination={{
                    hideOnSinglePage: true,
                    pageSize: 150,
                }}
            />
        </Spin>
    );
}
