import { IoDataResponse } from "../models/oDataResponse";
import { IWorkflow } from "../models/workflows";

export const getWorkflows = async (): Promise<IWorkflow[]> => {
  try {
    const workflowResponse = await window.PowerTools.get(`/api/data/v9.0/workflows`);
    const workflowsJson = await workflowResponse.asJson<IoDataResponse<IWorkflow>>();

    // Validate the data before casting
    if (workflowsJson && workflowsJson.value && Array.isArray(workflowsJson.value)) {
      return workflowsJson.value as IWorkflow[];
    } else {
      throw new Error('Invalid data format received');
    }
  } catch (error) {
    console.error('Failed to fetch workflows:', error);
    throw error;
  }
};
