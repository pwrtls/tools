import React, { useState } from 'react';
import { Button } from 'antd';

import { convertClassicWorkflow } from '../services/conversionService';

export const ConversionProcess: React.FC = () => {
  const [processing, setProcessing] = useState(false);

  const handleConvert = async (workflowId: string) => {
    setProcessing(true);
    //const log = await convertClassicWorkflow(workflowId);
    // Handle log, update UI, etc.
    setProcessing(false);
  };

  return (
    <div>
      <h2>Conversion Process</h2>
      <Button onClick={() => handleConvert('workflowId')} loading={processing}>Convert</Button>
    </div>
  );
};
