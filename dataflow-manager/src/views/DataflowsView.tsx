import React, { useContext, useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Select, message, Spin, Space, Typography, Alert, Card } from 'antd';
import { EditOutlined, UserOutlined, BugOutlined, ReloadOutlined } from '@ant-design/icons';
import { IDataflow, IUser, IDataflowOwnerUpdateRequest } from '../models/dataflow';
import { useDataflowService } from '../api/dataflowService';
import { PowerToolsContext } from '../powertools/context';
import { usePowerToolsApi } from '../powertools/apiHook';

const { Title } = Typography;
const { Option } = Select;

export const DataflowsView: React.FC = () => {
    const { connectionName, isLoaded } = useContext(PowerToolsContext);
    const { getAsJson, postAsJson } = usePowerToolsApi();
    const { getDataflows, getUsers, updateDataflowOwner } = useDataflowService(getAsJson, isLoaded);
    
    const [loading, setLoading] = useState(true);
    const [dataflows, setDataflows] = useState<IDataflow[]>([]);
    const [users, setUsers] = useState<IUser[]>([]);
    const [userSearchLoading, setUserSearchLoading] = useState(false);
    const [selectedDataflow, setSelectedDataflow] = useState<IDataflow | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [modalVisible, setModalVisible] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string>('');
    const [debugInfo, setDebugInfo] = useState<any>(null);

    const runDiagnostics = async () => {
        try {
            console.log('Running diagnostics...');
            setDebugInfo(null);
            
            const diagnostics: any = {
                powerToolsAvailable: typeof window.PowerTools !== 'undefined',
                powerToolsLoaded: window.PowerTools?.isLoaded(),
                powerToolsVersion: window.PowerTools?.version,
                connectionName: connectionName,
                isLoaded: isLoaded,
                hasGetAsJson: typeof getAsJson === 'function',
                hasPostAsJson: typeof postAsJson === 'function',
                timestamp: new Date().toISOString()
            };

            console.log('Basic diagnostics:', diagnostics);
            setDebugInfo(diagnostics);
            console.log('Complete diagnostics:', diagnostics);
            
        } catch (error) {
            console.error('Diagnostics failed:', error);
            setDebugInfo({ 
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');
            
            console.log('PowerTools Status:', { 
                isLoaded, 
                connectionName, 
                powerToolsAvailable: typeof window.PowerTools !== 'undefined',
                powerToolsLoaded: window.PowerTools?.isLoaded(),
                hasGetAsJson: typeof getAsJson === 'function'
            });

            if (!isLoaded || !window.PowerTools?.isLoaded()) {
                setError('PowerTools is not loaded yet. Please wait for PowerTools to initialize...');
                return;
            }

            if (!connectionName) {
                setError('No Power Platform connection selected. Please select an environment in PowerTools.');
                return;
            }

            if (typeof getAsJson !== 'function') {
                setError('PowerTools API methods not available. Please check your PowerTools connection.');
                return;
            }

            // Wait a bit more to ensure connection is stable
            await new Promise(resolve => setTimeout(resolve, 1000));

            const [dataflowsData, usersData] = await Promise.all([
                getDataflows(),
                getUsers()
            ]);
            
            console.log('=== DEBUGGING OWNER MAPPING ===');
            console.log('Raw dataflows data:', dataflowsData);
            console.log('Raw users data:', usersData);
            
            // Get all owner IDs from dataflows
            const ownerIds = dataflowsData
                .filter(df => df.owner?.id)
                .map(df => df.owner!.id);
            console.log('Owner IDs from dataflows:', ownerIds);
            
            // Get all user IDs from users
            const userIds = usersData.map(user => user.id);
            console.log('User IDs from users array:', userIds);
            
            // Check for matches
            const matchingIds = ownerIds.filter(ownerId => userIds.includes(ownerId));
            const nonMatchingIds = ownerIds.filter(ownerId => !userIds.includes(ownerId));
            console.log('Matching owner IDs:', matchingIds);
            console.log('Non-matching owner IDs:', nonMatchingIds);
            
            // Map owner IDs to actual user names from the users data
            // Note: dataflow.owner.id contains systemuserid (from _ownerid_value)
            // We need to match this against user.systemUserId
            const dataflowsWithOwnerNames = dataflowsData.map(dataflow => {
                if (dataflow.owner?.id) {
                    // Try to find user by systemUserId (since _ownerid_value is systemuserid)
                    const ownerUser = usersData.find(user => user.systemUserId === dataflow.owner!.id);
                    console.log(`🔍 Mapping dataflow "${dataflow.name}" owner:`);
                    console.log(`   - Dataflow owner ID (systemuserid): ${dataflow.owner.id}`);
                    console.log(`   - Found matching user:`, ownerUser ? `YES - ${ownerUser.name} (systemUserId: ${ownerUser.systemUserId})` : 'NO');
                    
                    if (ownerUser) {
                        console.log(`   ✅ Successfully mapped to: ${ownerUser.name}`);
                        return {
                            ...dataflow,
                            owner: {
                                id: dataflow.owner.id, // Keep the systemuserid for consistency
                                name: ownerUser.name,
                                email: ownerUser.email
                            }
                        };
                    } else {
                        console.log(`   ❌ No user found with systemUserId matching: ${dataflow.owner.id}`);
                        console.log(`   📋 Available user systemUserIds:`, usersData.map(u => u.systemUserId));
                    }
                }
                return dataflow;
            });
            
            console.log('Final dataflows with owner names:', dataflowsWithOwnerNames);
            console.log('=== END DEBUGGING ===');
            
            setDataflows(dataflowsWithOwnerNames);
            setUsers(usersData);
            
            if (dataflowsWithOwnerNames.length === 0) {
                setError('No dataflows found in the current environment. This could be normal if no dataflows exist, or there may be permission issues.');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setError(`Failed to load data: ${errorMessage}`);
            message.error('Failed to load dataflows and users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only load data when PowerTools is fully loaded AND we have a connection
        if (isLoaded && window.PowerTools?.isLoaded() && connectionName) {
            loadData();
        }
    }, [connectionName, isLoaded]);

    const handleAssignOwner = (dataflow: IDataflow) => {
        setSelectedDataflow(dataflow);
        setSelectedUserId('');
        setModalVisible(true);
    };

    const handleModalOk = async () => {
        if (!selectedDataflow || !selectedUserId) {
            message.error('Please select a user to assign as owner');
            return;
        }

        const selectedUser = users.find(u => u.id === selectedUserId);
        if (!selectedUser) {
            message.error('Selected user not found');
            return;
        }

        try {
            setUpdating(true);
            
            // Look up the current owner's Azure AD Object ID
            // The selectedDataflow.owner?.id contains systemuserid, but we need azureactivedirectoryobjectid
            let previousOwnerAzureId = '';
            if (selectedDataflow.owner?.id) {
                console.log('Looking up current owner Azure ID for systemuserid:', selectedDataflow.owner.id);
                
                // First try to find the owner in our loaded users by systemUserId
                const ownerUser = users.find(user => user.systemUserId === selectedDataflow.owner!.id);
                if (ownerUser && ownerUser.azureAdObjectId) {
                    previousOwnerAzureId = ownerUser.azureAdObjectId;
                    console.log('Found current owner Azure ID from loaded users:', previousOwnerAzureId);
                } else {
                    // Fallback: make an API call to get the specific user's Azure AD Object ID
                    try {
                        const ownerLookupUrl = `/api/data/v9.2/systemusers(${selectedDataflow.owner.id})`;
                        const ownerLookupParams = new URLSearchParams();
                        ownerLookupParams.append('$select', 'systemuserid,azureactivedirectoryobjectid,fullname');
                        
                        const ownerResponse = await getAsJson<{systemuserid: string, azureactivedirectoryobjectid?: string, fullname?: string}>(ownerLookupUrl, ownerLookupParams);
                        previousOwnerAzureId = ownerResponse.azureactivedirectoryobjectid || selectedDataflow.owner.id;
                        console.log('Found current owner Azure ID via API lookup:', previousOwnerAzureId);
                    } catch (ownerLookupError) {
                        console.warn('Could not lookup current owner Azure ID, using systemuserid:', ownerLookupError);
                        previousOwnerAzureId = selectedDataflow.owner.id;
                    }
                }
            }
            
            const updateRequest: IDataflowOwnerUpdateRequest = {
                newOwnerName: selectedUser.name,
                newOwnerUserId: selectedUser.id, // This is now the Azure AD Object ID
                previousOwnerUserId: previousOwnerAzureId
            };

            console.log('===== ID TRACE DEBUG =====');
            console.log('Selected User Object:', selectedUser);
            console.log('selectedUser.id (newOwnerUserId):', selectedUser.id);
            console.log('selectedUser.systemUserId:', selectedUser.systemUserId);
            console.log('selectedUser.azureAdObjectId:', selectedUser.azureAdObjectId);
            console.log('previousOwnerAzureId:', previousOwnerAzureId);
            console.log('Target ID to investigate: 2842494b-2ac3-4151-8211-02555a3ca4fb');
            console.log('Is newOwnerUserId the target ID?', selectedUser.id === '2842494b-2ac3-4151-8211-02555a3ca4fb');
            console.log('Is previousOwnerUserId the target ID?', previousOwnerAzureId === '2842494b-2ac3-4151-8211-02555a3ca4fb');
            console.log('===========================');
            console.log('Update request with correct IDs:', updateRequest);

            await updateDataflowOwner(
                selectedDataflow.workspaceId || '2907c6d4-b9fc-ee08-b734-b0cb22538609',
                selectedDataflow.id,
                updateRequest,
                postAsJson,
                getAsJson
            );

            message.success(`Successfully assigned ${selectedUser.name} as owner of ${selectedDataflow.name}`);
            
            // Update the local state
            setDataflows(prev => prev.map(df => 
                df.id === selectedDataflow.id 
                    ? { ...df, owner: { id: selectedUser.id, name: selectedUser.name, email: selectedUser.email } }
                    : df
            ));
            
            setModalVisible(false);
            setSelectedDataflow(null);
            setSelectedUserId('');
        } catch (error) {
            console.error('Error updating dataflow owner:', error);
            message.error('Failed to update dataflow owner');
        } finally {
            setUpdating(false);
        }
    };

    const handleModalCancel = () => {
        setModalVisible(false);
        setSelectedDataflow(null);
        setSelectedUserId('');
    };

    const handleRetry = () => {
        loadData();
    };

    // Debounced function to fetch users
    const debouncedUserSearch = useCallback(
        debounce(async (searchText: string) => {
            if (!searchText || searchText.trim().length < 2) { // Optional: Minimum search length
                // If search is cleared or too short, load initial/all users or an empty list
                // For now, let's clear users or load a small default set if search is empty
                // setUsers([]); // Or fetch a default list: setUsers(await getUsers());
                // setUserSearchLoading(false);
                // return;
            }
            console.log('Debounced search for:', searchText);
            setUserSearchLoading(true);
            try {
                const fetchedUsers = await getUsers(searchText);
                setUsers(fetchedUsers);
            } catch (err) {
                console.error('Error fetching users during search:', err);
                message.error('Failed to search users');
                setUsers([]); // Clear users on error
            } finally {
                setUserSearchLoading(false);
            }
        }, 500), // 500ms debounce delay
        [getUsers, isLoaded] // Ensure getUsers is stable or correctly re-bound
    );

    const handleUserSearch = (searchText: string) => {
        // setUserSearchText(searchText); // Update search text state
        console.log('User search input:', searchText);
        debouncedUserSearch(searchText);
    };

    // Initial load of users (optional, if you want a pre-filled list before searching)
    useEffect(() => {
        const loadInitialUsers = async () => {
            if (isLoaded && modalVisible) { // Only load if modal is visible and API is ready
                setUserSearchLoading(true);
                try {
                    const initialUsers = await getUsers(); // Fetch without search term
                    setUsers(initialUsers);
                } catch (error) {
                    console.error('Error fetching initial users:', error);
                    message.error('Failed to load initial user list');
                } finally {
                    setUserSearchLoading(false);
                }
            }
        };
        loadInitialUsers();
    }, [isLoaded, modalVisible]); // Reload if modal becomes visible

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: IDataflow) => (
                <Space>
                    <strong>{text}</strong>
                    {record.description && <span style={{ color: '#666' }}>- {record.description}</span>}
                </Space>
            ),
        },
        {
            title: 'Current Owner',
            dataIndex: ['owner', 'name'],
            key: 'owner',
            render: (text: string, record: IDataflow) => (
                <Space>
                    <UserOutlined />
                    <span>{text || 'Unknown'}</span>
                    {record.owner?.email && <span style={{ color: '#666' }}>({record.owner.email})</span>}
                </Space>
            ),
        },
        {
            title: 'Workspace',
            dataIndex: 'workspaceName',
            key: 'workspace',
        },
        {
            title: 'Modified',
            dataIndex: 'modifiedDateTime',
            key: 'modified',
            render: (text: string) => text ? new Date(text).toLocaleDateString() : 'Unknown',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (text: any, record: IDataflow) => (
                <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => handleAssignOwner(record)}
                    size="small"
                >
                    Assign Owner
                </Button>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>Dataflow Manager</Title>
            <p>Manage dataflow ownership assignments across your Power Platform environment.</p>
            
            {error && (
                <Alert
                    message="Connection Issue"
                    description={
                        <div>
                            <p>{error}</p>
                            <Space style={{ marginTop: '8px' }}>
                                <Button type="primary" onClick={handleRetry} icon={<ReloadOutlined />}>
                                    Retry
                                </Button>
                                <Button onClick={runDiagnostics} icon={<BugOutlined />}>
                                    Run Diagnostics
                                </Button>
                            </Space>
                        </div>
                    }
                    type="warning"
                    showIcon
                    style={{ marginBottom: '16px' }}
                />
            )}

            <Card title="Connection Status" style={{ marginBottom: '16px' }}>
                <p><strong>Connection:</strong> {connectionName || 'Not connected'}</p>
                <p><strong>PowerTools Loaded:</strong> {isLoaded ? 'Yes' : 'No'}</p>
                <p><strong>PowerTools Available:</strong> {typeof window.PowerTools !== 'undefined' ? 'Yes' : 'No'}</p>
                {typeof window.PowerTools !== 'undefined' && (
                    <p><strong>PowerTools Version:</strong> {window.PowerTools.version}</p>
                )}
                <p><strong>API Methods Available:</strong> {typeof getAsJson === 'function' && typeof postAsJson === 'function' ? 'Yes' : 'No'}</p>
                
                <Space style={{ marginTop: '8px' }}>
                    <Button onClick={runDiagnostics} icon={<BugOutlined />}>
                        Run Diagnostics
                    </Button>
                    <Button onClick={handleRetry} icon={<ReloadOutlined />}>
                        Refresh Data
                    </Button>
                </Space>
            </Card>

            {debugInfo && (
                <Card title="Diagnostic Information" style={{ marginBottom: '16px' }}>
                    <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', fontSize: '12px' }}>
                        {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                </Card>
            )}
            
            <Spin spinning={loading}>
                {dataflows.length === 0 && !loading ? (
                    <Alert
                        message="No Dataflows Found"
                        description="There are no dataflows available in the current environment. This could be because:
                        1. No dataflows exist in this environment
                        2. You don't have permission to view dataflows
                        3. The environment doesn't have dataflows enabled"
                        type="info"
                        showIcon
                        style={{ marginBottom: '16px' }}
                    />
                ) : (
                    <Table
                        columns={columns}
                        dataSource={dataflows}
                        rowKey="id"
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} dataflows`,
                        }}
                    />
                )}
            </Spin>

            <Modal
                title={`Assign Owner - ${selectedDataflow?.name}`}
                open={modalVisible}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
                confirmLoading={updating}
                okText="Assign Owner"
                cancelText="Cancel"
            >
                <div style={{ marginBottom: '16px' }}>
                    <p><strong>Current Owner:</strong> {selectedDataflow?.owner?.name || 'Unknown'}</p>
                    <p><strong>Dataflow:</strong> {selectedDataflow?.name}</p>
                </div>
                
                <div>
                    <label style={{ display: 'block', marginBottom: '8px' }}>
                        <strong>Select New Owner:</strong>
                    </label>
                    <Select
                        style={{ width: '100%' }}
                        placeholder="Type to search for a user..."
                        value={selectedUserId}
                        onChange={setSelectedUserId}
                        showSearch
                        onSearch={handleUserSearch}
                        filterOption={false} // Server-side filtering, so disable client-side
                        notFoundContent={userSearchLoading ? <Spin size="small" /> : (users.length === 0 ? 'No users found' : null)}
                        loading={userSearchLoading}
                        // listHeight={256} // Keep if needed
                        // virtual={false} // Keep if needed
                        options={users.map(user => ({
                            value: user.id,
                            label: `${user.name}${user.email ? ` (${user.email})` : ''}`,
                            key: user.id
                        }))}
                    />
                </div>
            </Modal>
        </div>
    );
};

// Helper debounce function (can be moved to a utils file)
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const debounced = (...args: Parameters<F>) => {
        if (timeout !== null) {
            clearTimeout(timeout);
            timeout = null;
        }
        timeout = setTimeout(() => func(...args), waitFor);
    };

    return debounced as (...args: Parameters<F>) => ReturnType<F>;
}