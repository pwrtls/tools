import React from 'react';
import { PowerToolsContextProvider } from './powertools/context';
import { AppRouter } from './AppRouter';
import './App.css';

function App() {
  return (
    <PowerToolsContextProvider showNoConnection>
      <AppRouter />
    </PowerToolsContextProvider>
  );
}

export default App;
