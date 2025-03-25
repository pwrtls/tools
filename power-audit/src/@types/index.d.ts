declare interface IHttpResult {
	headers: any;
	statusCode: number;
	contentLength: number;
	content: string;

	asJson<TResult>(): Promise<TResult>;
	asCsv(): Promise<string>;
	asText(): Promise<string>;
	getSkipToken(): Promise<string>;
}

declare interface IHeaders {
	[key: string]: string;
}

declare interface Window {
	PowerTools: {
		version: string;
		isLoaded(): boolean;
		onLoad(): Promise<void>;
		addConnectionChangeListener(listener: (connectionName: string | undefined) => void): void;
		get(url: string, query?: URLSearchParams, headers?: IHeaders): Promise<IHttpResult>;
		post(url: string, body?: any, headers?: IHeaders): Promise<IHttpResult>;
		download(data: string, fileName?: string, mimeType?: string): Promise<void>;
	};
} 