import React from 'react';
import { Result, Spin, Button } from 'antd';

type PowerToolsContextType = {
    isLoaded: boolean;
    connectionName: string;
    get?: (url: string, params?: URLSearchParams, headers?: Record<string, string>) => Promise<{ asJson: <T_Response>() => Promise<T_Response>; }>;
    post?: (url: string, body?: any, headers?: Record<string, string>) => Promise<{ asJson: <T_Response>() => Promise<T_Response>; }>;
    download?: ((content: string, fileName?: string, mimeType?: string) => Promise<void>);
};

export const PowerToolsContext = React.createContext<PowerToolsContextType>({ 
    isLoaded: false, 
    connectionName: '', 
    get: undefined, 
    post: undefined, 
    download: undefined 
});
PowerToolsContext.displayName = 'Power Tools Context';

interface IPowerToolsContextProviderProps extends React.PropsWithChildren {
    showNoConnection?: boolean;
}

interface IPowerToolsContextProviderState {
    invalidContext: boolean;
    isLoaded: boolean;
    connectionName: string;
    error?: string;
}

export class PowerToolsContextProvider extends React.PureComponent<IPowerToolsContextProviderProps, IPowerToolsContextProviderState> {
    state: Readonly<IPowerToolsContextProviderState> = {
        invalidContext: false,
        isLoaded: false,
        connectionName: '',
        error: undefined
    };

    componentDidMount() {
        console.log('PowerToolsContextProvider mounted');
        console.log('PowerTools available:', typeof window.PowerTools !== 'undefined');
        
        if (typeof window.PowerTools === 'undefined') {
            console.warn('PowerTools API not found. This tool requires the PowerTools API to function.');
            this.setState({ 
                invalidContext: true,
                error: 'PowerTools API not found. This tool must be run within the PowerTools environment.'
            });
            return;
        }

        // Add a setTimeout to handle Websandbox loading issues
        setTimeout(() => {
            // Check if we're still not loaded after 3 seconds - this could indicate a Websandbox error
            if (!this.state.isLoaded) {
                console.log('PowerTools loading timeout - attempting direct load');
                // Try to notify parent directly through window.parent if available
                try {
                    if (window.parent && window.parent !== window) {
                        console.log('Attempting to notify parent window that tool is loaded');
                        // This signals to the parent iframe that we're loaded even if Websandbox didn't connect
                        if (typeof window.parent.postMessage === 'function') {
                            window.parent.postMessage({ type: 'TOOL_LOADED' }, '*');
                        }
                    }
                } catch (e) {
                    console.error('Error communicating with parent frame:', e);
                }
            }
        }, 3000);

        console.log('PowerTools found, initializing...');
        window.PowerTools.onLoad()
            .then(this.onLoadCallback)
            .catch(error => {
                console.error('Failed to load PowerTools:', error);
                // Special handling for Websandbox errors
                if (error && (
                    error.toString().includes('Websandbox.connection.remote.loaded is not a function') ||
                    error.toString().includes('Content Security Policy')
                )) {
                    console.log('Detected Websandbox/CSP error, attempting manual load notification');
                    // Simulate a successful load since the error is likely just the notification mechanism
                    this.onLoadCallback();
                } else {
                    this.setState({
                        invalidContext: true,
                        error: `Failed to initialize PowerTools API: ${error.message || 'Unknown error'}`
                    });
                }
            });
        window.PowerTools.addConnectionChangeListener(this.connectionChangeCallback);
    }

    onLoadCallback = () => {
        console.log('PowerTools loaded successfully');
        this.setState({ isLoaded: true });
    }

    connectionChangeCallback = (name: string | undefined) => {
        console.log('Connection changed to:', name);
        this.setState({ connectionName: name || '' });
    }

    get invalidContextResult() {
        return (
            <div style={{ position: 'fixed', left: 0, top: 0, zIndex: 100, width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Result
                    status="500"
                    title="PowerTools Connection Error"
                    subTitle={this.state.error || "This tool requires the PowerTools API to function properly."}
                    extra={[
                        <div key="help-text" style={{ maxWidth: 600, textAlign: 'left', marginBottom: 20 }}>
                            <p>This issue may occur for the following reasons:</p>
                            <ul>
                                <li>The tool is not being loaded within the PowerTools framework</li>
                                <li>Your browser is blocking iframe communication</li>
                                <li>Your session may have expired</li>
                                <li>You may not have the necessary permissions</li>
                            </ul>
                            <p>If you are a developer working on this tool:</p>
                            <ul>
                                <li>Check that the PowerTools API script is included in your HTML</li>
                                <li>Verify you're testing within the PowerTools iframe environment</li>
                                <li>Check for CORS errors in the browser console</li>
                            </ul>
                        </div>,
                        <Button 
                            key="reload"
                            type="primary" 
                            onClick={() => window.location.reload()}
                        >
                            Reload Page
                        </Button>
                    ]}
                />
            </div>
        );
    }

    get noConnectionResult() {
        return (
            <div style={{ position: 'fixed', left: 0, top: 0, zIndex: 100, width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Result
                    status="404"
                    title="No Power Platform Connection Selected"
                    subTitle="Please select a connection in the PowerTools panel to continue"
                    extra={
                        <div style={{ maxWidth: 600, textAlign: 'left' }}>
                            <p>Before using this tool, you need to:</p>
                            <ol>
                                <li>Select an environment from the PowerTools connections panel</li>
                                <li>Ensure you have the necessary permissions in that environment</li>
                                <li>Verify that your connection is authorized for the required operations</li>
                            </ol>
                        </div>
                    }
                />
            </div>
        );
    }

    get loadingContent() {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" />
                <div style={{ marginLeft: 16 }}>Connecting to Power Platform...</div>
            </div>
        );
    }

    get content() {
        if (this.state.invalidContext) {
            return this.invalidContextResult;
        }

        if (!this.state.isLoaded) {
            return this.loadingContent;
        }

        if (!this.state.connectionName && this.props.showNoConnection) {
            return this.noConnectionResult;
        }

        return this.props.children;
    }

    render() {
        return (
            <PowerToolsContext.Provider value={{ 
                isLoaded: this.state.isLoaded, 
                connectionName: this.state.connectionName, 
                get: window.PowerTools?.get as unknown as PowerToolsContextType['get'], 
                post: window.PowerTools?.post as unknown as PowerToolsContextType['post'], 
                download: window.PowerTools?.download 
            }}>
                {this.content}
            </PowerToolsContext.Provider>
        );
    }
} 