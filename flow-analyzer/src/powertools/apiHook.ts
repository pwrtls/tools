import { useContext, useRef } from 'react';
import { PowerToolsContext } from './context';

// Define parameter types safely with optional chaining
type GetFn = NonNullable<typeof window.PowerTools>['get'];
type PostFn = NonNullable<typeof window.PowerTools>['post'];
type GetParams = Parameters<GetFn>;
type PostParams = Parameters<PostFn>;

/**
 * Custom hook to interact with the PowerTools API
 * @returns Hook API methods for PowerTools integration
 */
export function usePowerToolsApi() {
    const { get, post, isLoaded, download } = useContext(PowerToolsContext);
    const prevStateRef = useRef<string | null>(null);

    async function getAsJson<T>(url: string, query?: URLSearchParams, headers?: Record<string, string>): Promise<T> {
        // Format for Dataverse API calls
        let targetUrl = url;
        
        // For Dataverse API calls, we need to properly append the query parameters to the URL
        if (query && query.toString()) {
            // Check if URL already has parameters
            targetUrl = url.includes('?') 
                ? `${url}&${query.toString()}` 
                : `${url}?${query.toString()}`;
                
            console.log('Making API GET request for JSON:', targetUrl);
        } else {
            console.log('Making API GET request for JSON:', url);
        }
        
        if (!get) {
            console.error('PowerTools get method is not available');
            throw new Error('PowerTools API is not available - this tool must be run within the PowerTools environment');
        }

        try {
            // Log exact request details
            console.log('Request headers:', headers ? JSON.stringify(headers) : 'none');
            
            // Pass undefined for the query since we've already appended it to the URL
            const res = await get(targetUrl, undefined, headers);
            if (!res) {
                throw new Error('No response received from PowerTools API');
            }
            
            // Add additional debugging - log response shape
            try {
                const jsonData = await res.asJson();
                
                // Format the response for easier debugging
                const responsePreview = typeof jsonData === 'object'
                    ? {
                        keys: Object.keys(jsonData || {}),
                        hasError: 'error' in (jsonData || {}),
                        errorDetails: 'error' in (jsonData || {}) ? jsonData.error : null,
                        hasValue: 'value' in (jsonData || {}),
                        valueType: jsonData?.value ? Array.isArray(jsonData.value) ? 'array' : typeof jsonData.value : null,
                        valueLength: jsonData?.value && Array.isArray(jsonData.value) ? jsonData.value.length : null
                    }
                    : { type: typeof jsonData };
                
                console.log('API response preview:', responsePreview);
                
                // Check for specific errors in the response
                if (jsonData && typeof jsonData === 'object' && 'error' in jsonData) {
                    console.error('API returned an error response:', 
                        typeof jsonData.error === 'object' 
                            ? JSON.stringify(jsonData.error, null, 2) 
                            : jsonData.error
                    );
                    
                    // Format the error message
                    let errorMessage = 'API returned an error response';
                    if (typeof jsonData.error === 'object') {
                        if (jsonData.error?.message) {
                            errorMessage = jsonData.error.message;
                        }
                        if (jsonData.error?.code) {
                            errorMessage = `${errorMessage} (Code: ${jsonData.error.code})`;
                        }
                    } else if (jsonData.error) {
                        errorMessage = String(jsonData.error);
                    }
                    
                    // Throw this for central error handling
                    throw new Error(errorMessage);
                }
                
                // Use type assertion to avoid TS2347 error
                return jsonData as T;
            } catch (jsonError: any) {
                console.error('Error parsing response as JSON:', jsonError);
                
                // Provide more context in the error message
                if (jsonError.message && jsonError.message.includes('Unexpected token')) {
                    throw new Error(`Invalid JSON response: ${jsonError.message}`);
                }
                
                throw jsonError;
            }
        } catch (error: any) {
            // Handle browser security restrictions
            if (error.message && (
                error.message.includes('Unrecognized feature') || 
                error.message.includes('top-navigation') ||
                error.message.includes('Content Security Policy')
            )) {
                console.error('Browser security restriction detected:', error.message);
                throw new Error('Browser security restriction detected. This is likely due to iframe restrictions. Please contact your administrator.');
            }
            
            // Provide more detailed error information
            let errorMessage = 'API request failed';
            
            if (error.message) {
                errorMessage = error.message;
                // Provide suggestions for common Dataverse error messages
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
        console.log('Making API POST request for JSON:', url);
        
        if (!post) {
            console.error('PowerTools post method is not available');
            throw new Error('PowerTools API is not available - this tool must be run within the PowerTools environment');
        }

        try {
            // Log exact request details for better debugging
            console.log('Request body:', body ? JSON.stringify(body, null, 2) : 'none');
            console.log('Request headers:', headers ? JSON.stringify(headers) : 'none');
            
            const res = await post(url, body, headers);
            if (!res) {
                throw new Error('No response received from PowerTools API');
            }
            
            try {
                const jsonData = await res.asJson();
                
                // Format the response for easier debugging
                const responsePreview = typeof jsonData === 'object'
                    ? {
                        keys: Object.keys(jsonData || {}),
                        hasError: 'error' in (jsonData || {}),
                        errorDetails: 'error' in (jsonData || {}) ? jsonData.error : null
                    }
                    : { type: typeof jsonData };
                
                console.log('API response preview:', responsePreview);
                
                // Check for specific errors in the response
                if (jsonData && typeof jsonData === 'object' && 'error' in jsonData) {
                    console.error('API returned an error response:', 
                        typeof jsonData.error === 'object' 
                            ? JSON.stringify(jsonData.error, null, 2) 
                            : jsonData.error
                    );
                    
                    // Format the error message
                    let errorMessage = 'API returned an error response';
                    if (typeof jsonData.error === 'object') {
                        if (jsonData.error?.message) {
                            errorMessage = jsonData.error.message;
                        }
                        if (jsonData.error?.code) {
                            errorMessage = `${errorMessage} (Code: ${jsonData.error.code})`;
                        }
                    } else if (jsonData.error) {
                        errorMessage = String(jsonData.error);
                    }
                    
                    // Throw this for central error handling
                    throw new Error(errorMessage);
                }
                
                // Use type assertion to avoid TS2347 error
                return jsonData as T;
            } catch (jsonError: any) {
                console.error('Error parsing response as JSON:', jsonError);
                throw jsonError;
            }
        } catch (error: any) {
            // Handle browser security restrictions
            if (error.message && (
                error.message.includes('Unrecognized feature') || 
                error.message.includes('top-navigation') ||
                error.message.includes('Content Security Policy')
            )) {
                console.error('Browser security restriction detected:', error.message);
                throw new Error('Browser security restriction detected. This is likely due to iframe restrictions. Please contact your administrator.');
            }
            
            console.error('Error in API POST request:', error);
            throw error;
        }
    }

    async function downloadFile(content: string, fileName?: string, mimeType?: string): Promise<void> {
        console.log('Downloading file:', fileName);
        
        if (!download) {
            console.error('PowerTools download method is not available, falling back to browser download');
            // Fallback to browser download if PowerTools is not available
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName || 'download';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return;
        }

        try {
            await download(content, fileName, mimeType);
        } catch (error) {
            console.error('Error in download:', error);
            throw error;
        }
    }

    // Debug the state of PowerTools API
    const apiState = {
        isContextLoaded: isLoaded, 
        hasPowerTools: typeof window.PowerTools !== 'undefined',
        hasGetMethod: !!get,
        hasPostMethod: !!post,
        hasDownloadMethod: !!download
    };
    
    // Only log when the state changes or on first load
    const apiStateKey = JSON.stringify(apiState);
    
    if (prevStateRef.current !== apiStateKey) {
        console.log('PowerTools API hook state:', apiState);
        prevStateRef.current = apiStateKey;
    }

    // Ensure PowerTools API is available
    if (!apiState.hasPowerTools || !apiState.hasGetMethod || !apiState.hasPostMethod) {
        console.error('PowerTools API is not properly initialized:', apiState);
        
        // In development, show a more helpful error
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
        download: downloadFile 
    } as const;
}

export type ApiResponse<T> = {
  loading: boolean;
  error: Error | null;
  data: T | null;
  isLoaded: boolean;
}; 