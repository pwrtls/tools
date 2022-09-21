export interface ISolution {
    solutionid: string;
    friendlyname: string;
    uniquename: string;

    publisherid: IPublisher;
}

export interface IPublisher {
    publisherid: string;
    friendlyname: string;
    description: string;
    uniquename: string;
}
