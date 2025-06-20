import { ISystemUser } from "../models/systemUser";
import { PowerTools } from "../powertools/context";
import { ColumnsType } from "antd/es/table";

interface PaginatedResult {
    users: ISystemUser[];
    hasMore: boolean;
    nextLink?: string;
}

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
                console.log('Cannot paginate view queries with $skip, stopping pagination');
                return { users: [], hasMore: false };
            }
        } else {
            // Full OData nextLink URL - this should work for view queries
            try {
                const nextUrl = new URL(nextLink);
                url = `${nextUrl.pathname}${nextUrl.search}`;
            } catch (e) {
                console.error("Failed to parse nextLink URL, stopping pagination.", e);
                return { users: [], hasMore: false };
            }
        }
    } else {
        // First page or fetchAll - build the initial URL
        if (viewId && viewType) {
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
                    console.error("Failed to parse nextLink URL, stopping pagination.", e);
                    queryUrl = ''; 
                }
            } else {
                queryUrl = ''; 
            }

        } while (queryUrl);

        return { users: allUsers, hasMore: false };
    } else {
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
    }
};

// Helper function to build search filter based on displayed columns
const buildSearchFilter = (search: string, columns: ColumnsType<ISystemUser>): string => {
    const searchableColumns = columns
        .filter((col): col is { dataIndex: string } => 
            'dataIndex' in col && 
            typeof col.dataIndex === 'string' && 
            col.dataIndex !== undefined
        )
        .map(col => col.dataIndex)
        .filter(dataIndex => {
            // Exclude certain columns that shouldn't be searched
            const excludedColumns = ['systemuserid', 'isdisabled'];
            return !excludedColumns.includes(dataIndex);
        });

    if (searchableColumns.length === 0) {
        return '';
    }

    // Log which columns are being searched (for debugging)
    console.log('Searching across columns:', searchableColumns);

    // Build OData filter for all searchable columns
    const filters = searchableColumns.map(column => `contains(${column},'${search}')`);
    return filters.join(' or ');
}; 