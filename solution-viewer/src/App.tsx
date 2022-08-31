import React from 'react';
import { Button } from 'antd';

import { ConnectionView } from './views/connection';

import './App.css';

const App: React.FC = () => (
  <div className="App">
    <Button type="primary">Button</Button>
    <ConnectionView />
  </div>
);

export default App;
