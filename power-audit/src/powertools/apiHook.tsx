import { useContext } from 'react';

import { PowerToolsContext } from './context';

type getParameters = Parameters<typeof window.PowerTools.get>;
type postParameters = Parameters<typeof window.PowerTools.post>;

export function usePowerToolsApi() {
    const { get, post, isLoaded, download } = useContext(PowerToolsContext);

    // Add logging to help debug API access
    const wrappedGet = async (url: string, params?: URLSearchParams, headers?: Record<string, string>) => {
        if (!get) {
            console.error('PowerTools get method is not available');
            throw new Error('PowerTools API is not available - get method missing');
        }
        
        console.log('Making API GET request:', url, params?.toString());
        try {
            return await get(url, params, headers);
        } catch (error) {
            console.error('Error in API GET request:', error);
            throw error;
        }
    };

    const getAsJson = async <T,>(url: string, params?: URLSearchParams, headers?: Record<string, string>): Promise<T> => {
        if (!get) {
            console.error('PowerTools get method is not available');
            throw new Error('PowerTools API is not available - get method missing');
        }
        
        console.log('Making API GET request for JSON:', url, params?.toString());
        try {
            const response = await get(url, params, headers);
            return await response.asJson<T>();
        } catch (error) {
            console.error('Error in API GET request:', error);
            throw error;
        }
    };

    const wrappedDownload = async (content: string, fileName?: string, mimeType?: string) => {
        if (!download) {
            console.error('PowerTools download method is not available');
            throw new Error('PowerTools API is not available - download method missing');
        }
        
        console.log('Downloading file:', fileName);
        try {
            return await download(content, fileName, mimeType);
        } catch (error) {
            console.error('Error in download:', error);
            throw error;
        }
    };

    return { 
        get: wrappedGet,
        getAsJson,
        post, 
        isLoaded, 
        download: wrappedDownload 
    } as const;
} 