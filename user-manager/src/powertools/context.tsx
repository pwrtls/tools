import React from 'react';
import { Result } from 'antd';

export type PowerTools = {
    isLoaded: boolean;
    connectionName: string;
    get?: typeof window.PowerTools.get;
    post?: typeof window.PowerTools.post;
    download?: typeof window.PowerTools.download;
};

export const PowerToolsContext = React.createContext<PowerTools>({ isLoaded: false, connectionName: '', get: undefined, post: undefined, download: undefined });
PowerToolsContext.displayName = 'Power Tools Context';

interface IPowerToolsContextProviderProps extends React.PropsWithChildren {
    showNoConnection?: boolean;
}

interface IPowerToolsContextProviderState {
    invalidContext: boolean;
    isLoaded: boolean;
    connectionName: string;
    providerValue: PowerTools;
}

export class PowerToolsContextProvider extends React.PureComponent<IPowerToolsContextProviderProps, IPowerToolsContextProviderState> {
    private connectionChangeListenerRef: ((name: string | undefined) => void) | null = null;

    constructor(props: IPowerToolsContextProviderProps) {
        super(props);
        this.state = {
            invalidContext: false,
            isLoaded: false,
            connectionName: '',
            providerValue: {
                isLoaded: false,
                connectionName: '',
                get: undefined,
                post: undefined,
                download: undefined,
            },
        };
    }

    componentDidMount() {
        if (typeof window.PowerTools === 'undefined') {
            this.setState({ invalidContext: true });
            return;
        }

        try {
            // Store the reference to the callback for cleanup
            this.connectionChangeListenerRef = this.connectionChangeCallback;
            
            window.PowerTools.onLoad().then(this.onLoadCallback).catch((error: Error) => {
                // Handle onLoad promise rejection
                if (process.env.NODE_ENV === 'development') {
                    console.error('PowerTools onLoad failed:', error);
                }
                this.setState({ invalidContext: true });
            });
            
            window.PowerTools.addConnectionChangeListener(this.connectionChangeListenerRef);
        } catch (error) {
            // Handle any synchronous errors during setup
            if (process.env.NODE_ENV === 'development') {
                console.error('PowerTools setup failed:', error);
            }
            this.setState({ invalidContext: true });
        }
    }

    componentWillUnmount() {
        // Clean up event listeners to prevent memory leaks
        // Note: PowerTools API doesn't provide removeConnectionChangeListener method
        // so we cannot clean up the listener, but we clear our reference
        if (this.connectionChangeListenerRef) {
            // If PowerTools API is updated in the future to support cleanup, this is where it would go
            if (process.env.NODE_ENV === 'development') {
                console.info('PowerTools API does not support removeConnectionChangeListener - listener will remain active');
            }
        }
        
        // Clear the reference
        this.connectionChangeListenerRef = null;
    }

    componentDidUpdate(_: IPowerToolsContextProviderProps, prevState: IPowerToolsContextProviderState) {
        if (
            prevState.isLoaded !== this.state.isLoaded ||
            prevState.connectionName !== this.state.connectionName
        ) {
            this.setState({
                providerValue: {
                    isLoaded: this.state.isLoaded,
                    connectionName: this.state.connectionName,
                    get: window.PowerTools?.get,
                    post: window.PowerTools?.post,
                    download: window.PowerTools?.download,
                },
            });
        }
    }

    onLoadCallback = () => {
        this.setState({ isLoaded: true });
    }

    connectionChangeCallback = (name: string | undefined) => {
        // Validate the connection name parameter
        const validatedName = typeof name === 'string' ? name : '';
        this.setState({ connectionName: validatedName });
    }

    get invalidContextResult() {
        return (
            <div style={{ position: 'fixed', left: 0, top: 0, zIndex: 100, width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Result
                    status="500"
                    title="Invalid Context"
                    subTitle="This tool was loaded with an invalid context, the PowerTools API is not within the context of this page."
                />
            </div>
        );
    }

    get noConnectionResult() {
        return (
            <div style={{ position: 'fixed', left: 0, top: 0, zIndex: 100, width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Result
                    status="404"
                    title="No Connection Selected"
                    subTitle="To continue using this tool, please select a connection! Thank you"
                />
            </div>
        );
    }

    get content() {
        if (this.state.invalidContext) {
            return this.invalidContextResult;
        }

        /*if (!this.state.connectionName && this.props.showNoConnection) {
            return this.noConnectionResult;
        }*/

        return this.props.children;
    }

    render() {
        return (
            <PowerToolsContext.Provider value={this.state.providerValue}>
                {this.content}
            </PowerToolsContext.Provider>
        );
    }
}