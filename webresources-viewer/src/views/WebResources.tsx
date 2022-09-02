import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

import { ConnectionView } from './connection';
import { usePowerToolsApi } from '../powertools/apiHook';

export const WebResourcesView: React.FC = () => {
    const { get, isLoaded } = usePowerToolsApi();
    const [isLoading, setLoading] = useState(false);

    useEffect(() => {
        if (!get || !isLoaded) {
            return;
        }

        setLoading(true);

        const getWebresources = async () => {
            const query = new URLSearchParams();
            query.set(`$select`, 'createdon,solutionid,name,displayname,description,webresourcetype,componentstate,ismanaged,_createdby_value');
            // query.set(`$expand`, `solutionid`);
            query.set(`$filter`, `(ishidden/Value eq false)`);
            query.set(`$orderby`, `displayname asc`);
            query.set(`$top`, `1`);

            const results = await get('/api/data/v9.0/webresourceset', query);

            console.log('results:', results);

            const data = await results.asJson();

            console.log('data:', data);
        };

        Promise.all([getWebresources()]).then(() => setLoading(false));
    }, [get, isLoaded]);

    return (
        <React.Fragment>
            <ConnectionView />
            <Table loading={!isLoaded || isLoading} />
        </React.Fragment>
    );
};
