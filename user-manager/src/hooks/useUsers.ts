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
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedView, setSelectedView] = useState<string | undefined>();
    const [searchText, setSearchText] = useState('');
    const [hasMore, setHasMore] = useState(true);
    const [nextLink, setNextLink] = useState<string | undefined>();

    const statusColumn = useMemo((): ColumnsType<ISystemUser>[0] => ({
        title: 'Status',
        dataIndex: 'isdisabled',
        key: 'isdisabled',
        onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
        render: (isdisabled: boolean) => {
            if (isdisabled === undefined) return 'Unknown';
            if (isdisabled) return 'Disabled';
            return 'Enabled';
        },
    }), []);

    const defaultColumns = useMemo((): ColumnsType<ISystemUser> => [
        statusColumn,
        { title: 'Full Name', dataIndex: 'fullname', key: 'fullname', onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }) },
        { title: 'Email', dataIndex: 'internalemailaddress', key: 'internalemailaddress', onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }) },
        { title: 'Domain Name', dataIndex: 'domainname', key: 'domainname', onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }) },
    ], [statusColumn]);

    const [columns, setColumns] = useState<ColumnsType<ISystemUser>>(defaultColumns);

    const resetPagination = useCallback(() => {
        setUsers([]);
        setHasMore(true);
        setNextLink(undefined);
    }, []);

    useEffect(() => {
        if (powerTools.isLoaded) {
            setLoading(true);
            resetPagination();
            setSearchText('');
            getSystemUsers(powerTools)
                                .then(result => {
                    // Remove duplicates from initial load
                    const uniqueUsers = result.users.filter((user, index, self) => 
                        index === self.findIndex(u => u.systemuserid === user.systemuserid)
                    );
                    setUsers(uniqueUsers);
                    setHasMore(!!result.nextLink);
                    setNextLink(result.nextLink);
                })
                .finally(() => setLoading(false));
        }
    }, [powerTools, resetPagination]);

    const loadMoreUsers = useCallback(async () => {
        if (!hasMore || loadingMore || !nextLink) {
            return;
        }
        setLoadingMore(true);
        try {
            const viewType = selectedView ? views.find(v => v.id === selectedView)?.type : undefined;
            const result = await getSystemUsers(powerTools, selectedView, viewType, searchText, false, columns, nextLink);
            
            // Prevent duplicates by checking existing user IDs
            setUsers(prev => {
                const existingIds = new Set(prev.map(user => user.systemuserid));
                const newUsers = result.users.filter(user => !existingIds.has(user.systemuserid));

                return [...prev, ...newUsers];
            });
            
            setHasMore(!!result.nextLink);
            setNextLink(result.nextLink);
        } catch (error) {
            console.error('Failed to load more users:', error);
        } finally {
            setLoadingMore(false);
        }
    }, [powerTools, hasMore, loadingMore, nextLink, columns, selectedView, searchText, views]);

    const handleViewChange = useCallback((viewId: string) => {
        setLoading(true);
        setSelectedView(viewId);
        resetPagination();
        setSearchText('');
        
        const selected = views.find(v => v.id === viewId);
        if (!selected) {
            setLoading(false);
            setUsers([]);
            setColumns(defaultColumns);
            return;
        }

        getSystemUsers(powerTools, viewId, selected.type, undefined, false, columns).then(result => {
            // Remove duplicates from initial view load
            const uniqueUsers = result.users.filter((user, index, self) => 
                index === self.findIndex(u => u.systemuserid === user.systemuserid)
            );
            setUsers(uniqueUsers);
            setHasMore(!!result.nextLink);
            setNextLink(result.nextLink);
            if (selected) {
                const parser = new XMLParser({ ignoreAttributes: false });
                const layout = parser.parse(selected.layoutxml);
                const cells = layout.grid.row.cell;
                let newColumns = cells.map((cell: any) => ({
                    title: formatColumnTitle(cell['@_name']),
                    dataIndex: cell['@_name'],
                    key: cell['@_name'],
                    onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
                }));
                if (!newColumns.some((col: any) => col.key === 'isdisabled')) {
                    newColumns = [statusColumn, ...newColumns];
                }
                setColumns(newColumns);
            }
            setLoading(false);
        });
    }, [powerTools, views, statusColumn, defaultColumns, columns, resetPagination]);

    const handleSearch = useCallback((value: string) => {
        setLoading(true);
        resetPagination();
        setSearchText(value);
        
        if (selectedView) {
            // Search within the current view using the current columns
            const selected = views.find(v => v.id === selectedView);
            if (selected) {
                getSystemUsers(powerTools, selected.id, selected.type, value, false, columns)
                    .then(result => {
                        // Remove duplicates from search results
                        const uniqueUsers = result.users.filter((user, index, self) => 
                            index === self.findIndex(u => u.systemuserid === user.systemuserid)
                        );
                        setUsers(uniqueUsers);
                        setHasMore(!!result.nextLink);
                        setNextLink(result.nextLink);
                    })
                    .finally(() => setLoading(false));
            }
        } else {
            // Global search when no view is selected
            getSystemUsers(powerTools, undefined, undefined, value, false, columns)
                .then(result => {
                    // Remove duplicates from global search results
                    const uniqueUsers = result.users.filter((user, index, self) => 
                        index === self.findIndex(u => u.systemuserid === user.systemuserid)
                    );
                    setUsers(uniqueUsers);
                    setHasMore(!!result.nextLink);
                    setNextLink(result.nextLink);
                    setColumns(defaultColumns);
                })
                .finally(() => setLoading(false));
        }
    }, [powerTools, selectedView, views, defaultColumns, columns, resetPagination]);

    const fetchAllUsersInView = useCallback(async (viewId: string) => {
        const selected = views.find(v => v.id === viewId);
        if (selected) {
            const result = await getSystemUsers(powerTools, selected.id, selected.type, undefined, true);
            return result.users;
        }
        return [];
    }, [powerTools, views]);

    const clearViewSelection = useCallback(() => {
        setSelectedView(undefined);
        setColumns(defaultColumns);
        setLoading(true);
        resetPagination();
        setSearchText('');
        getSystemUsers(powerTools).then(result => {
            // Remove duplicates from initial load
            const uniqueUsers = result.users.filter((user, index, self) => 
                index === self.findIndex(u => u.systemuserid === user.systemuserid)
            );
            setUsers(uniqueUsers);
            setHasMore(!!result.nextLink);
            setNextLink(result.nextLink);
        }).finally(() => setLoading(false));
    }, [powerTools, defaultColumns, resetPagination]);

    return { 
        users, 
        columns, 
        loading, 
        loadingMore,
        hasMore,
        selectedView, 
        handleViewChange, 
        handleSearch, 
        fetchAllUsersInView, 
        clearViewSelection,
        loadMoreUsers
    };
}; 