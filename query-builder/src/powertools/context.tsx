import React, { useState, useEffect, ReactNode } from 'react';
import { Result } from 'antd';

type PowerToolsContextType = {
    isLoaded: boolean;
    connectionName: string;
    get?: ((url: string, params?: URLSearchParams, headers?: Record<string, string>) => Promise<any>);
    post?: ((url: string, body?: any, headers?: Record<string, string>) => Promise<any>);
    download?: ((content: string, fileName?: string, mimeType?: string) => Promise<void>);
};

export const PowerToolsContext = React.createContext<PowerToolsContextType>({ 
    isLoaded: false, 
    connectionName: '', 
    get: undefined, 
    post: undefined, 
    download: undefined 
});

type PowerToolsContextProviderProps = {
    children: ReactNode;
    showNoConnection?: boolean;
};

export const PowerToolsContextProvider: React.FC<PowerToolsContextProviderProps> = ({ 
    children, 
    showNoConnection = false 
}) => {
    const [isLoaded, setIsLoaded] = useState<boolean>(false);
    const [connectionName, setConnectionName] = useState<string>('');
    const [get, setGet] = useState<((url: string, params?: URLSearchParams, headers?: Record<string, string>) => Promise<any>) | undefined>(undefined);
    const [post, setPost] = useState<((url: string, body?: any, headers?: Record<string, string>) => Promise<any>) | undefined>(undefined);
    const [download, setDownload] = useState<((content: string, fileName?: string, mimeType?: string) => Promise<void>) | undefined>(undefined);

    useEffect(() => {
        const checkPowerTools = () => {
            if (typeof window.PowerTools !== 'undefined') {
                console.log('PowerTools API detected');
                
                // Set as loaded if PowerTools exists, regardless of isLoaded() method
                setIsLoaded(true);
                
                // Set up the API functions
                setGet(() => window.PowerTools!.get.bind(window.PowerTools));
                setPost(() => window.PowerTools!.post.bind(window.PowerTools));
                setDownload(() => window.PowerTools!.download.bind(window.PowerTools));
                
                // Listen for connection changes
                window.PowerTools.addConnectionChangeListener((name: string | undefined) => {
                    console.log('Connection changed:', name);
                    setConnectionName(name || '');
                    // If we have a connection, we're definitely loaded
                    if (name) {
                        setIsLoaded(true);
                    }
                });
                
                return true;
            }
            return false;
        };

        // Check immediately
        if (!checkPowerTools()) {
            // If not available, check periodically
            const intervalId = setInterval(() => {
                if (checkPowerTools()) {
                    clearInterval(intervalId);
                }
            }, 100);

            // Clean up interval after 10 seconds
            setTimeout(() => {
                clearInterval(intervalId);
                console.log('PowerTools detection timeout - checking final state');
                // One final check after timeout
                if (typeof window.PowerTools !== 'undefined') {
                    setIsLoaded(true);
                    setGet(() => window.PowerTools!.get.bind(window.PowerTools));
                    setPost(() => window.PowerTools!.post.bind(window.PowerTools));
                    setDownload(() => window.PowerTools!.download.bind(window.PowerTools));
                }
            }, 10000);

            return () => clearInterval(intervalId);
        }
    }, []);

    const contextValue: PowerToolsContextType = {
        isLoaded,
        connectionName,
        get,
        post,
        download
    };

    // Show no connection warning only if PowerTools is not detected AND showNoConnection is true
    if (!isLoaded && showNoConnection) {
        return (
            <Result
                status="warning"
                title="No connection available"
                subTitle="This tool requires an active connection to a Dynamics 365 / Power Platform environment."
            />
        );
    }

    return (
        <PowerToolsContext.Provider value={contextValue}>
            {children}
        </PowerToolsContext.Provider>
    );
}; 