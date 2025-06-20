import { useState, useCallback } from 'react';
import { message } from 'antd';
import { ISystemUser, getUserDisplayName } from '../models/systemUser';

type FetchAllUsersInView = (viewId: string) => Promise<ISystemUser[]>;

export const useUserSelection = (
    users: ISystemUser[],
    selectedView: string | undefined,
    fetchAllUsersInView: FetchAllUsersInView
) => {
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [loading, setLoading] = useState(false);

    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const handleSelectAll = useCallback(async () => {
        if (selectedView) {
            // If a view is selected, fetch all users in that view
            setLoading(true);
            message.loading({ content: 'Fetching all users in view...', key: 'loading' });

            try {
                const allUsers = await fetchAllUsersInView(selectedView);
                const allUserKeys = allUsers.map(user => user.systemuserid);
                setSelectedRowKeys(allUserKeys);
                message.success({ content: `Selected ${allUserKeys.length} users from view.`, key: 'loading' });
            } catch (error) {
                message.error({ content: 'Failed to fetch all users in view.', key: 'loading' });
                if (process.env.NODE_ENV === 'development') {
                    console.error('Error selecting all users in view:', error);
                }
            } finally {
                setLoading(false);
            }
        } else {
            // If no view is selected, select all users currently displayed
            const allUserKeys = users.map(user => user.systemuserid);
            setSelectedRowKeys(allUserKeys);
            message.success(`Selected ${allUserKeys.length} users.`);
        }
    }, [selectedView, fetchAllUsersInView, users]);

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        getCheckboxProps: (record: ISystemUser) => ({
            disabled: record.isdisabled,
            name: getUserDisplayName(record),
        }),
        onSelectAll: handleSelectAll,
    };

    return { selectedRowKeys, setSelectedRowKeys, rowSelection, loading };
}; 