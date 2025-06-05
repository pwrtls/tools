import { IDataflow, IUser, IDataflowOwnerUpdateRequest } from '../models/dataflow';
import { IoDataResponse } from '../models/oDataResponse';

// Define Dataverse response interfaces
interface DataverseResponse<T> {
  value: T[];
  "@odata.nextLink"?: string;
  "@odata.count"?: number;
  error?: {
    code?: string;
    message?: string;
  };
}

interface DataverseDataflow {
    msdyn_dataflowid: string;
    msdyn_name: string;
    msdyn_description?: string;
    createdon?: string;
    modifiedon?: string;
    statecode?: number;
    statuscode?: number;
    _ownerid_value?: string;
    ownerid?: {
        systemuserid: string;
        fullname?: string;
        internalemailaddress?: string;
    };
}

interface DataverseUser {
    systemuserid: string;
    azureactivedirectoryobjectid?: string;
    fullname?: string;
    internalemailaddress?: string;
    domainname?: string;
    isdisabled?: boolean;
    accessmode?: number;
}

// Note: User assertion tokens for OBO flow are now captured and stored during connection creation
// The backend automatically uses stored tokens for connections configured with OBO flow

// Service function to get dataflows using PowerTools API hook pattern
export const useDataflowService = (getAsJson: <T>(url: string, query?: URLSearchParams, headers?: Record<string, string>) => Promise<T>, isLoaded: boolean) => {
    
    const getDataflows = async (): Promise<IDataflow[]> => {
        try {
            // Check if the PowerTools API is available and initialized
            if (!isLoaded) {
                console.warn('API not initialized, cannot get dataflows');
                throw new Error('PowerTools API not initialized. Please ensure you are running within PowerTools and have a valid connection.');
            }
            
            // Try different possible entity set names for dataflows
            const possibleEntitySets = [
                'msdyn_dataflows',
                'dataflows', 
                'msdyn_dataflow',
                'dataflow'
            ];

            let dataflowData: DataverseResponse<DataverseDataflow> | null = null;
            let workingEntitySet: string = '';
            let lastError: Error | null = null;

            for (const entitySet of possibleEntitySets) {
                try {
                    // Create URL parameters in the proper format expected by Dataverse API
                    let params = new URLSearchParams();
                    params.append('$select', 'msdyn_dataflowid,msdyn_name,msdyn_description,createdon,modifiedon,statecode,statuscode,_ownerid_value');
                    
                    // Base filter for active dataflows
                    let filterQuery = 'statecode eq 0';
                    params.append('$filter', filterQuery);
                    
                    // Add pagination and ordering
                    params.append('$top', '50'); // Limit results
                    params.append('$orderby', 'modifiedon desc');
                    
                    // Use the same URL pattern as flowchart
                    const url = `/api/data/v9.2/${entitySet}`;
                    
                    try {
                        const response = await getAsJson<DataverseResponse<DataverseDataflow>>(url, params);
                        
                        if (response && response.value) {
                            dataflowData = response;
                            workingEntitySet = entitySet;
                            break;
                        } else {
                            continue;
                        }
                    } catch (error: any) {
                        lastError = error;
                        continue;
                    }
                } catch (error: any) {
                    lastError = error;
                    
                    // If it's a "not found" error, continue to next entity set
                    if (error.message && (
                        error.message.includes('Not Found') ||
                        error.message.includes('not found') ||
                        error.message.includes('404')
                    )) {
                        continue;
                    }
                    
                    // For other errors, continue but log them
                    console.warn(`Error with ${entitySet}:`, error.message);
                    continue;
                }
            }

            if (!dataflowData || !workingEntitySet) {
                console.warn('No dataflow entity sets found or accessible');
                // Return empty array instead of throwing error
                return [];
            }

            if (!dataflowData.value || !Array.isArray(dataflowData.value)) {
                console.warn('No dataflows found or invalid response format');
                return [];
            }

            // Transform Dataverse response to our IDataflow interface
            const transformedData = dataflowData.value.map((item: DataverseDataflow) => {
                return {
                    id: item.msdyn_dataflowid,
                    name: item.msdyn_name || 'Unnamed Dataflow',
                    description: item.msdyn_description || '',
                    owner: item._ownerid_value ? {
                        id: item._ownerid_value,
                        name: item._ownerid_value, // Will be mapped to actual name in the UI
                        email: ''
                    } : undefined,
                    modifiedDateTime: item.modifiedon,
                    createdDateTime: item.createdon,
                    workspaceId: '2907c6d4-b9fc-ee08-b734-b0cb22538609', // Default workspace ID
                    workspaceName: 'Power Platform Environment'
                };
            });

            return transformedData;
            
        } catch (error: any) {
            console.error('Error fetching dataflows:', error);
            // Return empty array instead of throwing error
            return [];
        }
    };

    const getUsers = async (searchText?: string): Promise<IUser[]> => {
        try {
            // Check if the PowerTools API is available and initialized
            if (!isLoaded) {
                console.warn('API not initialized, cannot get users');
                throw new Error('PowerTools API not initialized. Please ensure you are running within PowerTools and have a valid connection.');
            }
            
            // Create URL parameters in the proper format expected by Dataverse API
            let params = new URLSearchParams();
            params.append('$select', 'systemuserid,azureactivedirectoryobjectid,fullname,internalemailaddress,domainname');
            
            // Base filter for active users only, exclude support users
            let filterQuery = 'isdisabled eq false and accessmode ne 4';

            if (searchText && searchText.trim() !== '') {
                const escapedSearchText = searchText.replace(/'/g, "''"); // Escape single quotes for OData
                filterQuery += ` and (contains(fullname, '${escapedSearchText}') or contains(internalemailaddress, '${escapedSearchText}') or contains(domainname, '${escapedSearchText}'))`;
            }
            
            params.append('$filter', filterQuery);
            
            // Add pagination and ordering
            params.append('$top', '25'); // Limit results, even for search
            params.append('$orderby', 'fullname asc');

            // Use the same URL pattern as flowchart
            const url = '/api/data/v9.2/systemusers';
            
            const response = await getAsJson<DataverseResponse<DataverseUser>>(url, params);

            if (!response || !response.value || !Array.isArray(response.value)) {
                console.warn('No users found or invalid response format');
                return [];
            }

            // Transform Dataverse response to our IUser interface
            const transformedData = response.value.map((user: DataverseUser) => ({
                id: user.azureactivedirectoryobjectid || user.systemuserid,
                systemUserId: user.systemuserid,
                azureAdObjectId: user.azureactivedirectoryobjectid,
                name: user.fullname || 'Unknown User',
                email: user.internalemailaddress || '',
                userPrincipalName: user.domainname || user.internalemailaddress || ''
            }));

            return transformedData;
            
        } catch (error: any) {
            console.error('Error fetching users:', error);
            
            // Return mock data as fallback for development/testing
            return [
                {
                    id: 'de2cb672-db17-4cfb-aa79-54d825ef0823',
                    systemUserId: 'de2cb672-db17-4cfb-aa79-54d825ef0823',
                    azureAdObjectId: 'de2cb672-db17-4cfb-aa79-54d825ef0823',
                    name: 'Stephanie Wymore (Mock)',
                    email: 'stephanie.wymore@company.com',
                    userPrincipalName: 'stephanie.wymore@company.com'
                },
                {
                    id: '810c9a57-7ccd-40a1-8638-f90dca28507c',
                    systemUserId: '810c9a57-7ccd-40a1-8638-f90dca28507c',
                    azureAdObjectId: '810c9a57-7ccd-40a1-8638-f90dca28507c',
                    name: 'Current Owner (Mock)',
                    email: 'current.owner@company.com',
                    userPrincipalName: 'current.owner@company.com'
                },
                {
                    id: 'f1e3d584-ec28-5dcf-bb90-65d936f1ef34',
                    systemUserId: 'f1e3d584-ec28-5dcf-bb90-65d936f1ef34',
                    azureAdObjectId: 'f1e3d584-ec28-5dcf-bb90-65d936f1ef34',
                    name: 'John Smith (Mock)',
                    email: 'john.smith@company.com',
                    userPrincipalName: 'john.smith@company.com'
                }
            ];
        }
    };

    const updateDataflowOwner = async (
        groupId: string,
        dataflowId: string,
        updateRequest: IDataflowOwnerUpdateRequest,
        postAsJson: <T>(url: string, body?: any, headers?: Record<string, string>) => Promise<T>,
        getAsJson: <T>(url: string, query?: URLSearchParams, headers?: Record<string, string>) => Promise<T>
    ): Promise<void> => {
        // For Power Query API, we need to use a special approach since it's an external API
        // The PowerTools proxy system is designed for Dataverse APIs, not external services
        // We'll use a special URL pattern that the backend can detect and handle appropriately
        const powerQueryUrl = `https://us.prod.powerquery.microsoft.com/api/dataflow/group/${groupId}/dataflow/${dataflowId}/update-owner`;
        
        // Use a special prefix to signal to the backend that this is an external API call
        const proxiedUrl = `__external__${powerQueryUrl}`;
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-ms-client-request-id': crypto.randomUUID(),
            'x-ms-client-session-id': crypto.randomUUID(),
            'x-ms-host-context-type': 'PowerPlatformDataflowsBootstrap',
        };

        // For Power Query operations, the backend will automatically use stored user assertion tokens
        // for connections configured with OBO flow, or fall back to application flow
        console.log('Making Power Query API call - backend will handle authentication based on connection configuration');
        
        try {
            const apiResponse = await postAsJson(proxiedUrl, updateRequest, headers);
            console.log('Dataflow owner updated successfully');

        } catch (error: any) {
            console.error('Error updating dataflow owner:', error.message);
            throw new Error(`Failed to update dataflow owner: ${error.message}`);
        }
    };

    return {
        getDataflows,
        getUsers,
        updateDataflowOwner
    };
};

// Check available entity sets in the environment
export const checkAvailableEntitySets = async (): Promise<any> => {
    try {
        if (!window.PowerTools) {
            throw new Error('PowerTools is not available');
        }

        // Get service document to see available entity sets - using same pattern as solution-manager
        const response = await window.PowerTools.get('/api/data/v9.0/');

        if (response.statusCode !== 200) {
            throw new Error(`Failed to get service document: HTTP ${response.statusCode}`);
        }

        const data = await response.asJson<any>();
        
        // Look for dataflow-related entity sets
        const dataflowEntitySets = data.value?.filter((entitySet: any) => 
            entitySet.name?.toLowerCase().includes('dataflow') ||
            entitySet.name?.toLowerCase().includes('msdyn_dataflow')
        );
        
        return data;
    } catch (error) {
        console.error('Error checking entity sets:', error);
        throw error;
    }
};

// Test basic connectivity to Dataverse
export const testDataverseConnection = async (): Promise<boolean> => {
    try {
        if (!window.PowerTools) {
            throw new Error('PowerTools is not available');
        }

        // Try a simple query that should always work - get current user
        const response = await window.PowerTools.get('/api/data/v9.0/WhoAmI()');

        if (response.statusCode === 200) {
            return true;
        } else {
            console.error('WhoAmI failed with status:', response.statusCode);
            return false;
        }
    } catch (error) {
        console.error('Dataverse connection test failed:', error);
        return false;
    }
};

// Fetch dataflows from Dataverse using PowerTools API
export const fetchDataflows = async (): Promise<IDataflow[]> => {
    try {
        // First test basic connectivity
        const connectionWorking = await testDataverseConnection();
        if (!connectionWorking) {
            throw new Error('Basic Dataverse connectivity failed. Please check your PowerTools connection.');
        }

        // Check available entity sets
        await checkAvailableEntitySets();

        // Check if PowerTools is available
        if (!window.PowerTools) {
            throw new Error('PowerTools is not available');
        }

        // Try different possible entity set names for dataflows using same pattern as solution-manager
        const possibleEntitySets = [
            'msdyn_dataflows',
            'dataflows', 
            'msdyn_dataflow',
            'dataflow'
        ];

        let dataflowData: any = null;
        let workingEntitySet: string = '';

        for (const entitySet of possibleEntitySets) {
            try {
                const query = new URLSearchParams();
                query.set('$select', 'msdyn_dataflowid,msdyn_name,msdyn_description,createdon,modifiedon');
                query.set('$filter', 'statecode eq 0'); // Active dataflows only
                query.set('$top', '5'); // Limit to 5 for testing
                
                // Use same pattern as solution-manager - no headers parameter
                const response = await window.PowerTools.get(`/api/data/v9.0/${entitySet}`, query);

                if (response.statusCode === 200) {
                    dataflowData = await response.asJson<IoDataResponse<any>>();
                    workingEntitySet = entitySet;
                    break;
                } else if (response.statusCode === 404) {
                    continue;
                } else {
                    console.warn(`Entity set ${entitySet} returned status: ${response.statusCode}`);
                    continue;
                }
            } catch (error) {
                continue;
            }
        }

        if (!dataflowData || !workingEntitySet) {
            console.warn('No dataflow entity sets found or accessible');
            throw new Error('Unable to find accessible dataflow entity sets. This environment may not have dataflows enabled or you may not have permissions.');
        }

        if (!dataflowData || !Array.isArray(dataflowData.value)) {
            console.warn('No dataflows found or invalid response format');
            return [];
        }

        // Transform Dataverse response to our IDataflow interface
        const transformedData = dataflowData.value.map((item: any) => ({
            id: item.msdyn_dataflowid || item.dataflowid || item.id,
            name: item.msdyn_name || item.name || 'Unnamed Dataflow',
            description: item.msdyn_description || item.description || '',
            owner: undefined, // We'll need to expand or make separate calls for owner info
            modifiedDateTime: item.modifiedon,
            createdDateTime: item.createdon,
            workspaceId: '2907c6d4-b9fc-ee08-b734-b0cb22538609', // Default workspace ID
            workspaceName: 'Power Platform Environment'
        }));

        return transformedData;
    } catch (error) {
        console.error('Error fetching dataflows:', error);
        
        // Return mock data as fallback for development/testing
        return [
            {
                id: 'a360b24b-5245-4f60-bb17-acb0b78fcd73',
                name: 'Sample Dataflow 1 (Mock Data - API Error)',
                description: 'A sample dataflow for demonstration - this is mock data due to API error',
                owner: {
                    id: '810c9a57-7ccd-40a1-8638-f90dca28507c',
                    name: 'Current Owner',
                    email: 'current.owner@company.com'
                },
                modifiedDateTime: '2024-01-15T10:30:00Z',
                createdDateTime: '2024-01-01T09:00:00Z',
                workspaceId: '2907c6d4-b9fc-ee08-b734-b0cb22538609',
                workspaceName: 'Sample Workspace'
            }
        ];
    }
};

// Fetch users from Dataverse using PowerTools API
export const fetchUsers = async (): Promise<IUser[]> => {
    try {
        // Check if PowerTools is available
        if (!window.PowerTools) {
            throw new Error('PowerTools is not available');
        }

        const query = new URLSearchParams();
        query.set('$select', 'systemuserid,azureactivedirectoryobjectid,fullname,internalemailaddress,domainname');
        query.set('$filter', 'isdisabled eq false and accessmode ne 4'); // Active users only, exclude support users
        query.set('$orderby', 'fullname asc');
        query.set('$top', '20'); // Limit for testing

        // Use same pattern as solution-manager - no headers parameter
        const response = await window.PowerTools.get('/api/data/v9.0/systemusers', query);

        if (response.statusCode === 401) {
            throw new Error('Authentication failed. Please check your connection to the Power Platform environment.');
        }

        if (response.statusCode === 403) {
            throw new Error('Access denied. You may not have permission to view users in this environment.');
        }

        if (response.statusCode !== 200) {
            throw new Error(`API request failed with status: ${response.statusCode}`);
        }

        const data = await response.asJson<IoDataResponse<any>>();

        if (!data || !Array.isArray(data.value)) {
            console.warn('No users found or invalid response format');
            return [];
        }

        // Transform Dataverse response to our IUser interface
        const transformedData = data.value.map((user: any) => ({
            id: user.azureactivedirectoryobjectid || user.systemuserid,
            systemUserId: user.systemuserid,
            azureAdObjectId: user.azureactivedirectoryobjectid,
            name: user.fullname || 'Unknown User',
            email: user.internalemailaddress || '',
            userPrincipalName: user.domainname || user.internalemailaddress || ''
        }));

        return transformedData;
    } catch (error) {
        console.error('Error fetching users:', error);
        
        // Return mock data as fallback for development/testing
        return [
            {
                id: 'de2cb672-db17-4cfb-aa79-54d825ef0823',
                systemUserId: 'de2cb672-db17-4cfb-aa79-54d825ef0823',
                azureAdObjectId: 'de2cb672-db17-4cfb-aa79-54d825ef0823',
                name: 'Stephanie Wymore (Mock)',
                email: 'stephanie.wymore@company.com',
                userPrincipalName: 'stephanie.wymore@company.com'
            },
            {
                id: '810c9a57-7ccd-40a1-8638-f90dca28507c',
                systemUserId: '810c9a57-7ccd-40a1-8638-f90dca28507c',
                azureAdObjectId: '810c9a57-7ccd-40a1-8638-f90dca28507c',
                name: 'Current Owner (Mock)',
                email: 'current.owner@company.com',
                userPrincipalName: 'current.owner@company.com'
            },
            {
                id: 'f1e3d584-ec28-5dcf-bb90-65d936f1ef34',
                systemUserId: 'f1e3d584-ec28-5dcf-bb90-65d936f1ef34',
                azureAdObjectId: 'f1e3d584-ec28-5dcf-bb90-65d936f1ef34',
                name: 'John Smith (Mock)',
                email: 'john.smith@company.com',
                userPrincipalName: 'john.smith@company.com'
            }
        ];
    }
};

// Update dataflow owner using the Power Query API
export const updateDataflowOwner = async (
    groupId: string,
    dataflowId: string,
    updateRequest: IDataflowOwnerUpdateRequest
): Promise<void> => {
    const powerQueryUrl = `https://us.prod.powerquery.microsoft.com/api/dataflow/group/${groupId}/dataflow/${dataflowId}/update-owner`;
    
    try {
        if (!window.PowerTools) {
            throw new Error('PowerTools is not available');
        }
        
        // Use the special __external__ prefix to signal external API call to the backend
        const proxiedUrl = `__external__${powerQueryUrl}`;
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-ms-client-request-id': crypto.randomUUID(),
            'x-ms-client-session-id': crypto.randomUUID(),
            'x-ms-host-context-type': 'PowerPlatformDataflowsBootstrap',
        };

        // For Power Query operations, the backend will automatically use stored user assertion tokens
        // for connections configured with OBO flow, or fall back to application flow
        console.log('Making Power Query API call - backend will handle authentication based on connection configuration');
        
        const response = await window.PowerTools.post(proxiedUrl, updateRequest, headers);
        
        if (response.statusCode !== 200 && response.statusCode !== 204) {
            throw new Error(`Failed to update dataflow owner: HTTP ${response.statusCode}`);
        }
        
        console.log('Dataflow owner updated successfully');
    } catch (error) {
        console.error('Error updating dataflow owner:', error);
        throw new Error(`Failed to update dataflow owner: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}; 