export interface IWorkflow {
    workflowid: string;
    name: string;
    type: WorkflowType;
    category: WorkflowCategory;
    status: WorkflowStatus;
    mode: WorkflowMode;
    triggers: string[]; // List of triggers
    primaryentity: string;
    createdon: Date;
    modifiedon: Date;
    // Additional properties as needed
  }
  
  export enum WorkflowType {
    Definition = 1,
    Activation = 2,
    // Other types
  }
  
  export enum WorkflowCategory {
    Workflow = 0,
    Dialog = 1,
    // Other categories
  }
  
  export enum WorkflowStatus {
    Draft = 0,
    Activated = 1,
    // Other statuses
  }
  
  export enum WorkflowMode {
    Background = 0,
    Realtime = 1,
    // Other modes
  }
  