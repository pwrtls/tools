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

declare global {
    interface Window {
        PowerTools: {
            get: (url: string) => Promise<{ asJson: <T>() => Promise<T>; content: string; statusCode: number }>;
            post: (url: string, body?: any, headers?: any) => Promise<{ asJson: <T>() => Promise<T>; content: string; statusCode: number }>;
            download: (url: string, fileName: string) => Promise<void>;
            onLoad: () => Promise<void>;
            addConnectionChangeListener: (callback: (name: string | undefined) => void) => void;
        };
    }
    
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production' | 'test';
            REACT_APP_VERSION?: string;
        }
    }
}

export {};
