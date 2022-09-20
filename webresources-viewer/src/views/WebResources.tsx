import React, { useContext, useEffect, useState } from 'react';
import { Button, Table } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/lib/table';
import type { ColumnFilterItem, FilterValue, SorterResult, TableCurrentDataSource } from 'antd/lib/table/interface';
import uniqueBy from 'lodash.uniqby';

import { usePowerToolsApi } from 'powertools/apiHook';
import { PowerToolsContext } from 'powertools/context';

import { IoDataResponse } from 'models/oDataResponse';
import { IWebResource, WebResourceType } from 'models/webresoures';

import { SearchForm } from './SearchForm';
import { DownloadButton } from './DownloadButton';

interface IWebResourcesViewFilter {
    webresourcetype?: number[];
    searchValue?: string;
}

interface IWebResourcesViewSorter {
    property: string;
    order: 'asc' | 'desc' | '';
}

export const WebResourcesView: React.FC = () => {
    const { connectionName } = useContext(PowerToolsContext);
    const { get, isLoaded } = usePowerToolsApi();
    const [isLoading, setLoading] = useState(true);
    const [isLoadingMore, setLoadingMore] = useState(false);
    const [filter, setFilter] = useState<IWebResourcesViewFilter>({});
    const [sorter, setSorter] = useState<IWebResourcesViewSorter>({ property: 'name', order: 'asc' });
    const [data, setData] = useState<IWebResource[]>([]);
    const [skipToken, setSkipToken] = useState('');

    const getWebresources = async (skipTokenValue?: string) => {
        if (!get || !isLoaded || !connectionName) {
            return;
        }

        const filters = ['(ishidden/Value eq false)'];

        if (Array.isArray(filter.webresourcetype) && filter.webresourcetype.length !== 0) {
            const typeFilters = filter.webresourcetype.map((v) => `(webresourcetype eq ${v})`);

            filters.push(typeFilters.length === 1 ? typeFilters[0] : `(${ typeFilters.join(' or ') })`);
        }

        if (filter.searchValue) {
            filters.push(filter.searchValue);
        }

        const query = new URLSearchParams();
        query.set(`$select`, 'createdon,solutionid,name,displayname,description,webresourcetype,componentstate,ismanaged,_createdby_value');
        // query.set(`$expand`, `solutionid`);
        query.set(`$filter`, filters.join(' and '));

        if (sorter.property && sorter.order) {
            query.set(`$orderby`, `${sorter.property} ${sorter.order}`);
        }

        query.set('$count', 'true');

        if (skipTokenValue) {
            query.set('$skiptoken', skipTokenValue);
        }

        // query.forEach(function() { console.log(arguments) });

        const headers: IHeaders = {
            Prefer: `odata.maxpagesize=${25}, odata.include-annotations=OData.Community.Display.V1.FormattedValue`,
        };

        const results = await get('/api/data/v9.0/webresourceset', query, headers);
        const webresourcesResults = await results.asJson<IoDataResponse<IWebResource>>();
        const paginationToken = await results.getSkipToken();

        setSkipToken(paginationToken);
        setData(skipTokenValue ? uniqueBy([...data, ...webresourcesResults.value], 'webresourceid') : webresourcesResults.value);
    };

    useEffect(() => {
        if (!get || !isLoaded || !connectionName) {
            return;
        }

        Promise.all([getWebresources()]).then(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [get, isLoaded, connectionName, filter, sorter]);

    const columns: ColumnsType<IWebResource> = [
        {
            title: 'Name', dataIndex: 'name', key: 'name', sorter: true, defaultSortOrder: 'ascend',
        },
        {
            title: 'Display Name', dataIndex: 'displayname', key: 'displayName', ellipsis: true, sorter: true
        },
        {
            title: 'Type', dataIndex: 'webresourcetype', key: 'webresourcetype',
            filters: Object.values(WebResourceType).filter((i) => isNaN(Number(i))).map((v): ColumnFilterItem => {
                return { text: v, value: WebResourceType[v as any] };
            }),
            render: (value: number, record) => record['webresourcetype@OData.Community.Display.V1.FormattedValue'],
        },
        {
            title: 'Is Managed', dataIndex: 'ismanaged', key: 'isManaged', render: (value: boolean) => value ? 'Yes' : 'No'
        },
        {
            title: 'Created On', dataIndex: 'createdon', key: 'createdOn', sorter: true, render: (createdon: string) => new Date(createdon).toLocaleDateString()
        },
        {
            title: 'Download', key: 'download', render: (_, record) => <DownloadButton webresourceid={record.webresourceid} />,
        },
    ];

    const onTableChange = (pagination: TablePaginationConfig, filters: Record<string, FilterValue | null>, sorter: SorterResult<IWebResource> | SorterResult<IWebResource>[], extra: TableCurrentDataSource<IWebResource>) => {
        setSkipToken('');
        setLoading(true);

        const filterToSet: IWebResourcesViewFilter = {
            ...filter,
        };

        if (filters.webresourcetype) {
            filterToSet.webresourcetype = filters.webresourcetype as Array<number>;
        }

        if (!Array.isArray(sorter) && sorter.field && sorter.order) {
            setSorter({ property: sorter.field as string, order: sorter.order === 'ascend' ? 'asc' : 'desc' });
        } else {
            setSorter({ property: 'name', order: 'asc' });
        }

        setFilter(filterToSet);
    };

    const onSearchChange = (searchValue: string) => {
        setSkipToken('');
        setLoading(true);

        setFilter({
            ...filter,
            searchValue,
        });
    };

    const loadMore = () => {
        setLoadingMore(true);

        Promise.all([getWebresources(skipToken)]).then(() => setLoadingMore(false));
    };

    const footer = (data: readonly IWebResource[]) => {
        if (!Array.isArray(data) || data.length === 0 || !skipToken || isLoading) {
            return null;
        }

        return (
            <Button onClick={loadMore} disabled={isLoadingMore} loading={isLoadingMore}>Load more</Button>
        );
    };

    return (
        <React.Fragment>
            <SearchForm onChange={onSearchChange} />

            <Table<IWebResource>
                loading={!isLoaded || isLoading}
                dataSource={data}
                columns={columns}
                rowKey="webresourceid"
                pagination={false}
                footer={footer}
                onChange={onTableChange}
            />
        </React.Fragment>
    );
};
