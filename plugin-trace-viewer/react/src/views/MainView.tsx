import React, { useContext, useEffect, useState } from 'react';
import { List, Spin, Typography } from 'antd';
import { useLocation } from 'react-router-dom';

import { IoDataResponse } from 'models/oDataResponse';
import { ISolution } from 'models/solutions';

import { PowerToolsContext } from 'powertools/context';
import { usePowerToolsApi } from 'powertools/apiHook';

export const MainView: React.FC = () => {
    const { connectionName } = useContext(PowerToolsContext);
    const { get, isLoaded } = usePowerToolsApi();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ISolution[]>([]);
    const location = useLocation();

    useEffect(() => {
        console.log(location);
    }, [location]);

    useEffect(() => {
        setLoading(true);

        const loadSolutions = async () => {
            const query = new URLSearchParams();
            query.set(`$select`, `friendlyname,uniquename`);
            query.set(`$expand`, `publisherid`);
            query.set(`$filter`, `(isvisible eq true)`);
            query.set(`$orderby`, `createdon desc`);

            const res = await window.PowerTools.get("/api/data/v9.0/solutions", query); //view history: /api/data/v9.0/solutionhistories
            const js = await res.asJson<IoDataResponse<ISolution>>();

            setData(js.value);
        }

        Promise.all([loadSolutions()]).then(() => setLoading(false));
    }, [get, isLoaded, connectionName]);

    return (
        <Spin spinning={!isLoaded}>
            <h1>Hello, {connectionName}</h1>

            <List
                size="small"
                bordered
                dataSource={data}
                loading={loading}
                renderItem={(item) => (
                    <List.Item key={item.solutionid}>
                        <List.Item.Meta
                            title={item.friendlyname}
                            description={item.uniquename}
                        />
                        Publisher: <Typography.Text italic>{item.publisherid.friendlyname}</Typography.Text>
                    </List.Item>
                )}
            />
        </Spin>
    );
}
