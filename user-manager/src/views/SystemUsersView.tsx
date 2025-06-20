import { useState } from "react";
import { Spin, Typography } from "antd";
import { useViews } from "../hooks/useViews";
import { useUsers } from "../hooks/useUsers";
import { useRoles } from "../hooks/useRoles";
import { useUserSelection } from "../hooks/useUserSelection";
import { Toolbar } from "../components/Toolbar";
import { UserTable } from "../components/UserTable";
import { AssignRolesModal } from "../components/AssignRolesModal";

const { Title } = Typography;

export const SystemUsersView = () => {
    const { views, groupedViews, loading: viewsLoading } = useViews();
    const {
        users,
        columns,
        loading: usersLoading,
        selectedView,
        handleViewChange,
        handleSearch,
        fetchAllUsersInView,
        clearViewSelection
    } = useUsers(views);
    const { roles, loading: rolesLoading, loadRoles, hasLoaded } = useRoles();
    const { selectedRowKeys, setSelectedRowKeys, rowSelection } = useUserSelection(users, selectedView, fetchAllUsersInView);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const handleAssignRolesClick = async () => {
        // Load roles if not already loaded
        if (!hasLoaded) {
            await loadRoles();
        }
        setIsModalVisible(true);
    };

    const handleAssignmentComplete = () => {
        setSelectedRowKeys([]);
    };

    const handleClearSelection = () => {
        setSelectedRowKeys([]);
    };

    // Progressive loading: Only block UI for essential data (views + users)
    const isEssentialLoading = viewsLoading || usersLoading;
    const hasSelected = selectedRowKeys.length > 0;

    return (
        <Spin spinning={isEssentialLoading} tip="Loading user data...">
            <Title level={2}>User Manager</Title>
            <Toolbar
                groupedViews={groupedViews}
                handleViewChange={handleViewChange}
                clearViewSelection={clearViewSelection}
                handleSearch={handleSearch}
                selectedView={selectedView}
                handleAssignRolesClick={handleAssignRolesClick}
                hasSelected={hasSelected}
                selectedRowCount={selectedRowKeys.length}
                onClearSelection={handleClearSelection}
                rolesLoading={rolesLoading}
            />
            <UserTable
                loading={usersLoading}
                users={users}
                columns={columns}
                rowSelection={rowSelection}
            />
            <AssignRolesModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                roles={roles}
                selectedRowKeys={selectedRowKeys}
                onAssignmentComplete={handleAssignmentComplete}
            />
            {/* Show a subtle indicator if roles are still loading */}
            {rolesLoading && (
                <div style={{ 
                    position: 'fixed', 
                    bottom: 20, 
                    right: 20, 
                    background: '#1890ff', 
                    color: 'white', 
                    padding: '8px 12px', 
                    borderRadius: 4,
                    fontSize: '12px',
                    zIndex: 1000
                }}>
                    Loading security roles...
                </div>
            )}
        </Spin>
    );
}; 