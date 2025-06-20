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

    // Add pagination
    if (!fetchAll) {
        if (nextLink) {
            // The nextLink is a full URL, we need to extract the path and query string
            try {
                const nextUrl = new URL(nextLink);
                url = `${nextUrl.pathname}${nextUrl.search}`;
            } catch (e) {
                console.error("Failed to parse nextLink URL, stopping pagination.", e);
                return { users: [], hasMore: false };
            }
        } else {
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}$top=50`; // Load 50 records per page
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
        const hasMore = !!jsonResult?.["@odata.nextLink"];
        const nextLink = jsonResult?.["@odata.nextLink"];
        
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