import { usePowerToolsApi } from '../powertools/apiHook';
import { 
    IODataResponse, 
    IQueryRequest, 
    IQueryResult
} from '../models';

export const useQueryService = () => {
    const { getAsJson } = usePowerToolsApi();

    const executeODataQuery = async (query: string, pageSize = 50): Promise<IQueryResult> => {
        try {
            // Parse the query to extract entity set name
            const entitySetMatch = query.match(/\/([a-zA-Z_][a-zA-Z0-9_]*)/);
            if (!entitySetMatch) {
                return {
                    success: false,
                    error: 'Could not determine entity set from OData query'
                };
            }

            // Build query parameters
            const url = new URL(query, 'https://dummy.com');
            const params = new URLSearchParams(url.search);
            
            // Add or override $top parameter for pagination
            params.set('$top', pageSize.toString());

            const response = await getAsJson<IODataResponse<any>>(
                url.pathname,
                params
            );

            return {
                success: true,
                data: response.value,
                totalCount: response['@odata.count'],
                hasMore: !!response['@odata.nextLink'],
                nextLink: response['@odata.nextLink']
            };
        } catch (error: any) {
            console.error('Error executing OData query:', error);
            return {
                success: false,
                error: error?.message || 'Failed to execute OData query'
            };
        }
    };

    const executeFetchXMLQuery = async (fetchXml: string): Promise<IQueryResult> => {
        try {
            // Extract entity name from FetchXML
            const entityMatch = fetchXml.match(/<entity[^>]+name=['"]([^'"]+)['"]/i);
            if (!entityMatch) {
                return {
                    success: false,
                    error: 'Could not determine entity name from FetchXML'
                };
            }

            const entityName = entityMatch[1];
            
            // URL encode the FetchXML
            const encodedFetchXml = encodeURIComponent(fetchXml);
            
            const response = await getAsJson<IODataResponse<any>>(
                `/api/data/v9.2/${entityName}s?fetchXml=${encodedFetchXml}`
            );

            return {
                success: true,
                data: response.value,
                totalCount: response['@odata.count'],
                hasMore: !!response['@odata.nextLink'],
                nextLink: response['@odata.nextLink']
            };
        } catch (error: any) {
            console.error('Error executing FetchXML query:', error);
            return {
                success: false,
                error: error?.message || 'Failed to execute FetchXML query'
            };
        }
    };

    const validateODataQuery = (query: string): { isValid: boolean; error?: string } => {
        try {
            // Basic OData validation
            if (!query.trim()) {
                return { isValid: false, error: 'Query cannot be empty' };
            }

            // Check for basic OData structure
            if (!query.startsWith('/api/data/v9.') && !query.startsWith('api/data/v9.')) {
                return { isValid: false, error: 'Query must start with /api/data/v9.x/' };
            }

            // Check for valid entity set
            const entitySetMatch = query.match(/\/([a-zA-Z_][a-zA-Z0-9_]*)/);
            if (!entitySetMatch) {
                return { isValid: false, error: 'Invalid entity set name in query' };
            }

            return { isValid: true };
        } catch (error) {
            return { isValid: false, error: 'Query validation failed' };
        }
    };

    const validateFetchXMLQuery = (fetchXml: string): { isValid: boolean; error?: string } => {
        try {
            if (!fetchXml.trim()) {
                return { isValid: false, error: 'FetchXML cannot be empty' };
            }

            // Basic XML structure validation
            if (!fetchXml.includes('<fetch') || !fetchXml.includes('</fetch>')) {
                return { isValid: false, error: 'Invalid FetchXML structure' };
            }

            // Check for entity element
            if (!fetchXml.includes('<entity')) {
                return { isValid: false, error: 'FetchXML must contain an entity element' };
            }

            return { isValid: true };
        } catch (error) {
            return { isValid: false, error: 'FetchXML validation failed' };
        }
    };

    const validateSQLQuery = (sql: string): { isValid: boolean; error?: string } => {
        try {
            if (!sql.trim()) {
                return { isValid: false, error: 'SQL query cannot be empty' };
            }

            // Basic SQL validation - should start with SELECT
            const trimmedSql = sql.trim().toLowerCase();
            if (!trimmedSql.startsWith('select')) {
                return { isValid: false, error: 'SQL query must start with SELECT' };
            }

            // Note: SQL queries against Dataverse would need to be converted to OData
            // For now, we'll return an error indicating this limitation
            return { 
                isValid: false, 
                error: 'Direct SQL execution is not supported. Please use OData or FetchXML queries.' 
            };
        } catch (error) {
            return { isValid: false, error: 'SQL validation failed' };
        }
    };

    const executeQuery = async (request: IQueryRequest): Promise<IQueryResult> => {
        const { queryType, query, pageSize = 50 } = request;

        switch (queryType) {
            case 'odata':
                const odataValidation = validateODataQuery(query);
                if (!odataValidation.isValid) {
                    return { success: false, error: odataValidation.error };
                }
                return executeODataQuery(query, pageSize);

            case 'fetchxml':
                const fetchXmlValidation = validateFetchXMLQuery(query);
                if (!fetchXmlValidation.isValid) {
                    return { success: false, error: fetchXmlValidation.error };
                }
                return executeFetchXMLQuery(query);

            case 'sql':
                const sqlValidation = validateSQLQuery(query);
                if (!sqlValidation.isValid) {
                    return { success: false, error: sqlValidation.error };
                }
                // SQL execution would go here if supported
                return { success: false, error: 'SQL execution not yet implemented' };

            default:
                return { success: false, error: 'Unsupported query type' };
        }
    };

    const buildODataQuery = (entitySetName: string, options: {
        select?: string[];
        filter?: string;
        orderBy?: string;
        top?: number;
        skip?: number;
        expand?: string;
    }): string => {
        const params = new URLSearchParams();
        
        if (options.select && options.select.length > 0) {
            params.set('$select', options.select.join(','));
        }
        
        if (options.filter) {
            params.set('$filter', options.filter);
        }
        
        if (options.orderBy) {
            params.set('$orderby', options.orderBy);
        }
        
        if (options.top) {
            params.set('$top', options.top.toString());
        }
        
        if (options.skip) {
            params.set('$skip', options.skip.toString());
        }
        
        if (options.expand) {
            params.set('$expand', options.expand);
        }
        
        const queryString = params.toString();
        return `/api/data/v9.2/${entitySetName}${queryString ? '?' + queryString : ''}`;
    };

    return {
        executeQuery,
        executeODataQuery,
        executeFetchXMLQuery,
        validateODataQuery,
        validateFetchXMLQuery,
        validateSQLQuery,
        buildODataQuery
    };
}; 