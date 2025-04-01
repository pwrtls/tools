import { useContext } from 'react';
import { PowerToolsContext } from './context';

type getParameters = Parameters<typeof window.PowerTools.get>;
type postParameters = Parameters<typeof window.PowerTools.post>;

export function usePowerToolsApi() {
    const { get, post, isLoaded, download } = useContext(PowerToolsContext);

    async function getAsJson<T>(url: string, query?: URLSearchParams, headers?: Record<string, string>): Promise<T> {
        if (!get) {
            console.error('PowerTools get method is not available');
            throw new Error('PowerTools API is not available - get method missing');
        }

        console.log('Making API GET request:', url, query?.toString());
        try {
            const res = await get(url, query, headers);
            return await res.asJson<T>();
        } catch (error) {
            console.error('Error in API GET request:', error);
            throw error;
        }
    }

    async function postAsJson<T>(url: string, body?: any, headers?: Record<string, string>): Promise<T> {
        if (!post) {
            console.error('PowerTools post method is not available');
            throw new Error('PowerTools API is not available - post method missing');
        }

        console.log('Making API POST request:', url);
        try {
            const res = await post(url, body, headers);
            return await res.asJson<T>();
        } catch (error) {
            console.error('Error in API POST request:', error);
            throw error;
        }
    }

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
        get, 
        getAsJson, 
        post, 
        postAsJson, 
        isLoaded, 
        download: wrappedDownload 
    } as const;
} 