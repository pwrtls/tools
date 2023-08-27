import React from 'react';

import { ConversionLog } from './ConversionLog';
import { ConversionMapping } from './ConversionMapping';
import { ConversionProcess } from './ConversionProcess';

export const ConversionDashboard: React.FC = () => {
  return (
    <div>
      <ConversionMapping />
      <ConversionProcess />
      {/* <ConversionLog /> */}
    </div>
  );
};
