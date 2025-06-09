import React from 'react';
import { ConfigProvider } from 'antd';
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
    >
      <PowerToolsContextProvider showNoConnection>
        <AppRouter />
      </PowerToolsContextProvider>
    </ConfigProvider>
  );
};

export default App;
