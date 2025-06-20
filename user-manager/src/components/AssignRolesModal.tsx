import { useState, useMemo } from 'react';
import { Modal, Input, Checkbox, Row, Col, Progress, message } from 'antd';
import { IRole } from '../models/role';
import { assignRolesToUser } from '../api/roleService';
import { PowerToolsContext } from '../powertools/context';
import { useContext } from 'react';

interface AssignRolesModalProps {
    visible: boolean;
    onClose: () => void;
    roles: IRole[];
    selectedRowKeys: React.Key[];
    onAssignmentComplete: () => void;
}

export const AssignRolesModal = ({ visible, onClose, roles, selectedRowKeys, onAssignmentComplete }: AssignRolesModalProps) => {
    const powerTools = useContext(PowerToolsContext);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [roleSearch, setRoleSearch] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [assignmentProgress, setAssignmentProgress] = useState(0);

    const filteredRoles = useMemo(() => {
        return roles.filter(role => role.name.toLowerCase().includes(roleSearch.toLowerCase()));
    }, [roles, roleSearch]);

    const handleOk = async () => {
        if (selectedRowKeys.length === 0 || selectedRoles.length === 0) {
            message.warning('No users or roles selected.');
            return;
        }

        setIsAssigning(true);
        setAssignmentProgress(0);
        const totalUsers = selectedRowKeys.length;
        const failedAssignments: { userId: React.Key; error: string }[] = [];

        for (let i = 0; i < totalUsers; i++) {
            const userId = selectedRowKeys[i];
            try {
                await assignRolesToUser(powerTools, userId as string, selectedRoles);
            } catch (error: any) {
                failedAssignments.push({ userId, error: error.message });
            }
            setAssignmentProgress(Math.round(((i + 1) / totalUsers) * 100));
        }

        setIsAssigning(false);
        setAssignmentProgress(0);
        setSelectedRoles([]);
        setRoleSearch('');
        onAssignmentComplete();
        onClose();

        if (failedAssignments.length > 0) {
            const successfulCount = totalUsers - failedAssignments.length;
            message.warning(`Assignment completed. ${successfulCount} users updated, ${failedAssignments.length} failed.`);
            console.error("Failed role assignments:", failedAssignments);
        } else {
            message.success(`Successfully assigned ${selectedRoles.length} roles to ${totalUsers} users.`);
        }
    };

    const handleCancel = () => {
        if (isAssigning) return;
        onClose();
        setSelectedRoles([]);
        setRoleSearch('');
    };

    return (
        <Modal
            title="Assign Security Roles"
            open={visible}
            onOk={handleOk}
            onCancel={handleCancel}
            okText="Assign"
            cancelText="Cancel"
            okButtonProps={{ loading: isAssigning }}
            closable={!isAssigning}
            maskClosable={!isAssigning}
        >
            <Input
                placeholder="Search roles"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                style={{ marginBottom: 16 }}
                disabled={isAssigning}
            />
            <Checkbox.Group
                style={{ width: '100%', maxHeight: '400px', overflowY: 'auto' }}
                onChange={(checkedValues) => setSelectedRoles(checkedValues as string[])}
                value={selectedRoles}
                disabled={isAssigning}
            >
                <Row>
                    {filteredRoles.map(role => (
                        <Col span={24} key={role.roleid}>
                            <Checkbox value={role.roleid}>{role.name}</Checkbox>
                        </Col>
                    ))}
                </Row>
            </Checkbox.Group>
            {isAssigning && (
                <div style={{ marginTop: 16 }}>
                    <Progress percent={assignmentProgress} />
                </div>
            )}
        </Modal>
    );
}; 