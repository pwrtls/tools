export interface ISolution {
    solutionid: string;
    friendlyname: string;
    uniquename: string;
    version: string;
    modifiedon: string;
    ismanaged: boolean;

    publisherid: IPublisher;
}

export interface IPublisher {
    publisherid: string;
    friendlyname: string;
    description: string;
    uniquename: string;
}
