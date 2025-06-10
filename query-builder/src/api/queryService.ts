import { useCallback } from 'react';
import { usePowerToolsApi } from '../powertools/apiHook';
import { IQueryRequest, IQueryResult } from '../models';
import { QueryConverter } from '../utils/queryConverter';
import { useMetadataService } from './metadataService';

export const useQueryService = () => {
    const { get, post } = usePowerToolsApi();
    const { getEntitySetName } = useMetadataService();

    const executeQuery = useCallback(async (request: IQueryRequest): Promise<IQueryResult> => {
        try {
            const { queryType, query } = request;

            if (queryType === 'sql') {
                // Normalize the query string by removing extra whitespace but preserving structure
                const normalizedQuery = query.trim();

                console.log('Making API POST request:', '__sql__/query');
                const proxyResponse = await post('__sql__/query', normalizedQuery, {
                    'Content-Type': 'text/plain'
                });

                // Log the actual response structure for debugging
                console.log('SQL Proxy Response:', proxyResponse);

                if (proxyResponse.statusCode >= 400) {
                    try {
                        const errorData = await proxyResponse.asJson();
                        console.error('Proxy error response:', errorData);
                        
                        let errorMessage = 'An error occurred while executing the query.';
                        let errorDetails = null;

                        if (errorData.error) {
                            errorMessage = errorData.error;
                        }

                        if (errorData.errorDetails) {
                            const details = errorData.errorDetails;
                            errorDetails = {
                                type: details.type,
                                message: details.message,
                                requestId: details.requestId,
                                time: details.time
                            };
                        }

                        return {
                            success: false,
                            error: errorMessage,
                            errorDetails
                        };
                    } catch (parseError) {
                        return {
                            success: false,
                            error: `Request failed with status ${proxyResponse.statusCode}: ${proxyResponse.content || 'Unknown error'}`,
                            errorDetails: proxyResponse.content
                        };
                    }
                }

                const result = await proxyResponse.asJson();
                
                // The TDS Helper returns a direct JSON array, not an OData object.
                return {
                    success: true,
                    data: result,
                    totalCount: Array.isArray(result) ? result.length : 0,
                    hasMore: false, // TDS helper doesn't support pagination currently
                };
            } else if (queryType === 'fetchxml') {
                try {
                    // Extract entity name from FetchXML
                    const entityNameMatch = /<entity\s+name=(?:"|')([^"']+)(?:"|')/.exec(query);
                    if (!entityNameMatch) {
                        return { success: false, error: 'Could not extract entity name from FetchXML.' };
                    }
                    const entityLogicalName = entityNameMatch[1];
                    const entitySetName = await getEntitySetName(entityLogicalName);

                    // Execute FetchXML directly using GET request to the entity set endpoint
                    const params = new URLSearchParams();
                    params.set('fetchXml', query); // URLSearchParams handles encoding

                    const proxyResponse = await get(
                        `/api/data/v9.2/${entitySetName}`,
                        params,
                        {
                            'Prefer': 'odata.include-annotations="*"',
                        }
                    );
                    
                    if (proxyResponse.statusCode >= 400) {
                        const errorResponse = JSON.parse(proxyResponse.content || '{}');
                        return { success: false, error: errorResponse.error?.message || `Request failed with status ${proxyResponse.statusCode}` };
                    }
    
                    const odataResponse = JSON.parse(proxyResponse.content || '{}');
                    
                    return {
                        success: true,
                        data: odataResponse.value,
                        totalCount: odataResponse['@odata.count'],
                        hasMore: !!odataResponse['@odata.nextLink'],
                    };
                } catch (error: any) {
                    console.error('Error executing FetchXML query:', error);
                    return { success: false, error: error?.message || 'Failed to execute FetchXML query' };
                }
            } else {
                const conversionResult = QueryConverter.convert(query, queryType, 'odata');
                if (!conversionResult.success) {
                    return { success: false, error: `Failed to convert query: ${conversionResult.error}` };
                }

                const odataQuery = conversionResult.query;
                const path = odataQuery.startsWith('/') ? odataQuery : `/${odataQuery}`;
                const url = path.startsWith('/api/data') ? path : `/api/data/v9.2${path}`;

                const proxyResponse = await get(url);

                if (proxyResponse.statusCode >= 400) {
                    const errorResponse = JSON.parse(proxyResponse.content || '{}');
                    return { success: false, error: errorResponse.error?.message || `Request failed with status ${proxyResponse.statusCode}` };
                }

                const odataResponse = JSON.parse(proxyResponse.content || '{}');
                
                return {
                    success: true,
                    data: odataResponse.value,
                    totalCount: odataResponse['@odata.count'],
                    hasMore: !!odataResponse['@odata.nextLink'],
                    warnings: conversionResult.warnings,
                };
            }
        } catch (error: any) {
            console.error('Error executing query:', error);
            return {
                success: false,
                error: error?.message || 'Failed to execute query'
            };
        }
    }, [get, post, getEntitySetName]);

    return { executeQuery };
}; 