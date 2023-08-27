import React, { useState, useContext, useEffect } from 'react';
import { Button, Spin, Table, Alert } from 'antd';
import { IWorkflow } from '../models/workflows';
import { IPowerAutomateFlow } from '../models/powerAutomateFlow';
import { PowerToolsContext } from '../powertools/context';
import { convertClassicWorkflow, createFlow } from '../services/conversionService';

export const WorkflowConversion: React.FC = () => {
  const { connectionName, get } = useContext(PowerToolsContext);
  const [loading, setLoading] = useState(false);
  const [conversionLogs, setConversionLogs] = useState<string[]>([]);
  const [convertedFlows, setConvertedFlows] = useState<IPowerAutomateFlow[]>([]);
  const [selectedWorkflows, setSelectedWorkflows] = useState<IWorkflow[]>([]);

  const conversionColumns = [
    {
      title: 'Workflow Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
  ];

  useEffect(() => {
    const updateFlows = async () => {
      const newFlows = [...convertedFlows];
      const createdFlow = await createFlow(newFlows[0]);
      if (createdFlow !== null) {
        newFlows.push(createdFlow);
      }
      setConvertedFlows(newFlows);
    };

    updateFlows();
  }, [convertedFlows]);

  return (
    <div>
      <Button onClick={() => selectedWorkflows.forEach(async (workflow) => await convertClassicWorkflow(workflow.id))}>
        Convert Selected Workflows
      </Button>
      <Spin spinning={loading}>
        <Table
          columns={conversionColumns}
          dataSource={convertedFlows}
          rowKey="flowId"
        />
        {conversionLogs.map((log, index) => (
          <Alert key={index} message={log} type="info" />
        ))}
      </Spin>
    </div>
  );
};
