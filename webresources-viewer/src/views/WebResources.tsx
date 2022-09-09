import React, { useContext, useEffect, useState } from 'react';
import { Button, Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';

import { usePowerToolsApi } from 'powertools/apiHook';
import { PowerToolsContext } from 'powertools/context';

import { IoDataResponse } from 'models/oDataResponse';
import { IWebResource } from 'models/webresoures';

export const WebResourcesView: React.FC = () => {
    const { connectionName } = useContext(PowerToolsContext);
    const { get, isLoaded } = usePowerToolsApi();
    const [ isLoading, setLoading ] = useState(false);
    const [ data, setData ] = useState<IWebResource[]>([]);
    const [ nextLink, setNextLink ] = useState('');

    useEffect(() => {
        if (!get || !isLoaded || !connectionName) {
            return;
        }

        setLoading(true);

        const getWebresources = async () => {
            const query = new URLSearchParams();
            query.set(`$select`, 'createdon,solutionid,name,displayname,description,webresourcetype,componentstate,ismanaged,_createdby_value');
            // query.set(`$expand`, `solutionid`);
            query.set(`$filter`, `(ishidden/Value eq false)`);
            query.set(`$orderby`, `displayname asc`);
            query.set('$count', 'true');

            const headers: IHeaders = {
                Prefer: `odata.maxpagesize=${ 25 }, odata.include-annotations=OData.Community.Display.V1.FormattedValue`,
            };

            const results = await get('/api/data/v9.0/webresourceset', query, headers);
            const data = await results.asJson<IoDataResponse<IWebResource>>();

            console.log('data:', data);

            setNextLink(data['@odata.nextLink'] || '');
            setData(data.value);
        };

        Promise.all([getWebresources()]).then(() => setLoading(false));
    }, [get, isLoaded, connectionName]);

    //TODO: https://ant.design/components/table/#components-table-demo-ajax
    const columns: ColumnsType<IWebResource> = [
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Description', dataIndex: 'description', key: 'description', render: (value: string) => value || '-' },
        { title: 'Type', dataIndex: 'webresourcetype', key: 'webresourcetype', render: (value: number, record) => record['webresourcetype@OData.Community.Display.V1.FormattedValue'] },
        { title: 'Is Managed', dataIndex: 'ismanaged', key: 'isManaged', render: (value: boolean) => value ? 'Yes' : 'No' },
    ];

    const footer = (data: readonly IWebResource[]) => {
        if (!Array.isArray(data) || data.length === 0 || !nextLink) {
            return null;
        }

        return (
            <Button>Load more</Button>
        );
    };

    return (
        <React.Fragment>
            <Table
                loading={!isLoaded || isLoading}
                dataSource={data}
                columns={columns}
                rowKey="webresourceid"
                pagination={false}
                footer={footer}
            />
        </React.Fragment>
    );
};
