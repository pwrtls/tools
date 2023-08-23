import React, { useState, useContext } from 'react';
import { Button, Spin, Table, Alert } from 'antd';

import { IWorkflow } from '../models/workflows';
import { IPowerAutomateFlow } from '../models/powerAutomateFlow';

import { PowerToolsContext } from '../powertools/context';
import { usePowerToolsApi } from '../powertools/apiHook';

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
        // Add more columns as needed
    ];

    setConvertedFlows((prevFlows: IPowerAutomateFlow[]) => {
        const newFlows = [...prevFlows];
        const createdFlow = createFlow(newFlows[0]);
        if (createdFlow !== null) {
            newFlows.push(createdFlow);
        }
        return newFlows;
    });


    const analyzeWorkflow = async (workflow: IWorkflow) => {
        // Analyze the Classic Workflow structure, complexities, custom steps, plugins
        // This function will return an object representing the analysis result
        // ...
    };

    const createFlow = async (mappedFlow: IPowerAutomateFlow): Promise<IPowerAutomateFlow> => {
        // Create the Power Automate Flow using the API
        // This function will return the created Power Automate Flow object
        //const createdFlow = await createPowerAutomateFlow(mappedFlow);

        // Return the created Power Automate Flow object
        return {
            flowId: "",
            name: "",
            status: "Converted", // Update the status property to be either "Converted" or "Failed"
        };
    };

    return (
        <div>
            <Button onClick={() => convertWorkflows(selectedWorkflows)}>Convert Selected Workflows</Button>
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
