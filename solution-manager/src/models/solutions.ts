export interface ISolution {
    solutionid: string;
    friendlyname: string;
    uniquename: string;
    version: string;
    modifiedon: string;
    ismanaged: boolean;
    createdon: string;

    installedon: string;

    publisherid: IPublisher;
}

export interface IPublisher {
    publisherid: string;
    friendlyname: string;
    description: string;
    uniquename: string;
}
