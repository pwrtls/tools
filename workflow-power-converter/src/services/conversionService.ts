import { IConversionMapping, IConversionLog } from '../models/conversion';
import { IPowerAutomateFlow } from '../models/powerAutomateFlow';
import { IWorkflow } from '../models/workflows';

export const convertClassicWorkflow = async (workflowId: string): Promise<IConversionLog> => {
  // Mock API call to convert Classic Workflow to Power Automate Flow
  const response = await window.PowerTools.get(`/api/data/v9.0/workflows(${workflowId})`);
  const workflowData = await response.asJson() as IWorkflow[];

  // Logic to convert Classic Workflow to Power Automate Flow
  // Analyze, map, transform, handle errors, etc.
  // ...

  return {
    timestamp: new Date(),
    workflowName: workflowData[0].name,
    status: 'Success',
    message: 'Workflow converted successfully',
  };
};

export const createFlow = async (mappedFlow: IPowerAutomateFlow): Promise<IPowerAutomateFlow> => {
  // Mock API call to create a new Power Automate Flow
  // const response = await window.PowerTools.post(`/api/data/v9.0/flows`, mappedFlow);
  // const createdFlow = await response.asJson();

  return {
    flowId: "",
    name: "",
    status: 'Converted', // Update the status property to be either "Converted" or "Failed"
  };
};

export const getConversionMappings = async (): Promise<IConversionMapping[]> => {
  // Mock API call to fetch existing conversion mappings
  const response = await window.PowerTools.get(`/api/data/v9.0/conversionMappings`);
  const mappings = await response.asJson() as IConversionMapping[];
  return mappings;
};

export const getConversionLogs = async (workflowId: string): Promise<IConversionLog[]> => {
  // Mock API call to fetch conversion logs for a workflow
  const response = await window.PowerTools.get(`/api/data/v9.0/conversionLogs(${workflowId})`);
  const logs: IConversionLog[] = await response.asJson();
  return logs;
};

// export const saveConversionMapping = async (mapping: IConversionMapping): Promise<void> => {
//   // Mock API call to save a new conversion mapping
//   await window.PowerTools.post(`/api/data/v9.0/conversionMappings`, mapping);
// };