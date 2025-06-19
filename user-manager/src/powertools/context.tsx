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

        window.PowerTools.onLoad().then(this.onLoadCallback);
        window.PowerTools.addConnectionChangeListener(this.connectionChangeCallback);
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