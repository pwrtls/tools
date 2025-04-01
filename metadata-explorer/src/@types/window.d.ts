interface Window {
    PowerTools: {
        onLoad: () => Promise<unknown>;
        addConnectionChangeListener: (callback: (name: string | undefined) => void) => void;
        get: (url: string, params?: URLSearchParams, headers?: Record<string, string>) => Promise<{
            asJson: <T>() => Promise<T>;
            asText: () => Promise<string>;
        }>;
        post: (url: string, data: unknown, headers?: Record<string, string>) => Promise<{
            asJson: <T>() => Promise<T>;
            asText: () => Promise<string>;
        }>;
        download: (content: string, fileName?: string, mimeType?: string) => Promise<void>;
    };
} 