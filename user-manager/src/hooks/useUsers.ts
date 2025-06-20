import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { ISystemUser } from '../models/systemUser';
import { getSystemUsers } from '../api/systemUserService';
import { PowerToolsContext } from '../powertools/context';
import { ColumnsType } from 'antd/es/table';
import { XMLParser } from 'fast-xml-parser';
import { IView } from '../models/view';

const formatColumnTitle = (name: string) => {
    const result = name.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1);
};

export const useUsers = (views: IView[]) => {
    const powerTools = useContext(PowerToolsContext);
    const [users, setUsers] = useState<ISystemUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedView, setSelectedView] = useState<string | undefined>();

    const statusColumn = useMemo((): ColumnsType<ISystemUser>[0] => ({
        title: 'Status',
        dataIndex: 'isdisabled',
        key: 'isdisabled',
        render: (isdisabled: boolean) => {
            if (isdisabled === undefined) return 'Unknown';
            if (isdisabled) return 'Disabled';
            return 'Enabled';
        },
    }), []);

    const defaultColumns = useMemo((): ColumnsType<ISystemUser> => [
        statusColumn,
        { title: 'Full Name', dataIndex: 'fullname', key: 'fullname' },
        { title: 'Email', dataIndex: 'internalemailaddress', key: 'internalemailaddress' },
        { title: 'Domain Name', dataIndex: 'domainname', key: 'domainname' },
    ], [statusColumn]);

    const [columns, setColumns] = useState<ColumnsType<ISystemUser>>(defaultColumns);

    useEffect(() => {
        if (powerTools.isLoaded) {
            setLoading(true);
            getSystemUsers(powerTools)
                .then(setUsers)
                .finally(() => setLoading(false));
        }
    }, [powerTools]);

    const handleViewChange = useCallback((viewId: string) => {
        setLoading(true);
        setSelectedView(viewId);
        const selected = views.find(v => v.id === viewId);
        if (!selected) {
            setLoading(false);
            setUsers([]);
            setColumns(defaultColumns);
            return;
        }

        getSystemUsers(powerTools, viewId, selected.type, undefined, false).then(users => {
            setUsers(users);
            if (selected) {
                const parser = new XMLParser({ ignoreAttributes: false });
                const layout = parser.parse(selected.layoutxml);
                const cells = layout.grid.row.cell;
                let newColumns = cells.map((cell: any) => ({
                    title: formatColumnTitle(cell['@_name']),
                    dataIndex: cell['@_name'],
                    key: cell['@_name'],
                }));
                if (!newColumns.some((col: any) => col.key === 'isdisabled')) {
                    newColumns = [statusColumn, ...newColumns];
                }
                setColumns(newColumns);
            }
            setLoading(false);
        });
    }, [powerTools, views, statusColumn, defaultColumns]);

    const handleSearch = useCallback((value: string) => {
        setLoading(true);
        getSystemUsers(powerTools, undefined, undefined, value, false)
            .then(users => {
                setUsers(users);
                setColumns(defaultColumns);
                setSelectedView(undefined);
            })
            .finally(() => setLoading(false));
    }, [powerTools, defaultColumns]);

    const fetchAllUsersInView = useCallback(async (viewId: string) => {
        const selected = views.find(v => v.id === viewId);
        if (selected) {
            return await getSystemUsers(powerTools, selected.id, selected.type, undefined, true);
        }
        return [];
    }, [powerTools, views]);

    const clearViewSelection = useCallback(() => {
        setSelectedView(undefined);
        setColumns(defaultColumns);
        setLoading(true);
        getSystemUsers(powerTools).then(setUsers).finally(() => setLoading(false));
    }, [powerTools, defaultColumns]);

    return { users, columns, loading, selectedView, handleViewChange, handleSearch, fetchAllUsersInView, clearViewSelection };
}; 