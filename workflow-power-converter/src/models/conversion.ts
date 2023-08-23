export interface IConversionLog {
    workflowName: string;
    status: 'Success' | 'Failed';
    message: string;
    timestamp: Date;
  }
  
  export interface IConversionMapping {
    classicWorkflow: string;
    powerAutomateFlow: string;
  }
  