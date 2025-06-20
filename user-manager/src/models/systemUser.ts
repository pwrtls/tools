export interface ISystemUser {
  systemuserid: string;
  fullname: string | null;
  internalemailaddress: string | null;
  domainname: string | null;
  isdisabled: boolean;
  // Allow additional dynamic properties from OData responses
  [key: string]: any;
}

// Type guard to validate system user data
export const isValidSystemUser = (obj: any): obj is ISystemUser => {
  return obj 
    && typeof obj === 'object'
    && typeof obj.systemuserid === 'string'
    && obj.systemuserid.length > 0
    && typeof obj.isdisabled === 'boolean'
    && (obj.fullname === null || typeof obj.fullname === 'string')
    && (obj.internalemailaddress === null || typeof obj.internalemailaddress === 'string')
    && (obj.domainname === null || typeof obj.domainname === 'string');
};

// Utility to safely extract user display name
export const getUserDisplayName = (user: ISystemUser): string => {
  return user.fullname || user.internalemailaddress || user.domainname || 'Unknown User';
}; 