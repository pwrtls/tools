import React, { useState, useEffect } from 'react';
import { Table, Checkbox, Button } from 'antd';

import { IWorkflow } from '../models/workflows';
import { getWorkflows } from '../services/workflowService';

export const WorkflowSelection: React.FC = () => {
  const [workflows, setWorkflows] = useState<IWorkflow[]>([]);
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);

  useEffect(() => {
    const loadWorkflows = async () => {
      const res = await getWorkflows();
      setWorkflows(res);
    };

    loadWorkflows();
  }, []);

  const handleSelectWorkflow = (workflowId: string, checked: boolean) => {
    if (checked) {
      setSelectedWorkflows([...selectedWorkflows, workflowId]);
    } else {
      setSelectedWorkflows(selectedWorkflows.filter(id => id !== workflowId));
    }
  };

  const handleAddToSolution = () => {
    // Logic to add selected workflows to a solution
  };

  return (
    <div>
      <h2>Workflow Selection</h2>
      <Table
        dataSource={workflows}
        rowKey="workflowId"
        columns={[
          {
            title: 'Select',
            render: (text, record) => (
              <Checkbox onChange={e => handleSelectWorkflow(record.workflowid, e.target.checked)} />
            ),
          },
          // Other columns for workflow details
        ]}
      />
      <Button onClick={handleAddToSolution} disabled={selectedWorkflows.length === 0}>Add to Solution</Button>
    </div>
  );
};
