export interface IoDataResponse<TData> {
    '@odata.context': string;
    '@odata.count'?: number;
    value: TData[];
}
