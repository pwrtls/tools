export interface IAuditLog {
    auditid: string;
    createdon: string;
    operation: number;
    operation_formatted?: string;
    action: number;
    action_formatted?: string;
    objecttypecode: string;
    objecttypecode_formatted?: string;
    attributemask: string;
    _userid_value: string;
    transactionid?: string;
    objectid?: string;
    userid?: string;
    username?: string;
}

export interface IAuditLogDetails {
    auditdetailid: string;
    auditid: string;
    attributemask: string;
    oldvalue?: string;
    newvalue?: string;
    attributename?: string;
}

export enum AuditOperation {
    Create = 1,
    Update = 2,
    Delete = 3,
    Access = 4,
    AssignUser = 5,
    AssignTeam = 6,
    Share = 7,
    GrantAccess = 8,
    ExportToExcel = 9,
    ImportFromXml = 10,
    Other = 12,
    SystemDefined = 13
}

export const operationLabels: Record<number, string> = {
    1: 'Create',
    2: 'Update',
    3: 'Delete',
    4: 'Access',
    5: 'Assign (User)',
    6: 'Assign (Team)',
    7: 'Share',
    8: 'Grant Access',
    9: 'Export to Excel',
    10: 'Import from XML',
    12: 'Other',
    13: 'System Defined'
}; 