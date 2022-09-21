export interface IPluginTraceLog{
    organizationid: string;
    requestid: string;
    operationtype: number;
    primaryentity: string;
    correlationid: string;
    performanceexecutionduration: number;
    _createdby_value: string;
    issystemcreated: boolean;
    messageblock: string;
    messagename: string;
    performanceconstructorstarttime: string;
    depth: number;
    plugintracelogid: string;
    mode: number;
    performanceexecutionstarttime: string;
    exceptiondetails: string;
    typename: string;
    pluginstepid: string;
    persistencekey: string;
    createdon: string;
    performanceconstructorduration: number;
    configuration?: any;
    _createdonbehalfby_value?: any;
    secureconfiguration?: any;
    profile?: any;
}
