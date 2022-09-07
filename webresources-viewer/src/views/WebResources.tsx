import React, { useContext, useEffect, useState } from 'react';
import { Table } from 'antd';
import { TablePaginationConfig } from 'antd';

import { usePowerToolsApi } from 'powertools/apiHook';
import { PowerToolsContext } from 'powertools/context';

import { IoDataResponse } from 'models/oDataResponse';
import { IWebResource } from 'models/webresoures';

import { ConnectionView } from './connection';
import { ColumnsType } from 'antd/lib/table';

export const WebResourcesView: React.FC = () => {
    const { connectionName } = useContext(PowerToolsContext);
    const { get, isLoaded } = usePowerToolsApi();
    const [ isLoading, setLoading ] = useState(false);
    const [ data, setData ] = useState<IWebResource[]>([]);
    const [ pagination, setPagination ] = useState<TablePaginationConfig>({ pageSize: 10, current: 1 });

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
            query.set(`$top`, `${ pagination.pageSize }`);
            // query.set('$skip', `${ pagination.current * }`);

            const results = await get('/api/data/v9.0/webresourceset', query);

            console.log('results:', results);

            const data = await results.asJson<IoDataResponse<IWebResource>>();

            console.log('data:', data);
            setData(data.value);
        };

        Promise.all([getWebresources()]).then(() => setLoading(false));
    }, [get, isLoaded, connectionName, pagination]);

    const columns: ColumnsType<IWebResource> = [
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Description', dataIndex: 'description', key: 'description', render: (value: string) => value || '-' },
        { title: 'Is Managed', dataIndex: 'ismanaged', key: 'isManaged', render: (value: boolean) => value ? 'Yes' : 'No' },
    ];

    return (
        <React.Fragment>
            <ConnectionView />
            <Table
                loading={!isLoaded || isLoading}
                dataSource={data}
                columns={columns}
                pagination={{
                    ...pagination,
                    onChange: (page, pageSize) => {
                        setPagination({
                            ...pagination,
                            current: page,
                            pageSize,
                        })
                    },
                }}
            />
        </React.Fragment>
    );
};
