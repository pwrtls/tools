import React, { useState, useEffect } from 'react';
import { Table } from 'antd';

import { IConversionLog } from '../models/conversion';
// Assume a function getConversionLogs from services

export const ConversionLog: React.FC = () => {
  const [logs, setLogs] = useState<IConversionLog[]>([]);

  useEffect(() => {
    const loadLogs = async () => {
      const res = await getConversionLogs();
      setLogs(res);
    };

    loadLogs();
  }, []);

  return (
    <div>
      <h2>Conversion Log</h2>
      <Table dataSource={logs} /* columns and other props */ />
    </div>
  );
};
