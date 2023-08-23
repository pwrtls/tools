import React from 'react';

type PowerToolsContextType = {
  isLoaded: boolean;
  connectionName: string;
  get?: typeof window.PowerTools.get;
  download?: typeof window.PowerTools.download;
};

export const PowerToolsContext = React.createContext<PowerToolsContextType>({ isLoaded: false, connectionName: '' });
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
      <PowerToolsContext.Provider value={{ isLoaded: this.state.isLoaded, connectionName: this.state.connectionName, get: window.PowerTools?.get, download: window.PowerTools?.download }}>
        { this.content }
      </PowerToolsContext.Provider>
    );
  }
}
