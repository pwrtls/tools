import { useCallback } from 'react';
import { usePowerToolsApi } from '../powertools/apiHook';
import { IQueryRequest, IQueryResult } from '../models';
import { QueryConverter } from '../utils/queryConverter';

export const useQueryService = () => {
    const { get, post } = usePowerToolsApi();

    const executeQuery = useCallback(async (request: IQueryRequest): Promise<IQueryResult> => {
        try {
            const { queryType, query } = request;

            if (queryType === 'sql') {
                const proxyResponse = await post(`__sql__/query`, query, {
                    'Content-Type': 'text/plain',
                });

                // Log the actual response structure for debugging
                console.log('SQL Proxy Response:', proxyResponse);

                if (proxyResponse.statusCode >= 400) {
                    try {
                        const errorResponse = JSON.parse(proxyResponse.content || '{}');
                        return { success: false, error: errorResponse.error || `Request failed with status ${proxyResponse.statusCode}` };
                    } catch (parseError) {
                        return { success: false, error: `Request failed with status ${proxyResponse.statusCode}: ${proxyResponse.content || 'Unknown error'}` };
                    }
                }

                const responseData = JSON.parse(proxyResponse.content || '[]');
                
                return {
                    success: true,
                    data: responseData,
                    totalCount: responseData.length,
                    hasMore: false,
                };

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
    }, [get, post]);

    return { executeQuery };
}; 