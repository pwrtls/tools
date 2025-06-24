import { useState } from "react";
import { Spin, Typography } from "antd";
import { useViews } from "../hooks/useViews";
import { useUsers } from "../hooks/useUsers";
import { useRoles } from "../hooks/useRoles";
import { useUserSelection } from "../hooks/useUserSelection";
import { Toolbar } from "../components/Toolbar";
import { UserTable } from "../components/UserTable";
import { AssignRolesModal } from "../components/AssignRolesModal";
import { ErrorBoundary } from "../components/ErrorBoundary";

const { Title } = Typography;

export const SystemUsersView = () => {
    const { views, groupedViews, loading: viewsLoading } = useViews();
    const {
        users,
        columns,
        loading: usersLoading,
        loadingMore,
        hasMore,
        selectedView,
        handleViewChange,
        handleSearch,
        fetchAllUsersInView,
        clearViewSelection,
        loadMoreUsers
    } = useUsers(views);
    const { roles, loading: rolesLoading } = useRoles();
    const { selectedRowKeys, setSelectedRowKeys, rowSelection } = useUserSelection(users, selectedView, fetchAllUsersInView);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const handleAssignRolesClick = () => {
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
        <ErrorBoundary>
            <Spin spinning={isEssentialLoading} tip="Loading user data...">
                <Title level={2}>User Manager</Title>
                
                <ErrorBoundary fallback={
                    <div style={{ padding: '20px', textAlign: 'center', color: '#ff4d4f' }}>
                        Failed to load toolbar. Please refresh the page.
                    </div>
                }>
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
                </ErrorBoundary>
                
                <ErrorBoundary fallback={
                    <div style={{ padding: '20px', textAlign: 'center', color: '#ff4d4f' }}>
                        Failed to load user table. Please try refreshing the page or selecting a different view.
                    </div>
                }>
                    <UserTable
                        loading={usersLoading}
                        loadingMore={loadingMore}
                        hasMore={hasMore}
                        users={users}
                        columns={columns}
                        rowSelection={rowSelection}
                        onLoadMore={loadMoreUsers}
                    />
                </ErrorBoundary>
                
                <ErrorBoundary fallback={
                    <div style={{ padding: '20px', textAlign: 'center', color: '#ff4d4f' }}>
                        Failed to load role assignment dialog. Please try again.
                    </div>
                }>
                    <AssignRolesModal
                        visible={isModalVisible}
                        onClose={() => setIsModalVisible(false)}
                        roles={roles}
                        selectedRowKeys={selectedRowKeys}
                        onAssignmentComplete={handleAssignmentComplete}
                    />
                </ErrorBoundary>
                
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
        </ErrorBoundary>
    );
}; 