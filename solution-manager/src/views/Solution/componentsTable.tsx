import React, { useEffect, useState } from 'react';
import { Button, Table } from 'antd';

import { usePowerToolsApi } from 'powertools/apiHook';
import { useSolutionComponentColumns } from 'utils/columns';

import { IoDataResponse } from 'models/oDataResponse';
import { ISolutionComponentSummary } from 'models/solutionComponentSummary';

export const ComponentsTable: React.FC<{ solutionId?: string }> = (props) => {
    const { get, post } = usePowerToolsApi();
    const [isLoadingComponents, setLoadingComponents] = useState(true);
    const [isLoadingMore, setLoadingMore] = useState(false);
    const [skipToken, setSkipToken] = useState('');
    const [components, setComponents] = useState<ISolutionComponentSummary[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]); // For row selection

    const loadSolutionComponents = async (skipTokenValue?: string) => {
        if (!get || !post) {
            return;
        }

        const query = new URLSearchParams();
        query.set(`$filter`, `(msdyn_solutionid eq ${props.solutionId})`);
        query.set(`$orderby`, `msdyn_name asc`);

        if (skipTokenValue) {
            query.set('$skiptoken', skipTokenValue);
        }

        const res = await get('/api/data/v9.0/msdyn_solutioncomponentsummaries', query);
        const js = await res.asJson<IoDataResponse<ISolutionComponentSummary>>();

        if (!js || !Array.isArray(js.value)) {
            return;
        }

        const paginationToken = await res.getSkipToken();
        setSkipToken(paginationToken);

        console.log(js);
        setComponents(js.value);
    };

    useEffect(() => {
        if (!get || !props.solutionId) {
            return;
        }

        setLoadingComponents(true);

        loadSolutionComponents().then(() => setLoadingComponents(false));

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [get, props.solutionId]);

    const loadMore = () => {
        setLoadingMore(true);

        Promise.all([loadSolutionComponents(skipToken)]).then(() => setLoadingMore(false));
    };

    const footer = (data: readonly ISolutionComponentSummary[]) => {
        if (!Array.isArray(data) || data.length === 0 || !skipToken || isLoadingComponents) {
            return null;
        }

        return (
            <Button onClick={loadMore} disabled={isLoadingMore} loading={isLoadingMore}>Load more</Button>
        );
    };

    const handleRowClick = (record: ISolutionComponentSummary) => {
        const key = record.msdyn_objectid;
        const index = selectedRowKeys.indexOf(key);

        if (index >= 0) {
            // If the key exists, remove it from the selected keys
            setSelectedRowKeys(prevKeys => prevKeys.filter(k => k !== key));
        } else {
            // Otherwise, add the key to the selected keys
            setSelectedRowKeys(prevKeys => [...prevKeys, key]);
        }
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: (selectedKeys: React.Key[]) => {
            setSelectedRowKeys(selectedKeys as string[]);
        },
    };
    const endpoint = '/api/data/v9.2/';
    const customHeaders = {
        "Content-Type": "application/json"
    };

    const moveToComponent = () => {
        if (post) {
            post(endpoint + 'AddSolutionComponent', {
                "ComponentId": selectedRowKeys[0], // Assuming only one row can be selected at a time
                "ComponentType": components.find(comp => comp.msdyn_objectid === selectedRowKeys[0])?.msdyn_componenttype.toString(),
                "SolutionUniqueName": prompt("Please provide the Unique Name of the target solution for this component.") ?? '',
                "AddRequiredComponents": 'false'
            }, customHeaders);
        }
    };

    const deleteComponent = () => {
        if (!get) {
            return;
        }

        get(endpoint + 'solutions?$select=uniquename&$filter=solutionid eq ' + props.solutionId).then(
            function success(result) {
                console.log(result);
                var data = JSON.parse(result.content);
                if (post) {
                    post(endpoint + 'RemoveSolutionComponent', {
                        "ComponentId": '{' + selectedRowKeys[0] + '}', // Assuming only one row can be selected at a time
                        "ComponentType": components.find(comp => comp.msdyn_objectid === selectedRowKeys[0])?.msdyn_componenttype.toString(),
                        "SolutionUniqueName": 'test' //data.value[0].uniquename
                    }, customHeaders);
                }
            });
    };

    return (
        <div>
            <Button onClick={moveToComponent} disabled={selectedRowKeys.length !== 1}>Move to Solution</Button>
            <Button onClick={deleteComponent} disabled={selectedRowKeys.length !== 1}>Delete</Button>
            <Table<ISolutionComponentSummary>
                loading={isLoadingComponents}
                columns={useSolutionComponentColumns(props.solutionId)}
                dataSource={components}
                rowKey="msdyn_objectid"
                pagination={false}
                footer={footer}
                rowClassName={() => 'pointer-cursor'}
                onRow={(record) => ({
                    onClick: () => handleRowClick(record),
                })}
                rowSelection={rowSelection}
            />
        </div>
    );
}