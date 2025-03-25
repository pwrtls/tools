import { IAuditLog, IAuditLogDetails, operationLabels } from "models/auditLog";
import { IoDataResponse } from "models/oDataResponse";
import { usePowerToolsApi } from "powertools/apiHook";

// Type definition for error response from the API
interface IODataErrorResponse {
    error?: {
        code?: string;
        message?: string;
    };
}

// Entity metadata interface
interface IEntityMetadata {
    LogicalName: string;
    DisplayName: {
        UserLocalizedLabel: {
            Label: string;
        };
    };
}

// User interface
interface ISystemUser {
    systemuserid: string;
    fullname: string;
}

// Creating a service for audit logs operations
export const useAuditLogsService = () => {
    const { get, getAsJson, download } = usePowerToolsApi();
    
    // Cache for entity display names
    const entityDisplayNameCache = new Map<string, string>();
    
    // Cache for user names
    const userNameCache = new Map<string, string>();

    // Fetch entity display name from metadata
    const fetchEntityDisplayName = async (entityLogicalName: string): Promise<string> => {
        // Check cache first
        if (entityDisplayNameCache.has(entityLogicalName)) {
            return entityDisplayNameCache.get(entityLogicalName)!;
        }
        
        try {
            const query = new URLSearchParams();
            query.set('$select', 'LogicalName,DisplayName');
            query.set('$filter', `LogicalName eq '${entityLogicalName}'`);
            
            const response = await getAsJson<IoDataResponse<IEntityMetadata>>('/api/data/v9.0/EntityDefinitions', query);
            
            if (response && Array.isArray(response.value) && response.value.length > 0) {
                const metadata = response.value[0];
                const displayName = metadata.DisplayName?.UserLocalizedLabel?.Label || entityLogicalName;
                
                // Cache the result
                entityDisplayNameCache.set(entityLogicalName, displayName);
                return displayName;
            }
            
            return entityLogicalName; // Fall back to logical name if display name not found
        } catch (error) {
            console.error(`Error fetching display name for entity ${entityLogicalName}:`, error);
            return entityLogicalName; // Fall back to logical name on error
        }
    };
    
    // Fetch user name from systemuser
    const fetchUserName = async (userId: string): Promise<string> => {
        // Check cache first
        if (userNameCache.has(userId)) {
            return userNameCache.get(userId)!;
        }
        
        try {
            // Remove curly braces if present
            const cleanUserId = userId.replace(/[{}]/g, '');
            
            const query = new URLSearchParams();
            query.set('$select', 'fullname,systemuserid');
            query.set('$filter', `systemuserid eq ${cleanUserId}`);
            
            const response = await getAsJson<IoDataResponse<ISystemUser>>('/api/data/v9.0/systemusers', query);
            
            if (response && Array.isArray(response.value) && response.value.length > 0) {
                const user = response.value[0];
                const fullname = user.fullname || userId;
                
                // Cache the result
                userNameCache.set(userId, fullname);
                return fullname;
            }
            
            return userId; // Fall back to user ID if name not found
        } catch (error) {
            console.error(`Error fetching name for user ${userId}:`, error);
            return userId; // Fall back to user ID on error
        }
    };

    // Fetch audit logs with optional filtering parameters
    const fetchAuditLogs = async (
        startDate?: Date,
        endDate?: Date,
        operation?: number,
        entityName?: string,
        userId?: string,
        pageSize = 50,
        pageNumber = 1
    ): Promise<IoDataResponse<IAuditLog>> => {
        const query = new URLSearchParams();
        
        // Select relevant fields that exist in the Dynamics 365 audit entity
        // Based on documentation: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/audit
        query.set('$select', 'auditid,createdon,operation,action,objecttypecode,attributemask,_userid_value,transactionid');
        
        // Build filter based on parameters
        const filters: string[] = [];
        
        if (startDate) {
            filters.push(`createdon ge ${startDate.toISOString()}`);
        }
        
        if (endDate) {
            filters.push(`createdon le ${endDate.toISOString()}`);
        }
        
        if (operation !== undefined) {
            filters.push(`operation eq ${operation}`);
        }
        
        if (entityName) {
            filters.push(`objecttypecode eq '${entityName}'`);
        }
        
        if (userId) {
            filters.push(`_userid_value eq ${userId}`);
        }
        
        if (filters.length > 0) {
            query.set('$filter', filters.join(' and '));
        }
        
        // Add paging parameters
        query.set('$top', pageSize.toString());
        if (pageNumber > 1) {
            query.set('$skip', ((pageNumber - 1) * pageSize).toString());
        }
        
        // Add ordering by creation date desc
        query.set('$orderby', 'createdon desc');
        
        try {
            // Make the API call
            console.log('Fetching audit logs with params:', Object.fromEntries(query.entries()));
            const data = await getAsJson<IoDataResponse<IAuditLog> | IODataErrorResponse>('/api/data/v9.0/audits', query);
            
            // Check for error response from the API
            const errorResponse = data as IODataErrorResponse;
            if (errorResponse && errorResponse.error) {
                console.error('API returned an error:', errorResponse.error);
                return { value: [], '@odata.context': '', '@odata.count': 0 };
            }
            
            // Process the success response
            const successResponse = data as IoDataResponse<IAuditLog>;
            if (successResponse && Array.isArray(successResponse.value)) {
                // Process each audit log to enhance with additional data
                const enhancedLogs: IAuditLog[] = [];
                
                for (const log of successResponse.value) {
                    const enhancedLog: IAuditLog = {
                        ...log,
                        operation_formatted: operationLabels[log.operation] || `Operation ${log.operation}`
                    };
                    
                    // Fetch entity display name
                    if (log.objecttypecode) {
                        try {
                            const displayName = await fetchEntityDisplayName(log.objecttypecode);
                            enhancedLog.objecttypecode_formatted = displayName;
                        } catch (error) {
                            console.error('Error fetching entity display name:', error);
                        }
                    }
                    
                    // Fetch user name
                    if (log._userid_value) {
                        try {
                            const userName = await fetchUserName(log._userid_value);
                            enhancedLog.username = userName;
                        } catch (error) {
                            console.error('Error fetching user name:', error);
                        }
                    }
                    
                    enhancedLogs.push(enhancedLog);
                }
                
                successResponse.value = enhancedLogs;
                return successResponse;
            } else {
                console.warn('Received unexpected response format from API:', data);
                // Return an empty response to prevent errors
                return { value: [], '@odata.context': '', '@odata.count': 0 };
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            // Return an empty response to prevent errors
            return { value: [], '@odata.context': '', '@odata.count': 0 };
        }
    };

    // Fetch audit log details for a specific audit record
    const fetchAuditDetails = async (auditId: string): Promise<IAuditLogDetails[]> => {
        const query = new URLSearchParams();
        query.set('$select', 'auditdetailid,auditid,attributemask,oldvalue,newvalue,attributename');
        query.set('$filter', `auditid eq ${auditId}`);
        
        try {
            console.log('Fetching audit details for:', auditId);
            const data = await getAsJson<IoDataResponse<IAuditLogDetails> | IODataErrorResponse>('/api/data/v9.0/auditdetails', query);
            
            // Check for error response from the API
            const errorResponse = data as IODataErrorResponse;
            if (errorResponse && errorResponse.error) {
                console.error('API returned an error:', errorResponse.error);
                return [];
            }
            
            // Process the success response
            const successResponse = data as IoDataResponse<IAuditLogDetails>;
            if (successResponse && Array.isArray(successResponse.value)) {
                return successResponse.value;
            } else {
                console.warn('Received unexpected response format from API:', data);
                return [];
            }
        } catch (error) {
            console.error('Error fetching audit details:', error);
            return [];
        }
    };

    // Export audit logs as CSV
    const exportAuditLogsAsCsv = async (
        startDate?: Date,
        endDate?: Date,
        operation?: number,
        entityName?: string,
        userId?: string
    ): Promise<void> => {
        const query = new URLSearchParams();
        
        // Select relevant fields that exist in the Dynamics 365 audit entity
        query.set('$select', 'auditid,createdon,operation,action,objecttypecode,attributemask,_userid_value,transactionid');
        
        // Build filter based on parameters
        const filters: string[] = [];
        
        if (startDate) {
            filters.push(`createdon ge ${startDate.toISOString()}`);
        }
        
        if (endDate) {
            filters.push(`createdon le ${endDate.toISOString()}`);
        }
        
        if (operation !== undefined) {
            filters.push(`operation eq ${operation}`);
        }
        
        if (entityName) {
            filters.push(`objecttypecode eq '${entityName}'`);
        }
        
        if (userId) {
            filters.push(`_userid_value eq ${userId}`);
        }
        
        if (filters.length > 0) {
            query.set('$filter', filters.join(' and '));
        }
        
        // Set large page size for export
        query.set('$top', '5000');
        
        // Add ordering by creation date desc
        query.set('$orderby', 'createdon desc');
        
        try {
            // Make the API call
            console.log('Exporting audit logs with params:', Object.fromEntries(query.entries()));
            const response = await get('/api/data/v9.0/audits', query);
            if (!response) {
                throw new Error('Empty response from API');
            }
            
            const csvData = await response.asCsv();
            if (!csvData) {
                throw new Error('Empty CSV data received');
            }
            
            // Generate a filename with current date
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `audit_logs_${dateStr}.csv`;
            
            // Download the CSV
            await download(csvData, filename, 'text/csv');
            console.log('Successfully downloaded audit logs as CSV');
        } catch (error) {
            console.error('Error exporting audit logs:', error);
            throw error; // Re-throw since UI expects this to handle errors
        }
    };

    return {
        fetchAuditLogs,
        fetchAuditDetails,
        exportAuditLogsAsCsv,
        fetchEntityDisplayName,
        fetchUserName
    };
}; 