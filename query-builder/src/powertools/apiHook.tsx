import { useContext } from 'react';
import { PowerToolsContext } from './context';

export function usePowerToolsApi() {
    const { get, post, isLoaded, download } = useContext(PowerToolsContext);

    // Add logging to help debug API access
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
        if (!get) {
            console.error('PowerTools get method is not available');
            throw new Error('PowerTools API is not available - get method missing');
        }
        
        try {
            const response = await get(url, params, headers);
            const result = await response.asJson();
            return result as T;
        } catch (error) {
            console.error('Error in API GET request:', error);
            throw error;
        }
    };

    const wrappedPost = async (url: string, body?: any, headers?: Record<string, string>) => {
        if (!post) {
            console.error('PowerTools post method is not available');
            throw new Error('PowerTools API is not available - post method missing');
        }
        
        try {
            return await post(url, body, headers);
        } catch (error) {
            console.error('Error in API POST request:', error);
            throw error;
        }
    };

    const wrappedDownload = async (content: string, fileName?: string, mimeType?: string) => {
        if (!download) {
            console.error('PowerTools download method is not available');
            throw new Error('PowerTools API is not available - download method missing');
        }
        
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
        post: wrappedPost, 
        isLoaded, 
        download: wrappedDownload 
    } as const;
} 