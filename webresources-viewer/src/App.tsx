import React from 'react';
import { Button } from 'antd';

import { PowerToolsContextProvider } from './powertools/context';
import { ConnectionView } from './views/connection';

import './App.css';

const App: React.FC = () => (
  <PowerToolsContextProvider>
    <div className="App">
      <Button type="primary">Button</Button>
      <ConnectionView />
    </div>
  </PowerToolsContextProvider>
);

export default App;
