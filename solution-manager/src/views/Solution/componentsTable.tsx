import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Button, Table, Modal, Progress, message, Space, Popconfirm } from 'antd';
import { usePowerToolsApi } from 'powertools/apiHook';
import { useSolutionComponentColumns } from 'utils/columns';
import { IoDataResponse } from 'models/oDataResponse';
import { ISolutionComponentSummary } from 'models/solutionComponentSummary';
import { ISolution } from 'models/solutions';
import { useComponentOperations } from './hooks/useComponentOperations';
import { useSolutionFetching } from './hooks/useSolutionFetching';

export const ComponentsTable: React.FC<{ solutionId?: string }> = (props) => {
    const { get, post } = usePowerToolsApi();
    const [isLoadingComponents, setLoadingComponents] = useState(true);
    const [components, setComponents] = useState<ISolutionComponentSummary[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [copying, setCopying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [operationDebugInfo, setOperationDebugInfo] = useState<string[]>([]);

    const { copyToComponents, deleteComponents } = useComponentOperations(
        post, 
        components, 
        selectedRowKeys, 
        setProgress, 
        setOperationDebugInfo,
        setCopying  // Pass setCopying to the hook
    );
    const { unmanagedSolutions, fetchUnmanagedSolutions } = useSolutionFetching(get);

    const loadSolutionComponents = useCallback(async () => {
        if (!get || !props.solutionId) return;

        try {
            setLoadingComponents(true);
            const query = new URLSearchParams({
                $filter: `(msdyn_solutionid eq ${props.solutionId})`,
                $orderby: 'msdyn_name asc'
            });

            const res = await get('/api/data/v9.0/msdyn_solutioncomponentsummaries', query);
            const js = await res.asJson<IoDataResponse<ISolutionComponentSummary>>();

            if (js && Array.isArray(js.value)) {
                setComponents(js.value);
            }
        } catch (error) {
            console.error('Failed to load solution components:', error);
            message.error('Failed to load solution components');
        } finally {
            setLoadingComponents(false);
        }
    }, [get, props.solutionId]);

    useEffect(() => {
        loadSolutionComponents();
    }, [loadSolutionComponents]);

    const handleSolutionSelection = useCallback((solutionName: string) => {
        setCopying(true);
        setIsModalVisible(false);
        copyToComponents(solutionName);
    }, [copyToComponents]);

    const showUnmanagedSolutionsModal = useCallback(async () => {
        await fetchUnmanagedSolutions();
        setIsModalVisible(true);
    }, [fetchUnmanagedSolutions]);

    const handleDeleteComponents = useCallback(() => {
        deleteComponents().then(() => {
            message.success('Components deleted successfully');
            loadSolutionComponents();
        }).catch((error: Error) => {
            console.error('Failed to delete components:', error);
            message.error('Failed to delete components');
        });
    }, [deleteComponents, loadSolutionComponents]);

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
            render: (publisher: { name: string }) => publisher?.name || 'N/A',
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: unknown, record: ISolution) => (
                <Button onClick={() => handleSolutionSelection(record.uniquename)}>Select</Button>
            ),
        },
    ], [handleSolutionSelection]);

    const handleRowClick = useCallback((record: ISolutionComponentSummary) => {
        const key = record.msdyn_objectid;
        setSelectedRowKeys(prevKeys => 
            prevKeys.includes(key) 
                ? prevKeys.filter(k => k !== key)
                : [...prevKeys, key]
        );
    }, []);

    const rowSelection = {
        selectedRowKeys,
        onChange: (selectedKeys: React.Key[]) => {
            setSelectedRowKeys(selectedKeys as string[]);
        },
    };

    const ActionButtons = useMemo(() => () => (
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
                aria-label="Copy selected components to another solution"
            >
                Copy to Solution
            </Button>
            <Popconfirm
                title="Are you sure you want to delete these components?"
                onConfirm={handleDeleteComponents}
                okText="Yes"
                cancelText="No"
            >
                <Button 
                    danger 
                    disabled={selectedRowKeys.length < 1}
                    aria-label="Remove selected components from solution"
                >
                    Remove from Solution
                </Button>
            </Popconfirm>
        </Space>
    ), [selectedRowKeys, showUnmanagedSolutionsModal, handleDeleteComponents]);

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
                pagination={{ pageSize: 50 }}
                rowClassName={() => 'pointer-cursor'}
                onRow={(record) => ({
                    onClick: () => handleRowClick(record),
                })}
                rowSelection={rowSelection}
            />
        </div>
    );
};