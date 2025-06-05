import { useContext, useRef } from 'react';
import { PowerToolsContext } from './context';

// Define parameter types safely with optional chaining
// type GetFn = NonNullable<typeof window.PowerTools>['get']; // Unused
// type PostFn = NonNullable<typeof window.PowerTools>['post']; // Unused

/**
 * Custom hook to interact with the PowerTools API
 * @returns Hook API methods for PowerTools integration
 */
export function usePowerToolsApi() {
    const { get, post, isLoaded, download } = useContext(PowerToolsContext);
    const prevStateRef = useRef<string | null>(null);

    async function getAsJson<T>(url: string, query?: URLSearchParams, headers?: Record<string, string>): Promise<T> {
        if (!get) {
            console.error('PowerTools get method is not available');
            throw new Error('PowerTools API is not available - get method missing');
        }

        console.log('Making API GET request for JSON:', url, 'Query:', query);
        console.log('Request headers:', headers || 'none');

        try {
            // Assuming 'get' returns a Promise<IHttpResult> or similar based on PowerTools API structure
            const res = await get(url, query, headers) as IHttpResult; 
            if (!res) {
                console.error('No response received from PowerTools API');
                throw new Error('No response received from PowerTools API');
            }

            // Gracefully handle empty or non-JSON content
            if (res.statusCode === 204 || res.contentLength === 0 || !res.content || (typeof res.content === 'string' && res.content.trim() === '')) {
                console.warn(`API GET request to ${url} returned status ${res.statusCode || 'unknown'} with empty or no content. Returning null.`);
                return null as T;
            }
            
            const jsonData = await res.asJson<T>();
            
            const responsePreview = typeof jsonData === 'object' && jsonData !== null
                ? {
                    keys: Object.keys(jsonData || {}),
                    hasError: jsonData && typeof jsonData === 'object' && 'error' in jsonData,
                    errorDetails: jsonData && typeof jsonData === 'object' && 'error' in jsonData ? (jsonData as any).error : null,
                    hasValue: jsonData && typeof jsonData === 'object' && 'value' in jsonData,
                    valueType: jsonData && typeof jsonData === 'object' && (jsonData as any).value ? Array.isArray((jsonData as any).value) ? 'array' : typeof (jsonData as any).value : null,
                    valueLength: jsonData && typeof jsonData === 'object' && (jsonData as any).value && Array.isArray((jsonData as any).value) ? (jsonData as any).value.length : null
                }
                : { type: typeof jsonData };
            
            console.log('API response preview (after asJson()):', responsePreview);
            
            return jsonData;
        } catch (error: any) {
            if (error.message && (
                error.message.includes('Unrecognized feature') || 
                error.message.includes('top-navigation') ||
                error.message.includes('Content Security Policy')
            )) {
                console.error('Browser security restriction detected:', error.message);
                throw new Error('Browser security restriction detected. This is likely due to iframe restrictions. Please contact your administrator.');
            }
            
            let errorMessage = 'API request failed';
            
            if (error.message) {
                errorMessage = error.message;
                if (error.message.includes('Could not find a property named')) {
                    const missingProp = error.message.match(/property named '([^']+)'/);
                    if (missingProp && missingProp[1]) {
                        errorMessage = `Property '${missingProp[1]}' is not available in the API. Please check the field name in the documentation.`;
                        console.error('Field not found error:', errorMessage);
                        console.error('Documentation URL: https://learn.microsoft.com/en-us/power-automate/manage-flows-with-code?tabs=webapi#workflow-table');
                    }
                }
            }
            
            console.error('Error in API GET request:', error);
            throw new Error(errorMessage);
        }
    }

    async function postAsJson<T>(url: string, body?: any, headers?: Record<string, string>): Promise<T> {
        if (!post) {
            console.error('PowerTools post method is not available');
            throw new Error('PowerTools API is not available - post method missing');
        }

        console.log('Making API POST request:', url, 'Body:', body, 'Headers:', headers);
        try {
            const res = await post(url, body, headers); // No 'as any' here initially
            if (!res) {
                console.error('No response object received from PowerTools API on POST');
                throw new Error('No response object received from PowerTools API on POST');
            }

            console.log('Raw PowerTools POST response object (res):', res); 

            let httpStatusCode: number | undefined;
            // Use type assertion for potentially dynamic properties
            if (res && typeof (res as any).statusCode === 'number') {
                httpStatusCode = (res as any).statusCode;
                console.log('PowerTools POST response statusCode:', httpStatusCode);
            }

            if (httpStatusCode && (httpStatusCode < 200 || httpStatusCode >= 300)) {
                let responseBodyText = 'Could not retrieve error response body.';
                try {
                    const resAsAny = res as any; // Helper for readability in this block
                    if (resAsAny && typeof resAsAny.asText === 'function') {
                        responseBodyText = await resAsAny.asText();
                    } else if (resAsAny && typeof resAsAny.text === 'function') {
                        responseBodyText = await resAsAny.text();
                    } else if (resAsAny && resAsAny.content) { 
                        responseBodyText = String(resAsAny.content).substring(0, 1000);
                    } else {
                        responseBodyText = JSON.stringify(resAsAny).substring(0, 1000);
                    }
                } catch (textError) {
                    console.error('Error trying to get text from error response:', textError);
                    if ((res as any) && typeof (res as any).message === 'string') responseBodyText = (res as any).message;
                }
                const errorMessage = `HTTP Error ${httpStatusCode}: ${responseBodyText.substring(0, 200)}`;
                console.error('Error in API POST request (non-success status):', errorMessage, 'Full Response Text (first 1000 chars):', responseBodyText.substring(0,1000));
                const error: any = new Error(errorMessage);
                error.status = httpStatusCode;
                error.response = responseBodyText;
                error.isHttpError = true;
                throw error;
            }

            // Now, res.asJson<T>() should use the original type of res
            const jsonData = await res.asJson<T>();
            console.log('API POST response (after asJson() for success/unknown status):', jsonData);
            return jsonData;
        } catch (error: any) {
            if (error.isHttpError) {
                console.error('Re-throwing HTTP error from postAsJson:', error.message, 'Status:', error.status);
                throw error;
            }
            console.error('Error in API POST request (catch block in postAsJson):', error.name, error.message, error.stack);
            if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
                 const wrappedError : any = new Error(`Failed to parse API response as JSON. The server likely returned HTML or non-JSON text. Original error: ${error.message}`);
                 wrappedError.originalError = error;
                 throw wrappedError;
            }
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

    const apiState = {
        isContextLoaded: isLoaded, 
        hasPowerTools: typeof window.PowerTools !== 'undefined',
        hasGetMethod: !!get,
        hasPostMethod: !!post,
        hasDownloadMethod: !!download
    };
    
    const apiStateKey = JSON.stringify(apiState);
    
    if (prevStateRef.current !== apiStateKey) {
        console.log('PowerTools API hook state:', apiState);
        prevStateRef.current = apiStateKey;
    }

    if (!apiState.hasPowerTools || !apiState.hasGetMethod || !apiState.hasPostMethod) {
        console.error('PowerTools API is not properly initialized:', apiState);
        
        if (process.env.NODE_ENV === 'development') {
            console.warn(`
                DEVELOPMENT ERROR: PowerTools API is not available.
                
                This tool must be run within the PowerTools environment iframe.
                
                Make sure:
                1. The script tag is included in index.html: <script src="https://api.powertoolsdev.com/files/api.js"></script>
                2. The tool is loaded within the PowerTools iframe context
                3. Cross-origin iframe communication is permitted
            `);
        }
    }

    return { 
        get, 
        getAsJson, 
        post, 
        postAsJson, 
        isLoaded, 
        download: wrappedDownload 
    } as const;
}

export type ApiResponse<T> = {
  loading: boolean;
  error: Error | null;
  data: T | null;
  isLoaded: boolean;
}; 