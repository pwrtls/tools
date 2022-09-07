import React, { useContext, useEffect, useState } from 'react';
import { Table } from 'antd';
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
    const [ paging, setPaging ] = useState({ pageSize: 10, page: 1 });
    const [ totalCount, setTotalCount ] = useState(0);

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
                Prefer: `odata.maxpagesize=${ paging.pageSize }, odata.include-annotations=OData.Community.Display.V1.FormattedValue`,
            };

            const results = await get('/api/data/v9.0/webresourceset', query, headers);
            const data = await results.asJson<IoDataResponse<IWebResource>>();

            console.log('data:', data);

            setTotalCount(data['@odata.count'] || 0);
            setData(data.value);
        };

        Promise.all([getWebresources()]).then(() => setLoading(false));
    }, [get, isLoaded, connectionName, paging]);

    const columns: ColumnsType<IWebResource> = [
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Description', dataIndex: 'description', key: 'description', render: (value: string) => value || '-' },
        { title: 'Is Managed', dataIndex: 'ismanaged', key: 'isManaged', render: (value: boolean) => value ? 'Yes' : 'No' },
    ];

    return (
        <Table
            loading={!isLoaded || isLoading}
            dataSource={data}
            columns={columns}
            rowKey="webresourceid"
            pagination={{
                position: ['topRight'],
                current: paging.page,
                total: totalCount,
                onShowSizeChange(page, pageSize) {
                    setPaging({ page, pageSize });
                },
                onChange: (page, pageSize) => {
                    setPaging({ page, pageSize });
                },
            }}
        />
    );
};
