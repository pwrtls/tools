import React from 'react';
import { Result } from 'antd';

type PowerToolsContextType = {
    isLoaded: boolean;
    connectionName: string;
};

export const PowerToolsContext = React.createContext<PowerToolsContextType>({ isLoaded: false, connectionName: '' });
PowerToolsContext.displayName = 'Power Tools Context';

interface IPowerToolsContextProviderState {
    invalidContext: boolean;
    isLoaded: boolean;
    connectionName: string;
}

export class PowerToolsContextProvider extends React.PureComponent<React.PropsWithChildren, IPowerToolsContextProviderState> {
    state: Readonly<IPowerToolsContextProviderState> = {
        invalidContext: false,
        isLoaded: false,
        connectionName: '',
    };

    componentDidMount() {
        if (typeof window.PowerTools === 'undefined') {
            this.setState({ invalidContext: true });
            return;
        }

        window.PowerTools.onLoad().then(this.onLoadCallback);
        window.PowerTools.addConnectionChangeListener(this.connectionChangeCallback);
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

    render() {
        return (
            <PowerToolsContext.Provider value={{ isLoaded: this.state.isLoaded, connectionName: this.state.connectionName }}>
                { this.state.invalidContext ? this.invalidContextResult : this.props.children }
            </PowerToolsContext.Provider>
        );
    }
}
