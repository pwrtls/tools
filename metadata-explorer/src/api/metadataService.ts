import { usePowerToolsApi } from "powertools/apiHook";
import { IEntityMetadata, IAttributeMetadata, IRelationshipMetadata, IOptionSetMetadata } from "models/entityMetadata";
import { IoDataResponse } from "models/oDataResponse";

// Service for working with Microsoft Dynamics 365 / Power Platform metadata
export const useMetadataService = () => {
    const { getAsJson, download } = usePowerToolsApi();
    
    // Cache for entity display names to optimize performance
    const entityDisplayNameCache = new Map<string, string>();

    // Get all entities with pagination support
    const getEntities = async (
        pageSize = 50,
        pageNumber = 1,
        includeTotalCount = true,
        filter?: string
    ): Promise<IoDataResponse<IEntityMetadata>> => {
        try {
            const query = new URLSearchParams();
            
            // Add select fields to limit the data returned
            query.set('$select', 'MetadataId,LogicalName,SchemaName,EntitySetName,DisplayName,IsCustomEntity,IsIntersect,IsActivity,ObjectTypeCode,PrimaryIdAttribute,PrimaryNameAttribute');
            
            // Set page size and skip for pagination
            query.set('$top', pageSize.toString());
            query.set('$skip', ((pageNumber - 1) * pageSize).toString());
            
            // Ensure we get the count with results
            if (includeTotalCount) {
                query.set('$count', 'true');
            }
            
            // Add filtering if provided
            if (filter) {
                query.set('$filter', filter);
            }
            
            // Sort by logical name
            query.set('$orderby', 'LogicalName');
            
            console.log('Fetching entities with query:', query.toString());
            return await getAsJson<IoDataResponse<IEntityMetadata>>('/api/data/v9.2/EntityDefinitions', query);
        } catch (error) {
            console.error('Error fetching entities:', error);
            throw new Error('Failed to fetch entity metadata. See console for details.');
        }
    };

    // Get detailed information about a specific entity by ID
    const getEntityById = async (entityId: string): Promise<IEntityMetadata> => {
        try {
            const query = new URLSearchParams();
            
            // Include essential relationships and attributes
            query.set('$expand', 'Attributes,OneToManyRelationships,ManyToOneRelationships,ManyToManyRelationships');
            
            console.log(`Fetching entity details for ID: ${entityId}`);
            const response = await getAsJson<IEntityMetadata>(`/api/data/v9.2/EntityDefinitions(${entityId})`, query);
            return response;
        } catch (error) {
            console.error(`Error fetching entity with ID ${entityId}:`, error);
            throw new Error(`Failed to fetch entity details for ID ${entityId}. See console for details.`);
        }
    };

    // Get detailed information about a specific entity by logical name
    const getEntityByName = async (logicalName: string): Promise<IEntityMetadata> => {
        try {
            const query = new URLSearchParams();
            
            // Include essential relationships and attributes
            query.set('$expand', 'Attributes,OneToManyRelationships,ManyToOneRelationships,ManyToManyRelationships');
            
            console.log(`Fetching entity details for logical name: ${logicalName}`);
            const response = await getAsJson<IEntityMetadata>(`/api/data/v9.2/EntityDefinitions(LogicalName='${logicalName}')`, query);
            return response;
        } catch (error) {
            console.error(`Error fetching entity with logical name ${logicalName}:`, error);
            throw new Error(`Failed to fetch entity details for ${logicalName}. See console for details.`);
        }
    };

    // Get entity display name from logical name
    const getEntityDisplayName = async (logicalName: string): Promise<string> => {
        // Check cache first
        if (entityDisplayNameCache.has(logicalName)) {
            return entityDisplayNameCache.get(logicalName)!;
        }
        
        try {
            const query = new URLSearchParams();
            query.set('$select', 'LogicalName,DisplayName');
            query.set('$filter', `LogicalName eq '${logicalName}'`);
            
            const response = await getAsJson<IoDataResponse<IEntityMetadata>>('/api/data/v9.2/EntityDefinitions', query);
            
            if (response && Array.isArray(response.value) && response.value.length > 0) {
                const metadata = response.value[0];
                const displayName = metadata.DisplayName?.UserLocalizedLabel?.Label || logicalName;
                
                // Cache the result
                entityDisplayNameCache.set(logicalName, displayName);
                return displayName;
            }
            
            return logicalName; // Fall back to logical name if display name not found
        } catch (error) {
            console.error(`Error fetching display name for entity ${logicalName}:`, error);
            return logicalName; // Fall back to logical name on error
        }
    };

    // Get global option sets
    const getGlobalOptionSets = async (
        pageSize = 50,
        pageNumber = 1,
        includeTotalCount = true,
        filter?: string
    ): Promise<IoDataResponse<IOptionSetMetadata>> => {
        try {
            const query = new URLSearchParams();
            
            // Select fields
            query.set('$select', 'MetadataId,Name,DisplayName,IsCustomOptionSet,Options');
            
            // Set page size and skip for pagination
            query.set('$top', pageSize.toString());
            query.set('$skip', ((pageNumber - 1) * pageSize).toString());
            
            // Ensure we get the count with results
            if (includeTotalCount) {
                query.set('$count', 'true');
            }
            
            // Add filtering if provided
            if (filter) {
                query.set('$filter', filter);
            }
            
            // Sort by name
            query.set('$orderby', 'Name');
            
            console.log('Fetching global option sets with query:', query.toString());
            return await getAsJson<IoDataResponse<IOptionSetMetadata>>('/api/data/v9.2/GlobalOptionSetDefinitions', query);
        } catch (error) {
            console.error('Error fetching global option sets:', error);
            throw new Error('Failed to fetch global option set metadata. See console for details.');
        }
    };

    // Get relationships
    const getRelationships = async (
        pageSize = 50,
        pageNumber = 1,
        includeTotalCount = true,
        filter?: string
    ): Promise<IoDataResponse<IRelationshipMetadata>> => {
        try {
            const query = new URLSearchParams();
            
            // Select fields
            query.set('$select', 'MetadataId,SchemaName,ReferencedEntity,ReferencedAttribute,ReferencingEntity,ReferencingAttribute,RelationshipType,IsCustomRelationship');
            
            // Set page size and skip for pagination
            query.set('$top', pageSize.toString());
            query.set('$skip', ((pageNumber - 1) * pageSize).toString());
            
            // Ensure we get the count with results
            if (includeTotalCount) {
                query.set('$count', 'true');
            }
            
            // Add filtering if provided
            if (filter) {
                query.set('$filter', filter);
            }
            
            // Sort by schema name
            query.set('$orderby', 'SchemaName');
            
            console.log('Fetching relationships with query:', query.toString());
            return await getAsJson<IoDataResponse<IRelationshipMetadata>>('/api/data/v9.2/RelationshipDefinitions', query);
        } catch (error) {
            console.error('Error fetching relationships:', error);
            throw new Error('Failed to fetch relationship metadata. See console for details.');
        }
    };

    // Export entity metadata as JSON
    const exportEntityMetadata = async (entityId: string, fileName?: string): Promise<void> => {
        try {
            const entityMetadata = await getEntityById(entityId);
            const jsonContent = JSON.stringify(entityMetadata, null, 2);
            const metadataFileName = fileName || `${entityMetadata.LogicalName}_metadata.json`;
            
            await download(jsonContent, metadataFileName, 'application/json');
        } catch (error) {
            console.error('Error exporting entity metadata:', error);
            throw new Error('Failed to export entity metadata. See console for details.');
        }
    };

    return {
        getEntities,
        getEntityById,
        getEntityByName,
        getEntityDisplayName,
        getGlobalOptionSets,
        getRelationships,
        exportEntityMetadata
    };
}; 