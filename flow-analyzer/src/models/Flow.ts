export interface Flow {
  id: string;
  name: string;
  description: string;
  category: number;
  createdOn: Date;
  modifiedOn: Date;
  status: string;
  type: number;
  createdBy: string;
  modifiedBy: string;
  owner: string;
  isManaged?: boolean;
  state?: number;
  clientData?: string;
  selected?: boolean;
}

export interface FlowDetails {
  id: string;
  name: string;
  description: string;
  definition: any;
  connectionReferences: FlowConnector[];
  actions: FlowAction[];
  triggers: FlowTriggerDetails[];
}

export interface FlowAction {
  id: string;
  name: string;
  type?: string;
  kind?: string;
  description?: string;
  inputs?: any;
  outputs?: any;
  runAfter?: { [key: string]: string[] };
  expression?: any;
  actions?: { [key: string]: FlowAction };
  elseActions?: { [key: string]: FlowAction };
}

export interface FlowConnector {
  id: string;
  displayName: string;
  connectorName: string;
  connectionName: string;
  iconUri: string;
  count?: number;
  critical?: boolean;
}

export interface FlowIssue {
  id: string;
  severity: 'Error' | 'Warning' | 'Info';
  description: string;
  impact: string;
  location: string;
}

export interface FlowRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  category: string;
}

export interface FlowAnalysisResult {
  connectors: FlowConnector[];
  issues: FlowIssue[];
  recommendations: FlowRecommendation[];
}

// Dataverse API models
export interface WorkflowResponse {
  value: WorkflowRecord[];
  error?: {
    code?: string;
    message?: string;
  };
}

export interface WorkflowRecord {
  workflowid: string;
  name: string;
  description?: string;
  category: number;
  createdon: string;
  modifiedon: string;
  statecode: number;
  statuscode?: number;
  type?: number;
  ismanaged?: boolean;
  _createdby_value?: string;
  _modifiedby_value?: string;
  _ownerid_value?: string;
  clientdata?: string;
}

export interface WorkflowDefinition {
  properties: {
    displayName?: string;
    description?: string;
    connectionReferences?: {
      [key: string]: {
        displayName?: string;
        connectorName?: string;
        connectionName?: string;
        iconUri?: string;
        connection?: {
          id: string;
        };
        api?: {
          name: string;
        };
      };
    };
    definition: {
      $schema?: string;
      contentVersion?: string;
      triggers?: {
        [key: string]: {
          kind?: string;
          type?: string;
          inputs?: any;
        };
      };
      actions?: {
        [key: string]: {
          type?: string;
          description?: string;
          inputs?: any;
          outputs?: any;
          runAfter?: {
            [key: string]: string[];
          };
          expression?: {
            [key: string]: any;
          };
          actions?: {
            [key: string]: any;
          };
        };
      };
      parameters?: any;
      outputs?: any;
    } | {
      // Default empty definition to avoid null reference errors
      triggers: {};
      actions: {};
    };
  };
}

export enum FlowType {
  CLOUD = 'cloud',
  DESKTOP = 'desktop',
  INSTANT = 'instant'
}

export interface Trigger {
  type: string;
  inputs: Record<string, any>;
  conditions?: Condition[];
}

export interface Action {
  id: string;
  type: string;
  name: string;
  inputs: Record<string, any>;
  conditions?: Condition[];
  runAfter?: Record<string, string[]>;
}

export interface Condition {
  expression: string;
  operator: string;
  value: any;
}

export interface Connection {
  id: string;
  name: string;
  type: string;
  reference: string;
}

export interface Variable {
  name: string;
  type: string;
  value?: any;
}

export interface Dependency {
  type: DependencyType;
  name: string;
  reference: string;
}

export enum DependencyType {
  ENVIRONMENT_VARIABLE = 'environment_variable',
  CONNECTION = 'connection',
  DATAVERSE_TABLE = 'dataverse_table',
  DATAVERSE_COLUMN = 'dataverse_column',
  FLOW = 'flow'
}

export interface FlowAnalysis {
  flow: Flow;
  connectors: Connector[];
  issues: Issue[];
  recommendations: string[];
}

export interface Connector {
  name: string;
  type: string;
  actions: string[];
  connections: Connection[];
}

export interface Issue {
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  location?: string;
}

export enum IssueType {
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  BEST_PRACTICE = 'best_practice',
  ERROR = 'error'
}

export enum IssueSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Detailed structure for a trigger from the definition
export interface FlowTriggerDetails {
  id: string;
  type?: string;
  kind?: string;
  inputs?: any;
} 