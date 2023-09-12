declare interface IHttpResult {
	headers: any;
	statusCode: number;
	contentLength: number;
	content: string;

	asJson<TResult>(): Promise<TResult>;
    getSkipToken(): Promise<string>;
}

declare interface IHeaders {
	[key: string]: string;
}

interface PowerTools {
    version: string;
    isLoaded(): boolean;
    onLoad(): Promise<void>;
    addConnectionChangeListener(listener: (connectionName: string | undefined) => void): void;
    get(url: string, query?: URLSearchParams, headers?: IHeaders): Promise<any>;
    download(data: string, fileName?: string, mimeType?: string): Promise<void>;
}

interface Window {
    PowerTools: PowerTools;
}
