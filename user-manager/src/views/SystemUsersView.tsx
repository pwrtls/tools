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
    const { roles, loading: rolesLoading } = useRoles();
    const { selectedRowKeys, setSelectedRowKeys, rowSelection, loading: selectionLoading } = useUserSelection(users, selectedView, fetchAllUsersInView);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const handleAssignRolesClick = () => {
        setIsModalVisible(true);
    };

    const handleAssignmentComplete = () => {
        setSelectedRowKeys([]);
    };

    const isLoading = viewsLoading || usersLoading || rolesLoading || selectionLoading;
    const hasSelected = selectedRowKeys.length > 0;

    return (
        <Spin spinning={isLoading} tip="Loading...">
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
        </Spin>
    );
}; 