import { useState, useCallback } from 'react';
import { message, Table } from 'antd';
import { ISystemUser } from '../models/systemUser';

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

    const handleSelectAllFromView = useCallback(async () => {
        if (!selectedView) {
            message.warning('Please select a view first.');
            return;
        }
        setLoading(true);
        message.loading({ content: 'Fetching all users in view...', key: 'loading' });

        const allUsers = await fetchAllUsersInView(selectedView);
        const allUserKeys = allUsers.map(user => user.systemuserid);
        setSelectedRowKeys(allUserKeys);

        setLoading(false);
        message.success({ content: `Selected ${allUserKeys.length} users.`, key: 'loading' });
    }, [selectedView, fetchAllUsersInView]);

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        getCheckboxProps: (record: ISystemUser) => ({
            disabled: record.isdisabled,
            name: record.fullname,
        }),
        selections: [
            Table.SELECTION_ALL,
            Table.SELECTION_INVERT,
            Table.SELECTION_NONE,
            {
                key: 'all-view-users',
                text: 'Select All Users in View',
                onSelect: handleSelectAllFromView,
            },
            {
                key: 'all-current-users',
                text: 'Select All on Current Page',
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

    return { selectedRowKeys, setSelectedRowKeys, rowSelection, loading };
}; 