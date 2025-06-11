import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Button, Table, Modal, Progress, message, Space, Popconfirm, Input } from 'antd';
import { usePowerToolsApi } from 'powertools/apiHook';
import { useSolutionComponentColumns } from 'utils/columns';
import { IoDataResponse } from 'models/oDataResponse';
import { ISolutionComponentSummary } from 'models/solutionComponentSummary';
import { ISolution } from 'models/solutions';
import { useComponentOperations } from './hooks/useComponentOperations';
import { useSolutionFetching } from './hooks/useSolutionFetching';

interface ComponentsTableProps {
    solutionId?: string;
    onComponentSelect?: (component: ISolutionComponentSummary) => React.ReactNode;
}

export const ComponentsTable: React.FC<ComponentsTableProps> = (props) => {
    const { get, post } = usePowerToolsApi();
    const { solutionId, onComponentSelect } = props;
    const [isLoadingComponents, setLoadingComponents] = useState(true);
    const [components, setComponents] = useState<ISolutionComponentSummary[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [copying, setCopying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [operationDebugInfo, setOperationDebugInfo] = useState<string[]>([]);
    const [solutionSearch, setSolutionSearch] = useState('');
    const [solutionSearchTimeout, setSolutionSearchTimeout] = useState<NodeJS.Timeout | null>(null);

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
        if (!get || !solutionId) return;

        try {
            setLoadingComponents(true);
            const query = new URLSearchParams({
                $filter: `(msdyn_solutionid eq ${solutionId})`,
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
    }, [get, solutionId]);

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
            sorter: (a: ISolution, b: ISolution) => (a.friendlyname || '').localeCompare(b.friendlyname || ''),
        },
        {
            title: 'Unique Name',
            dataIndex: 'uniquename',
            key: 'uniquename',
            sorter: (a: ISolution, b: ISolution) => (a.uniquename || '').localeCompare(b.uniquename || ''),
        },
        {
            title: 'Version',
            dataIndex: 'version',
            key: 'version',
            sorter: (a: ISolution, b: ISolution) => (a.version || '').localeCompare(b.version || ''),
        },
        {
            title: 'Publisher',
            dataIndex: 'publisherid',
            key: 'publisherid',
            render: (publisher: { friendlyname: string }) => publisher?.friendlyname || 'N/A',
            sorter: (a: ISolution, b: ISolution) => {
                const aName = a.publisherid?.friendlyname || '';
                const bName = b.publisherid?.friendlyname || '';
                return aName.localeCompare(bName);
            },
        },
        {
            title: 'Created On',
            dataIndex: 'createdon',
            key: 'createdon',
            sorter: (a: ISolution, b: ISolution) => new Date(a.createdon).getTime() - new Date(b.createdon).getTime(),
            render: (date: string) => date ? new Date(date).toLocaleString() : 'N/A',
        },
        {
            title: 'Modified On',
            dataIndex: 'modifiedon',
            key: 'modifiedon',
            sorter: (a: ISolution, b: ISolution) => new Date(a.modifiedon).getTime() - new Date(b.modifiedon).getTime(),
            render: (date: string) => date ? new Date(date).toLocaleString() : 'N/A',
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
        if (onComponentSelect) {
            // If we have an onComponentSelect handler, use it
            return onComponentSelect(record);
        }
        // Otherwise use the default selection behavior
        const key = record.msdyn_objectid;
        setSelectedRowKeys(prevKeys => 
            prevKeys.includes(key) 
                ? prevKeys.filter(k => k !== key)
                : [...prevKeys, key]
        );
    }, [onComponentSelect]);

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

    const handleSolutionSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (solutionSearchTimeout) clearTimeout(solutionSearchTimeout);
        setSolutionSearchTimeout(setTimeout(() => setSolutionSearch(value), 300));
    };

    const filteredUnmanagedSolutions = useMemo(() => {
        if (!solutionSearch) return unmanagedSolutions;
        const lower = solutionSearch.toLowerCase();
        return unmanagedSolutions.filter(s =>
            (s.friendlyname && s.friendlyname.toLowerCase().includes(lower)) ||
            (s.uniquename && s.uniquename.toLowerCase().includes(lower)) ||
            (s.version && s.version.toLowerCase().includes(lower)) ||
            (s.createdon && new Date(s.createdon).toLocaleString().toLowerCase().includes(lower)) ||
            (s.modifiedon && new Date(s.modifiedon).toLocaleString().toLowerCase().includes(lower))
        );
    }, [unmanagedSolutions, solutionSearch]);

    return (
        <div>
            <Modal
                title="Select an Unmanaged Solution"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                width={1200}
                bodyStyle={{ padding: 0 }}
                style={{ top: 40 }}
            >
                <div style={{ padding: 24 }}>
                    <Input.Search
                        placeholder="Search solutions..."
                        allowClear
                        onChange={handleSolutionSearchChange}
                        style={{ width: '100%', marginBottom: 16 }}
                    />
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                        <Table
                            dataSource={filteredUnmanagedSolutions}
                            columns={solutionColumns}
                            rowKey="solutionid"
                            pagination={false}
                            bordered
                            size="middle"
                            scroll={{ x: true }}
                        />
                    </div>
                </div>
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
                columns={useSolutionComponentColumns(solutionId)}
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