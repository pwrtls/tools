import { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
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

// Custom hook for debouncing
const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
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
    
    // Performance: Debounce search input
    const debouncedSearchText = useDebounce(searchText, 300);
    
    // Performance: Memoize XML parser to avoid recreating
    const xmlParser = useMemo(() => new XMLParser({ ignoreAttributes: false }), []);
    
    // Performance: Use ref to track cleanup
    const abortControllerRef = useRef<AbortController | null>(null);

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

    // Performance: Cleanup function
    const cleanup = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    // Performance: Effect cleanup on unmount
    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    useEffect(() => {
        if (powerTools.isLoaded) {
            setLoading(true);
            resetPagination();
            setSearchText('');
            getSystemUsers(powerTools)
                .then(result => {
                    setUsers(result.users);
                    setHasMore(result.hasMore);
                    setNextLink(result.nextLink);
                })
                .catch(error => {
                    if (process.env.NODE_ENV === 'development') {
                        console.error('Failed to load initial users:', error);
                    }
                    setUsers([]);
                })
                .finally(() => setLoading(false));
        }
    }, [powerTools, resetPagination]);

    const loadMoreUsers = useCallback(async () => {
        if (!hasMore || loadingMore || !nextLink) return;

        setLoadingMore(true);
        try {
            const viewType = selectedView ? views.find(v => v.id === selectedView)?.type : undefined;
            const result = await getSystemUsers(powerTools, selectedView, viewType, debouncedSearchText, false, columns, nextLink);
            setUsers(prev => [...prev, ...result.users]);
            setHasMore(result.hasMore);
            setNextLink(result.nextLink);
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to load more users:', error);
            }
        } finally {
            setLoadingMore(false);
        }
    }, [powerTools, hasMore, loadingMore, nextLink, columns, selectedView, debouncedSearchText, views]);

    const handleViewChange = useCallback((viewId: string) => {
        cleanup(); // Cancel any pending requests
        
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

        getSystemUsers(powerTools, viewId, selected.type, undefined, false, columns)
            .then(result => {
                setUsers(result.users);
                setHasMore(result.hasMore);
                setNextLink(result.nextLink);
                if (selected?.layoutxml) {
                    try {
                        // Performance: Parse XML asynchronously using setTimeout
                        setTimeout(() => {
                            try {
                                const layout = xmlParser.parse(selected.layoutxml);
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
                            } catch (parseError) {
                                if (process.env.NODE_ENV === 'development') {
                                    console.error('Failed to parse view layout XML:', parseError);
                                }
                                setColumns(defaultColumns);
                            }
                        }, 0);
                    } catch (error) {
                        if (process.env.NODE_ENV === 'development') {
                            console.error('Failed to process view layout:', error);
                        }
                        setColumns(defaultColumns);
                    }
                }
            })
            .catch(error => {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Failed to load view data:', error);
                }
                setUsers([]);
            })
            .finally(() => setLoading(false));
    }, [powerTools, views, statusColumn, defaultColumns, columns, resetPagination, cleanup, xmlParser]);

    // Performance: Search effect with debouncing
    useEffect(() => {
        cleanup(); // Cancel any pending requests
        setLoading(true);
        resetPagination();
        
        // BUG FIX: Handle empty search - restore original list
        // This ensures that when users clear the search box, they see the full list again
        if (!debouncedSearchText.trim()) {
            if (selectedView) {
                // Restore view users when search is cleared
                const selected = views.find(v => v.id === selectedView);
                if (selected) {
                    getSystemUsers(powerTools, selected.id, selected.type, undefined, false, columns)
                        .then(result => {
                            setUsers(result.users);
                            setHasMore(result.hasMore);
                            setNextLink(result.nextLink);
                        })
                        .catch(error => {
                            if (process.env.NODE_ENV === 'development') {
                                console.error('Failed to restore view users:', error);
                            }
                            setUsers([]);
                        })
                        .finally(() => setLoading(false));
                } else {
                    setLoading(false);
                }
            } else {
                // Restore all users when no view is selected and search is cleared
                getSystemUsers(powerTools, undefined, undefined, undefined, false, defaultColumns)
                    .then(result => {
                        setUsers(result.users);
                        setHasMore(result.hasMore);
                        setNextLink(result.nextLink);
                        setColumns(defaultColumns);
                    })
                    .catch(error => {
                        if (process.env.NODE_ENV === 'development') {
                            console.error('Failed to restore all users:', error);
                        }
                        setUsers([]);
                    })
                    .finally(() => setLoading(false));
            }
            return;
        }
        
        // Handle search with text - existing search functionality
        if (selectedView) {
            // Search within the current view using the current columns
            const selected = views.find(v => v.id === selectedView);
            if (selected) {
                getSystemUsers(powerTools, selected.id, selected.type, debouncedSearchText, false, columns)
                    .then(result => {
                        setUsers(result.users);
                        setHasMore(result.hasMore);
                        setNextLink(result.nextLink);
                    })
                    .catch(error => {
                        if (process.env.NODE_ENV === 'development') {
                            console.error('Failed to search in view:', error);
                        }
                        setUsers([]);
                    })
                    .finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        } else {
            // Global search when no view is selected
            getSystemUsers(powerTools, undefined, undefined, debouncedSearchText, false, columns)
                .then(result => {
                    setUsers(result.users);
                    setHasMore(result.hasMore);
                    setNextLink(result.nextLink);
                    setColumns(defaultColumns);
                })
                .catch(error => {
                    if (process.env.NODE_ENV === 'development') {
                        console.error('Failed to perform global search:', error);
                    }
                    setUsers([]);
                })
                .finally(() => setLoading(false));
        }
    }, [debouncedSearchText, powerTools, selectedView, views, defaultColumns, columns, resetPagination, cleanup]);

    const handleSearch = useCallback((value: string) => {
        setSearchText(value);
    }, []);

    const fetchAllUsersInView = useCallback(async (viewId: string) => {
        const selected = views.find(v => v.id === viewId);
        if (selected) {
            try {
                const result = await getSystemUsers(powerTools, selected.id, selected.type, undefined, true);
                return result.users;
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Failed to fetch all users in view:', error);
                }
                return [];
            }
        }
        return [];
    }, [powerTools, views]);

    const clearViewSelection = useCallback(() => {
        cleanup(); // Cancel any pending requests
        
        setSelectedView(undefined);
        setColumns(defaultColumns);
        setLoading(true);
        resetPagination();
        setSearchText('');
        getSystemUsers(powerTools)
            .then(result => {
                setUsers(result.users);
                setHasMore(result.hasMore);
                setNextLink(result.nextLink);
            })
            .catch(error => {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Failed to clear view selection:', error);
                }
                setUsers([]);
            })
            .finally(() => setLoading(false));
    }, [powerTools, defaultColumns, resetPagination, cleanup]);

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