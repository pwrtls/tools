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
    
    // Performance: Memoize XML parser to avoid recreation
    const xmlParser = useMemo(() => new XMLParser({ ignoreAttributes: false }), []);
    
    // BUG FIX: Properly initialize and track cancellation
    const abortControllerRef = useRef<AbortController | null>(null);
    const timeoutIdsRef = useRef<Set<NodeJS.Timeout>>(new Set());

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

    // BUG FIX: Enhanced cleanup function with timeout cancellation
    const cleanup = useCallback(() => {
        // Cancel pending HTTP requests
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        
        // Cancel all pending timeouts (XML parsing)
        timeoutIdsRef.current.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        timeoutIdsRef.current.clear();
    }, []);

    // BUG FIX: Create new AbortController for each request
    const createAbortController = useCallback(() => {
        // Clean up previous controller
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        // Create new controller
        const controller = new AbortController();
        abortControllerRef.current = controller;
        return controller;
    }, []);

    // Helper function: Handle successful API response
    const handleApiSuccess = useCallback((controller: AbortController, result: any, updateColumns = false) => {
        if (!controller.signal.aborted) {
            setUsers(result.users);
            setHasMore(result.hasMore);
            setNextLink(result.nextLink);
            
            if (updateColumns) {
                setColumns(defaultColumns);
            }
        }
    }, [defaultColumns]);

    // Helper function: Handle API errors
    const handleApiError = useCallback((controller: AbortController, error: any, context: string) => {
        if (!controller.signal.aborted) {
            if (process.env.NODE_ENV === 'development') {
                console.error(`Failed to ${context}:`, error);
            }
            setUsers([]);
        }
    }, []);

    // Helper function: Handle loading state
    const handleLoadingComplete = useCallback((controller: AbortController) => {
        if (!controller.signal.aborted) {
            setLoading(false);
        }
    }, []);

    // REFACTOR: Extracted restoration logic for empty search
    const restoreViewUsers = useCallback(async (controller: AbortController) => {
        const selected = views.find(v => v.id === selectedView);
        if (selected) {
            try {
                const result = await getSystemUsers(powerTools, selected.id, selected.type, undefined, false, columns, undefined, controller.signal);
                handleApiSuccess(controller, result);
            } catch (error) {
                handleApiError(controller, error, 'restore view users');
            } finally {
                handleLoadingComplete(controller);
            }
        } else {
            setLoading(false);
        }
    }, [selectedView, views, powerTools, columns, handleApiSuccess, handleApiError, handleLoadingComplete]);

    // REFACTOR: Extracted restoration logic for global users
    const restoreAllUsers = useCallback(async (controller: AbortController) => {
        try {
            const result = await getSystemUsers(powerTools, undefined, undefined, undefined, false, defaultColumns, undefined, controller.signal);
            handleApiSuccess(controller, result, true);
        } catch (error) {
            handleApiError(controller, error, 'restore all users');
        } finally {
            handleLoadingComplete(controller);
        }
    }, [powerTools, defaultColumns, handleApiSuccess, handleApiError, handleLoadingComplete]);

    // REFACTOR: Extracted search logic for view search
    const searchInView = useCallback(async (controller: AbortController, searchTerm: string) => {
        const selected = views.find(v => v.id === selectedView);
        if (selected) {
            try {
                const result = await getSystemUsers(powerTools, selected.id, selected.type, searchTerm, false, columns, undefined, controller.signal);
                handleApiSuccess(controller, result);
            } catch (error) {
                handleApiError(controller, error, 'search in view');
            } finally {
                handleLoadingComplete(controller);
            }
        } else {
            setLoading(false);
        }
    }, [selectedView, views, powerTools, columns, handleApiSuccess, handleApiError, handleLoadingComplete]);

    // REFACTOR: Extracted search logic for global search
    const searchGlobally = useCallback(async (controller: AbortController, searchTerm: string) => {
        try {
            const result = await getSystemUsers(powerTools, undefined, undefined, searchTerm, false, columns, undefined, controller.signal);
            handleApiSuccess(controller, result, true);
        } catch (error) {
            handleApiError(controller, error, 'perform global search');
        } finally {
            handleLoadingComplete(controller);
        }
    }, [powerTools, columns, handleApiSuccess, handleApiError, handleLoadingComplete]);

    // Performance: Effect cleanup on unmount
    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    useEffect(() => {
        if (powerTools.isLoaded) {
            const controller = createAbortController();
            setLoading(true);
            resetPagination();
            setSearchText('');
            
            getSystemUsers(powerTools, undefined, undefined, undefined, false, undefined, undefined, controller.signal)
                .then(result => {
                    // Only update state if this request wasn't cancelled
                    if (!controller.signal.aborted) {
                        setUsers(result.users);
                        setHasMore(result.hasMore);
                        setNextLink(result.nextLink);
                    }
                })
                .catch(error => {
                    // Only handle error if not cancelled
                    if (!controller.signal.aborted) {
                        if (process.env.NODE_ENV === 'development') {
                            console.error('Failed to load initial users:', error);
                        }
                        setUsers([]);
                    }
                })
                .finally(() => {
                    // Only update loading state if not cancelled
                    if (!controller.signal.aborted) {
                        setLoading(false);
                    }
                });
        }
    }, [powerTools, resetPagination, createAbortController]);

    const loadMoreUsers = useCallback(async () => {
        if (!hasMore || loadingMore || !nextLink) return;

        const controller = createAbortController();
        setLoadingMore(true);
        
        try {
            const viewType = selectedView ? views.find(v => v.id === selectedView)?.type : undefined;
            const result = await getSystemUsers(powerTools, selectedView, viewType, debouncedSearchText, false, columns, nextLink, controller.signal);
            
            // Only update state if request wasn't cancelled
            if (!controller.signal.aborted) {
                setUsers(prev => [...prev, ...result.users]);
                setHasMore(result.hasMore);
                setNextLink(result.nextLink);
            }
        } catch (error) {
            // Only handle error if not cancelled
            if (!controller.signal.aborted) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Failed to load more users:', error);
                }
            }
        } finally {
            // Only update loading state if not cancelled
            if (!controller.signal.aborted) {
                setLoadingMore(false);
            }
        }
    }, [powerTools, hasMore, loadingMore, nextLink, columns, selectedView, debouncedSearchText, views, createAbortController]);

    const handleViewChange = useCallback((viewId: string) => {
        cleanup(); // Cancel any pending requests and timeouts
        
        const controller = createAbortController();
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

        getSystemUsers(powerTools, viewId, selected.type, undefined, false, columns, undefined, controller.signal)
            .then(result => {
                // Only proceed if request wasn't cancelled
                if (!controller.signal.aborted) {
                    setUsers(result.users);
                    setHasMore(result.hasMore);
                    setNextLink(result.nextLink);
                    
                    if (selected?.layoutxml) {
                        try {
                            // BUG FIX: Track timeout and cancel if component unmounts
                            const timeoutId = setTimeout(() => {
                                // Remove this timeout from tracking
                                timeoutIdsRef.current.delete(timeoutId);
                                
                                // Only update columns if request is still valid
                                if (!controller.signal.aborted) {
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
                                }
                            }, 0);
                            
                            // Track timeout for cleanup
                            timeoutIdsRef.current.add(timeoutId);
                        } catch (error) {
                            if (process.env.NODE_ENV === 'development') {
                                console.error('Failed to process view layout:', error);
                            }
                            setColumns(defaultColumns);
                        }
                    }
                }
            })
            .catch(error => {
                // Only handle error if not cancelled
                if (!controller.signal.aborted) {
                    if (process.env.NODE_ENV === 'development') {
                        console.error('Failed to load view data:', error);
                    }
                    setUsers([]);
                }
            })
            .finally(() => {
                // Only update loading state if not cancelled
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });
    }, [powerTools, views, statusColumn, defaultColumns, columns, resetPagination, cleanup, xmlParser, createAbortController]);

    // REFACTOR: Simplified and more readable search effect
    useEffect(() => {
        const controller = createAbortController();
        setLoading(true);
        resetPagination();
        
        // Handle empty search - restore original list
        if (!debouncedSearchText.trim()) {
            if (selectedView) {
                restoreViewUsers(controller);
            } else {
                restoreAllUsers(controller);
            }
            return;
        }
        
        // Handle search with text
        if (selectedView) {
            searchInView(controller, debouncedSearchText);
        } else {
            searchGlobally(controller, debouncedSearchText);
        }
    }, [debouncedSearchText, selectedView, restoreViewUsers, restoreAllUsers, searchInView, searchGlobally, resetPagination, createAbortController]);

    const handleSearch = useCallback((value: string) => {
        setSearchText(value);
    }, []);

    const fetchAllUsersInView = useCallback(async (viewId: string) => {
        const selected = views.find(v => v.id === viewId);
        if (selected) {
            try {
                const controller = createAbortController();
                const result = await getSystemUsers(powerTools, selected.id, selected.type, undefined, true, undefined, undefined, controller.signal);
                return controller.signal.aborted ? [] : result.users;
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Failed to fetch all users in view:', error);
                }
                return [];
            }
        }
        return [];
    }, [powerTools, views, createAbortController]);

    const clearViewSelection = useCallback(() => {
        cleanup(); // Cancel any pending requests and timeouts
        
        const controller = createAbortController();
        setSelectedView(undefined);
        setColumns(defaultColumns);
        setLoading(true);
        resetPagination();
        setSearchText('');
        
        getSystemUsers(powerTools, undefined, undefined, undefined, false, undefined, undefined, controller.signal)
            .then(result => {
                if (!controller.signal.aborted) {
                    setUsers(result.users);
                    setHasMore(result.hasMore);
                    setNextLink(result.nextLink);
                }
            })
            .catch(error => {
                if (!controller.signal.aborted) {
                    if (process.env.NODE_ENV === 'development') {
                        console.error('Failed to clear view selection:', error);
                    }
                    setUsers([]);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });
    }, [powerTools, defaultColumns, resetPagination, cleanup, createAbortController]);

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