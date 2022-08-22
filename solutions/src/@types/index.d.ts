declare interface IHttpResult {
	headers: any;
	statusCode: number;
	contentLength: number;
	content: string;

	asJson<TResult>(): Promise<TResult>;
}

declare interface Window {
	PowerTools: {
		version: string;
		isLoaded(): boolean;
		onLoad(): Promise<void>;
		addConnectionChangeListener(listener: (connectionName: string | undefined) => void): void;
		get(url: string): Promise<IHttpResult>;
	};
}
