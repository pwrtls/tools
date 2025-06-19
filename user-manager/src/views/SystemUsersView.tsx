import { useContext, useEffect, useMemo, useState } from "react";
import { PowerToolsContext } from "../powertools/context";
import { IView } from "../models/view";
import { ISystemUser } from "../models/systemUser";
import { getViewsForEntity } from "../api/viewService";
import { getSystemUsers } from "../api/systemUserService";
import { Table, Select, Input, Spin, Col, Row, Typography, Tag, Button, Modal, Checkbox, message } from "antd";
import { XMLParser } from "fast-xml-parser";
import { ColumnsType } from "antd/es/table";
import { getRoles, assignRolesToUser } from "../api/roleService";
import { IRole } from "../models/role";

const { Title } = Typography;

const formatColumnTitle = (name: string) => {
    const result = name.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1);
}

export const SystemUsersView = () => {
    const powerTools = useContext(PowerToolsContext);
    const [views, setViews] = useState<IView[]>([]);
    const [users, setUsers] = useState<ISystemUser[]>([]);
    const [columns, setColumns] = useState<ColumnsType<ISystemUser>>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Loading...");
    const [selectedView, setSelectedView] = useState<string | undefined>();
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [roles, setRoles] = useState<IRole[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [roleSearch, setRoleSearch] = useState('');

    const defaultColumns: ColumnsType<ISystemUser> = useMemo(() => [
        { title: 'Full Name', dataIndex: 'fullname', key: 'fullname' },
        { title: 'Email', dataIndex: 'internalemailaddress', key: 'internalemailaddress' },
        { title: 'Domain Name', dataIndex: 'domainname', key: 'domainname' },
    ], []);

    useEffect(() => {
        if (powerTools.isLoaded) {
            setLoading(true);
            const viewPromise = getViewsForEntity(powerTools, 'systemuser').then(setViews);
            const userPromise = getSystemUsers(powerTools).then(users => {
                setUsers(users);
                setColumns(defaultColumns);
            });
            const rolesPromise = getRoles(powerTools).then(setRoles);

            Promise.all([viewPromise, userPromise, rolesPromise]).finally(() => {
                setLoading(false);
            });
        }
    }, [powerTools, defaultColumns]);

    const handleViewChange = (viewId: string) => {
        setLoading(true);
        setSelectedView(viewId);
        const selected = views.find(v => v.id === viewId);
        if (!selected) {
            setLoading(false);
            return;
        }

        getSystemUsers(powerTools, viewId, selected.type, undefined, false).then(users => {
            setUsers(users);
            if (selected) {
                const parser = new XMLParser({ ignoreAttributes: false });
                const layout = parser.parse(selected.layoutxml);
                const cells = layout.grid.row.cell;
                const newColumns = cells.map((cell: any) => ({
                    title: formatColumnTitle(cell['@_name']),
                    dataIndex: cell['@_name'],
                    key: cell['@_name'],
                }));
                setColumns(newColumns);
            }
            setLoading(false);
        });
    };

    const handleSearch = (value: string) => {
        setLoading(true);
        getSystemUsers(powerTools, undefined, undefined, value, false).then(users => {
            setUsers(users);
            setLoading(false);
        });
    };

    const handleSelectAllFromView = async () => {
        if (!selectedView) {
            message.warning('Please select a view first.');
            return;
        }
        setLoading(true);
        setLoadingMessage("Fetching all user IDs from the selected view...");

        const selected = views.find(v => v.id === selectedView);
        if (selected) {
            const allUsers = await getSystemUsers(powerTools, selected.id, selected.type, undefined, true);
            const allUserKeys = allUsers.map(user => user.systemuserid);
            setSelectedRowKeys(allUserKeys);
        }

        setLoading(false);
        setLoadingMessage("Loading...");
    };

    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const handleAssignRolesClick = () => {
        setIsModalVisible(true);
    };

    const handleModalOk = async () => {
        if (selectedRowKeys.length === 0 || selectedRoles.length === 0) {
            message.warning('No users or roles selected.');
            return;
        }

        setLoading(true);
        setLoadingMessage('Assigning roles...');

        try {
            for (const userId of selectedRowKeys) {
                await assignRolesToUser(powerTools, userId as string, selectedRoles);
            }
            message.success(`Successfully assigned ${selectedRoles.length} roles to ${selectedRowKeys.length} users.`);
        } catch (error: any) {
            message.error(`Failed to assign roles: ${error.message}`);
        } finally {
            setLoading(false);
            setIsModalVisible(false);
            setSelectedRoles([]);
            setRoleSearch('');
        }
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
        setSelectedRoles([]);
        setRoleSearch('');
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        selections: [
            Table.SELECTION_ALL,
            Table.SELECTION_INVERT,
            Table.SELECTION_NONE,
            {
                key: 'all-users',
                text: 'Select All Users',
                onSelect: () => {
                    const allUserKeys = users.map(user => user.systemuserid);
                    setSelectedRowKeys(allUserKeys);
                },
            },
            {
                key: 'clear-all',
                text: 'Clear All Selections',
                onSelect: () => {
                    setSelectedRowKeys([]);
                },
            }
        ],
    };
    const hasSelected = selectedRowKeys.length > 0;

    // Group views by type for better organization
    const groupedViews = useMemo(() => {
        const personal = views.filter(v => v.type === 'personal');
        const system = views.filter(v => v.type === 'system');
        return { personal, system };
    }, [views]);

    // GUARANTEED DE-DUPLICATION: No matter what the API returns, this ensures the list is unique.
    const uniqueRoles = useMemo(() => {
        const seen = new Set();
        return roles.filter(role => {
            const duplicate = seen.has(role.name);
            seen.add(role.name);
            return !duplicate;
        });
    }, [roles]);

    const filteredRoles = useMemo(() => {
        return uniqueRoles.filter(role => role.name.toLowerCase().includes(roleSearch.toLowerCase()));
    }, [uniqueRoles, roleSearch]);

    return (
        <Spin spinning={loading} tip={loadingMessage}>
            <Title level={2}>User Manager</Title>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col>
                    <Select
                        style={{ width: 350 }}
                        placeholder="Select a view"
                        onChange={handleViewChange}
                        allowClear
                        onClear={() => {
                            setSelectedView(undefined);
                            setColumns(defaultColumns);
                            getSystemUsers(powerTools).then(setUsers);
                        }}
                    >
                        {groupedViews.system.length > 0 && (
                            <Select.OptGroup label="System Views">
                                {groupedViews.system.map(view => (
                                    <Select.Option key={view.id} value={view.id} label={view.name}>
                                        <Tag color="blue">System</Tag> 
                                        {view.name}
                                        {view.isdefault && <Tag color="orange" style={{ marginLeft: 4 }}>Default</Tag>}
                                    </Select.Option>
                                ))}
                            </Select.OptGroup>
                        )}
                        {groupedViews.personal.length > 0 && (
                            <Select.OptGroup label="Personal Views">
                                {groupedViews.personal.map(view => (
                                    <Select.Option key={view.id} value={view.id} label={view.name}>
                                        <Tag color="green">Personal</Tag> 
                                        {view.name}
                                        {view.ownerid && (
                                            <span style={{ fontSize: '0.8em', color: '#666', marginLeft: 4 }}>
                                                ({view.ownerid.name || view.ownerid._value || 'Unknown Owner'})
                                            </span>
                                        )}
                                    </Select.Option>
                                ))}
                            </Select.OptGroup>
                        )}
                    </Select>
                </Col>
                <Col>
                    <Input.Search
                        placeholder="Search users"
                        onSearch={handleSearch}
                        disabled={!!selectedView}
                        style={{ width: 300 }}
                    />
                </Col>
            </Row>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Button type="primary" onClick={handleAssignRolesClick} disabled={!hasSelected}>
                    Assign Security Roles
                </Button>
                <Button onClick={handleSelectAllFromView} disabled={!selectedView}>
                    Select All Users from View
                </Button>
                <span style={{ marginLeft: 8 }}>
                    {hasSelected ? `Selected ${selectedRowKeys.length} items` : ''}
                </span>
            </div>
            <Table
                rowSelection={rowSelection}
                columns={columns}
                dataSource={users}
                rowKey="systemuserid"
            />
            <Modal
                title="Assign Security Roles"
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
                okText="Assign"
                cancelText="Cancel"
            >
                <Input
                    placeholder="Search roles"
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    style={{ marginBottom: 16 }}
                />
                <Checkbox.Group
                    style={{ width: '100%' }}
                    onChange={(checkedValues) => setSelectedRoles(checkedValues as string[])}
                    value={selectedRoles}
                >
                    <Row>
                        {filteredRoles.map(role => (
                            <Col span={24} key={role.roleid}>
                                <Checkbox value={role.roleid}>{role.name}</Checkbox>
                            </Col>
                        ))}
                    </Row>
                </Checkbox.Group>
            </Modal>
        </Spin>
    );
}; 