import React from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import { PowerToolsContextProvider } from './powertools/context';
import { AppRouter } from './AppRouter';
import './App.css';

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
        },
      }}
      warning={{
        strict: false,
      }}
    >
      <AntApp>
      <PowerToolsContextProvider showNoConnection>
        <AppRouter />
      </PowerToolsContextProvider>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
