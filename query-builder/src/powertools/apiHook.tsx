import { useContext } from 'react';
import { PowerToolsContext } from './context';

export function usePowerToolsApi() {
    const { get, post, isLoaded, download } = useContext(PowerToolsContext);

    const wrappedGet = async (url: string, params?: URLSearchParams, headers?: Record<string, string>) => {
        if (!get) {
            console.error('PowerTools get method is not available');
            throw new Error('PowerTools API is not available - get method missing');
        }
        try {
            return await get(url, params, headers);
        } catch (error) {
            console.error('Error in API GET request:', error);
            throw error;
        }
    };

    const getAsJson = async <T,>(url: string, params?: URLSearchParams, headers?: Record<string, string>): Promise<T> => {
        const res = await wrappedGet(url, params, headers);
        return await res.asJson<T>();
    };

    const wrappedDownload = async (content: string, fileName?: string, mimeType?: string) => {
        if (!download) {
            throw new Error('PowerTools API is not available - download method missing');
        }
        return download(content, fileName, mimeType);
    };

    return { get: wrappedGet, getAsJson, post, isLoaded, download: wrappedDownload } as const;
}
