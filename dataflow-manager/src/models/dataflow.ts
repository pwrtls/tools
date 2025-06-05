export interface IDataflow {
    id: string;
    name: string;
    description?: string;
    owner?: {
        id: string;
        name: string;
        email?: string;
    };
    modifiedDateTime?: string;
    createdDateTime?: string;
    workspaceId?: string;
    workspaceName?: string;
}

export interface IDataflowOwnerUpdateRequest {
    newOwnerName: string;
    newOwnerUserId: string;
    previousOwnerUserId: string;
}

export interface IUser {
    id: string; // Primary ID (Azure AD Object ID preferred, fallback to systemuserid)
    systemUserId?: string; // Dataverse system user ID
    azureAdObjectId?: string; // Azure AD Object ID
    name: string;
    email?: string;
    userPrincipalName?: string;
} 