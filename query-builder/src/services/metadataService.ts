export interface DataverseAttribute {
  LogicalName: string;
  DisplayName: {
    UserLocalizedLabel?: {
      Label: string;
      LanguageCode: number;
    };
    LocalizedLabels?: Array<{
      Label: string;
      LanguageCode: number;
    }>;
  } | string; // Support both complex and simple formats
  AttributeType: string;
}

export interface DataverseEntity {
  LogicalName: string;
  EntitySetName?: string; // Used for Web API collections
  LogicalCollectionName?: string; // Fallback - all lower-case collection name
  DisplayName: {
    UserLocalizedLabel?: {
      Label: string;
      LanguageCode: number;
    };
    LocalizedLabels?: Array<{
      Label: string;
      LanguageCode: number;
    }>;
  } | string; // Support both complex and simple formats
  Attributes: DataverseAttribute[];
}

export interface MetadataCache {
  entities: DataverseEntity[];
  lastFetched: number;
  isLoading: boolean;
}

type GetAsJsonFunction = <T>(url: string, params?: URLSearchParams, headers?: Record<string, string>) => Promise<T>;

export class MetadataService {
  private cache: MetadataCache = {
    entities: [],
    lastFetched: 0,
    isLoading: false
  };

  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private getAsJson: GetAsJsonFunction) {}

  public async getMetadata(): Promise<DataverseEntity[]> {
    const now = Date.now();
    
    // Return cached data if it's still fresh
    if (this.cache.entities.length > 0 && (now - this.cache.lastFetched) < this.CACHE_DURATION && !this.cache.isLoading) {
      return this.cache.entities;
    }

    // If already loading, wait for the existing request
    if (this.cache.isLoading) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          if (!this.cache.isLoading) {
            resolve(this.cache.entities);
          } else {
            setTimeout(checkLoading, 100);
          }
        };
        checkLoading();
      });
    }

    // Fetch fresh metadata
    return this.fetchMetadata();
  }

  private async fetchMetadata(): Promise<DataverseEntity[]> {
    this.cache.isLoading = true;
    
    try {
      console.log('Fetching Dataverse metadata...');
      
      // First, get the list of entities using proper Dataverse Web API syntax
      // Based on Microsoft docs: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-metadata-web-api
      // Request both EntitySetName and LogicalCollectionName per entity metadata docs
      const entitiesResponse = await this.getAsJson<any>(
        '/api/data/v9.0/EntityDefinitions?$select=LogicalName,DisplayName,EntitySetName,LogicalCollectionName'
      );

      // Handle PowerTools API response format
      let entitiesData: any;
      if (entitiesResponse && typeof entitiesResponse.content === 'string') {
        entitiesData = JSON.parse(entitiesResponse.content);
      } else {
        entitiesData = entitiesResponse;
      }

      // Check for API errors
      if (entitiesData.error) {
        throw new Error(`API Error: ${entitiesData.error.message} (${entitiesData.error.code})`);
      }

      const entities = entitiesData.value || [];
      console.log(`Fetched ${entities.length} entities`);

      // Debug: Log the first few entities to see what properties we're getting
      if (entities.length > 0) {
        console.log('Sample entity properties:', JSON.stringify(entities.slice(0, 3).map((e: any) => ({
          LogicalName: e.LogicalName,
          EntitySetName: e.EntitySetName,
          LogicalCollectionName: e.LogicalCollectionName,
          hasEntitySetName: !!e.EntitySetName,
          hasLogicalCollectionName: !!e.LogicalCollectionName
        })), null, 2));
      }

      // If we have no entities, return empty array
      if (entities.length === 0) {
        console.warn('No entities returned from API');
        this.cache.entities = [];
        this.cache.lastFetched = Date.now();
        this.cache.isLoading = false;
        return [];
      }

      // For common entities that are likely to be used, fetch their attributes
      const commonEntities = ['account', 'contact', 'lead', 'opportunity', 'systemuser'];
      const entitiesToFetchAttributes = entities.filter((entity: DataverseEntity) => 
        commonEntities.includes(entity.LogicalName.toLowerCase())
      ).slice(0, 5); // Limit to 5 entities for performance

      const entitiesWithAttributes = await Promise.all(
        entitiesToFetchAttributes.map(async (entity: DataverseEntity) => {
          try {
            // Use proper syntax for fetching attributes as per Microsoft docs
            const attributesResponse = await this.getAsJson<any>(
              `/api/data/v9.0/EntityDefinitions(LogicalName='${entity.LogicalName}')?$select=LogicalName,DisplayName&$expand=Attributes($select=LogicalName,DisplayName,AttributeType)`
            );

            // Handle PowerTools API response format
            let attributesData: any;
            if (attributesResponse && typeof attributesResponse.content === 'string') {
              attributesData = JSON.parse(attributesResponse.content);
            } else {
              attributesData = attributesResponse;
            }

            // Check for API errors
            if (attributesData.error) {
              console.warn(`Error fetching attributes for ${entity.LogicalName}:`, attributesData.error.message);
              return {
                ...entity,
                Attributes: []
              };
            }

            return {
              LogicalName: attributesData.LogicalName,
              DisplayName: attributesData.DisplayName,
              Attributes: attributesData.Attributes || []
            };
          } catch (error) {
            console.warn(`Failed to fetch attributes for entity ${entity.LogicalName}:`, error);
            return {
              ...entity,
              Attributes: []
            };
          }
        })
      );

      // Add remaining entities without attributes for entity suggestions
      const remainingEntities = entities.filter((entity: DataverseEntity) => 
        !commonEntities.includes(entity.LogicalName.toLowerCase())
      ).map((entity: DataverseEntity) => ({
        ...entity,
        Attributes: []
      }));

      const allEntities = [...entitiesWithAttributes, ...remainingEntities];

      this.cache.entities = allEntities;
      this.cache.lastFetched = Date.now();
      this.cache.isLoading = false;

      console.log('Metadata cache updated successfully');
      return this.cache.entities;

    } catch (error) {
      console.error('Error fetching metadata:', error);
      this.cache.isLoading = false;
      throw error;
    }
  }

  public getEntityByName(logicalName: string): DataverseEntity | undefined {
    return this.cache.entities.find(entity => 
      entity.LogicalName.toLowerCase() === logicalName.toLowerCase()
    );
  }

  // Helper method to get display name from complex or simple format
  private getDisplayName(displayName: DataverseEntity['DisplayName'] | DataverseAttribute['DisplayName']): string {
    if (typeof displayName === 'string') {
      return displayName;
    }
    
    if (displayName?.UserLocalizedLabel?.Label) {
      return displayName.UserLocalizedLabel.Label;
    }
    
    if (displayName?.LocalizedLabels && displayName.LocalizedLabels.length > 0) {
      return displayName.LocalizedLabels[0].Label;
    }
    
    return '';
  }

  public searchEntities(query: string): DataverseEntity[] {
    if (!query) return this.cache.entities;
    
    const searchTerm = query.toLowerCase();
    return this.cache.entities.filter(entity => {
      const displayName = this.getDisplayName(entity.DisplayName);
      return entity.LogicalName.toLowerCase().includes(searchTerm) ||
             displayName.toLowerCase().includes(searchTerm);
    });
  }

  public searchAttributes(entityName: string, query: string): DataverseAttribute[] {
    const entity = this.getEntityByName(entityName);
    if (!entity) return [];

    if (!query) return entity.Attributes;

    const searchTerm = query.toLowerCase();
    return entity.Attributes.filter(attr => {
      const displayName = this.getDisplayName(attr.DisplayName);
      return attr.LogicalName.toLowerCase().includes(searchTerm) ||
             displayName.toLowerCase().includes(searchTerm);
    });
  }

  public isLoading(): boolean {
    return this.cache.isLoading;
  }

  public clearCache(): void {
    this.cache = {
      entities: [],
      lastFetched: 0,
      isLoading: false
    };
  }

  // Helper method to get the correct collection name for Web API queries
  private getCollectionName(entity: DataverseEntity): string {
    // Priority: EntitySetName > LogicalCollectionName > LogicalName + 's'
    if (entity.EntitySetName) {
      return entity.EntitySetName;
    }
    if (entity.LogicalCollectionName) {
      return entity.LogicalCollectionName;
    }
    // Fallback to LogicalName + 's' (this is what we were always doing before)
    return entity.LogicalName + 's';
  }

  public getEntityCollectionName(logicalName: string): string | null {
    const entity = this.getEntityByName(logicalName);
    if (!entity) return null;
    return this.getCollectionName(entity);
  }
} 