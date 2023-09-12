import React, { useEffect, useState } from 'react';
import { Button, Table, Modal } from 'antd';

import { usePowerToolsApi } from 'powertools/apiHook';
import { useSolutionComponentColumns } from 'utils/columns';

import { IoDataResponse } from 'models/oDataResponse';
import { ISolutionComponentSummary } from 'models/solutionComponentSummary';
import { ISolution } from 'models/solutions';

export const ComponentsTable: React.FC<{ solutionId?: string }> = (props) => {
    const { get, post } = usePowerToolsApi();
    const [isLoadingComponents, setLoadingComponents] = useState(true);
    const [isLoadingMore, setLoadingMore] = useState(false);
    const [skipToken, setSkipToken] = useState('');
    const [components, setComponents] = useState<ISolutionComponentSummary[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [unmanagedSolutions, setUnmanagedSolutions] = useState<ISolution[]>([]);
    const [selectedSolution, setSelectedSolution] = useState<string>('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const solutionColumns = [
        {
            title: 'Friendly Name',
            dataIndex: 'friendlyname',
            key: 'friendlyname',
        },
        {
            title: 'Unique Name',
            dataIndex: 'uniquename',
            key: 'uniquename',
        },
        {
            title: 'Version',
            dataIndex: 'version',
            key: 'version',
        },
        {
            title: 'Publisher',
            dataIndex: 'publisherid',
            key: 'publisherid',
            render: (publisher: any) => publisher?.name || 'N/A', // Assuming publisher object has a name property
        },
        {
            title: 'Action',
            key: 'action',
            render: (text: string, record: ISolution) => (
                <Button onClick={() => handleSolutionSelection(record.uniquename)}>Select</Button>
            ),
        },
    ];

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
    const endpoint = 'api/data/v9.2/';
    const customHeaders = {
        "Content-Type": "application/json"
    };

    useEffect(() => {
        const loadUnmanagedSolutions = async () => {
            const fetchedSolutions = await fetchUnmanagedSolutions();
            setUnmanagedSolutions(fetchedSolutions);
        };

        loadUnmanagedSolutions();
    }, []);

    const fetchUnmanagedSolutions = async (): Promise<ISolution[]> => {
        if (!get) {
            return [];
        }
    
        const query = new URLSearchParams();
        query.set('$select', 'friendlyname,uniquename,version,publisherid');
        query.set('$filter', '(isvisible eq true) and (ismanaged eq false)');
        query.set('$orderby', 'friendlyname asc');
        query.set('$expand', 'publisherid'); // To fetch publisher details
    
        try {
            const res = await get(`${endpoint + 'solutions'}?${query.toString()}`);
            const js = await res.asJson<IoDataResponse<ISolution>>();
            return js.value;
        } catch (error) {
            console.error("Error fetching unmanaged solutions:", error);
            return [];
        }
    };
    

    const showUnmanagedSolutionsModal = async () => {
        const fetchedSolutions = await fetchUnmanagedSolutions();
        setUnmanagedSolutions(fetchedSolutions);
        setIsModalVisible(true);
    };

    const handleSolutionSelection = (solutionName: string) => {
        setSelectedSolution(solutionName);
        moveToComponents();
        setIsModalVisible(false); // Close the modal after moving the component
    };

    const moveToComponents = () => {
        if (!post || !selectedSolution) {
            return;
        }

        for (const componentKey of selectedRowKeys) {
            const component = components.find(comp => comp.msdyn_objectid === componentKey);
            if (component) {
                post(endpoint + 'AddSolutionComponent', {
                    "ComponentId": componentKey,
                    "ComponentType": component.msdyn_componenttype.toString(),
                    "SolutionUniqueName": selectedSolution,
                    "AddRequiredComponents": 'false'
                }, customHeaders);
            }
        }
    };

    const deleteComponents = () => {
        if (!get) {
            return;
        }

        get(endpoint + 'solutions?$select=uniquename&$filter=solutionid eq ' + props.solutionId).then(function success(result) {
            console.log(result);
            const data = JSON.parse(result.content);
            const solutionUniqueName = 'test'; // or use: data.value[0].uniquename

            for (const componentKey of selectedRowKeys) {
                const component = components.find(comp => comp.msdyn_objectid === componentKey);
                if (component) {
                    if (post) {
                        post(endpoint + 'RemoveSolutionComponent', {
                            "ComponentId": '{' + componentKey + '}',
                            "ComponentType": component.msdyn_componenttype.toString(),
                            "SolutionUniqueName": solutionUniqueName
                        }, customHeaders);
                    }
                }
            }
        });
    };

    return (
        <div>
            <Button onClick={showUnmanagedSolutionsModal} disabled={selectedRowKeys.length < 1}>Move to Solution</Button>
            <Button onClick={deleteComponents} disabled={selectedRowKeys.length < 1}>Remove from Solution</Button>

            <Modal
                title="Select an Unmanaged Solution"
                visible={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                width={800} // Adjust width as needed
            >
                <Table
                    dataSource={unmanagedSolutions}
                    columns={solutionColumns}
                    rowKey="solutionid"
                    pagination={false}
                />
            </Modal>

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