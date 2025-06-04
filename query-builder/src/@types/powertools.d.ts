interface PowerToolsResponse {
  asJson<T>(): Promise<T>;
  text(): Promise<string>;
  getSkipToken?(): Promise<string>;
}

interface IHeaders {
  [key: string]: string;
}

interface PowerTools {
  version: string;
  isLoaded(): boolean;
  onLoad(): Promise<void>;
  get(url: string, params?: URLSearchParams, headers?: IHeaders): Promise<PowerToolsResponse>;
  post(url: string, body?: any, headers?: IHeaders): Promise<PowerToolsResponse>;
  download(content: string, fileName?: string, mimeType?: string): Promise<void>;
  addConnectionChangeListener(callback: (name: string | undefined) => void): void;
}

declare global {
  interface Window {
    PowerTools?: PowerTools;
  }
}

export {};
