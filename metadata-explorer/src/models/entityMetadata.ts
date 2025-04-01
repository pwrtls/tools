// Entity metadata interface based on Microsoft Dynamics API
export interface IEntityMetadata {
    MetadataId: string;
    LogicalName: string;
    SchemaName: string;
    EntitySetName: string;
    DisplayName: {
        UserLocalizedLabel: {
            Label: string;
            LanguageCode: number;
        };
    };
    Description: {
        UserLocalizedLabel: {
            Label: string;
            LanguageCode: number;
        };
    };
    IsCustomEntity: boolean;
    IsIntersect: boolean;
    IsActivity: boolean;
    IsLookupTable: boolean;
    IsBPFEntity: boolean;
    IsMappable: boolean;
    IsCustomizable: {
        Value: boolean;
    };
    IsRenameable: {
        Value: boolean;
    };
    IsValidForAdvancedFind: {
        Value: boolean;
    };
    Attributes: IAttributeMetadata[];
    ManyToOneRelationships: IRelationshipMetadata[];
    OneToManyRelationships: IRelationshipMetadata[];
    ManyToManyRelationships: IRelationshipMetadata[];
    ObjectTypeCode: number;
    PrimaryIdAttribute: string;
    PrimaryNameAttribute: string;
}

// Attribute metadata interface
export interface IAttributeMetadata {
    MetadataId: string;
    LogicalName: string;
    SchemaName: string;
    DisplayName: {
        UserLocalizedLabel: {
            Label: string;
            LanguageCode: number;
        };
    };
    Description: {
        UserLocalizedLabel: {
            Label: string;
            LanguageCode: number;
        };
    };
    AttributeType: string;
    AttributeTypeName: {
        Value: string;
    };
    IsPrimaryId: boolean;
    IsPrimaryName: boolean;
    IsCustomAttribute: boolean;
    IsValidForRead: boolean;
    IsValidForCreate: boolean;
    IsValidForUpdate: boolean;
    RequiredLevel: {
        Value: string;
    };
    IsCustomizable: {
        Value: boolean;
    };
    MaxLength?: number;
    Precision?: number;
    Format?: string;
    SourceType?: number;
    // Lookup-specific properties
    Targets?: string[];
    // OptionSet-specific properties
    OptionSet?: IOptionSetMetadata;
}

// Relationship metadata interface
export interface IRelationshipMetadata {
    MetadataId: string;
    SchemaName: string;
    ReferencedEntity: string;
    ReferencedAttribute: string;
    ReferencingEntity: string;
    ReferencingAttribute: string;
    RelationshipType: number;
    IsCustomRelationship: boolean;
    IsValidForAdvancedFind: boolean;
    IsCustomizable: {
        Value: boolean;
    };
    // Many-to-Many specific properties
    IntersectEntityName?: string;
}

// Option set metadata interface
export interface IOptionSetMetadata {
    MetadataId?: string;
    Name?: string;
    DisplayName?: {
        UserLocalizedLabel: {
            Label: string;
            LanguageCode: number;
        };
    };
    IsCustomOptionSet?: boolean;
    IsGlobal?: boolean;
    Options: IOptionMetadata[];
}

// Option metadata interface
export interface IOptionMetadata {
    Value: number;
    Label: {
        UserLocalizedLabel: {
            Label: string;
            LanguageCode: number;
        };
    };
    Description?: {
        UserLocalizedLabel: {
            Label: string;
            LanguageCode: number;
        };
    };
    Color?: string;
} 