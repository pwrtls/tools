export interface ISolutionComponentSummary {
    msdyn_modifiedon: string;
    msdyn_createdon: string;
    msdyn_solutionid: string;
    msdyn_ismanaged: boolean;
    msdyn_ismanagedname: string;
    organizationid: string;
    msdyn_isappaware?: boolean;
    msdyn_isappawarename: string;
    msdyn_name: string;
    msdyn_displayname: string;
    msdyn_objecttypecode: number;
    msdyn_objectid: string;
    msdyn_description: string;
    msdyn_componenttype: SolutionComponentType;
    msdyn_componenttypename: string;
    msdyn_componentlogicalname: string;
    msdyn_primaryidattribute: string;
    msdyn_total: number;
    msdyn_executionorder?: any;
    msdyn_isolationmode: any;
    msdyn_sdkmessagename: string;
    msdyn_connectorinternalid?: any;
    msdyn_iscustomizablename: string;
    msdyn_iscustom?: boolean;
    msdyn_synctoexternalsearchindex: string;
    msdyn_logicalcollectionname: string;
    msdyn_canvasappuniqueid?: any;
    msdyn_solutioncomponentsummaryid?: any;
    msdyn_deployment: string;
    msdyn_executionstage: string;
    msdyn_owner?: any;
    msdyn_fieldsecurity: string;
    msdyn_typename: string;
    msdyn_eventhandler: string;
    msdyn_statusname: string;
    msdyn_isdefault?: boolean;
    msdyn_publickeytoken: string;
    msdyn_iscustomname: string;
    msdyn_workflowcategoryname?: any;
    msdyn_subtype?: number;
    msdyn_owningbusinessunit?: any;
    msdyn_workflowcategory?: any;
    msdyn_isauditenabledname: string;
    msdyn_isdefaultname: string;
    msdyn_istableenabled?: any;
    msdyn_fieldtype: string;
    msdyn_relatedentity: string;
    msdyn_schemaname: string;
    msdyn_version: string;
    msdyn_standardstatus?: number;
    msdyn_uniquename: string;
    msdyn_iscustomizable?: boolean;
    msdyn_status?: number;
    msdyn_relatedentityattribute: string;
    msdyn_workflowidunique?: any;
    msdyn_isauditenabled?: boolean;
    msdyn_primaryentityname: string;
    msdyn_culture: string;
}

export enum SolutionComponentType {
    Entity = 1,
    Attribute = 2,
    Relationship = 3,
    AttributePicklistValue = 4,
    AttributeLookupValue = 5,
    ViewAttribute = 6,
    LocalizedLabel = 7,
    RelationshipExtraCondition = 8,
    OptionSet = 9,
    EntityRelationship = 10,
    EntityRelationshipRole = 11,
    EntityRelationshipRelationships = 12,
    ManagedProperty = 13,
    EntityKey = 14,
    Privilege = 16,
    PrivilegeObjectTypeCode = 17,
    Role = 20,
    RolePrivilege = 21,
    DisplayString = 22,
    DisplayStringMap = 23,
    Form = 24,
    Organization = 25,
    SavedQuery = 26,
    Workflow = 29,
    Report = 31,
    ReportEntity = 32,
    ReportCategory = 33,
    ReportVisibility = 34,
    Attachment = 35,
    EmailTemplate = 36,
    ContractTemplate = 37,
    KBArticleTemplate = 38,
    MailMergeTemplate = 39,
    DuplicateRule = 44,
    DuplicateRuleCondition = 45,
    EntityMap = 46,
    AttributeMap = 47,
    RibbonCommand = 48,
    RibbonContextGroup = 49,
    RibbonCustomization = 50,
    RibbonRule = 52,
    RibbonTabToCommandMap = 53,
    RibbonDiff = 55,
    SavedQueryVisualization = 59,
    SystemForm = 60,
    WebResource = 61,
    SiteMap = 62,
    ConnectionRole = 63,
    ComplexControl = 64,
    FieldSecurityProfile = 70,
    FieldPermission = 71,
    PluginType = 90,
    PluginAssembly = 91,
    SDKMessageProcessingStep = 92,
    SDKMessageProcessingStepImage = 93,
    ServiceEndpoint = 95,
    RoutingRule = 150,
    RoutingRuleItem = 151,
    SLA = 152,
    SLAItem = 153,
    ConvertRule = 154,
    ConvertRuleItem = 155,
    HierarchyRule = 65,
    MobileOfflineProfile = 161,
    MobileOfflineProfileItem = 162,
    SimilarityRule = 165,
    CustomControl = 66,
    CustomControlDefaultConfig = 68,
    DataSourceMapping = 166,
    SDKMessage = 201,
    SDKMessageFilter = 202,
    SdkMessagePair = 203,
    SdkMessageRequest = 204,
    SdkMessageRequestField = 205,
    SdkMessageResponse = 206,
    SdkMessageResponseField = 207,
    WebWizard = 210,
    Index = 18,
    ImportMap = 208,
    CanvasApp = 300,
    Connector = 371,
    Connector_ = 372,
    EnvironmentVariableDefinition = 380,
    EnvironmentVariableValue = 381,
    AIProjectType = 400,
    AIProject = 401,
    AIConfiguration = 402,
    EntityAnalyticsConfiguration = 430,
    AttributeImageConfiguration = 431,
    EntityImageConfiguration = 432,
}
