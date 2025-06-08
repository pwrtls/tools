// OData Response structure
export interface IODataResponse<T> {
    '@odata.context': string;
    '@odata.count'?: number;
    '@odata.nextLink'?: string;
    value: T[];
}

// Entity metadata interfaces
export interface IEntityMetadata {
    LogicalName: string;
    EntitySetName: string;
    MetadataId: string;
    DisplayName?: ILabel;
    SchemaName: string;
    PrimaryIdAttribute: string;
    PrimaryNameAttribute: string;
    IsCustomEntity?: boolean;
    OwnershipType?: string;
    Attributes?: IAttributeMetadata[];
}

export interface IAttributeMetadata {
    LogicalName: string;
    SchemaName: string;
    MetadataId: string;
    DisplayName?: ILabel;
    AttributeType: string;
    IsValidForRead: boolean;
    IsValidForCreate: boolean;
    IsValidForUpdate: boolean;
    RequiredLevel?: string;
    IsPrimaryId?: boolean;
    IsPrimaryName?: boolean;
    MaxLength?: number;
    OptionSet?: IOptionSetMetadata;
    Targets?: string[];
}

export interface ILabel {
    LocalizedLabels: ILocalizedLabel[];
    UserLocalizedLabel: ILocalizedLabel;
}

export interface ILocalizedLabel {
    Label: string;
    LanguageCode: number;
    IsManaged: boolean;
    MetadataId: string;
    HasChanged?: boolean;
}

export interface IOptionSetMetadata {
    MetadataId: string;
    Name: string;
    DisplayName?: ILabel;
    Options: IOptionMetadata[];
}

export interface IOptionMetadata {
    Value: number;
    Label: ILabel;
    Description?: ILabel;
}

// Query related interfaces
export interface IQueryRequest {
    queryType: QueryType;
    query: string;
    entityName?: string;
    pageSize?: number;
    page?: number;
}

export interface IQueryResult {
    success: boolean;
    data?: any[];
    error?: string;
    errorDetails?: any;
    totalCount?: number;
    hasMore?: boolean;
    warnings?: string[];
}

export interface IQuerySuggestion {
    text: string;
    detail?: string;
    kind: 'entity' | 'attribute' | 'keyword' | 'function' | 'operator';
    insertText?: string;
    documentation?: string;
}

export type QueryType = 'odata' | 'sql' | 'fetchxml';

export interface IQueryLanguageConfig {
    name: string;
    displayName: string;
    description: string;
    fileExtension: string;
    keywords: string[];
    functions: string[];
    operators: string[];
    monaco?: {
        language: string;
        theme?: string;
    };
}

// Error interfaces
export interface IApiError {
    error: {
        code: string;
        message: string;
        details?: any[];
    };
} 