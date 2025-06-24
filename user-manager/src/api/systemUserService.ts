import { ISystemUser } from "../models/systemUser";
import { PowerTools } from "../powertools/context";
import { ColumnsType } from "antd/es/table";

interface PaginatedResult {
    users: ISystemUser[];
    hasMore: boolean;
    nextLink?: string;
}

// Utility function to sanitize and escape OData query values
const sanitizeODataValue = (value: string): string => {
    if (!value || typeof value !== 'string') {
        return '';
    }
    
    // Remove potentially dangerous characters and escape single quotes
    return value
        .replace(/'/g, "''")  // Escape single quotes for OData
        .replace(/[<>\"&]/g, '') // Remove HTML/XML special characters
        .replace(/[;()]/g, '')   // Remove SQL injection characters
        .trim()
        .substring(0, 100); // Limit length to prevent extremely long queries
};

// Validate column names to prevent injection
const isValidColumnName = (columnName: string): boolean => {
    // Only allow alphanumeric characters and underscores, starting with a letter
    return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(columnName);
};

export const getSystemUsers = async (
    powerTools: PowerTools, 
    viewId?: string, 
    viewType?: 'system' | 'personal', 
    search?: string, 
    fetchAll: boolean = false,
    columns?: ColumnsType<ISystemUser>,
    nextLink?: string
): Promise<PaginatedResult> => {
    if (!powerTools.get) {
        return { users: [], hasMore: false };
    }

    let url = `/api/data/v9.2/systemusers`;
    let allUsers: ISystemUser[] = [];

    // If we have a nextLink, use it directly
    if (nextLink && !fetchAll) {
        if (nextLink.startsWith('SKIP:')) {
            // Our internal skip token - only works for non-view queries
            const skipValue = parseInt(nextLink.split(':')[1]);
            
            // Validate skip value
            if (isNaN(skipValue) || skipValue < 0) {
                throw new Error('Invalid pagination token');
            }
            
            // Only use $skip for basic queries, not for view queries
            if (!viewId || !viewType) {
                url += `?$select=fullname,internalemailaddress,domainname,isdisabled`;
                
                if (search && columns) {
                    const searchFilters = buildSearchFilter(search, columns);
                    if (searchFilters) {
                        url += `&$filter=${searchFilters}`;
                    }
                }
                url += `&$skip=${skipValue}&$top=50`;
            } else {
                // For view queries, we can't use $skip - return no more data
                return { users: [], hasMore: false };
            }
        } else {
            // Full OData nextLink URL - this should work for view queries
            try {
                const nextUrl = new URL(nextLink);
                url = `${nextUrl.pathname}${nextUrl.search}`;
            } catch (e) {
                throw new Error('Invalid pagination URL provided');
            }
        }
    } else {
        // First page or fetchAll - build the initial URL
        if (viewId && viewType) {
            // Validate viewId to prevent injection
            if (!/^[a-fA-F0-9-]{36}$/.test(viewId)) {
                throw new Error('Invalid view ID format');
            }
            
            if (viewType === 'system') {
                url += `?savedQuery=${viewId}`;
            } else {
                url += `?userQuery=${viewId}`;
            }
            
            // Add search filter to view queries
            if (search && columns) {
                const searchFilters = buildSearchFilter(search, columns);
                if (searchFilters) {
                    url += `&$filter=${searchFilters}`;
                }
            }
        } else {
            let select = `?$select=fullname,internalemailaddress,domainname,isdisabled`;
            if (fetchAll) {
                select = `?$select=systemuserid`;
            }
            url += select;
            
            // Add search filter for global search
            if (search && columns) {
                const searchFilters = buildSearchFilter(search, columns);
                if (searchFilters) {
                    url += `&$filter=${searchFilters}`;
                }
            }
        }

        // Add pagination for first page (not fetchAll)
        if (!fetchAll) {
            const separator = url.includes('?') ? '&' : '?';
            if (viewId && viewType) {
                // For view queries, try to get more records since pagination might not work
                url += `${separator}$top=200`;
            } else {
                // For basic queries, use standard page size
                url += `${separator}$top=50`;
            }
        }
    }

    if (fetchAll) {
        let queryUrl = url;

        do {
            try {
                const result = await powerTools.get(queryUrl);
                const jsonResult = await result.asJson<{ value: ISystemUser[]; "@odata.nextLink"?: string }>();
                
                if (jsonResult?.value) {
                    allUsers = allUsers.concat(jsonResult.value);
                }

                const fullNextLink = jsonResult ? jsonResult["@odata.nextLink"] : undefined;
                if (fullNextLink) {
                    try {
                        const nextUrl = new URL(fullNextLink);
                        queryUrl = `${nextUrl.pathname}${nextUrl.search}`;
                    } catch (e) {
                        throw new Error('Failed to parse pagination URL during fetch all operation');
                    }
                } else {
                    queryUrl = ''; 
                }
            } catch (error) {
                throw new Error(`Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

        } while (queryUrl);

        return { users: allUsers, hasMore: false };
    } else {
        try {
            const result = await powerTools.get(url);
            const jsonResult = await result.asJson<{ value: ISystemUser[]; "@odata.nextLink"?: string }>();
            const users = jsonResult?.value || [];
            
            // Single pagination logic: determine if there are more records
            let hasMore = false;
            let nextLink: string | undefined;
            
            // Determine if there are more records
            if (jsonResult?.["@odata.nextLink"]) {
                // API provided its own nextLink (most reliable)
                nextLink = jsonResult["@odata.nextLink"];
                hasMore = true;
            } else if (users.length === 50 && (!viewId || !viewType)) {
                // Got exactly the page size we requested for basic queries, likely more records exist
                // Only use manual pagination for non-view queries
                const currentSkip = url.includes('$skip=') ? 
                    parseInt(url.match(/\$skip=(\d+)/)?.[1] || '0') : 0;
                const nextSkip = currentSkip + users.length;
                
                // Use our simple internal format for next page
                nextLink = `SKIP:${nextSkip}`;
                hasMore = true;
            } else if (users.length === 200 && viewId && viewType) {
                // Got full page for view query (200 records), but we can't manually paginate
                // View queries should provide @odata.nextLink if more data exists
                hasMore = false;
            } else {
                // Got fewer records than requested, this is likely the last page
                hasMore = false;
            }
            
            return { users, hasMore, nextLink };
        } catch (error) {
            throw new Error(`Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
};

// Helper function to build search filter based on displayed columns
const buildSearchFilter = (search: string, columns: ColumnsType<ISystemUser>): string => {
    // Sanitize search input
    const sanitizedSearch = sanitizeODataValue(search);
    
    if (!sanitizedSearch) {
        return '';
    }

    const searchableColumns = columns
        .filter((col): col is { dataIndex: string } => 
            'dataIndex' in col && 
            typeof col.dataIndex === 'string' && 
            col.dataIndex !== undefined
        )
        .map(col => col.dataIndex)
        .filter(dataIndex => {
            // Exclude certain columns that shouldn't be searched and validate column names
            const excludedColumns = ['systemuserid', 'isdisabled'];
            return !excludedColumns.includes(dataIndex) && isValidColumnName(dataIndex);
        });

    if (searchableColumns.length === 0) {
        return '';
    }

    // Build OData filter for all searchable columns with properly escaped values
    const filters = searchableColumns.map(column => `contains(${column},'${sanitizedSearch}')`);
    return filters.join(' or ');
}; 