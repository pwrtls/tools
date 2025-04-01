import { useCallback } from 'react';
import { Flow, FlowDetails, FlowAnalysisResult, FlowIssue, FlowRecommendation, FlowConnector, FlowAction, FlowTriggerDetails, WorkflowDefinition } from '../models/Flow';
import { usePowerToolsApi } from '../powertools/apiHook';
import { mockFlowsResponse, mockFlowDefinition } from '../mock/flowData';

// Set to false for production. Only enable for local testing without PowerTools.
const USE_MOCK_DATA = false;

// Define Dataverse response interfaces
interface DataverseResponse<T> {
  value: T[];
  error?: {
    code?: string;
    message?: string;
  };
}

interface DataverseWorkflow {
  workflowid: string;
  name: string;
  description?: string;
  category?: number;
  createdon?: string;
  modifiedon?: string;
  statecode?: number;
  statuscode?: number;
  type?: number;
  ismanaged?: boolean;
  _createdby_value?: string;
  _modifiedby_value?: string;
  _ownerid_value?: string;
  clientdata?: string;
}

interface DataverseFlowDefinition {
  properties?: {
    displayName?: string;
    description?: string;
    connectionReferences?: Record<string, {
      displayName?: string;
      connectorName?: string;
      connectionName?: string;
      iconUri?: string;
    }>;
    definition?: {
      triggers?: Record<string, any>;
      actions?: Record<string, {
        type?: string;
        description?: string;
        inputs?: any;
        outputs?: any;
      }>;
    };
  };
}

// For use with type assertions to fix 'unknown' type issues
interface ActionValue {
  type?: string;
  description?: string;
  inputs?: any;
  outputs?: any;
}

export function useFlowService() {
  const { getAsJson, isLoaded, download } = usePowerToolsApi();
  const dev = process.env.NODE_ENV === 'development';

  /**
   * Get a list of flows from the PowerPlatform
   */
  const getFlows = useCallback(async (): Promise<Flow[]> => {
    console.log('Getting flows...');
    try {
      // Check if the PowerTools API is available and initialized
      if (!isLoaded) {
        console.warn('API not initialized, cannot get flows');
        throw new Error('PowerTools API not initialized. Please ensure you are running within PowerTools and have a valid connection.');
      }
      
      // In Dataverse Web API, query parameters must be passed directly in the URL
      // not as URLSearchParams object, as they need to be properly formatted
      const url = '/api/data/v9.2/workflows';
      
      // Create URL parameters in the proper format expected by Dataverse API
      const params = new URLSearchParams();
      params.append('$select', 'workflowid,name,statecode,statuscode,category,clientdata,description,ismanaged,type,modifiedon,createdon,_createdby_value,_modifiedby_value,_ownerid_value');
      params.append('$filter', 'category eq 5 and (statecode eq 0 or statecode eq 1)');
      
      // Add cache buster separately
      const cacheBuster = Date.now().toString();
      
      console.log('Starting API request to get flows...');
      console.log('Request URL:', url);
      console.log('Request params:', params.toString());
      
      const response = await getAsJson<DataverseResponse<any>>(url, params);
      console.log('API response received, structure:', Object.keys(response || {}));
      
      // Check if the response contains an error
      if (response.error) {
        const errorCode = response.error.code || 'unknown';
        const errorMessage = response.error.message || 'Unknown error occurred';
        console.error(`API Error (${errorCode}): ${errorMessage}`);
        throw new Error(`Failed to retrieve flows: ${errorMessage}`);
      }
      
      // Check if the response contains the expected value array
      if (!response.value || !Array.isArray(response.value)) {
        console.error('Invalid API response format:', response);
        throw new Error('Invalid API response: Expected an array of flows but received an invalid format. Please check your permissions and connection.');
      }
      
      console.log(`Successfully received ${response.value.length} flows, first flow fields:`, 
        response.value.length > 0 ? Object.keys(response.value[0]) : 'No flows found');
        
      return response.value.map((flow: any) => ({
        id: flow.workflowid,
        name: flow.name,
        description: flow.description || '',
        category: flow.category || 0,
        createdOn: new Date(flow.createdon || Date.now()),
        modifiedOn: new Date(flow.modifiedon || Date.now()),
        status: flow.statecode === 1 ? 'Inactive' : 'Active',
        type: flow.type || 0,
        createdBy: flow._createdby_value || '',
        modifiedBy: flow._modifiedby_value || '',
        owner: flow._ownerid_value || '',
        // Additional properties that might be used by the UI but not in the select query
        state: flow.statecode,
        clientData: flow.clientdata,
        isManaged: flow.ismanaged,
        selected: false
      }));
    } catch (error) {
      console.error('Error getting flows:', error);
      // Provide detailed error information to the user
      if (error instanceof Error) {
        if (error.message.includes('API not initialized')) {
          throw new Error('PowerTools connection error: Please ensure you have selected a valid connection in the PowerTools panel.');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('Network error')) {
          throw new Error('Network error: Unable to connect to the Power Platform API. Please check your internet connection and try again.');
        } else {
          throw new Error(`Error fetching flows: ${error.message}`);
        }
      } else {
        throw new Error('An unexpected error occurred while retrieving flows. Please try again later.');
      }
      
      // No mock data in production, only throw error
    }
  }, [isLoaded, getAsJson]);

  /**
   * Get detailed information about a flow by ID
   */
  const getFlowDetails = useCallback(async (flowId: string): Promise<FlowDetails> => {
    try {
      console.log(`Fetching details for flow ${flowId}`);
      
      if (!isLoaded) {
        throw new Error('PowerTools API not initialized. Please ensure you are running within PowerTools and have a valid connection.');
      }
      
      // Use the Dataverse API endpoint for a specific workflow with proper formatting
      // Format the URL without query parameters in it first
      const url = `/api/data/v9.2/workflows(${flowId})`;
      
      // Create URL parameters in the proper format expected by Dataverse API
      const params = new URLSearchParams();
      params.append('$select', 'workflowid,name,description,clientdata,category,statecode,type,ismanaged,createdon,modifiedon,_createdby_value,_modifiedby_value,_ownerid_value');
      
      console.log('Requesting flow details from:', url);
      console.log('Request params:', params.toString());
      
      const response = await getAsJson<DataverseWorkflow>(url, params);
      console.log('Flow details response structure:', Object.keys(response || {}));
      
      // Verify response has the expected structure
      if (!response || !response.workflowid) {
        console.warn('API response missing workflow data');
        throw new Error('Invalid response from API: missing workflow data');
      }
      
      console.log('Flow details received:', {
        id: response.workflowid,
        name: response.name,
        description: response.description,
        category: response.category,
        statecode: response.statecode,
        type: response.type,
        ismanaged: response.ismanaged,
        hasClientData: !!response.clientdata,
        clientDataLength: response.clientdata?.length
      });
      
      // Parse the clientdata field if it exists (contains the flow definition)
      let flowDefinition: WorkflowDefinition | null = null; // Use the defined interface
      if (response.clientdata) {
        try {
          console.log('Attempting to parse clientdata');
          flowDefinition = JSON.parse(response.clientdata);
          console.log('Successfully parsed clientdata...');
          // Add more detailed logging if needed
        } catch (error) {
          console.warn('Failed to parse flow definition from clientdata:', error);
          // Assign a default empty definition to prevent errors later
          flowDefinition = { properties: { definition: { triggers: {}, actions: {} } } };
        }
      } else {
        console.warn('No clientdata found in the workflow response');
        // Assign a default empty definition if no clientdata
        flowDefinition = { properties: { definition: { triggers: {}, actions: {} } } };
      }
      
      // Ensure flowDefinition and its nested properties exist before accessing them
      const definitionProps = flowDefinition?.properties;
      const definition = definitionProps?.definition;
      const connectionRefs = definitionProps?.connectionReferences || {};
      const definitionTriggers = definition?.triggers || {};
      const definitionActions = definition?.actions || {};

      // Extract connection references
      const connectionReferences = Object.entries(connectionRefs).map(([key, value]) => {
        // Safely access properties with optional chaining
        const connectorName = value?.connectorName || value?.api?.name || '';
        const connectionName = value?.connectionName || value?.connection?.id || '';
        const iconUri = value?.iconUri || '';
        const displayName = value?.displayName || key;

        return {
          id: key,
          displayName: displayName,
          connectorName: connectorName,
          connectionName: connectionName,
          iconUri: iconUri,
          count: 0,
          critical: false
        };
      });
      
      // Extract triggers from the workflow definition
      const triggers: FlowTriggerDetails[] = Object.entries(definitionTriggers).map(([key, value]) => {
        // Safely access properties
        const triggerValue = value as any; // Cast to any for simplicity or define a strict type
        return {
          id: key,
          type: triggerValue?.type,
          kind: triggerValue?.kind,
          inputs: triggerValue?.inputs
        };
      });
      
      // Recursive function to parse actions, including nested ones
      const parseActions = (actionsObj: any): { [key: string]: FlowAction } => {
          const parsedActions: { [key: string]: FlowAction } = {};
          if (!actionsObj) return parsedActions;
          
          Object.entries(actionsObj).forEach(([key, value]) => {
            const actionValue = value as any; // Use any or define strict ActionDefinition
            
            // Recursively parse nested actions
            const nestedActions = actionValue.actions ? parseActions(actionValue.actions) : undefined;
            const elseActions = actionValue.else?.actions ? parseActions(actionValue.else.actions) : undefined;

            parsedActions[key] = {
              id: key,
              name: key, // Consider extracting a display name if available
              type: actionValue?.type,
              kind: actionValue?.kind,
              description: actionValue?.description,
              inputs: actionValue?.inputs,
              outputs: actionValue?.outputs,
              runAfter: actionValue?.runAfter,
              expression: actionValue?.expression,
              actions: nestedActions, 
              elseActions: elseActions
            };
          });
          return parsedActions;
        };

      // Parse the top-level actions into an array for FlowDetails
      const actionsObject = parseActions(definitionActions);
      const actionsArray = Object.values(actionsObject);

      return {
        id: flowId,
        name: response.name || 'Unnamed Flow',
        description: response.description || '',
        definition: flowDefinition, // Store the parsed definition
        connectionReferences: connectionReferences,
        actions: actionsArray, // Use the parsed array of actions
        triggers: triggers, // Use the parsed trigger details
      };
    } catch (error) {
      console.error(`Error getting details for flow ${flowId}:`, error);
      if (error instanceof Error) {
        throw new Error(`Error fetching details: ${error.message}`);
      } else {
        throw new Error('An unexpected error occurred while fetching flow details.');
      }
    }
  }, [isLoaded, getAsJson]);

  /**
   * Get detailed information about a flow by ID, including any child flows
   */
  const getFlowDetailsWithChildren = useCallback(async (flowId: string, depth: number = 0): Promise<FlowDetails> => {
    // Prevent infinite recursion with a reasonable depth limit
    if (depth > 3) {
      console.warn(`Reached maximum child flow depth (${depth}) for flow ${flowId}`);
      return getFlowDetails(flowId);
    }
    
    try {
      // Get the main flow details
      const flowDetails = await getFlowDetails(flowId);
      
      // Look for child workflow references
      const childFlowIds = new Set<string>();
      const findChildFlowsInActions = (actions: FlowAction[]): void => {
        actions.forEach(action => {
          // Check if this is a child workflow reference
          if (action.type === 'Workflow' && action.inputs?.host?.workflowReferenceName) {
            const childFlowId = action.inputs.host.workflowReferenceName;
            childFlowIds.add(childFlowId);
          }
          
          // Recursively check nested actions
          if (action.actions) {
            findChildFlowsInActions(Object.values(action.actions));
          }
          if (action.elseActions) {
            findChildFlowsInActions(Object.values(action.elseActions));
          }
        });
      };
      
      findChildFlowsInActions(flowDetails.actions);
      
      // Fetch details for each child flow
      const childFlowPromises = Array.from(childFlowIds).map(childId => 
        getFlowDetailsWithChildren(childId, depth + 1)
      );
      
      // Wait for all child flow details to be fetched
      const childFlows = await Promise.all(childFlowPromises);
      
      // Attach child flow details to the main flow
      return {
        ...flowDetails,
        childFlows
      };
    } catch (error) {
      console.error(`Error getting details with children for flow ${flowId}:`, error);
      // Fall back to basic flow details
      return getFlowDetails(flowId);
    }
  }, [getFlowDetails]);

  // Analyze flow and gather data about connectors, issues, etc.
  const analyzeFlow = useCallback(async (flowId: string): Promise<FlowAnalysisResult> => {
    try {
      // Use getFlowDetailsWithChildren instead of getFlowDetails to get child flows too
      const details = await getFlowDetailsWithChildren(flowId);
      
      // Analyze connectors used in the flow
      const connectors = analyzeConnectors(details);
      
      // Identify potential issues
      const issues = analyzeIssues(details, connectors);
      
      // Generate recommendations
      const recommendations = generateRecommendations(details, issues);
      
      return {
        connectors,
        issues,
        recommendations
      };
    } catch (error) {
      console.error('Error analyzing flow:', error);
      throw error;
    }
  }, [getFlowDetailsWithChildren]);

  // Analyze connectors used in the flow
  const analyzeConnectors = (flowDetails: FlowDetails): FlowConnector[] => {
    const connectorMap = new Map<string, { count: number, displayName: string, isCritical: boolean }>();
    
    // Process connection references
    flowDetails.connectionReferences.forEach(ref => {
      connectorMap.set(ref.connectorName, {
        count: 0,
        displayName: ref.displayName,
        isCritical: ['sql', 'sharepoint', 'office365', 'dynamics', 'documentdb'].some(
          critical => ref.connectorName.toLowerCase().includes(critical)
        )
      });
    });
    
    // Count connector usage in actions
    flowDetails.actions.forEach(action => {
      // Try to extract connector from action type or other properties
      const actionType = action.type || '';
      const connectorName = actionType.split('/')[0] || '';
      
      if (connectorName && connectorMap.has(connectorName)) {
        const connector = connectorMap.get(connectorName)!;
        connectorMap.set(connectorName, {
          ...connector,
          count: connector.count + 1
        });
      }
    });
    
    // Convert map to array
    return Array.from(connectorMap.entries()).map(([connectorName, data]) => ({
      id: connectorName,
      displayName: data.displayName,
      connectorName,
      connectionName: '',
      iconUri: '',
      count: data.count,
      critical: data.isCritical
    }));
  };

  // Analyze flow for potential issues
  const analyzeIssues = (flowDetails: FlowDetails, connectors: FlowConnector[]): FlowIssue[] => {
    const issues: FlowIssue[] = [];
    
    // Check for critical connectors
    const criticalConnectors = connectors.filter(c => c.critical);
    if (criticalConnectors.length > 0) {
      issues.push({
        id: 'critical-connectors',
        severity: 'Warning',
        description: `Flow uses ${criticalConnectors.length} critical connectors: ${criticalConnectors.map(c => c.displayName).join(', ')}`,
        impact: 'These connectors access important business data and should be reviewed for proper error handling.',
        location: 'Connection References'
      });
    }
    
    // Check for lack of error handling
    const actionsWithoutErrorHandling = flowDetails.actions.filter(action => 
      !(action as any).runAfter
    );
    
    if (actionsWithoutErrorHandling.length > 3) {
      issues.push({
        id: 'missing-error-handling',
        severity: 'Error',
        description: `Flow has ${actionsWithoutErrorHandling.length} actions without error handling.`,
        impact: 'Lack of error handling can cause the flow to fail silently when errors occur.',
        location: 'Actions'
      });
    }
    
    // Check for complex flow
    if (flowDetails.actions.length > 15) {
      issues.push({
        id: 'complex-flow',
        severity: 'Warning',
        description: 'Flow is complex with many actions.',
        impact: 'Complex flows can be difficult to maintain and troubleshoot.',
        location: 'Flow Definition'
      });
    }
    
    return issues;
  };

  // Generate recommendations based on issues
  const generateRecommendations = (flowDetails: FlowDetails, issues: FlowIssue[]): FlowRecommendation[] => {
    const recommendations: FlowRecommendation[] = [];
    
    // Check error handling
    if (issues.some(i => i.id === 'missing-error-handling')) {
      recommendations.push({
        id: 'add-error-handling',
        title: 'Add Error Handling',
        description: 'Add error handling for critical actions to prevent flow failures and improve reliability.',
        priority: 'High',
        category: 'Reliability'
      });
    }
    
    // Check for complex flow
    if (issues.some(i => i.id === 'complex-flow')) {
      recommendations.push({
        id: 'simplify-flow',
        title: 'Simplify Flow',
        description: 'Consider breaking this flow into smaller, more manageable flows for better maintainability.',
        priority: 'Medium',
        category: 'Maintainability'
      });
    }
    
    // Check documentation
    recommendations.push({
      id: 'update-documentation',
      title: 'Update Documentation',
      description: 'Add detailed descriptions to actions and flows to improve team understanding and maintenance.',
      priority: 'Low',
      category: 'Documentation'
    });
    
    return recommendations;
  };

  // Download documentation
  const downloadDocumentation = useCallback(async (content: string, fileName: string, mimeType: string): Promise<void> => {
    try {
      await download(content, fileName, mimeType);
    } catch (error) {
      console.error('Error downloading documentation:', error);
      throw error;
    }
  }, [download]);

  const mockMethods = useCallback((enabled: boolean): void => {
    console.log(`${enabled ? 'Enabling' : 'Disabling'} mock data...`);
    // This function can be used to toggle mock data for testing
  }, []);

  // Function to generate a Mermaid diagram from flow details
  const generateFlowDiagram = useCallback((flowDetails: FlowDetails): string => {
    if (!flowDetails || !flowDetails.actions || !flowDetails.triggers) {
      console.warn('Missing flow details for diagram generation');
      return '';
    }

    // Extract data for the diagram
    const { triggers, actions, connectionReferences } = flowDetails;
    
    // Count different types of nodes for statistics
    const nodeStats = {
      triggers: triggers.length,
      actions: actions.length,
      conditions: actions.filter(a => a.type?.includes('Condition') || false).length,
      expressions: actions.filter(a => a.type?.includes('Expression') || false).length
    };
    
    // Get a list of connectors used in the flow
    const connectors = connectionReferences.map(c => c.connectorName || c.displayName);
    
    // Use simpler Mermaid syntax without semicolons for better compatibility
    let diagram = `graph TD\n`;
    
    // Each class definition needs a line break PLUS we need to add line prefix to ensure proper spacing
    diagram += `classDef trigger fill:#FF9966,stroke:#FF6600,color:#000\n`;
    diagram += `classDef action fill:#99CCFF,stroke:#3366CC,color:#000\n`;
    diagram += `classDef condition fill:#FFCC99,stroke:#FF9933,color:#000\n`;
    diagram += `classDef expression fill:#C2FABC,stroke:#2ECC71,color:#000\n`;
    diagram += `classDef end fill:#EEEEEE,stroke:#999999,color:#000\n\n`;
    
    // Flow diagram - simplified syntax
    diagram += `subgraph Flow["${flowDetails.name || 'Flow Diagram'}"]\n`;
    
    // Add triggers as nodes
    triggers.forEach((triggerName, index) => {
      const triggerId = `T${index}`;
      diagram += `  ${triggerId}["${triggerName}"]\n`;
      diagram += `  class ${triggerId} trigger\n`;
    });
    
    // Add actions as nodes with appropriate shapes
    actions.forEach((action, index) => {
      const actionId = `A${index}`;
      const name = action.name || 'Action';
      
      // Determine node shape based on type
      if (action.type?.includes('Condition')) {
        diagram += `  ${actionId}{"${name}"}\n`;
        diagram += `  class ${actionId} condition\n`;
      } else if (action.type?.includes('Expression')) {
        diagram += `  ${actionId}>"${name}"]\n`;
        diagram += `  class ${actionId} expression\n`;
      } else {
        diagram += `  ${actionId}["${name}"]\n`;
        diagram += `  class ${actionId} action\n`;
      }
    });
    
    // Add end node
    diagram += `  END([End])\n`;
    diagram += `  class END end\n`;
    
    // Connect triggers to first actions (simplified logic)
    triggers.forEach((trigger, index) => {
      if (actions.length > 0) {
        // In a simplified model, connect trigger to first action
        diagram += `  T${index} --> A0\n`;
      }
    });
    
    // Connect actions in sequence (simplified for compatibility)
    for (let i = 0; i < actions.length - 1; i++) {
      diagram += `  A${i} --> A${i+1}\n`;
    }
    
    // Connect last action to END
    if (actions.length > 0) {
      diagram += `  A${actions.length - 1} --> END\n`;
    }
    
    diagram += `end\n\n`;
    
    // Add flow details and statistics in a separate subgraph
    diagram += `subgraph Stats["Flow Statistics"]\n`;
    diagram += `  Triggers["Triggers: ${nodeStats.triggers}"]\n`;
    diagram += `  Actions["Actions: ${nodeStats.actions}"]\n`;
    if (nodeStats.conditions > 0) {
      diagram += `  Conditions["Conditions: ${nodeStats.conditions}"]\n`;
    }
    if (nodeStats.expressions > 0) {
      diagram += `  Expressions["Expressions: ${nodeStats.expressions}"]\n`;
    }
    diagram += `end\n\n`;
    
    // Add connectors used
    if (connectors.length > 0) {
      diagram += `subgraph Conn["Connectors Used"]\n`;
      connectors.forEach((connector, index) => {
        if (connector) {
          diagram += `  C${index}["${connector}"]\n`;
        }
      });
      diagram += `end\n\n`;
    }
    
    // Add diagram key in a separate subgraph
    diagram += `subgraph Legend["Flow Diagram Legend"]\n`;
    diagram += `  LT["Trigger"]\n`;
    diagram += `  class LT trigger\n`;
    diagram += `  LA["Action"]\n`;
    diagram += `  class LA action\n`;
    diagram += `  LC{"Condition"}\n`;
    diagram += `  class LC condition\n`;
    diagram += `  LE>"Expression"]\n`;
    diagram += `  class LE expression\n`;
    diagram += `  LEND([End])\n`;
    diagram += `  class LEND end\n`;
    diagram += `end\n`;
    
    // Log the first 200 chars for debugging
    console.log('Generated diagram (first 200 chars):', diagram.substring(0, 200));
    
    return diagram;
  }, []);

  // Generate a very basic, simplified test diagram that is guaranteed to work
  const generateTestDiagram = useCallback((): string => {
    return `graph TD
    A[Start] --> B[Process]
    B --> C[End]
    
    class A fill:#FF9966,stroke:#FF6600
    class B fill:#99CCFF,stroke:#3366CC
    class C fill:#EEEEEE,stroke:#999999`;
  }, []);

  // For testing purposes - generate a test connection request
  const testApiConnection = useCallback(async (): Promise<boolean> => {
    try {
      const url = '/api/data/v9.2/workflows';
      const params = new URLSearchParams();
      params.append('$select', 'workflowid,name');
      params.append('$top', '1');
      
      console.log('Testing API connection...');
      const response = await getAsJson<any>(url, params);
      
      console.log('Connection test response:', response);
      return true;
    } catch (error) {
      console.error('API Connection test failed:', error);
      return false;
    }
  }, [getAsJson]);

  // Generate a simplified version of the diagram for actual flows
  const generateSimplifiedFlowDiagram = useCallback((flowDetails: FlowDetails): string => {
    if (!flowDetails || !flowDetails.definition) {
      console.warn("Cannot generate diagram: FlowDetails or definition missing.");
      return 'graph TD\n  Error[\"Flow data incomplete\"]';
    }
    
    // Function to recursively generate Mermaid syntax for actions and subgraphs
    // This function is defined *inside* generateSimplifiedFlowDiagram to access flowDetails etc.
    const generateMermaidForScope = ( 
        actionsToProcess: { [key: string]: FlowAction }, 
        parentPrefix: string,
        scopeEntryNodeId?: string // Optional ID of the node entering this scope (trigger or parent action)
     ): { diagram: string, entryNodeIds: string[], exitNodeIds: string[] } => {
      
      let diagram = '';
      let nodeIdsInScope: string[] = [];
      const actionMap = actionsToProcess;
      const actionList = Object.values(actionsToProcess);

      // 1. Define all nodes in the current scope
      actionList.forEach(action => {
        const nodeId = `${parentPrefix}${action.id.replace(/[^a-zA-Z0-9_]/g, '_')}`; // Sanitize ID
        nodeIdsInScope.push(nodeId);
        const safeActionType = action.type || ''; // Use a safe variable
        
        // Create more informative node label based on action type and inputs
        let nodeLabelText = action.id; // Default to action ID
        let nodeClass = 'action'; // Default class
        let isContainer = false;
        
        // Extract details from action inputs based on type
        if (action.inputs) {
          if (safeActionType === 'OpenApiConnection') {
            // For API connections, show the operation and entity
            const host = action.inputs.host;
            if (host) {
              const connName = host.connectionName || '';
              const opId = host.operationId || '';
              const params = action.inputs.parameters || {};
              
              // For Dataverse operations
              if (connName.includes('commondataservice') || connName.includes('dataverse')) {
                // Handle different Dataverse operations
                if (opId === 'ListRecords') {
                  const entityName = params.entityName || '';
                  let filterInfo = '';
                  
                  // Extract filter details - use multiline instead of truncating
                  if (params.$filter) {
                    const filterText = String(params.$filter);
                    filterInfo = `<br/>WHERE ${formatMultilineText(filterText, 60)}`;
                  } else if (params.fetchXml) {
                    // For FetchXML, show a condensed version
                    filterInfo = '<br/>(using FetchXML)';
                    // Could extract entity name from fetchXml if needed
                  } else if (params.$select) {
                    const selectFields = String(params.$select);
                    filterInfo = `<br/>fields: ${formatMultilineText(selectFields, 60)}`;
                  }
                  
                  nodeLabelText = `Get ${entityName} records${filterInfo}`;
                } else if (opId === 'GetItem') {
                  const entityName = params.entityName || '';
                  const recordId = params.recordId ? `<br/>ID: ${String(params.recordId)}` : '';
                  nodeLabelText = `Get ${entityName}${recordId}`;
                } else if (opId === 'CreateRecord') {
                  const entityName = params.entityName || '';
                  // Show all fields being set, with each on a new line
                  const fields = Object.keys(params.item || {});
                  const fieldInfo = fields.length > 0 
                    ? `<br/>Fields:<br/>${fields.join('<br/>')}` 
                    : '';
                  
                  nodeLabelText = `Create ${entityName}${fieldInfo}`;
                } else if (opId === 'UpdateRecord') {
                  const entityName = params.entityName || '';
                  const recordId = params.recordId ? `<br/>ID: ${String(params.recordId)}` : '';
                  // Show all fields being updated, with each on a new line
                  const fields = Object.keys(params.item || {});
                  const fieldInfo = fields.length > 0 
                    ? `<br/>Fields:<br/>${fields.join('<br/>')}` 
                    : '';
                  
                  nodeLabelText = `Update ${entityName}${recordId}${fieldInfo}`;
                } else if (opId === 'DeleteRecord') {
                  const entityName = params.entityName || '';
                  const recordId = params.recordId ? `<br/>ID: ${String(params.recordId)}` : '';
                  nodeLabelText = `Delete ${entityName}${recordId}`;
                } else if (opId === 'PerformBoundAction' || opId === 'PerformUnboundAction') {
                  const actionName = params.actionName || '';
                  nodeLabelText = `${actionName}<br/>(${opId})`;
                } else {
                  // Default for other Dataverse operations
                  nodeLabelText = `${opId}<br/>on ${params.entityName || connName}`;
                }
              } else if (connName.includes('excel') || connName.includes('excelonline')) {
                // Excel operations
                if (opId === 'GetItems' || opId === 'GetRows') {
                  const file = params.file || '';
                  const table = params.table || params.tableName || '';
                  const fileInfo = file ? ` file:${extractFilename(String(file))}` : '';
                  const tableInfo = table ? ` table:${extractTableName(String(table))}` : '';
                  const filterInfo = params.$filter ? ` filter:${String(params.$filter).substring(0, 20)}...` : '';
                  
                  nodeLabelText = `Excel: Get Rows${fileInfo}${tableInfo}${filterInfo}`;
                } else if (opId === 'RunQuery') {
                  const file = params.file || '';
                  const fileInfo = file ? ` file:${extractFilename(String(file))}` : '';
                  nodeLabelText = `Excel: Run Query${fileInfo}`;
                } else {
                  // Other Excel operations
                  nodeLabelText = `Excel: ${opId}`;
                }
              } else if (connName.includes('sharepoint')) {
                // SharePoint operations
                const site = params.site || '';
                const list = params.list || '';
                const itemId = params.id || '';
                
                if (opId === 'GetItem') {
                  nodeLabelText = `SharePoint: Get Item${list ? ` (list:${list})` : ''}${itemId ? ` ID:${itemId}` : ''}`;
                } else if (opId === 'GetItems') {
                  const filterInfo = params.$filter ? ` filter:${String(params.$filter).substring(0, 20)}...` : '';
                  nodeLabelText = `SharePoint: Get Items${list ? ` (list:${list})` : ''}${filterInfo}`;
                } else if (opId === 'CreateItem') {
                  nodeLabelText = `SharePoint: Create Item${list ? ` (list:${list})` : ''}`;
                } else if (opId === 'UpdateItem') {
                  nodeLabelText = `SharePoint: Update Item${list ? ` (list:${list})` : ''}${itemId ? ` ID:${itemId}` : ''}`;
                } else if (opId === 'DeleteItem') {
                  nodeLabelText = `SharePoint: Delete Item${list ? ` (list:${list})` : ''}${itemId ? ` ID:${itemId}` : ''}`;
                } else {
                  nodeLabelText = `SharePoint: ${opId}`;
                }
              } else {
                // Generic connector operation
                nodeLabelText = `${connName}: ${opId}`;
              }
            }
          } else if (safeActionType === 'ApiConnection') {
            // Legacy API connection format
            const apiId = action.inputs.apiId || '';
            const operationId = action.inputs.operationId || '';
            nodeLabelText = `${apiId}: ${operationId}`;
          } else if (safeActionType === 'Http') {
            // HTTP actions
            const method = action.inputs.method || '';
            const uri = action.inputs.uri || '';
            nodeLabelText = `HTTP ${method}:<br/>${formatMultilineText(uri, 40)}`;
          } else if (safeActionType === 'Compose') {
            // For Compose, try to include the actual input value if it's not too complex
            const inputValue = action.inputs.inputs;
            let truncatedValue = '';
            
            if (inputValue !== undefined) {
              if (typeof inputValue === 'string') {
                truncatedValue = formatMultilineText(inputValue, 40);
                truncatedValue = inputValue.length > 30 ? inputValue.substring(0, 30) + '...' : inputValue;
              } else if (typeof inputValue === 'number' || typeof inputValue === 'boolean') {
                truncatedValue = String(inputValue);
              } else {
                // For objects or arrays, just show the type
                truncatedValue = `[${Array.isArray(inputValue) ? 'Array' : 'Object'}]`;
              }
            }
            
            nodeLabelText = truncatedValue ? `Compose: ${truncatedValue}` : 'Compose data';
          } else if (safeActionType === 'Parse') {
            // For Parse JSON, try to show the schema source
            const content = action.inputs.content;
            let contentInfo = '';
            
            if (typeof content === 'string' && content.startsWith('@')) {
              // This is a reference expression
              contentInfo = ` (${content})`;
            }
            
            nodeLabelText = `Parse JSON${contentInfo}`;
          } else if (safeActionType === 'Table') {
            // For HTML Table, show the source if possible
            const sourceInfo = action.inputs.from ? ` from: ${action.inputs.from.toString().substring(0, 20)}...` : '';
            nodeLabelText = `Create HTML Table${sourceInfo}`;
          } else if (safeActionType === 'Join') {
            // For Join, show the format
            const format = action.inputs.format || '';
            nodeLabelText = `Join Array${format ? ` (${format})` : ''}`;
          } else if (safeActionType === 'Select') {
            // For Select, show what we're selecting
            const from = typeof action.inputs.from === 'string' ? action.inputs.from : '[Array]';
            const fromInfo = from.startsWith('@') ? ` from:${from}` : '';
            nodeLabelText = `Select${fromInfo}`;
          } else if (safeActionType === 'Query') {
            // For Query/Filter Array, show the source and filter if possible
            const from = typeof action.inputs.from === 'string' ? action.inputs.from : '[Array]';
            const fromInfo = from.startsWith('@') ? ` from:${from}` : '';
            nodeLabelText = `Filter Array${fromInfo}`;
          } else if (safeActionType === 'Response') {
            // For Response, show the status code
            const statusCode = action.inputs.statusCode || '';
            nodeLabelText = `Send Response (${statusCode})`;
          } else if (safeActionType === 'Workflow') {
            // Child flow calls
            const workflowName = action.inputs?.host?.workflowReferenceName || '';
            
            // Check if we have details for this child flow
            const childFlowDetails = flowDetails.childFlows?.find(cf => cf.name === workflowName);
            
            // Create a more informative label that includes child flow details if available
            let childFlowInfo = '';
            if (childFlowDetails) {
              const triggerCount = childFlowDetails.triggers.length;
              const actionCount = childFlowDetails.actions.length;
              const connectorCount = childFlowDetails.connectionReferences.length;
              
              childFlowInfo = `<br/><br/>Contains:<br/>- ${triggerCount} trigger${triggerCount !== 1 ? 's' : ''}<br/>- ${actionCount} action${actionCount !== 1 ? 's' : ''}<br/>- ${connectorCount} connector${connectorCount !== 1 ? 's' : ''}`;
            }
            
            // Try to get any parameters being passed
            const params = action.inputs.body || {};
            const paramLines = Object.entries(params).map(([key, value]) => {
              let valueStr = '';
              
              // Format the parameter value based on its type
              if (typeof value === 'string') {
                valueStr = value.length > 30 ? value.substring(0, 30) + '...' : value;
              } else if (value === null || value === undefined) {
                valueStr = '(null)';
              } else if (typeof value === 'object') {
                try {
                  valueStr = JSON.stringify(value).substring(0, 30);
                  if (JSON.stringify(value).length > 30) valueStr += '...';
                } catch (e) {
                  valueStr = '(complex object)';
                }
              } else {
                valueStr = String(value);
              }
              
              return `- ${key}: ${valueStr}`;
            });
            
            const paramInfo = paramLines.length > 0 
              ? `<br/><br/>Parameters:<br/>${paramLines.join('<br/>')}` 
              : '';
            
            nodeLabelText = `CHILD Flow:<br/>${workflowName}${paramInfo}${childFlowInfo}`;
            nodeClass = 'childflow'; // Special class for child flow nodes
          }
        }
        
        if (safeActionType === 'If' || safeActionType === 'Switch') {
          // For conditions, show the condition expression if available
          if (action.expression) {
            // Extract and simplify condition for display
            const conditionText = JSON.stringify(action.expression).substring(0, 40);
            nodeLabelText = `If: ${conditionText}${conditionText.length > 40 ? '...' : ''}`;
          } else {
            nodeLabelText = `Condition: ${action.id}`;
          }
          nodeClass = 'condition';
          isContainer = true;
        } else if (safeActionType === 'Foreach' || safeActionType === 'Until') {
          // For loops, show what's being iterated if available
          const loopOn = action.inputs?.foreach || action.inputs?.until || '';
          if (loopOn && typeof loopOn === 'string' && loopOn.length < 40) {
            nodeLabelText = `${safeActionType} ${loopOn}`;
          } else {
            nodeLabelText = `Loop: ${action.id}`;
          }
          nodeClass = 'loop';
          isContainer = true;
        } else if (safeActionType === 'Scope') {
          nodeLabelText = `Scope: ${action.id}`;
          nodeClass = 'scope';
          isContainer = true;
        } else if (safeActionType === 'Expression' || action.kind === 'Expression') {
          // For expressions, show the function name if available
          const expression = action.inputs?.expression || '';
          if (expression && typeof expression === 'string' && expression.length < 40) {
            nodeLabelText = expression;
          } else if (action.kind) {
            nodeLabelText = `Expression (${action.kind})`;
          } else {
            nodeLabelText = `Expression: ${action.id}`;
          }
          nodeClass = 'expression';
        }
        
        // Escape and wrap the label in quotes for Mermaid
        const nodeLabel = JSON.stringify(nodeLabelText);
        
        // Define node based on class/container type
        let nodeDefinition = '';
        if (safeActionType === 'If' || safeActionType === 'Switch') {
          // Format condition text using formatMultilineText for better readability
          let conditionDisplay = nodeLabelText;
          if (typeof conditionDisplay === 'string') {
            conditionDisplay = formatMultilineText(conditionDisplay, 50);
          }
          
          nodeDefinition = `${nodeId}{${JSON.stringify(conditionDisplay)}}`;
          
          // For conditions, create a subgraph with the condition node as the title
          diagram += `  subgraph ${nodeId}_Scope ["${formatMultilineText(nodeLabelText, 40)}"]\n`;
          diagram += `    direction TB\n`;
          diagram += `    class ${nodeId}_Scope condition\n`;
          
          // Process 'true' branch actions
          if (action.actions) {
            const trueBranchResult = generateMermaidForScope(action.actions, `${nodeId}_T_`, nodeId);
            diagram += trueBranchResult.diagram;
            
            // Only connect from condition to the first action in the true branch
            // The condition subgraph itself will act as the container
          }
          
          // Process 'else' branch actions
          if (action.elseActions) {
            diagram += `    subgraph ${nodeId}_Else ["Else"]\n`;
            diagram += `      direction TB\n`;
            diagram += `      class ${nodeId}_Else elseBranch\n`; // Style the else branch distinctly
            const elseBranchResult = generateMermaidForScope(action.elseActions, `${nodeId}_E_`, nodeId);
            diagram += elseBranchResult.diagram;
            diagram += `    end\n`;
          }
          
          diagram += `  end\n`;
        } else if (safeActionType === 'Foreach' || safeActionType === 'Until') {
          // Format loop label text using formatMultilineText for better readability
          let loopDisplay = nodeLabelText;
          if (typeof loopDisplay === 'string') {
            loopDisplay = formatMultilineText(loopDisplay, 50);
          }
          
          nodeDefinition = `${nodeId}[/${JSON.stringify(loopDisplay)}/]`;
          diagram += `  subgraph ${nodeId}_Scope ["${formatMultilineText(nodeLabelText, 40)}"]\n`;
          diagram += `    direction TB\n`;
          diagram += `    class ${nodeId}_Scope loop\n`;
          
          if (action.actions) {
            const loopResult = generateMermaidForScope(action.actions, `${nodeId}_L_`, nodeId);
            diagram += loopResult.diagram;
            
            // No need to manually connect to first action - the subgraph container handles it
          }
          
          diagram += `  end\n`;
        } else if (safeActionType === 'Scope') {
          // Format scope label text using formatMultilineText for better readability
          let scopeDisplay = nodeLabelText;
          if (typeof scopeDisplay === 'string') {
            scopeDisplay = formatMultilineText(scopeDisplay, 50);
          }
          
          nodeDefinition = `${nodeId}[(${JSON.stringify(scopeDisplay)})]`;
          diagram += `  subgraph ${nodeId}_Scope ["${formatMultilineText(nodeLabelText, 40)}"]\n`;
          diagram += `    direction TB\n`;
          diagram += `    class ${nodeId}_Scope scope\n`;
          
          if (action.actions) {
            const scopeResult = generateMermaidForScope(action.actions, `${nodeId}_S_`, nodeId);
            diagram += scopeResult.diagram;
          }
          
          diagram += `  end\n`;
        } else if (safeActionType === 'Expression' || action.kind === 'Expression') {
          // Format expression text for better readability
          let expressionDisplay = nodeLabelText;
          if (typeof expressionDisplay === 'string') {
            expressionDisplay = formatMultilineText(expressionDisplay, 40);
          }
          
          nodeDefinition = `${nodeId}>${JSON.stringify(expressionDisplay)}]`;
        } else if (safeActionType === 'Workflow') {
          // Use special styling for child flow nodes
          let childFlowDisplay = nodeLabelText;
          if (typeof childFlowDisplay === 'string') {
            childFlowDisplay = formatMultilineText(childFlowDisplay, 60);
          }
          
          nodeDefinition = `${nodeId}[${JSON.stringify(childFlowDisplay)}]`;
        } else {
          // For regular actions, make sure text is properly formatted for multiline display
          let actionDisplay = nodeLabelText;
          if (typeof actionDisplay === 'string') {
            actionDisplay = formatMultilineText(actionDisplay, 40);
          }
          
          nodeDefinition = `${nodeId}[${JSON.stringify(actionDisplay)}]`;
        }
        
        // Define the node itself (container nodes are defined by their subgraph)
        if (!isContainer) {
           diagram += `  ${nodeDefinition}\n`;
        }
        // Apply styling class
        diagram += `  class ${nodeId} ${nodeClass}\n`;
      });

      // 2. Define connections within the current scope
      let entryNodeIds: string[] = [];
      let exitNodeIds: string[] = [...nodeIdsInScope]; // Start with all nodes as potential exits

      actionList.forEach(action => {
         const currentNodeId = `${parentPrefix}${action.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
         
         if (!action.runAfter || Object.keys(action.runAfter).length === 0) {
           // This action is an entry point for this scope
           entryNodeIds.push(currentNodeId);
           if (scopeEntryNodeId) {
             // Connect from the node that triggered this scope
             diagram += `  ${scopeEntryNodeId} --> ${currentNodeId}\n`;
           }
         } else {
           // This action runs after others
           Object.keys(action.runAfter).forEach(predecessorKey => {
              const predecessorId = `${parentPrefix}${predecessorKey.replace(/[^a-zA-Z0-9_]/g, '_')}`;
              if (nodeIdsInScope.includes(predecessorId)) {
                 // Connect within the same scope
                 diagram += `  ${predecessorId} --> ${currentNodeId}\n`;
                 // If a node has successors, it's not an exit node for the scope
                 exitNodeIds = exitNodeIds.filter(id => id !== predecessorId);
              } else {
                 // Connection comes from outside this immediate scope (should be handled by parent scope or initial trigger connection)
                 console.warn(`Connection from ${predecessorKey} to ${action.id} crosses scope boundaries.`);
                 // As a fallback, try connecting from the scope entry
                 if (scopeEntryNodeId) {
                    diagram += `  ${scopeEntryNodeId} --> ${currentNodeId} --- Connection from parent scope\n`;
                 }
              }
           });
         }
      });
      
      // Refine exit nodes: Only keep those that don't have successors *within this scope*
      const nodesWithSuccessors = new Set<string>();
       actionList.forEach(action => {
          if (action.runAfter) {
             Object.keys(action.runAfter).forEach(predecessorKey => {
                const predecessorId = `${parentPrefix}${predecessorKey.replace(/[^a-zA-Z0-9_]/g, '_')}`;
                if (nodeIdsInScope.includes(predecessorId)) {
                    nodesWithSuccessors.add(predecessorId);
                }
             });
          }
       });
       exitNodeIds = nodeIdsInScope.filter(id => !nodesWithSuccessors.has(id));

      return { diagram, entryNodeIds, exitNodeIds };
    };

    // --- Main Diagram Generation --- 
    let diagram = `graph TD\n`; // Top Down direction
    diagram += `%%{init: {'theme': 'neutral', 'flowchart': {'useMaxWidth': false, 'htmlLabels': true}} }%%\n\n`;
    
    // Define main Flow subgraph
    diagram += `subgraph FlowGraph ["${flowDetails.name}"]\n`;
    diagram += `  direction TB\n`;

    // Define Trigger nodes
    let triggerNodeIds: string[] = [];
    flowDetails.triggers.forEach((trigger) => {
      const triggerId = `Trigger_${trigger.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      triggerNodeIds.push(triggerId);
      // Use trigger.kind or trigger.type for more specific labeling if needed
      diagram += `  ${triggerId}["Trigger: ${trigger.id}"]\n`; 
      diagram += `  class ${triggerId} trigger\n`;
    });

    // Process top-level actions
    const topLevelActions = flowDetails.actions.reduce((obj, action) => {
       obj[action.id] = action;
       return obj;
    }, {} as { [key: string]: FlowAction });

    const scopeResult = generateMermaidForScope(topLevelActions, 'Action_');
    diagram += scopeResult.diagram;

    // Connect Triggers to the entry points of the top-level scope
    triggerNodeIds.forEach(triggerId => {
        scopeResult.entryNodeIds.forEach(entryNodeId => {
            diagram += `  ${triggerId} --> ${entryNodeId}\n`;
        });
    });
    
    // Add an explicit End node? (Optional, Mermaid usually infers)
    // diagram += `  EndNode((End))\n`;
    // scopeResult.exitNodeIds.forEach(exitNodeId => {
    //    diagram += `  ${exitNodeId} --> EndNode\n`;
    // });
    
    diagram += `end\n\n`; // End FlowGraph subgraph
    
    // Define Legend subgraph separately
    diagram += `subgraph Legend ["Flow Diagram Legend"]\n`;
    diagram += `  direction LR\n`; // Layout legend horizontally
    diagram += `  L_T["Trigger"]:::trigger\n`;
    diagram += `  L_A["Action"]:::action\n`;
    diagram += `  L_C{"Condition"}:::condition\n`;
    diagram += `  L_E>"Expression"]:::expression\n`;
    diagram += `  L_L[Loop]:::loop\n`; 
    diagram += `  L_CF[Child Flow]:::childflow\n`;
    diagram += `  L_S[Scope]:::scope\n`; // Added scope legend item
    diagram += `end\n\n`;
    
    // Add styling class definitions
    diagram += `classDef default fill:#f9f9f9,stroke:#333,stroke-width:1px\n\n`;
    diagram += `classDef trigger fill:#FF9966,stroke:#FF6600\n\n`;
    diagram += `classDef action fill:#99CCFF,stroke:#3366CC\n\n`;
    diagram += `classDef condition fill:#FFCC99,stroke:#FF9933\n\n`;
    diagram += `classDef expression fill:#C2FABC,stroke:#2ECC71\n\n`;
    diagram += `classDef loop fill:#E8DAEF,stroke:#8E44AD\n\n`;
    diagram += `classDef childflow fill:#AED6F1,stroke:#3498DB,stroke-width:2px,stroke-dasharray:5,5\n\n`;
    diagram += `classDef scope fill:#F5B7B1,stroke:#C0392B\n\n`; 

    // Apply classes to legend items (Mermaid quirk)
    // Need to ensure all classes used in the legend are defined above
    diagram += `class L_T trigger; class L_A action; class L_C condition; class L_E expression; class L_L loop; class L_CF childflow; class L_S scope;\n`;

    console.log('Generated enhanced diagram:', diagram);
    return diagram;
  }, []);

  // Helper functions for extracting readable info from complex parameters
  function extractFilename(path: string): string {
    // Try to extract just the filename from a path or ID
    const parts = path.split('/');
    return parts[parts.length - 1].substring(0, 15) + (parts[parts.length - 1].length > 15 ? '...' : '');
  }

  function extractTableName(tableId: string): string {
    // Extract a readable table name from complex Excel table IDs
    if (tableId.includes('{') && tableId.includes('}')) {
      return 'Table';
    }
    return tableId.substring(0, 15) + (tableId.length > 15 ? '...' : '');
  }

  // Function to format text for multiline display in Mermaid nodes
  const formatMultilineText = (text: string, maxLineLength: number = 40): string => {
    if (!text || text.length <= maxLineLength) {
      return text;
    }
    
    // Convert non-breakable text into lines
    let result = '';
    let currentLine = '';
    
    // Split by words to preserve word boundaries
    const words = text.split(' ');
    
    words.forEach(word => {
      // If adding this word would exceed the line length, add a line break
      if (currentLine.length + word.length + 1 > maxLineLength) {
        result += currentLine + '<br/>';
        currentLine = word;
      } else {
        // Otherwise, add the word to the current line
        currentLine = currentLine ? currentLine + ' ' + word : word;
      }
    });
    
    // Add the last line
    if (currentLine) {
      result += currentLine;
    }
    
    return result;
  };

  return {
    isLoaded,
    getFlows,
    getFlowDetails,
    getFlowDetailsWithChildren,
    analyzeFlow,
    downloadDocumentation,
    mockMethods,
    generateFlowDiagram,
    generateTestDiagram,
    generateSimplifiedFlowDiagram,
    testApiConnection
  };
}