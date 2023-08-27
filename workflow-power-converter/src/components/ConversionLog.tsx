import React, { useState, useEffect } from 'react';
import { Table } from 'antd';
import { IConversionLog } from '../models/conversion';
import { getConversionLogs } from '../services/conversionService';

export const ConversionLog: React.FC<{ workflowId: string }> = ({ workflowId }) => {
  const [logs, setLogs] = useState<IConversionLog[]>([]);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const res = await getConversionLogs(workflowId); // Providing workflowId here
        setLogs(res);
      } catch (error) {
        console.error("Failed to load conversion logs:", error);
      }
    };

    loadLogs();
  }, [workflowId]); // Added workflowId as a dependency

  return (
    <div>
      <h2>Conversion Log</h2>
      <Table dataSource={logs} /* columns and other props */ />
    </div>
  );
};