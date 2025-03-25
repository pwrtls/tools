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

// OptionSet metadata interface
interface IOptionSetMetadata {
    LogicalName: string;
    OptionSet: {
        Options: Array<{
            Value: number;
            Label: {
                UserLocalizedLabel: {
                    Label: string;
                };
            };
        }>;
    };
}

// Creating a service for audit logs operations
export const useAuditLogsService = () => {
    const { get, getAsJson, download } = usePowerToolsApi();
    
    // Cache for entity display names
    const entityDisplayNameCache = new Map<string, string>();
    
    // Cache for user names
    const userNameCache = new Map<string, string>();
    
    // Cache for option set values
    const optionSetValueCache = new Map<string, Map<number, string>>();
    
    // Cache for lookup display names
    const lookupDisplayNameCache = new Map<string, string>();

    // Cache for attribute display names
    const attributeDisplayNameCache = new Map<string, string>();

    // Cache for entity attribute metadata
    const entityAttributesCache = new Map<string, Map<string, string>>();

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

    // Fetch option set display text for a given value
    const fetchOptionSetText = async (
        entityName: string,
        attributeName: string,
        value: number
    ): Promise<string> => {
        // Create a cache key
        const cacheKey = `${entityName}_${attributeName}`;
        
        // Check cache first
        if (optionSetValueCache.has(cacheKey)) {
            const optionMap = optionSetValueCache.get(cacheKey)!;
            if (optionMap.has(value)) {
                return optionMap.get(value)!;
            }
        }
        
        try {
            // Query the metadata to get option set values
            const query = new URLSearchParams();
            query.set('$select', 'LogicalName,OptionSet');
            query.set('$filter', `EntityLogicalName eq '${entityName}' and LogicalName eq '${attributeName}'`);
            
            const response = await getAsJson<IoDataResponse<IOptionSetMetadata>>(
                '/api/data/v9.0/EntityDefinitions/Microsoft.Dynamics.CRM.RetrieveAttribute', 
                query
            );
            
            if (response && Array.isArray(response.value) && response.value.length > 0) {
                const metadata = response.value[0];
                
                if (metadata.OptionSet && Array.isArray(metadata.OptionSet.Options)) {
                    // Create a new option map if it doesn't exist
                    if (!optionSetValueCache.has(cacheKey)) {
                        optionSetValueCache.set(cacheKey, new Map<number, string>());
                    }
                    
                    const optionMap = optionSetValueCache.get(cacheKey)!;
                    
                    // Store all options in the cache
                    metadata.OptionSet.Options.forEach(option => {
                        const label = option.Label?.UserLocalizedLabel?.Label || `Option ${option.Value}`;
                        optionMap.set(option.Value, label);
                    });
                    
                    // Return the requested value if found
                    if (optionMap.has(value)) {
                        return optionMap.get(value)!;
                    }
                }
            }
            
            // If not found, return the number as string
            return `${value}`;
        } catch (error) {
            console.error(`Error fetching option set text for ${entityName}.${attributeName} value ${value}:`, error);
            return `${value}`;
        }
    };
    
    // Get lookup display name for a reference value (GUID)
    const fetchLookupDisplayName = async (
        targetEntityName: string, 
        referenceId: string
    ): Promise<string> => {
        // Check cache first
        const cacheKey = `${targetEntityName}_${referenceId}`;
        if (lookupDisplayNameCache.has(cacheKey)) {
            return lookupDisplayNameCache.get(cacheKey)!;
        }
        
        try {
            // Clean GUID if needed
            const cleanId = referenceId.replace(/[{}]/g, '');
            
            // Query the entity to get primary field
            const query = new URLSearchParams();
            
            // For common entities like account, contact, etc. we know the primary field
            let primaryField = 'name';
            if (targetEntityName === 'systemuser') primaryField = 'fullname';
            if (targetEntityName === 'team') primaryField = 'name';
            
            query.set('$select', primaryField);
            query.set('$filter', `${targetEntityName}id eq ${cleanId}`);
            
            const response = await getAsJson<any>(
                `/api/data/v9.0/${targetEntityName}s`, 
                query
            );
            
            if (response && Array.isArray(response.value) && response.value.length > 0) {
                const entity = response.value[0];
                if (entity[primaryField]) {
                    // Store in cache
                    lookupDisplayNameCache.set(cacheKey, entity[primaryField]);
                    return entity[primaryField];
                }
            }
            
            // If not found, return the ID
            return referenceId;
        } catch (error) {
            console.error(`Error fetching lookup display name for ${targetEntityName} with ID ${referenceId}:`, error);
            return referenceId;
        }
    };

    // Fetch display names for all attributes of an entity
    const fetchEntityAttributeDisplayNames = async (entityLogicalName: string): Promise<Map<string, string>> => {
        // Check if we already have the entity attributes in cache
        if (entityAttributesCache.has(entityLogicalName)) {
            return entityAttributesCache.get(entityLogicalName)!;
        }

        // Create a new map to store attribute logical name to display name mappings
        const attributeMap = new Map<string, string>();
        
        console.log(`Fetching all attribute display names for entity: ${entityLogicalName}`);
        
        try {
            // First get the entity metadata ID
            const entityQuery = new URLSearchParams();
            entityQuery.set('$select', 'LogicalName,MetadataId');
            entityQuery.set('$filter', `LogicalName eq '${entityLogicalName}'`);
            
            const entityResponse = await getAsJson<IoDataResponse<{
                LogicalName: string;
                MetadataId: string;
            }>>(
                '/api/data/v9.0/EntityDefinitions',
                entityQuery
            );
            
            if (entityResponse && Array.isArray(entityResponse.value) && entityResponse.value.length > 0) {
                const entityMetadata = entityResponse.value[0];
                
                // Now fetch all attributes for this entity
                const attributesQuery = new URLSearchParams();
                attributesQuery.set('$select', 'LogicalName,DisplayName,SchemaName');
                
                const attributesResponse = await getAsJson<IoDataResponse<{
                    LogicalName: string;
                    SchemaName: string;
                    DisplayName: {
                        UserLocalizedLabel: {
                            Label: string;
                        };
                    };
                }>>(
                    `/api/data/v9.0/EntityDefinitions(${entityMetadata.MetadataId})/Attributes`,
                    attributesQuery
                );
                
                if (attributesResponse && Array.isArray(attributesResponse.value)) {
                    console.log(`Retrieved ${attributesResponse.value.length} attributes for ${entityLogicalName}`);
                    
                    // Process each attribute and add to the map
                    attributesResponse.value.forEach(attr => {
                        const logicalName = attr.LogicalName;
                        const displayName = attr.DisplayName?.UserLocalizedLabel?.Label || logicalName;
                        
                        // Store in both the attribute map and the individual cache
                        attributeMap.set(logicalName, displayName);
                        attributeDisplayNameCache.set(`${entityLogicalName}|${logicalName}`, displayName);
                    });
                    
                    // Cache the entire attribute map for this entity
                    entityAttributesCache.set(entityLogicalName, attributeMap);
                    return attributeMap;
                }
            }
            
            console.warn(`Could not fetch attribute metadata for entity: ${entityLogicalName}`);
            entityAttributesCache.set(entityLogicalName, attributeMap);
            return attributeMap;
        } catch (error) {
            console.error(`Error fetching attribute metadata for entity ${entityLogicalName}:`, error);
            entityAttributesCache.set(entityLogicalName, attributeMap);
            return attributeMap;
        }
    };

    // Fetch attribute display name from metadata
    const fetchAttributeDisplayName = async (entityLogicalName: string, attributeLogicalName: string): Promise<string> => {
        // Create a cache key combining entity and attribute
        const cacheKey = `${entityLogicalName}|${attributeLogicalName}`;
        
        // Check cache first
        if (attributeDisplayNameCache.has(cacheKey)) {
            return attributeDisplayNameCache.get(cacheKey)!;
        }
        
        console.log(`Fetching display name for attribute ${entityLogicalName}.${attributeLogicalName}`);
        
        // Try to get the display name from the entity attributes map
        try {
            const attributesMap = await fetchEntityAttributeDisplayNames(entityLogicalName);
            if (attributesMap.has(attributeLogicalName)) {
                return attributesMap.get(attributeLogicalName)!;
            }
        } catch (error) {
            console.warn(`Could not get display name from entity attributes map: ${error}`);
        }
        
        // First approach: try the entity attributes endpoint specifically for this attribute
        try {
            const query = new URLSearchParams();
            query.set('$select', 'LogicalName,MetadataId');
            query.set('$filter', `LogicalName eq '${entityLogicalName}'`);
            
            const entityResponse = await getAsJson<IoDataResponse<{
                LogicalName: string;
                MetadataId: string;
            }>>(
                '/api/data/v9.0/EntityDefinitions',
                query
            );
            
            if (entityResponse && Array.isArray(entityResponse.value) && entityResponse.value.length > 0) {
                const entityMetadata = entityResponse.value[0];
                
                // Query the attributes for this entity specifically
                const attributeQuery = new URLSearchParams();
                attributeQuery.set('$select', 'LogicalName,DisplayName,SchemaName');
                attributeQuery.set('$filter', `LogicalName eq '${attributeLogicalName}'`);
                
                const attributeResponse = await getAsJson<IoDataResponse<{
                    LogicalName: string;
                    SchemaName: string;
                    DisplayName: {
                        UserLocalizedLabel: {
                            Label: string;
                        };
                    };
                }>>(
                    `/api/data/v9.0/EntityDefinitions(${entityMetadata.MetadataId})/Attributes`,
                    attributeQuery
                );
                
                if (attributeResponse && Array.isArray(attributeResponse.value) && attributeResponse.value.length > 0) {
                    const attributeMetadata = attributeResponse.value[0];
                    // Use the display name if available, otherwise fall back to logical name
                    const displayName = attributeMetadata.DisplayName?.UserLocalizedLabel?.Label || attributeLogicalName;
                    
                    console.log(`Found attribute display name via entity metadata: ${displayName}`);
                    
                    // Cache the result
                    attributeDisplayNameCache.set(cacheKey, displayName);
                    return displayName;
                }
            }
        } catch (error) {
            console.warn(`Error retrieving attribute metadata via entity attributes: ${error}`);
        }
        
        // Second approach: try the RetrieveAttribute endpoint
        try {
            const query = new URLSearchParams();
            query.set('$select', 'DisplayName,LogicalName,SchemaName');
            query.set('$filter', `EntityLogicalName eq '${entityLogicalName}' and LogicalName eq '${attributeLogicalName}'`);
            
            const response = await getAsJson<IoDataResponse<{
                LogicalName: string;
                SchemaName: string;
                DisplayName: {
                    UserLocalizedLabel: {
                        Label: string;
                    };
                };
            }>>(
                '/api/data/v9.0/EntityDefinitions/Microsoft.Dynamics.CRM.RetrieveAttribute',
                query
            );
            
            if (response && Array.isArray(response.value) && response.value.length > 0) {
                const metadata = response.value[0];
                const displayName = metadata.DisplayName?.UserLocalizedLabel?.Label || attributeLogicalName;
                
                console.log(`Found attribute display name via RetrieveAttribute: ${displayName}`);
                
                // Cache the result
                attributeDisplayNameCache.set(cacheKey, displayName);
                return displayName;
            }
        } catch (error) {
            console.warn(`Error with RetrieveAttribute approach: ${error}`);
        }
        
        // If metadata retrieval fails, return the logical name as is
        console.log(`No metadata found for ${entityLogicalName}.${attributeLogicalName}, using logical name`);
        attributeDisplayNameCache.set(cacheKey, attributeLogicalName);
        return attributeLogicalName;
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

    // Fetch detailed information for an audit record
    const fetchAuditDetails = async (auditId: string): Promise<IAuditLogDetails[]> => {
        console.log('Fetching audit details for:', auditId);
        
        // First get the audit log's basic information to determine entity type
        const basicAuditQuery = new URLSearchParams();
        basicAuditQuery.set('$select', 'auditid,objecttypecode,operation,objectid');
        basicAuditQuery.set('$filter', `auditid eq ${auditId}`);
        
        let entityLogicalName = '';
        let operationType = 0;
        let attributeDisplayNames = new Map<string, string>();
        
        try {
            // First get basic audit info to ensure we have entity info
            const basicAuditResponse = await getAsJson<IoDataResponse<IAuditLog>>(
                '/api/data/v9.0/audits', 
                basicAuditQuery
            );
            
            if (basicAuditResponse && Array.isArray(basicAuditResponse.value) && basicAuditResponse.value.length > 0) {
                const auditRecord = basicAuditResponse.value[0];
                entityLogicalName = auditRecord.objecttypecode;
                operationType = auditRecord.operation;
                
                console.log(`Found entity type: ${entityLogicalName}, operation: ${operationLabels[operationType]}`);
                
                // Prefetch all attribute display names for this entity
                if (entityLogicalName) {
                    console.log(`Prefetching attribute display names for entity: ${entityLogicalName}`);
                    attributeDisplayNames = await fetchEntityAttributeDisplayNames(entityLogicalName);
                    console.log(`Retrieved ${attributeDisplayNames.size} attribute display names for ${entityLogicalName}`);
                    
                    // Log the first few display names to verify data
                    const entries = Array.from(attributeDisplayNames.entries()).slice(0, 5);
                    console.log('Sample attribute mappings:', Object.fromEntries(entries));
                }
            } else {
                console.warn('Could not find audit record with ID:', auditId);
            }
            
            // Now get the detailed audit record with changedata
            const detailedAuditQuery = new URLSearchParams();
            detailedAuditQuery.set('$select', 'objecttypecode,operation,attributemask,changedata,objectid');
            detailedAuditQuery.set('$filter', `auditid eq ${auditId}`);
            
            const auditResponse = await getAsJson<IoDataResponse<IAuditLog & { changedata?: string }>>(
                '/api/data/v9.0/audits', 
                detailedAuditQuery
            );
            
            console.log('Audit record details:', JSON.stringify(auditResponse?.value?.[0], null, 2));
            
            // If change data is available, try to parse it
            if (auditResponse?.value?.[0]?.changedata) {
                try {
                    const changeData = JSON.parse(auditResponse.value[0].changedata);
                    console.log('Parsed changeData:', JSON.stringify(changeData, null, 2));
                } catch (error) {
                    console.warn('Failed to parse changedata:', error);
                }
            }
        } catch (error) {
            console.warn('Error getting audit record:', error);
        }
        
        // Try multiple approaches for compatibility with different Dynamics versions
        // Based on official Microsoft documentation: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/auditing/retrieve-audit-data
        
        // First approach: Use the RetrieveAuditDetails function (recommended in docs)
        try {
            console.log('Using RetrieveAuditDetails function endpoint');
            
            // Add headers for better results
            const headers: Record<string, string> = {
                'Prefer': 'odata.include-annotations="*"'
            };
            
            const response = await getAsJson<any>(
                `/api/data/v9.0/audits(${auditId})/Microsoft.Dynamics.CRM.RetrieveAuditDetails`, 
                undefined, 
                headers
            );
            
            console.log('RetrieveAuditDetails response:', JSON.stringify(response, null, 2));
            
            if (response && response.AuditDetail) {
                // Process audit details based on the type
                const auditDetail = response.AuditDetail;
                console.log('AuditDetail type:', auditDetail['@odata.type']);
                
                if (auditDetail['@odata.type'] === '#Microsoft.Dynamics.CRM.AttributeAuditDetail') {
                    // Process attribute audit details
                    const oldValues = auditDetail.OldValue || {};
                    const newValues = auditDetail.NewValue || {};
                    
                    // Debug log to see what's in the values
                    console.log('Old values object:', JSON.stringify(oldValues, null, 2));
                    console.log('New values object:', JSON.stringify(newValues, null, 2));
                    console.log('Operation type:', operationType);
                    
                    // Check if OldValue is empty but still has an entity type (common in Dynamics)
                    const isOldValueEmpty = Object.keys(oldValues).length === 1 && 
                                           Object.keys(oldValues).includes('@odata.type');
                    
                    console.log('Is OldValue effectively empty?', isOldValueEmpty);
                    
                    // Extract changed attributes
                    const details: IAuditLogDetails[] = [];
                    
                    // For Creates, old values may be empty so we need to make sure we process all new values
                    const allKeys = new Set([
                        ...Object.keys(oldValues),
                        ...Object.keys(newValues)
                    ]);
                    
                    // Skip the @odata.type property
                    allKeys.delete('@odata.type');
                    
                    // Process each changed attribute
                    for (const key of Array.from(allKeys)) {
                        // Skip properties starting with underscore that have corresponding formatted values
                        if (key.startsWith('_') && key.endsWith('_value') && 
                            newValues[`${key}@OData.Community.Display.V1.FormattedValue`]) {
                            continue;
                        }
                        
                        // Skip formatted value annotations
                        if (key.includes('@OData.')) {
                            continue;
                        }
                        
                        let oldValueFormatted = '';
                        let newValueFormatted = '';
                        
                        const oldValue = oldValues[key];
                        const newValue = newValues[key];

                        console.log(`Processing field ${key}: oldValue=${oldValue}, newValue=${newValue}`);
                        
                        // If this is a create operation (1) or oldValue is undefined, 
                        // set a descriptive placeholder for the old value
                        let isNewField = false;
                        if (oldValue === undefined) {
                            if (operationType === 1) {
                                // This is a create operation
                                isNewField = true;
                                oldValueFormatted = '[New Record]';
                            } else {
                                // This is an update, but field was previously empty/null
                                isNewField = true;
                                oldValueFormatted = '[Previously Empty]';
                            }
                        }
                        
                        // Check if we have a formatted value in the new values
                        const formattedValueKey = `${key}@OData.Community.Display.V1.FormattedValue`;
                        if (newValues[formattedValueKey]) {
                            newValueFormatted = newValues[formattedValueKey];
                        } 
                        // Check if this might be an option set (numeric value)
                        else if (!isNewField && entityLogicalName && !isNaN(Number(newValue)) && Number.isInteger(Number(newValue))) {
                            try {
                                // Try to get the display text for option set values
                                if (oldValue !== undefined) {
                                    oldValueFormatted = await fetchOptionSetText(
                                        entityLogicalName, 
                                        key, 
                                        Number(oldValue)
                                    );
                                }
                                
                                if (newValue !== undefined) {
                                    newValueFormatted = await fetchOptionSetText(
                                        entityLogicalName, 
                                        key, 
                                        Number(newValue)
                                    );
                                }
                            } catch (error) {
                                console.warn(`Failed to get option set text for ${key}:`, error);
                                // Fall back to original values
                                if (!isNewField) {
                                    oldValueFormatted = oldValue !== undefined ? String(oldValue) : '';
                                }
                                newValueFormatted = newValue !== undefined ? String(newValue) : '';
                            }
                        } 
                        // Check for lookup fields (they end with _value and contain GUIDs)
                        else if (key.endsWith('_value') && 
                                (typeof newValue === 'string' && /^[{]?[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}[}]?$/.test(newValue))) {
                            try {
                                // Extract the target entity type from the key (e.g., "customerid_value" -> "customer")
                                const targetEntityName = key.substring(0, key.length - 6); // Remove "_value"
                                
                                // Look for formatted value in OData annotations
                                const formattedValueKey = `${key}@OData.Community.Display.V1.FormattedValue`;
                                const lookupLogicalNameKey = `${key}@Microsoft.Dynamics.CRM.lookuplogicalname`;
                                
                                let targetEntity = '';
                                if (newValues[lookupLogicalNameKey]) {
                                    targetEntity = newValues[lookupLogicalNameKey];
                                }
                                
                                // Old value lookup
                                if (!isNewField && oldValue !== undefined && oldValue !== null) {
                                    if (targetEntity) {
                                        oldValueFormatted = await fetchLookupDisplayName(targetEntity, String(oldValue));
                                    } else {
                                        oldValueFormatted = String(oldValue);
                                    }
                                }
                                
                                // New value lookup - use the formatted value if available
                                if (newValues[formattedValueKey]) {
                                    newValueFormatted = newValues[formattedValueKey];
                                } else if (newValue !== undefined && newValue !== null) {
                                    if (targetEntity) {
                                        newValueFormatted = await fetchLookupDisplayName(targetEntity, String(newValue));
                                    } else {
                                        newValueFormatted = String(newValue);
                                    }
                                }
                            } catch (error) {
                                console.warn(`Failed to get lookup display name for ${key}:`, error);
                                // Fall back to original values
                                if (!isNewField) {
                                    oldValueFormatted = oldValue !== undefined ? String(oldValue) : '';
                                }
                                newValueFormatted = newValue !== undefined ? String(newValue) : '';
                            }
                        }
                        else {
                            // For all other fields, use string representation
                            if (!isNewField) {
                                oldValueFormatted = oldValue !== undefined ? String(oldValue) : '';
                            }
                            newValueFormatted = newValue !== undefined ? String(newValue) : '';
                        }
                        
                        // Get the display name from our prefetched map
                        let attributeDisplayName = key;
                        if (attributeDisplayNames.has(key)) {
                            attributeDisplayName = attributeDisplayNames.get(key)!;
                            console.log(`Using cached display name for ${key}: ${attributeDisplayName}`);
                        }
                        
                        const detail: IAuditLogDetails = {
                            auditdetailid: `${auditId}-${key}`,
                            auditid: auditId,
                            attributename: attributeDisplayName,
                            oldvalue: oldValueFormatted,
                            newvalue: newValueFormatted,
                            attributemask: key // Store logical name in attributemask
                        };
                        
                        details.push(detail);
                    }
                    
                    console.log(`Found ${details.length} audit details`);
                    return details;
                }
                // Handle other audit detail types as needed
            }
            
            console.log('No audit details found in response');
            return [];
        } catch (error) {
            console.warn('Error using RetrieveAuditDetails function:', error);
            
            // Second approach: Try direct table queries for audit details
            try {
                console.log('Falling back to direct table queries');
                
                const query = new URLSearchParams();
                query.set('$select', 'auditdetailid,auditid,attributemask,oldvalue,newvalue,attributename');
                query.set('$filter', `auditid eq ${auditId}`);
                
                // Try each endpoint in sequence until we get a successful response
                const endpoints = [
                    `/api/data/v9.0/auditdetails`, // Legacy endpoint
                    `/api/data/v9.0/msdyn_auditdetails`, // Possible alternative name
                    `/api/data/v9.0/audit_details` // Another possible alternative
                ];
                
                for (const endpoint of endpoints) {
                    try {
                        console.log(`Trying endpoint: ${endpoint}`);
                        const response = await getAsJson<IoDataResponse<IAuditLogDetails>>(endpoint, query);
                        
                        if (response && Array.isArray(response.value)) {
                            const details = response.value;
                            console.log(`Found ${details.length} audit details using endpoint: ${endpoint}`);
                            
                            if (details.length > 0) {
                                // If we have entity type information, enhance with attribute display names
                                if (entityLogicalName) {
                                    for (const detail of details) {
                                        // Use attribute logical name from attributemask
                                        const attributeLogicalName = detail.attributemask || detail.attributename || '';
                                        
                                        if (attributeLogicalName) {
                                            // Check our prefetched map first
                                            if (attributeDisplayNames.has(attributeLogicalName)) {
                                                detail.attributename = attributeDisplayNames.get(attributeLogicalName)!;
                                                console.log(`Using cached display name for ${attributeLogicalName}: ${detail.attributename}`);
                                            } else {
                                                try {
                                                    detail.attributename = await fetchAttributeDisplayName(
                                                        entityLogicalName, 
                                                        attributeLogicalName
                                                    );
                                                } catch (error) {
                                                    console.warn(`Failed to get display name for attribute ${attributeLogicalName}:`, error);
                                                }
                                            }
                                        }
                                    }
                                }
                                return details;
                            }
                        }
                    } catch (endpointError) {
                        console.warn(`Error fetching from ${endpoint}:`, endpointError);
                        // Continue to the next endpoint
                    }
                }
                
                console.error('All audit detail endpoints failed. No details retrieved.');
                return [];
            } catch (fallbackError) {
                console.error('Error in fallback method:', fallbackError);
                return [];
            }
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
        fetchUserName,
        fetchOptionSetText,
        fetchLookupDisplayName,
        fetchAttributeDisplayName,
        fetchEntityAttributeDisplayNames
    };
}; 