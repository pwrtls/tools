export interface IAuditRecord {
    _objectid_value: string;
    _userid_value: string;
    versionnumber: number;
    operation: number;
    createdon: string;
    auditid: string;
    changedata: string;
    action: number;
    objecttypecode: string;
    transactionid: string;
}

export interface IFormattedAuditRecord {
    auditid: string;
    operation: string | number;
    action: string | number;
    createdon: string;
    objecttypecode: string;
    _objectid_value: string;
    _userid_value: string;
    versionnumber: number | string;
    changedata: string;
    transactionid: string;
    userid?: {
        fullname: string;
    };
}