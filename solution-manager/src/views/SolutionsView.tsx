import React, { useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Spin, Table, message, Checkbox, Input, Button, Modal, Progress, Space } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';

import { IoDataResponse } from 'models/oDataResponse';
import { ISolution } from 'models/solutions';
import { usePowerToolsApi } from 'powertools/apiHook';

import { useSolutionsColumns } from 'utils/columns';

import { PowerToolsContext } from 'powertools/context';
import { useNavigate } from 'react-router-dom';
import { useSolutionFetching } from 'views/Solution/hooks/useSolutionFetching';
import { ISolutionComponentSummary } from 'models/solutionComponentSummary';

// Define constants for better clarity and maintainability
const PAGE_SIZE = 50;
const API_ENDPOINT = 'api/data/v9.0/solutions';

export const SolutionsView: React.FC = () => {
    const { get, post } = usePowerToolsApi();
    const { connectionName } = useContext(PowerToolsContext);
    const [loading, setLoading] = useState(true);
    const [solutions, setSolutions] = useState<ISolution[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [showUnmanagedOnly, setShowUnmanagedOnly] = useState(true);
    const [lastModifiedDate, setLastModifiedDate] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [copying, setCopying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [operationDebugInfo, setOperationDebugInfo] = useState<string[]>([]);
    const { unmanagedSolutions, fetchUnmanagedSolutions } = useSolutionFetching(get);
    const [unmanagedSearch, setUnmanagedSearch] = useState('');
    const [unmanagedSearchTimeout, setUnmanagedSearchTimeout] = useState<NodeJS.Timeout | null>(null);

    const loadSolutions = useCallback(async (currentPage: number, unmanagedOnly: boolean) => {
        const query = new URLSearchParams();
        query.set('$select', 'friendlyname,uniquename,version,ismanaged,modifiedon,createdon');
        query.set('$expand', 'publisherid($select=friendlyname)');
        
        const filters = ['isvisible eq true'];
        if (unmanagedOnly) {
            filters.push('ismanaged eq false');
        }
        if (lastModifiedDate && currentPage > 1) {
            filters.push(`modifiedon lt ${lastModifiedDate}`);
        }
        query.set('$filter', filters.join(' and '));
        query.set('$orderby', 'modifiedon desc');
        query.set('$top', PAGE_SIZE.toString());

        try {
            const response = await window.PowerTools.get(`${API_ENDPOINT}?${query.toString()}`);
            
            if (response.statusCode === 401) {
                throw new Error('Unauthorized: Please check your authentication credentials');
            }

            if (!response || !response.content) {
                throw new Error('No content received from API');
            }

            const data = await response.asJson<IoDataResponse<ISolution>>();
            
            if (!data || !Array.isArray(data.value)) {
                throw new Error('Invalid response format: expected data.value to be an array');
            }

            // Update the last modified date for next page
            if (data.value.length > 0) {
                const lastSolution = data.value[data.value.length - 1];
                setLastModifiedDate(lastSolution.modifiedon);
            }

            // If this is the first page, get the total count
            if (currentPage === 1) {
                const countQuery = new URLSearchParams();
                countQuery.set('$select', 'solutionid');
                countQuery.set('$filter', filters.join(' and '));
                countQuery.set('$count', 'true');
                
                const countResponse = await window.PowerTools.get(`${API_ENDPOINT}?${countQuery.toString()}`);
                const countData = await countResponse.asJson<IoDataResponse<ISolution>>();
                setTotal(countData['@odata.count'] || 0);
            }

            setSolutions(data.value);
        } catch (error: any) {
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                response: error.response,
                statusCode: error.statusCode
            });
            throw error;
        }
    }, [lastModifiedDate]);

    useEffect(() => {
        if (!get) return;

        setLoading(true);
        loadSolutions(page, showUnmanagedOnly)
            .then(() => setLoading(false))
            .catch((error: Error) => {
                setLoading(false);
                message.error('Failed to load solutions');
            });
    }, [get, connectionName, page, showUnmanagedOnly, loadSolutions]);

    const navigate = useNavigate();

    const onViewClick = (solutionId: string): void => {
        navigate(`/${solutionId}`);
    };

    const columns = useSolutionsColumns(onViewClick);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handleFilterChange = (e: CheckboxChangeEvent) => {
        setPage(1);
        setLastModifiedDate(null);
        setShowUnmanagedOnly(e.target.checked);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (searchTimeout) clearTimeout(searchTimeout);
        setSearchTimeout(setTimeout(() => setSearch(value), 300));
    };

    const copySolutions = useCallback(async (targetSolutionName: string) => {
        if (!post || !get) {
            message.error('API function is not available');
            return;
        }

        setCopying(true);
        setProgress(0);
        setOperationDebugInfo([`Starting copy process for ${selectedRowKeys.length} solutions...`]);

        try {
            // Step 1: Fetch all components from all selected solutions
            let allComponents: ISolutionComponentSummary[] = [];
            setOperationDebugInfo(prev => [...prev, 'Fetching components from selected solutions...']);

            for (const solutionId of selectedRowKeys) {
                try {
                    const query = new URLSearchParams({
                        $filter: `(msdyn_solutionid eq ${solutionId})`,
                        $orderby: 'msdyn_name asc'
                    });
        
                    const res = await get('/api/data/v9.0/msdyn_solutioncomponentsummaries', query);
                    const js = await res.asJson<IoDataResponse<ISolutionComponentSummary>>();
        
                    if (js && Array.isArray(js.value)) {
                        allComponents = [...allComponents, ...js.value];
                        setOperationDebugInfo(prev => [...prev, `Found ${js.value.length} components in solution ${solutionId}.`]);
                    }
                } catch (error) {
                    setOperationDebugInfo(prev => [...prev, `❌ Failed to fetch components from solution ${solutionId}.`]);
                }
            }

            setOperationDebugInfo(prev => [...prev, `Total components to copy: ${allComponents.length}`]);

            // Step 2: Copy each component to the target solution
            let copiedCount = 0;
            for (const component of allComponents) {
                try {
                    const requestBody = {
                        "ComponentId": component.msdyn_objectid,
                        "ComponentType": component.msdyn_componenttype,
                        "SolutionUniqueName": targetSolutionName,
                        "AddRequiredComponents": 'false'
                    };

                    await post('api/data/v9.2/AddSolutionComponent', JSON.stringify(requestBody));
                    copiedCount++;
                    const newProgress = Math.round((copiedCount / allComponents.length) * 100);
                    setProgress(newProgress);
                    setOperationDebugInfo(prev => [...prev, `✅ Copied component: ${component.msdyn_name}`]);
                } catch (error: any) {
                    setOperationDebugInfo(prev => [...prev, `❌ Failed to copy component ${component.msdyn_name}: ${error.message}`]);
                }
            }
            setOperationDebugInfo(prev => [...prev, `✅ Copy process completed.`]);

        } catch (error: any) {
            setOperationDebugInfo(prev => [...prev, `❌ An unexpected error occurred: ${error.message}`]);
            message.error('An unexpected error occurred during the copy process.');
        }

    }, [get, post, selectedRowKeys]);


    const handleSolutionSelectionForCopy = useCallback((solutionName: string) => {
        setIsModalVisible(false);
        copySolutions(solutionName);
    }, [copySolutions]);

    const showCopyToModal = async () => {
        await fetchUnmanagedSolutions();
        setIsModalVisible(true);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: (keys: React.Key[]) => {
            setSelectedRowKeys(keys);
        },
    };

    const filteredSolutions = useMemo(() => {
        if (!search) return solutions;
        const lower = search.toLowerCase();
        return solutions.filter(s =>
            (s.friendlyname && s.friendlyname.toLowerCase().includes(lower)) ||
            (s.uniquename && s.uniquename.toLowerCase().includes(lower)) ||
            (s.version && s.version.toLowerCase().includes(lower)) ||
            (s.createdon && new Date(s.createdon).toLocaleString().toLowerCase().includes(lower)) ||
            (s.modifiedon && new Date(s.modifiedon).toLocaleString().toLowerCase().includes(lower))
        );
    }, [solutions, search]);

    const unmanagedSolutionsColumns = useMemo(() => [
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
            title: 'Action',
            key: 'action',
            render: (_: unknown, record: ISolution) => (
                <Button onClick={() => handleSolutionSelectionForCopy(record.uniquename)}>Select</Button>
            ),
        },
    ], [handleSolutionSelectionForCopy]);

    const handleUnmanagedSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (unmanagedSearchTimeout) clearTimeout(unmanagedSearchTimeout);
        setUnmanagedSearchTimeout(setTimeout(() => setUnmanagedSearch(value), 300));
    };

    const filteredUnmanagedSolutions = useMemo(() => {
        if (!unmanagedSearch) return unmanagedSolutions;
        const lower = unmanagedSearch.toLowerCase();
        return unmanagedSolutions.filter(s =>
            (s.friendlyname && s.friendlyname.toLowerCase().includes(lower)) ||
            (s.uniquename && s.uniquename.toLowerCase().includes(lower)) ||
            (s.version && s.version.toLowerCase().includes(lower)) ||
            (s.createdon && new Date(s.createdon).toLocaleString().toLowerCase().includes(lower)) ||
            (s.modifiedon && new Date(s.modifiedon).toLocaleString().toLowerCase().includes(lower))
        );
    }, [unmanagedSolutions, unmanagedSearch]);

    return (
        <Spin spinning={loading}>
            <Modal
                title="Select an Unmanaged Solution to Copy To"
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
                        onChange={handleUnmanagedSearchChange}
                        style={{ width: '100%', marginBottom: 16 }}
                    />
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                        <Table
                            dataSource={filteredUnmanagedSolutions}
                            columns={unmanagedSolutionsColumns}
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
                title="Copying Solutions"
                open={copying}
                footer={[
                    <Button key="close" onClick={() => { setCopying(false); setSelectedRowKeys([]); }}>
                        Close
                    </Button>
                ]}
                closable={false}
                maskClosable={false}
            >
                <Progress percent={progress} status="active" />
                <div style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '10px' }}>
                    {operationDebugInfo.map((info, index) => (
                        <div key={index}>{info}</div>
                    ))}
                </div>
            </Modal>

            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                    <Checkbox checked={showUnmanagedOnly} onChange={handleFilterChange}>
                        Show unmanaged solutions only
                    </Checkbox>
                    <Input.Search
                        placeholder="Search solutions..."
                        allowClear
                        onChange={handleSearchChange}
                        style={{ width: 300 }}
                    />
                </Space>
                <Button
                    type="primary"
                    onClick={showCopyToModal}
                    disabled={selectedRowKeys.length === 0}
                >
                    Copy to Solution
                </Button>
            </div>
            <Table
                columns={columns}
                loading={loading}
                dataSource={filteredSolutions}
                rowKey="solutionid"
                rowSelection={rowSelection}
                onRow={(record) => ({
                    onDoubleClick: () => onViewClick(record.solutionid),
                })}
                rowClassName={() => 'pointer-cursor'}
                pagination={{
                    current: page,
                    pageSize: PAGE_SIZE,
                    total: total,
                    onChange: handlePageChange,
                }}
            />
        </Spin>
    );
};