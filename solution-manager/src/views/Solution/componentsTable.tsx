import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Button, Table, Modal, Progress, message, Space } from 'antd';
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
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [copying, setCopying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [operationDebugInfo, setOperationDebugInfo] = useState<string[]>([]);

    const endpoint = 'api/data/v9.2/';
    const customHeaders = useMemo(() => ({
        "Content-Type": "application/json"
    }), []);

    const copyToComponents = useCallback(async (solutionName: string) => {
        if (!post) {
            message.error('Copy function is not available');
            return;
        }
        if (!solutionName) {
            message.error('No solution selected for copying');
            setCopying(false);
            return;
        }

        setProgress(0);
        setOperationDebugInfo(['Starting copy process']);

        const totalComponents = selectedRowKeys.length;
        let copiedComponents = 0;

        for (const componentKey of selectedRowKeys) {
            const component = components.find(comp => comp.msdyn_objectid === componentKey);
            if (component) {
                try {
                    await post(endpoint + 'AddSolutionComponent', {
                        "ComponentId": componentKey,
                        "ComponentType": component.msdyn_componenttype.toString(),
                        "SolutionUniqueName": solutionName,
                        "AddRequiredComponents": 'false'
                    }, customHeaders);

                    copiedComponents++;
                    const newProgress = Math.round((copiedComponents / totalComponents) * 100);
                    setProgress(newProgress);
                    setOperationDebugInfo(prev => [...prev, `Copied component ${copiedComponents}/${totalComponents}`]);
                    
                    await new Promise(resolve => setTimeout(resolve, 10));
                } catch (error) {
                    setOperationDebugInfo(prev => [...prev, `Failed to copy component: ${componentKey}`]);
                }
            }
        }

        message.success('Components copied successfully');
        setCopying(false);
    }, [post, selectedRowKeys, components, customHeaders]);

    const handleSolutionSelection = useCallback((solutionName: string) => {
        setCopying(true);
        setIsModalVisible(false);
        copyToComponents(solutionName);
    }, [copyToComponents]);

    const solutionColumns = useMemo(() => [
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
            render: (publisher: any) => publisher?.name || 'N/A',
        },
        {
            title: 'Action',
            key: 'action',
            render: (text: string, record: ISolution) => (
                <Button onClick={() => handleSolutionSelection(record.uniquename)}>Select</Button>
            ),
        },
    ], [handleSolutionSelection]);

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
            setSelectedRowKeys(prevKeys => prevKeys.filter(k => k !== key));
        } else {
            setSelectedRowKeys(prevKeys => [...prevKeys, key]);
        }
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: (selectedKeys: React.Key[]) => {
            setSelectedRowKeys(selectedKeys as string[]);
        },
    };

    const fetchUnmanagedSolutions = useCallback(async (): Promise<ISolution[]> => {
        if (!get) {
            return [];
        }
    
        const query = new URLSearchParams();
        query.set('$select', 'friendlyname,uniquename,version,publisherid');
        query.set('$filter', '(isvisible eq true) and (ismanaged eq false)');
        query.set('$orderby', 'friendlyname asc');
        query.set('$expand', 'publisherid');
    
        try {
            const res = await get(`${endpoint + 'solutions'}?${query.toString()}`);
            const js = await res.asJson<IoDataResponse<ISolution>>();
            return js.value;
        } catch (error) {
            console.error("Error fetching unmanaged solutions:", error);
            return [];
        }
    }, [get]);

    useEffect(() => {
        const loadUnmanagedSolutions = async () => {
            const fetchedSolutions = await fetchUnmanagedSolutions();
            setUnmanagedSolutions(fetchedSolutions);
        };

        loadUnmanagedSolutions();
    }, [fetchUnmanagedSolutions]);

    const showUnmanagedSolutionsModal = async () => {
        const fetchedSolutions = await fetchUnmanagedSolutions();
        setUnmanagedSolutions(fetchedSolutions);
        setIsModalVisible(true);
    };

    const deleteComponents = () => {
        if (!get) {
            return;
        }

        get(endpoint + 'solutions?$select=uniquename&$filter=solutionid eq ' + props.solutionId).then(function success(result) {
            console.log(result);
            const solutionUniqueName = 'test';

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

    useEffect(() => {
        if (copying && progress === 100) {
            const timer = setTimeout(() => {
                setCopying(false);
                setProgress(0);
                setOperationDebugInfo([]);
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [copying, progress]);

    const ActionButtons = () => (
        <Space size="middle" style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 16,
            opacity: selectedRowKeys.length > 0 ? 1 : 0.3,
            transition: 'opacity 0.3s',
            pointerEvents: selectedRowKeys.length > 0 ? 'auto' : 'none',
        }}>
            <Button 
                onClick={showUnmanagedSolutionsModal}
                disabled={selectedRowKeys.length < 1}
            >
                Copy to Solution
            </Button>
            <Button 
                danger 
                onClick={deleteComponents}
                disabled={selectedRowKeys.length < 1}
            >
                Remove from Solution
            </Button>
        </Space>
    );

    return (
        <div>
            <Modal
                title="Select an Unmanaged Solution"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                width={800}
            >
                <Table
                    dataSource={unmanagedSolutions}
                    columns={solutionColumns}
                    rowKey="solutionid"
                    pagination={false}
                />
            </Modal>

            <Modal
                title="Copying Solution Components"
                open={copying}
                footer={[
                    <Button key="close" onClick={() => setCopying(false)}>
                        Close
                    </Button>
                ]}
                closable={true}
                maskClosable={false}
                onCancel={() => setCopying(false)}
            >
                <Progress percent={progress} status="active" />
                <p>Progress: {progress}%</p>
                <p>Debug Info:</p>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {operationDebugInfo.map((info, index) => (
                        <div key={index}>{info}</div>
                    ))}
                </div>
            </Modal>

            <ActionButtons />

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