import { usePowerToolsApi } from '../powertools/apiHook';
import { 
    IODataResponse, 
    IEntityMetadata, 
    IAttributeMetadata
} from '../models';

export const useMetadataService = () => {
    const { getAsJson } = usePowerToolsApi();

    // Cache for entity metadata to avoid repeated API calls
    const entityCache = new Map<string, IEntityMetadata>();
    const attributeCache = new Map<string, IAttributeMetadata[]>();

    const fetchAllEntities = async (): Promise<IEntityMetadata[]> => {
        try {
            const query = new URLSearchParams();
            query.set('$select', 'LogicalName,EntitySetName,MetadataId,DisplayName,SchemaName');

            const response = await getAsJson<IODataResponse<IEntityMetadata>>(
                '/api/data/v9.2/EntityDefinitions',
                query
            );

            if (response && Array.isArray(response.value)) {
                // Cache entities for later use
                response.value.forEach((entity: IEntityMetadata) => {
                    entityCache.set(entity.LogicalName, entity);
                });
                
                return response.value;
            }

            return [];
        } catch (error) {
            console.error('Error fetching entities:', error);
            return [];
        }
    };

    const fetchEntityMetadata = async (entityLogicalName: string): Promise<IEntityMetadata | null> => {
        // Check cache first
        if (entityCache.has(entityLogicalName)) {
            return entityCache.get(entityLogicalName)!;
        }

        try {
            const query = new URLSearchParams();
            query.set('$select', 'LogicalName,EntitySetName,MetadataId,DisplayName,SchemaName,PrimaryIdAttribute,PrimaryNameAttribute,IsCustomEntity,OwnershipType');
            query.set('$filter', `LogicalName eq '${entityLogicalName}'`);

            const response = await getAsJson<IODataResponse<IEntityMetadata>>(
                '/api/data/v9.2/EntityDefinitions',
                query
            );

            if (response && Array.isArray(response.value) && response.value.length > 0) {
                const entity = response.value[0];
                entityCache.set(entityLogicalName, entity);
                return entity;
            }

            return null;
        } catch (error) {
            console.error(`Error fetching entity metadata for ${entityLogicalName}:`, error);
            return null;
        }
    };

    const fetchEntityAttributes = async (entityLogicalName: string): Promise<IAttributeMetadata[]> => {
        // Check cache first
        if (attributeCache.has(entityLogicalName)) {
            return attributeCache.get(entityLogicalName)!;
        }

        try {
            // First get the entity metadata to get MetadataId
            const entity = await fetchEntityMetadata(entityLogicalName);
            if (!entity) {
                console.warn(`Entity ${entityLogicalName} not found`);
                return [];
            }

            const query = new URLSearchParams();
            query.set('$select', 'LogicalName,SchemaName,MetadataId,DisplayName,AttributeType,IsValidForRead,IsValidForCreate,IsValidForUpdate,RequiredLevel,IsPrimaryId,IsPrimaryName,MaxLength');
            query.set('$filter', 'IsValidForAdvancedFind eq true');
            query.set('$orderby', 'DisplayName/UserLocalizedLabel/Label');

            const response = await getAsJson<IODataResponse<IAttributeMetadata>>(
                `/api/data/v9.2/EntityDefinitions(${entity.MetadataId})/Attributes`,
                query
            );

            if (response && Array.isArray(response.value)) {
                // Cache attributes for later use
                attributeCache.set(entityLogicalName, response.value);
                return response.value;
            }

            return [];
        } catch (error) {
            console.error(`Error fetching attributes for entity ${entityLogicalName}:`, error);
            return [];
        }
    };

    const getEntityDisplayName = (entity: IEntityMetadata): string => {
        return entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName;
    };

    const getAttributeDisplayName = (attribute: IAttributeMetadata): string => {
        return attribute.DisplayName?.UserLocalizedLabel?.Label || attribute.LogicalName;
    };

    const searchEntities = async (searchTerm: string): Promise<IEntityMetadata[]> => {
        const allEntities = await fetchAllEntities();
        
        if (!searchTerm.trim()) {
            return allEntities;
        }

        const lowercaseSearch = searchTerm.toLowerCase();
        return allEntities.filter(entity => {
            const displayName = getEntityDisplayName(entity).toLowerCase();
            const logicalName = entity.LogicalName.toLowerCase();
            const schemaName = entity.SchemaName.toLowerCase();
            
            return displayName.includes(lowercaseSearch) || 
                   logicalName.includes(lowercaseSearch) || 
                   schemaName.includes(lowercaseSearch);
        });
    };

    const searchAttributes = async (entityLogicalName: string, searchTerm: string): Promise<IAttributeMetadata[]> => {
        const allAttributes = await fetchEntityAttributes(entityLogicalName);
        
        if (!searchTerm.trim()) {
            return allAttributes;
        }

        const lowercaseSearch = searchTerm.toLowerCase();
        return allAttributes.filter(attribute => {
            const displayName = getAttributeDisplayName(attribute).toLowerCase();
            const logicalName = attribute.LogicalName.toLowerCase();
            const schemaName = attribute.SchemaName.toLowerCase();
            
            return displayName.includes(lowercaseSearch) || 
                   logicalName.includes(lowercaseSearch) || 
                   schemaName.includes(lowercaseSearch);
        });
    };

    const getEntitySetName = async (entityLogicalName: string): Promise<string> => {
        const entity = await fetchEntityMetadata(entityLogicalName);
        return entity?.EntitySetName || `${entityLogicalName}s`;
    };

    const clearCache = () => {
        entityCache.clear();
        attributeCache.clear();
    };

    // Expose all cached or fetched entities for intellisense
    const getAllEntities = async (): Promise<IEntityMetadata[]> => {
        return fetchAllEntities();
    };

    return {
        fetchAllEntities,
        fetchEntityMetadata,
        fetchEntityAttributes,
        getEntityDisplayName,
        getAttributeDisplayName,
        searchEntities,
        searchAttributes,
        getEntitySetName,
        clearCache,
        getAllEntities
    };
};
