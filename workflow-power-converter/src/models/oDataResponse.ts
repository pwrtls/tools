export interface IoDataResponse<TData = {}> {
  '@odata.context': string;
  '@odata.count'?: number;
  '@odata.nextLink'?: string;
  value: TData[];
}
