export interface IWebResource {
    content?: string;
    componentstate: number;
    'componentstate@OData.Community.Display.V1.FormattedValue': string;
    createdon: string;
    description?: string;
    displayname?: string;
    ismanaged: boolean;
    'ismanaged@OData.Community.Display.V1.FormattedValue': string;
    name: string;
    solutionid: string;
    webresourceid: string;
    webresourcetype: WebResourceType;
    'webresourcetype@OData.Community.Display.V1.FormattedValue': string;
    _createdby_value: string;
}

export enum WebResourceType {
    '.html' = 1,
    '.css' = 2,
    '.js' = 3,
    '.xml' = 4,
    '.png' = 5,
    '.jpg' = 6,
    '.gif' = 7,
    '.xap' = 8,
    '.xsl' = 9,
    '.ico' = 10,
    '.svg' = 11,
    '.resx' = 12,
}
