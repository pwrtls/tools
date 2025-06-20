export interface ISystemUser {
  systemuserid: string;
  fullname: string;
  internalemailaddress: string;
  domainname: string;
  isdisabled: boolean;
  [key: string]: any;
} 