import { QueryType } from '../models';

export interface QueryConversionResult {
    success: boolean;
    query: string;
    error?: string;
    warnings?: string[];
}

export class QueryConverter {
    
    static convert(
        sourceQuery: string,
        fromType: QueryType,
        toType: QueryType
    ): QueryConversionResult {
        if (fromType === toType) {
            return { success: true, query: sourceQuery };
        }

        if (!sourceQuery.trim()) {
            return { success: true, query: '' };
        }

        try {
            switch (`${fromType}->${toType}`) {
                case 'odata->fetchxml':
                    return this.odataToFetchXml(sourceQuery);
                case 'odata->sql':
                    return this.odataToSql(sourceQuery);
                case 'fetchxml->odata':
                    return this.fetchXmlToOdata(sourceQuery);
                case 'fetchxml->sql':
                    return this.fetchXmlToSql(sourceQuery);
                case 'sql->odata':
                    return this.sqlToOdata(sourceQuery);
                case 'sql->fetchxml':
                    return this.sqlToFetchXml(sourceQuery);
                default:
                    return {
                        success: false,
                        query: sourceQuery,
                        error: `Conversion from ${fromType} to ${toType} not supported`
                    };
            }
        } catch (error) {
            return {
                success: false,
                query: sourceQuery,
                error: `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    private static odataToFetchXml(odataQuery: string): QueryConversionResult {
        try {
            // Parse OData URL
            const url = new URL(odataQuery, 'https://dummy.com');
            const pathParts = url.pathname.split('/');
            const entitySet = pathParts[pathParts.length - 1];
            
            // Convert plural entity set to singular entity name
            const entityName = this.pluralToSingular(entitySet);
            
            const params = new URLSearchParams(url.search);
            
            let fetchXml = '<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">\n';
            fetchXml += `  <entity name="${entityName}">\n`;
            
            // Handle $select
            const select = params.get('$select');
            if (select) {
                const attributes = select.split(',').map(attr => attr.trim());
                attributes.forEach(attr => {
                    fetchXml += `    <attribute name="${attr}" />\n`;
                });
            } else {
                fetchXml += `    <all-attributes />\n`;
            }
            
            // Handle $filter
            const filter = params.get('$filter');
            if (filter) {
                fetchXml += `    <filter type="and">\n`;
                const conditions = this.parseODataFilter(filter);
                conditions.forEach(condition => {
                    fetchXml += `      <condition attribute="${condition.attribute}" operator="${condition.operator}" value="${condition.value}" />\n`;
                });
                fetchXml += `    </filter>\n`;
            }
            
            // Handle $orderby
            const orderby = params.get('$orderby');
            if (orderby) {
                const orderParts = orderby.split(',').map(part => part.trim());
                orderParts.forEach(part => {
                    const [attribute, direction] = part.split(' ');
                    const descending = direction && direction.toLowerCase() === 'desc';
                    fetchXml += `    <order attribute="${attribute.trim()}" descending="${descending}" />\n`;
                });
            }
            
            fetchXml += '  </entity>\n';
            fetchXml += '</fetch>';
            
            return {
                success: true,
                query: fetchXml,
                warnings: ['Automatic conversion from OData to FetchXML - please verify the result']
            };
        } catch (error) {
            return {
                success: false,
                query: odataQuery,
                error: `Failed to convert OData to FetchXML: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    private static odataToSql(odataQuery: string): QueryConversionResult {
        try {
            const url = new URL(odataQuery, 'https://dummy.com');
            const pathParts = url.pathname.split('/');
            const entitySet = pathParts[pathParts.length - 1];
            const entityName = this.pluralToSingular(entitySet);
            
            const params = new URLSearchParams(url.search);
            
            let sql = 'SELECT ';
            
            // Handle $select
            const select = params.get('$select');
            if (select) {
                sql += select.split(',').map(attr => attr.trim()).join(', ');
            } else {
                sql += '*';
            }
            
            sql += ` FROM ${entityName}`;
            
            // Handle $filter
            const filter = params.get('$filter');
            if (filter) {
                const sqlWhere = this.odataFilterToSqlWhere(filter);
                sql += ` WHERE ${sqlWhere}`;
            }
            
            // Handle $orderby
            const orderby = params.get('$orderby');
            if (orderby) {
                const sqlOrderBy = orderby.split(',').map(part => {
                    const [attr, dir] = part.trim().split(' ');
                    return dir && dir.toLowerCase() === 'desc' ? `${attr} DESC` : attr;
                }).join(', ');
                sql += ` ORDER BY ${sqlOrderBy}`;
            }
            
            // Handle $top
            const top = params.get('$top');
            if (top) {
                sql += ` LIMIT ${top}`;
            }
            
            return {
                success: true,
                query: sql,
                warnings: ['SQL queries are converted to OData for execution against Dataverse']
            };
        } catch (error) {
            return {
                success: false,
                query: odataQuery,
                error: `Failed to convert OData to SQL: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    private static fetchXmlToOdata(fetchXmlQuery: string): QueryConversionResult {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(fetchXmlQuery, 'text/xml');
            
            if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                throw new Error('Invalid XML format');
            }
            
            const entityElement = xmlDoc.querySelector('entity');
            if (!entityElement) {
                throw new Error('No entity element found in FetchXML');
            }
            
            const entityName = entityElement.getAttribute('name');
            if (!entityName) {
                throw new Error('Entity name not specified');
            }
            
            const entitySet = this.singularToPlural(entityName);
            let odataUrl = `/api/data/v9.2/${entitySet}`;
            const params = new URLSearchParams();
            
            // Handle attributes (SELECT)
            const attributes = xmlDoc.querySelectorAll('attribute');
            const allAttributes = xmlDoc.querySelector('all-attributes');
            
            if (attributes.length > 0 && !allAttributes) {
                const selectFields = Array.from(attributes).map(attr => attr.getAttribute('name')).filter(Boolean);
                if (selectFields.length > 0) {
                    params.set('$select', selectFields.join(','));
                }
            }
            
            // Handle filter conditions
            const conditions = xmlDoc.querySelectorAll('condition');
            if (conditions.length > 0) {
                const filterParts: string[] = [];
                conditions.forEach(condition => {
                    const attribute = condition.getAttribute('attribute');
                    const operator = condition.getAttribute('operator');
                    const value = condition.getAttribute('value');
                    
                    if (attribute && operator && value !== null) {
                        const odataOperator = this.fetchXmlOperatorToOData(operator);
                        filterParts.push(`${attribute} ${odataOperator} '${value}'`);
                    }
                });
                
                if (filterParts.length > 0) {
                    params.set('$filter', filterParts.join(' and '));
                }
            }
            
            // Handle order
            const orderElements = xmlDoc.querySelectorAll('order');
            if (orderElements.length > 0) {
                const orderParts: string[] = [];
                orderElements.forEach(order => {
                    const attribute = order.getAttribute('attribute');
                    const descending = order.getAttribute('descending') === 'true';
                    
                    if (attribute) {
                        orderParts.push(descending ? `${attribute} desc` : attribute);
                    }
                });
                
                if (orderParts.length > 0) {
                    params.set('$orderby', orderParts.join(','));
                }
            }
            
            const queryString = params.toString();
            if (queryString) {
                odataUrl += '?' + queryString;
            }
            
            return {
                success: true,
                query: odataUrl,
                warnings: ['Automatic conversion from FetchXML to OData - please verify the result']
            };
        } catch (error) {
            return {
                success: false,
                query: fetchXmlQuery,
                error: `Failed to convert FetchXML to OData: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    private static fetchXmlToSql(fetchXmlQuery: string): QueryConversionResult {
        // First convert to OData, then to SQL
        const odataResult = this.fetchXmlToOdata(fetchXmlQuery);
        if (!odataResult.success) {
            return odataResult;
        }
        
        const sqlResult = this.odataToSql(odataResult.query);
        return {
            ...sqlResult,
            warnings: ['Converted via OData intermediate format - please verify the result']
        };
    }

    private static sqlToOdata(sqlQuery: string): QueryConversionResult {
        try {
            // Enhanced SQL parsing with JOIN support
            const sql = sqlQuery.trim();
            const sqlClean = sql.replace(/\s+/g, ' ').toLowerCase();
            
            // Extract different parts of the SQL query (using basic regex without ES2018 flags)
            const selectMatch = sqlClean.match(/select\s+(.*?)\s+from/);
            const fromMatch = sqlClean.match(/from\s+(\w+)(?:\s+(\w+))?/);
            // Find all JOIN clauses manually
            const joinMatches: Array<{ table: string, alias?: string, condition: string }> = [];
            const joinRegex = /(?:inner\s+|left\s+|right\s+)?join\s+(\w+)(?:\s+(\w+))?\s+on\s+(.*?)(?=\s+(?:join|where|order|limit|$))/gi;
            let match;
            while ((match = joinRegex.exec(sqlClean)) !== null) {
                joinMatches.push({
                    table: match[1],
                    alias: match[2],
                    condition: match[3]
                });
            }
            const whereMatch = sqlClean.match(/where\s+(.*?)(?:\s+order\s+by|\s+limit|$)/);
            const orderMatch = sqlClean.match(/order\s+by\s+(.*?)(?:\s+limit|$)/);
            const limitMatch = sqlClean.match(/limit\s+(\d+)/);
            
            if (!fromMatch) {
                throw new Error('No FROM clause found');
            }
            
            const primaryTable = fromMatch[1];
            const primaryAlias = fromMatch[2] || primaryTable;
            const primaryEntitySet = this.singularToPlural(primaryTable);
            
            let odataUrl = `/api/data/v9.2/${primaryEntitySet}`;
            const params = new URLSearchParams();
            const warnings: string[] = [];
            
            // Parse SELECT fields and organize by table/alias
            const selectFields: { [key: string]: string[] } = {};
            let hasJoins = joinMatches.length > 0;
            
            if (selectMatch && selectMatch[1].trim() !== '*') {
                const fields = selectMatch[1].split(',').map(f => f.trim());
                
                fields.forEach(field => {
                    // Handle aliased fields like "table.field" or "alias.field"
                    const fieldMatch = field.match(/(?:(\w+)\.)?(\w+)/);
                    if (fieldMatch) {
                        const tableAlias = fieldMatch[1] || primaryAlias;
                        const fieldName = fieldMatch[2];
                        
                        if (!selectFields[tableAlias]) {
                            selectFields[tableAlias] = [];
                        }
                        selectFields[tableAlias].push(fieldName);
                    }
                });
            }
            
            // Handle JOINs by converting to $expand
            const expandParts: string[] = [];
            const joinInfo: { [alias: string]: { table: string, relationship: string } } = {};
            
            if (hasJoins) {
                joinMatches.forEach(joinMatch => {
                    const joinTable = joinMatch.table;
                    const joinAlias = joinMatch.alias || joinTable;
                    const joinCondition = joinMatch.condition;
                    
                    // Parse join condition to find the relationship
                    // Example: "a.solutionid = b.solutionid" or "table1.field = table2.field"
                    const conditionMatch = joinCondition.match(/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/);
                    
                    if (conditionMatch) {
                        let relationshipField = '';
                        let isPrimaryToSecondary = false;
                        
                        // Determine which side is the primary table
                        if (conditionMatch[1] === primaryAlias || conditionMatch[1] === primaryTable) {
                            relationshipField = conditionMatch[2];
                            isPrimaryToSecondary = true;
                        } else if (conditionMatch[3] === primaryAlias || conditionMatch[3] === primaryTable) {
                            relationshipField = conditionMatch[4];
                            isPrimaryToSecondary = false;
                        }
                        
                        // Build the expand clause
                        const joinEntitySet = this.singularToPlural(joinTable);
                        let expandClause = '';
                        
                        if (isPrimaryToSecondary) {
                            // Primary table has foreign key to joined table
                            // Convert field name to navigation property name
                            const navProperty = this.convertToNavigationProperty(relationshipField, joinTable);
                            expandClause = navProperty;
                        } else {
                            // Joined table has foreign key to primary table (reverse lookup)
                            // This is more complex and might need different handling
                            expandClause = joinEntitySet;
                            warnings.push(`Reverse lookup join detected for ${joinTable} - may need manual adjustment`);
                        }
                        
                        // Add selected fields for this join
                        if (selectFields[joinAlias] && selectFields[joinAlias].length > 0) {
                            expandClause += `($select=${selectFields[joinAlias].join(',')})`;
                        }
                        
                        expandParts.push(expandClause);
                        joinInfo[joinAlias] = { table: joinTable, relationship: expandClause };
                    } else {
                        warnings.push(`Could not parse join condition: ${joinCondition}`);
                    }
                });
            }
            
            // Set primary table select fields
            if (selectFields[primaryAlias] && selectFields[primaryAlias].length > 0) {
                params.set('$select', selectFields[primaryAlias].join(','));
            }
            
            // Set expand parameter
            if (expandParts.length > 0) {
                params.set('$expand', expandParts.join(','));
            }
            
            // Handle WHERE clause
            if (whereMatch) {
                const whereClause = this.sqlWhereToODataFilter(whereMatch[1]);
                params.set('$filter', whereClause);
            }
            
            // Handle ORDER BY
            if (orderMatch) {
                const orderBy = orderMatch[1].split(',').map(part => {
                    const trimmed = part.trim();
                    // Handle table-prefixed order fields
                    const orderField = trimmed.replace(/^\w+\./, ''); // Remove table prefix
                    return orderField.replace(/\s+desc$/i, ' desc').replace(/\s+asc$/i, '');
                }).join(',');
                params.set('$orderby', orderBy);
            }
            
            // Handle LIMIT
            if (limitMatch) {
                params.set('$top', limitMatch[1]);
            }
            
            const queryString = params.toString();
            if (queryString) {
                odataUrl += '?' + queryString;
            }
            
            if (hasJoins) {
                warnings.push('SQL JOINs converted to OData $expand - verify navigation properties are correct');
            }
            if (warnings.length === 0) {
                warnings.push('Basic SQL parsing - complex queries may not convert correctly');
            }
            
            return {
                success: true,
                query: odataUrl,
                warnings
            };
        } catch (error) {
            return {
                success: false,
                query: sqlQuery,
                error: `Failed to convert SQL to OData: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    private static sqlToFetchXml(sqlQuery: string): QueryConversionResult {
        // First convert to OData, then to FetchXML
        const odataResult = this.sqlToOdata(sqlQuery);
        if (!odataResult.success) {
            return odataResult;
        }
        
        const fetchXmlResult = this.odataToFetchXml(odataResult.query);
        return {
            ...fetchXmlResult,
            warnings: ['Converted via OData intermediate format - please verify the result']
        };
    }

    // Helper methods
    private static pluralToSingular(plural: string): string {
        const exceptions: { [key: string]: string } = {
            'accounts': 'account',
            'contacts': 'contact',
            'leads': 'lead',
            'opportunities': 'opportunity',
            'systemusers': 'systemuser',
            'teams': 'team',
            'businessunits': 'businessunit'
        };
        
        if (exceptions[plural.toLowerCase()]) {
            return exceptions[plural.toLowerCase()];
        }
        
        if (plural.endsWith('ies')) {
            return plural.slice(0, -3) + 'y';
        }
        if (plural.endsWith('es')) {
            return plural.slice(0, -2);
        }
        if (plural.endsWith('s')) {
            return plural.slice(0, -1);
        }
        
        return plural;
    }

    private static singularToPlural(singular: string): string {
        const exceptions: { [key: string]: string } = {
            'account': 'accounts',
            'contact': 'contacts',
            'lead': 'leads',
            'opportunity': 'opportunities',
            'systemuser': 'systemusers',
            'team': 'teams',
            'businessunit': 'businessunits'
        };
        
        if (exceptions[singular.toLowerCase()]) {
            return exceptions[singular.toLowerCase()];
        }
        
        if (singular.endsWith('y')) {
            return singular.slice(0, -1) + 'ies';
        }
        if (singular.endsWith('s') || singular.endsWith('x') || singular.endsWith('z') || 
            singular.endsWith('ch') || singular.endsWith('sh')) {
            return singular + 'es';
        }
        
        return singular + 's';
    }

    private static convertToNavigationProperty(fieldName: string, targetTable: string): string {
        // Common navigation property patterns in Dynamics 365
        // This is a basic implementation - in real scenarios, you'd need metadata to get the exact navigation property names
        
        // Remove common suffixes to get base name
        let navProperty = fieldName;
        if (navProperty.endsWith('id')) {
            navProperty = navProperty.slice(0, -2);
        }
        
        // Add common navigation property suffixes based on target table
        const targetSingular = this.pluralToSingular(targetTable);
        
        // Common patterns:
        // solutionid -> solution (for lookup to solution table)
        // parentaccountid -> parentaccount_account
        // ownerid -> owninguser or owningteam
        
        if (navProperty === 'solution' || navProperty === 'solutionid') {
            return 'solution';
        }
        
        // For most cases, try the base navigation property name
        // This might need adjustment based on actual Dataverse schema
        return navProperty;
    }

    private static parseODataFilter(filter: string): Array<{attribute: string, operator: string, value: string}> {
        // Simplified filter parsing
        const conditions: Array<{attribute: string, operator: string, value: string}> = [];
        
        // Handle simple conditions like "statecode eq 0"
        const parts = filter.split(' and ');
        parts.forEach(part => {
            const match = part.trim().match(/(\w+)\s+(eq|ne|gt|ge|lt|le)\s+(.+)/);
            if (match) {
                conditions.push({
                    attribute: match[1],
                    operator: this.odataOperatorToFetchXml(match[2]),
                    value: match[3].replace(/'/g, '')
                });
            }
        });
        
        return conditions;
    }

    private static odataOperatorToFetchXml(operator: string): string {
        const mapping: { [key: string]: string } = {
            'eq': 'eq',
            'ne': 'ne',
            'gt': 'gt',
            'ge': 'ge',
            'lt': 'lt',
            'le': 'le'
        };
        return mapping[operator] || 'eq';
    }

    private static fetchXmlOperatorToOData(operator: string): string {
        const mapping: { [key: string]: string } = {
            'eq': 'eq',
            'ne': 'ne',
            'gt': 'gt',
            'ge': 'ge',
            'lt': 'lt',
            'le': 'le'
        };
        return mapping[operator] || 'eq';
    }

    private static odataFilterToSqlWhere(filter: string): string {
        return filter
            .replace(/\s+eq\s+/gi, ' = ')
            .replace(/\s+ne\s+/gi, ' != ')
            .replace(/\s+gt\s+/gi, ' > ')
            .replace(/\s+ge\s+/gi, ' >= ')
            .replace(/\s+lt\s+/gi, ' < ')
            .replace(/\s+le\s+/gi, ' <= ')
            .replace(/\s+and\s+/gi, ' AND ')
            .replace(/\s+or\s+/gi, ' OR ');
    }

    private static sqlWhereToODataFilter(whereClause: string): string {
        return whereClause
            .replace(/\s*=\s*/gi, ' eq ')
            .replace(/\s*!=\s*/gi, ' ne ')
            .replace(/\s*>\s*/gi, ' gt ')
            .replace(/\s*>=\s*/gi, ' ge ')
            .replace(/\s*<\s*/gi, ' lt ')
            .replace(/\s*<=\s*/gi, ' le ')
            .replace(/\s+and\s+/gi, ' and ')
            .replace(/\s+or\s+/gi, ' or ');
    }
} 