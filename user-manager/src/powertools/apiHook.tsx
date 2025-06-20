import { useContext } from 'react';
import { PowerToolsContext } from './context';

export function usePowerToolsApi() {
    const { get, post, isLoaded, download } = useContext(PowerToolsContext);

    async function getAsJson<T>(url: string): Promise<T> {
        if (!get) {
            throw new Error('PowerTools get method is not available');
        }

        try {
            const res = await get(url);
            return await res.asJson<T>();
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Error in API GET request:', error);
            }
            throw error;
        }
    }

    async function postAsJson<T>(url: string, body?: any, headers?: any): Promise<T> {
        if (!post) {
            throw new Error('PowerTools post method is not available');
        }

        try {
            const res = await post(url, body, headers);
            return await res.asJson<T>();
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Error in API POST request:', error);
            }
            throw error;
        }
    }

    async function downloadFile(url: string, fileName: string): Promise<void> {
        if (!download) {
            throw new Error('PowerTools download method is not available');
        }

        try {
            await download(url, fileName);
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Error in download:', error);
            }
            throw error;
        }
    }

    return { 
        get: get || undefined, 
        getAsJson: get ? getAsJson : undefined, 
        post: post || undefined, 
        postAsJson: post ? postAsJson : undefined, 
        isLoaded, 
        download: download || undefined,
        downloadFile: download ? downloadFile : undefined
    } as const;
}