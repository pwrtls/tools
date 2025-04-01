import React from 'react';
import { Result } from 'antd';

type PowerToolsContextType = {
    isLoaded: boolean;
    connectionName: string;
    get?: typeof window.PowerTools.get;
    post?: typeof window.PowerTools.post;
    download?: typeof window.PowerTools.download;
};

export const PowerToolsContext = React.createContext<PowerToolsContextType>({ isLoaded: false, connectionName: '', get: undefined, post: undefined, download: undefined });
PowerToolsContext.displayName = 'Power Tools Context';

interface IPowerToolsContextProviderProps extends React.PropsWithChildren {
    showNoConnection?: boolean;
}

interface IPowerToolsContextProviderState {
    invalidContext: boolean;
    isLoaded: boolean;
    connectionName: string;
}

export class PowerToolsContextProvider extends React.PureComponent<IPowerToolsContextProviderProps, IPowerToolsContextProviderState> {
    state: Readonly<IPowerToolsContextProviderState> = {
        invalidContext: false,
        isLoaded: false,
        connectionName: '',
    };

    componentDidMount() {
        console.log('PowerToolsContextProvider mounted');
        
        // Direct check without polling, matching solution-manager approach
        if (typeof window.PowerTools === 'undefined') {
            console.error('PowerTools API not found. This tool requires the PowerTools API to function.');
            console.log('Current window state:', {
                isIframe: window !== window.top,
                url: window.location.href,
                referrer: document.referrer
            });
            this.setState({ invalidContext: true });
            return;
        }

        console.log('PowerTools API found, initializing...');
        try {
            window.PowerTools.onLoad()
                .then(this.onLoadCallback)
                .catch(error => {
                    console.error('Error in PowerTools.onLoad():', error);
                    this.setState({ invalidContext: true });
                });
                
            window.PowerTools.addConnectionChangeListener(this.connectionChangeCallback);
        } catch (error) {
            console.error('Error initializing PowerTools:', error);
            this.setState({ invalidContext: true });
        }
    }

    onLoadCallback = () => {
        console.log('PowerTools onLoad callback triggered');
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
                get: window.PowerTools?.get, 
                post: window.PowerTools?.post, 
                download: window.PowerTools?.download 
            }}>
                {this.content}
            </PowerToolsContext.Provider>
        );
    }
} 