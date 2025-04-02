import { useCallback } from 'react';
import { Flow, FlowDetails, FlowAnalysisResult, FlowIssue, FlowRecommendation, FlowConnector, FlowAction, FlowTriggerDetails, WorkflowDefinition } from '../models/Flow';
import { usePowerToolsApi } from '../powertools/apiHook';
import { mockFlowsResponse, mockFlowDefinition } from '../mock/flowData';
import { getFlowStatus } from '../utils/flowStatus';

// Set to false for production. Only enable for local testing without PowerTools.
const USE_MOCK_DATA = false;

// Cache to store page skipTokens for efficient pagination
// Structure: { [searchText_pageSize]: { [pageNumber]: skipToken } }
const skipTokenCache: Record<string, Record<number, string>> = {};

// Define Dataverse response interfaces
interface DataverseResponse<T> {
  value: T[];
  "@odata.nextLink"?: string;
  "@odata.count"?: number;
  error?: {
    code?: string;
    message?: string;
  };
}

// PowerTools API specific response wrapper
interface PowerToolsApiResponse {
  headers?: any;
  statusCode?: number;
  contentLength?: number;
  content?: string;
  asJson?: () => Promise<any>;
  getSkipToken?: () => string | null;
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

// For use with type assertions to fix 'unknown' type issues
// interface ActionValue {
//   type?: string;
//   description?: string;
//   inputs?: any;
//   outputs?: any;
// }

// Response type for paginated results
export interface PaginatedFlowsResponse {
  flows: Flow[];
  totalCount?: number;
  hasNextPage: boolean;
}

export function useFlowService() {
  const { getAsJson, isLoaded, download } = usePowerToolsApi();

  /**
   * Get a list of flows from the PowerPlatform
   * @param searchText Optional search text to filter flows on the server side
   * @param pageSize Number of flows to retrieve per page (default: 50)
   * @param pageNumber Page number to retrieve (default: 1)
   */
  const getFlows = useCallback(async (
    searchText?: string, 
    pageSize: number = 50, 
    pageNumber: number = 1
  ): Promise<PaginatedFlowsResponse> => {
    console.log(`Getting flows...${searchText ? ` with search: "${searchText}"` : ''}, page ${pageNumber}, size ${pageSize}`);
    try {
      // Check if the PowerTools API is available and initialized
      if (!isLoaded) {
        console.warn('API not initialized, cannot get flows');
        throw new Error('PowerTools API not initialized. Please ensure you are running within PowerTools and have a valid connection.');
      }
      
      // For testing/development without PowerTools connection
      if (USE_MOCK_DATA) {
        console.log('Using mock data for flows');
        let mockFlows = mockFlowsResponse.value.map((flow: any) => {
          const flowStatus = getFlowStatus(flow.statecode);
          return {
            id: flow.workflowid,
            name: flow.name,
            description: flow.description || '',
            category: flow.category || 0,
            createdOn: new Date(flow.createdon || Date.now()),
            modifiedOn: new Date(flow.modifiedon || Date.now()),
            status: flowStatus,
            type: flow.type || 0,
            createdBy: flow._createdby_value || '',
            modifiedBy: flow._modifiedby_value || '',
            owner: flow._ownerid_value || '',
            state: flow.statecode,
            clientData: flow.clientdata,
            isManaged: flow.ismanaged,
            selected: false
          };
        });
        
        // If search text is provided, filter mock data
        if (searchText && searchText.trim()) {
          const searchTerms = searchText.toLowerCase().trim();
          mockFlows = mockFlows.filter(flow => 
            flow.name.toLowerCase().includes(searchTerms) || 
            (flow.description && flow.description.toLowerCase().includes(searchTerms))
          );
        }
        
        // Apply pagination to mock data
        const totalCount = mockFlows.length;
        const skip = (pageNumber - 1) * pageSize;
        mockFlows = mockFlows.slice(skip, skip + pageSize);
        
        return {
          flows: mockFlows,
          totalCount,
          hasNextPage: skip + pageSize < totalCount
        };
      }
      
      // In Dataverse Web API, query parameters must be passed directly in the URL
      // not as URLSearchParams object, as they need to be properly formatted
      const url = '/api/data/v9.2/workflows';
      
      // Create URL parameters in the proper format expected by Dataverse API
      let params = new URLSearchParams();
      params.append('$select', 'workflowid,name,statecode,statuscode,category,clientdata,description,ismanaged,type,modifiedon,createdon,_createdby_value,_modifiedby_value,_ownerid_value');
      
      // Base filter for Power Automate Cloud Flows
      let filterQuery = 'category eq 5 and (statecode eq 0 or statecode eq 1)';
      
      // Add search filter if provided
      if (searchText && searchText.trim()) {
        // Clean and prepare the search text for OData filter
        const cleanSearchText = searchText.trim().replace(/'/g, "''");
        
        // Create filter conditions for searchable fields
        const searchFilter = `(contains(name,'${cleanSearchText}') or contains(description,'${cleanSearchText}'))`;
        
        // Combine with base filter
        filterQuery = `${filterQuery} and ${searchFilter}`;
      }
      
      params.append('$filter', filterQuery);
      
      // Add pagination parameters
      params.append('$count', 'true'); // Request total count
      params.append('$top', pageSize.toString()); // Limit results
      
      // Add ordering to ensure consistent results across pages
      params.append('$orderby', 'modifiedon desc');
      
      // Generate a cache key based on searchText and pageSize
      const cacheKey = `${searchText || ''}_${pageSize}`;
      
      // For subsequent pages, check if we have a cached skiptoken
      if (pageNumber > 1) {
        // Check if we have a cached skiptoken for this page
        if (skipTokenCache[cacheKey] && skipTokenCache[cacheKey][pageNumber]) {
          console.log(`Using cached skiptoken for page ${pageNumber}`);
          params.append('$skiptoken', skipTokenCache[cacheKey][pageNumber]);
        }
        // Check if we have a cached skiptoken for the previous page
        else if (skipTokenCache[cacheKey] && skipTokenCache[cacheKey][pageNumber - 1]) {
          console.log(`Using cached skiptoken for previous page ${pageNumber - 1} and requesting next page`);
          
          // Use the previous page's skiptoken
          let prevParams = new URLSearchParams();
          prevParams.append('$select', params.get('$select') || '');
          prevParams.append('$filter', params.get('$filter') || '');
          prevParams.append('$top', params.get('$top') || '');
          prevParams.append('$count', 'true');
          prevParams.append('$orderby', params.get('$orderby') || '');
          prevParams.append('$skiptoken', skipTokenCache[cacheKey][pageNumber - 1]);
          
          // Make request to get the next page's skiptoken
          const intermediateResponse = await getAsJson<PowerToolsApiResponse>(url, prevParams);
          
          // Parse the response to get the nextLink
          let jsonData: DataverseResponse<DataverseWorkflow>;
          
          if (intermediateResponse && typeof intermediateResponse.content === 'string') {
            jsonData = JSON.parse(intermediateResponse.content);
          } else if (intermediateResponse && typeof intermediateResponse.asJson === 'function') {
            jsonData = await intermediateResponse.asJson();
          } else {
            jsonData = intermediateResponse as unknown as DataverseResponse<DataverseWorkflow>;
          }
          
          // Check if there's a next page
          const nextPageLink = jsonData["@odata.nextLink"] || null;
          
          if (!nextPageLink) {
            console.warn(`No more pages available after page ${pageNumber - 1}, cannot retrieve page ${pageNumber}`);
            // Return the last page's results with hasNextPage = false
            const flows = jsonData.value.map((flow: DataverseWorkflow) => {
              const flowStatus = getFlowStatus(flow.statecode ?? 0);
              return {
                id: flow.workflowid,
                name: flow.name,
                description: flow.description || '',
                category: flow.category || 0,
                createdOn: new Date(flow.createdon || Date.now()),
                modifiedOn: new Date(flow.modifiedon || Date.now()),
                status: flowStatus,
                type: flow.type || 0,
                createdBy: flow._createdby_value || '',
                modifiedBy: flow._modifiedby_value || '',
                owner: flow._ownerid_value || '',
                state: flow.statecode ?? 0,
                clientData: flow.clientdata,
                isManaged: flow.ismanaged,
                selected: false
              };
            });
            
            return {
              flows,
              totalCount: jsonData["@odata.count"] || 0,
              hasNextPage: false
            };
          }
          
          // Extract skiptoken from the nextLink for the requested page
          const skipTokenMatch = nextPageLink.match(/\$skiptoken=([^&]+)/);
          
          if (skipTokenMatch && skipTokenMatch[1]) {
            const newSkipToken = decodeURIComponent(skipTokenMatch[1]);
            
            // Store the skiptoken in the cache
            if (!skipTokenCache[cacheKey]) {
              skipTokenCache[cacheKey] = {};
            }
            skipTokenCache[cacheKey][pageNumber] = newSkipToken;
            
            // Update the params for the current request
            params.append('$skiptoken', newSkipToken);
            console.log(`Found and cached skiptoken for page ${pageNumber}: ${newSkipToken.substring(0, 20)}...`);
          } else {
            // If we can't find a skiptoken, use the full nextLink URL
            const urlParts = nextPageLink.split('?');
            if (urlParts.length > 1) {
              params = new URLSearchParams(urlParts[1]);
              console.log('Using full nextLink parameters for pagination');
            } else {
              console.error('Unable to extract pagination parameters from nextLink:', nextPageLink);
              throw new Error('Failed to navigate to the requested page: invalid pagination link');
            }
          }
        }
        // We don't have any cached skiptokens for this query, we need to build the chain
        else {
          console.log('No cached skiptokens - need to build pagination chain');
          
          // For pagination beyond page 1, we need to retrieve each previous page to get the skiptoken
          // This is because Dataverse uses continuation tokens instead of skip/offset pagination
          let currentPage = 1;
          let currentParams = new URLSearchParams(params);
          
          // Initialize the cache for this query
          if (!skipTokenCache[cacheKey]) {
            skipTokenCache[cacheKey] = {};
          }
          
          // Loop through pages until we reach the requested page or run out of data
          while (currentPage < pageNumber) {
            console.log(`Retrieving page ${currentPage} to get skiptoken for page ${currentPage + 1}...`);
            
            // Make request for the current page
            const intermediateResponse = await getAsJson<PowerToolsApiResponse>(url, currentParams);
            
            // Parse the response to get the nextLink
            let jsonData: DataverseResponse<DataverseWorkflow>;
            
            if (intermediateResponse && typeof intermediateResponse.content === 'string') {
              jsonData = JSON.parse(intermediateResponse.content);
            } else if (intermediateResponse && typeof intermediateResponse.asJson === 'function') {
              jsonData = await intermediateResponse.asJson();
            } else {
              jsonData = intermediateResponse as unknown as DataverseResponse<DataverseWorkflow>;
            }
            
            // Check if there's a next page
            const nextPageLink = jsonData["@odata.nextLink"] || null;
            
            if (!nextPageLink) {
              console.warn(`No more pages available after page ${currentPage}, cannot retrieve page ${pageNumber}`);
              // Return empty result or last available page
              return {
                flows: [],
                totalCount: jsonData["@odata.count"] || 0,
                hasNextPage: false
              };
            }
            
            // Extract skiptoken from the nextLink
            const skipTokenMatch = nextPageLink.match(/\$skiptoken=([^&]+)/);
            
            if (skipTokenMatch && skipTokenMatch[1]) {
              const newSkipToken = decodeURIComponent(skipTokenMatch[1]);
              
              // Store the skiptoken in the cache for the next page
              skipTokenCache[cacheKey][currentPage + 1] = newSkipToken;
              
              // Replace the params with just the skiptoken for the next request
              currentParams = new URLSearchParams();
              currentParams.append('$select', params.get('$select') || '');
              currentParams.append('$filter', params.get('$filter') || '');
              currentParams.append('$top', params.get('$top') || '');
              currentParams.append('$count', 'true');
              currentParams.append('$orderby', params.get('$orderby') || '');
              currentParams.append('$skiptoken', newSkipToken);
              
              console.log(`Found and cached skiptoken for page ${currentPage + 1}: ${newSkipToken.substring(0, 20)}...`);
            } else {
              // If we can't find a skiptoken, use the full nextLink URL
              const urlParts = nextPageLink.split('?');
              if (urlParts.length > 1) {
                currentParams = new URLSearchParams(urlParts[1]);
                console.log('Using full nextLink parameters for pagination');
              } else {
                console.error('Unable to extract pagination parameters from nextLink:', nextPageLink);
                throw new Error('Failed to navigate to the requested page: invalid pagination link');
              }
            }
            
            currentPage++;
          }
          
          // Now currentParams contains the skiptoken or parameters needed for the requested page
          params = currentParams;
          console.log(`Successfully navigated to parameters for page ${pageNumber}`);
        }
      }
      
      console.log('Starting API request to get flows...');
      console.log('Request URL:', url);
      console.log('Request params:', params.toString());
      
      const response = await getAsJson<PowerToolsApiResponse>(url, params);
      console.log('API response received, structure:', Object.keys(response || {}));
      
      // Handle PowerTools-specific response format
      let jsonData: DataverseResponse<DataverseWorkflow>;
      
      // Check if response is a PowerTools wrapper with content property
      if (response && typeof response.content === 'string') {
        try {
          console.log('Parsing content string from PowerTools response');
          jsonData = JSON.parse(response.content);
          console.log('Successfully parsed content from PowerTools response');
        } catch (parseError) {
          console.error('Failed to parse content from PowerTools response:', parseError);
          throw new Error('Failed to parse API response content');
        }
      } else if (response && typeof response.asJson === 'function') {
        // Use the asJson method if available
        try {
          console.log('Using asJson method from PowerTools response');
          jsonData = await response.asJson();
          console.log('Successfully got JSON from asJson method');
        } catch (jsonError) {
          console.error('Failed to get JSON using asJson method:', jsonError);
          throw new Error('Failed to extract JSON data from API response');
        }
      } else {
        // Try to use the response directly if it's already in the expected format
        console.log('Using response directly as JSON data');
        jsonData = response as unknown as DataverseResponse<DataverseWorkflow>;
      }
      
      console.log('Parsed response data structure:', Object.keys(jsonData || {}));
      
      // Check if the response contains an error
      if (jsonData.error) {
        const errorCode = jsonData.error.code || 'unknown';
        const errorMessage = jsonData.error.message || 'Unknown error occurred';
        console.error(`API Error (${errorCode}): ${errorMessage}`);
        throw new Error(`Failed to retrieve flows: ${errorMessage}`);
      }
      
      // Check if the response contains the expected value array
      if (!jsonData.value || !Array.isArray(jsonData.value)) {
        console.error('Invalid API response format:', jsonData);
        throw new Error('Invalid API response: Expected an array of flows but received an invalid format. Please check your permissions and connection.');
      }
      
      console.log(`Successfully received ${jsonData.value.length} flows, first flow fields:`, 
        jsonData.value.length > 0 ? Object.keys(jsonData.value[0]) : 'No flows found');
        
      const flows = jsonData.value.map((flow: DataverseWorkflow) => {
        const flowStatus = getFlowStatus(flow.statecode ?? 0);
        return {
          id: flow.workflowid,
          name: flow.name,
          description: flow.description || '',
          category: flow.category || 0,
          createdOn: new Date(flow.createdon || Date.now()),
          modifiedOn: new Date(flow.modifiedon || Date.now()),
          status: flowStatus,
          type: flow.type || 0,
          createdBy: flow._createdby_value || '',
          modifiedBy: flow._modifiedby_value || '',
          owner: flow._ownerid_value || '',
          // Additional properties that might be used by the UI but not in the select query
          state: flow.statecode ?? 0,
          clientData: flow.clientdata,
          isManaged: flow.ismanaged,
          selected: false
        };
      });
      
      // Cache the skiptoken for the next page if available
      if (jsonData["@odata.nextLink"]) {
        const nextPageLink = jsonData["@odata.nextLink"];
        const skipTokenMatch = nextPageLink.match(/\$skiptoken=([^&]+)/);
        
        if (skipTokenMatch && skipTokenMatch[1]) {
          const newSkipToken = decodeURIComponent(skipTokenMatch[1]);
          
          // Store the skiptoken in the cache for the next page
          if (!skipTokenCache[cacheKey]) {
            skipTokenCache[cacheKey] = {};
          }
          skipTokenCache[cacheKey][pageNumber + 1] = newSkipToken;
          console.log(`Cached skiptoken for next page (${pageNumber + 1})`);
        }
      }
      
      return {
        flows,
        totalCount: jsonData["@odata.count"],
        hasNextPage: !!jsonData["@odata.nextLink"]
      };
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
      
      // For testing/development without PowerTools connection
      if (USE_MOCK_DATA) {
        console.log('Using mock data for flow details');
        const mockFlowRecord = mockFlowsResponse.value.find(f => f.workflowid === flowId) || mockFlowsResponse.value[0];
        
        // Define interfaces for correct typing
        interface MockTrigger {
          type?: string;
          kind?: string;
          inputs?: any;
        }
        
        interface MockAction {
          type?: string;
          description?: string;
          inputs?: any;
          outputs?: any;
          runAfter?: { [key: string]: string[] };
        }
        
        // Create mock triggers and actions from the mock definition
        const triggers: FlowTriggerDetails[] = Object.entries(mockFlowDefinition.properties.definition?.triggers || {})
          .map(([id, trigger]) => ({
            id,
            type: (trigger as MockTrigger).type,
            kind: (trigger as MockTrigger).kind,
            inputs: (trigger as MockTrigger).inputs
          }));
          
        const actions: FlowAction[] = Object.entries(mockFlowDefinition.properties.definition?.actions || {})
          .map(([id, action]) => ({
            id,
            name: id.replace(/_/g, ' '),
            type: (action as MockAction).type,
            description: (action as MockAction).description,
            inputs: (action as MockAction).inputs,
            outputs: (action as MockAction).outputs,
            runAfter: (action as MockAction).runAfter
          }));
          
        const connections: FlowConnector[] = Object.entries(mockFlowDefinition.properties.connectionReferences || {})
          .map(([id, connection]) => ({
            id,
            displayName: connection.displayName || id,
            connectorName: connection.connectorName || '',
            connectionName: connection.connectionName || '',
            iconUri: connection.iconUri || '',
            count: 0,
            critical: false
          }));
        
        return {
          id: flowId,
          name: mockFlowRecord.name,
          description: mockFlowRecord.description || '',
          definition: mockFlowDefinition,
          connectionReferences: connections,
          actions: actions,
          triggers: triggers,
          childFlows: []
        };
      }
      
      // Use the Dataverse API endpoint for a specific workflow with proper formatting
      // Format the URL without query parameters in it first
      const url = `/api/data/v9.2/workflows(${flowId})`;
      
      // Create URL parameters in the proper format expected by Dataverse API
      const params = new URLSearchParams();
      params.append('$select', 'workflowid,name,description,clientdata,category,statecode,type,ismanaged,createdon,modifiedon,_createdby_value,_modifiedby_value,_ownerid_value');
      
      console.log('Requesting flow details from:', url);
      console.log('Request params:', params.toString());
      
      const response = await getAsJson<PowerToolsApiResponse>(url, params);
      console.log('Flow details response structure:', Object.keys(response || {}));
      
      // Handle PowerTools-specific response format
      let workflowData: DataverseWorkflow;
      
      // Check if response is a PowerTools wrapper with content property
      if (response && typeof response.content === 'string') {
        try {
          console.log('Parsing content string from PowerTools response');
          workflowData = JSON.parse(response.content);
          console.log('Successfully parsed content from PowerTools response');
        } catch (parseError) {
          console.error('Failed to parse content from PowerTools response:', parseError);
          throw new Error('Failed to parse API response content');
        }
      } else if (response && typeof response.asJson === 'function') {
        // Use the asJson method if available
        try {
          console.log('Using asJson method from PowerTools response');
          workflowData = await response.asJson();
          console.log('Successfully got JSON from asJson method');
        } catch (jsonError) {
          console.error('Failed to get JSON using asJson method:', jsonError);
          throw new Error('Failed to extract JSON data from API response');
        }
      } else {
        // Try to use the response directly if it's already in the expected format
        console.log('Using response directly as JSON data');
        workflowData = response as unknown as DataverseWorkflow;
      }
      
      // Verify response has the expected structure
      if (!workflowData || !workflowData.workflowid) {
        console.warn('API response missing workflow data');
        throw new Error('Invalid response from API: missing workflow data');
      }
      
      console.log('Flow details received:', {
        id: workflowData.workflowid,
        name: workflowData.name,
        description: workflowData.description,
        category: workflowData.category,
        statecode: workflowData.statecode,
        type: workflowData.type,
        ismanaged: workflowData.ismanaged,
        hasClientData: !!workflowData.clientdata,
        clientDataLength: workflowData.clientdata?.length
      });
      
      // Parse the clientdata field if it exists (contains the flow definition)
      let flowDefinition: WorkflowDefinition | null = null; // Use the defined interface
      if (workflowData.clientdata) {
        try {
          console.log('Attempting to parse clientdata');
          flowDefinition = JSON.parse(workflowData.clientdata);
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
      
      // Define interfaces for correct typing
      interface TriggerValue {
        type?: string;
        kind?: string;
        inputs?: any;
      }
      
      interface ActionValue {
        type?: string;
        description?: string;
        inputs?: any;
        outputs?: any;
        runAfter?: { [key: string]: string[] };
        expression?: any;
        actions?: any;
        else?: any;
      }
      
      // Extract triggers from the workflow definition
      const triggers: FlowTriggerDetails[] = Object.entries(definitionTriggers).map(([key, value]) => {
        // Safely access properties
        const triggerValue = value as TriggerValue;
        return {
          id: key,
          type: triggerValue.type,
          kind: triggerValue.kind,
          inputs: triggerValue.inputs
        };
      });
      
      // Parse actions from the workflow definition using recursive function
      const parseActions = (actionsObj: any): { [key: string]: FlowAction } => {
        const result: { [key: string]: FlowAction } = {};
        if (!actionsObj || typeof actionsObj !== 'object') {
          return result;
        }
        
        Object.entries(actionsObj).forEach(([key, value]) => {
          const actionValue = value as ActionValue;
          const action: FlowAction = {
            id: key,
            name: key.replace(/_/g, ' '),
            type: actionValue.type,
            description: actionValue.description,
            inputs: actionValue.inputs,
            outputs: actionValue.outputs,
            runAfter: actionValue.runAfter,
            expression: actionValue.expression
          };
          
          // Handle nested actions (for If conditions, Switch, etc.)
          if (actionValue.actions && typeof actionValue.actions === 'object') {
            action.actions = parseActions(actionValue.actions);
          }
          
          // Handle 'else' actions for If conditions
          if (actionValue.else && typeof actionValue.else === 'object') {
            action.elseActions = parseActions(actionValue.else);
          }
          
          result[key] = action;
        });
        
        return result;
      };
      
      // Extract all actions as a flat array for easier processing
      const actionsList: FlowAction[] = [];
      const actionMap = parseActions(definitionActions);
      
      const flattenActions = (actionMap: { [key: string]: FlowAction }) => {
        Object.values(actionMap).forEach(action => {
          actionsList.push(action);
          
          // Recursively add nested actions
          if (action.actions) {
            flattenActions(action.actions);
          }
          
          if (action.elseActions) {
            flattenActions(action.elseActions);
          }
        });
      };
      
      flattenActions(actionMap);
      
      return {
        id: workflowData.workflowid,
        name: workflowData.name || 'Unnamed Flow',
        description: workflowData.description || '',
        definition: flowDefinition,
        connectionReferences: connectionReferences,
        actions: actionsList,
        triggers: triggers,
        childFlows: []
      };
    } catch (error) {
      console.error('Error getting flow details:', error);
      
      // Provide detailed error information to the user
      if (error instanceof Error) {
        if (error.message.includes('API not initialized')) {
          throw new Error('PowerTools connection error: Please ensure you have selected a valid connection in the PowerTools panel.');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('Network error')) {
          throw new Error('Network error: Unable to connect to the Power Platform API. Please check your internet connection and try again.');
        } else {
          throw new Error(`Error fetching flow details: ${error.message}`);
        }
      } else {
        throw new Error('An unexpected error occurred while retrieving flow details. Please try again later.');
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
  const analyzeFlow = useCallback(async (flowId: string, cachedFlowDetails?: FlowDetails): Promise<FlowAnalysisResult> => {
    try {
      // Use provided flowDetails if available, otherwise fetch them
      const details = cachedFlowDetails || await getFlowDetailsWithChildren(flowId);
      
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
    if (!flowDetails || !flowDetails.definition) {
      console.warn("Cannot generate diagram: FlowDetails or definition missing.");
      return 'graph TD\n  Error["Flow data incomplete"]';
    }
    
    // Function to recursively generate Mermaid syntax for actions and subgraphs
    // This function is defined *inside* generateFlowDiagram to access flowDetails etc.
    const generateMermaidForScope = ( 
        actionsToProcess: { [key: string]: FlowAction }, 
        parentPrefix: string,
        scopeEntryNodeId?: string // Optional ID of the node entering this scope (trigger or parent action)
     ): { diagram: string, entryNodeIds: string[], exitNodeIds: string[] } => {
      
      let diagram = '';
      let nodeIdsInScope: string[] = [];
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
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        
        // Define node based on class/container type
        let nodeDefinition = '';
        if (safeActionType === 'If' || safeActionType === 'Switch') {
          // Format condition text using formatMultilineText for better readability
          let conditionDisplay = nodeLabelText;
          if (typeof conditionDisplay === 'string') {
            conditionDisplay = formatMultilineText(conditionDisplay, 50);
          }
          
          // eslint-disable-next-line no-useless-escape
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
    testApiConnection
  };
}