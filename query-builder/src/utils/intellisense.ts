import { QueryType, IAttributeMetadata, IEntityMetadata } from '../models';

export const parseEntityName = (query: string, type: QueryType): string | null => {
    if (!query) return null;

    switch (type) {
        case 'sql': {
            // Look for FROM clause with entity name
            const match = /\bfrom\s+([a-zA-Z0-9_]+)/i.exec(query);
            if (match) {
                const entityName = match[1];
                // Only return entity name if it looks complete (more than 2 characters)
                if (entityName.length >= 3) {
                    return entityName;
                }
            }
            return null;
        }
        case 'odata': {
            // Normalize path by removing leading slash and query string
            const path = query.split('?')[0].replace(/^\//, '');
            const segments = path.split('/').filter(p => p);

            // Find the version segment, e.g., "v9.2"
            const versionIndex = segments.findIndex(s => /^v9\.\d+$/.test(s.toLowerCase()));

            // If no version is found, assume the last segment is the entity
            if (versionIndex === -1) {
                return segments.length > 0 ? segments[segments.length - 1] : null;
            }

            // If the last segment is the version, no entity is specified yet
            if (versionIndex === segments.length - 1) {
                return null;
            }

            // Otherwise, the entity is the segment after the version
            return segments[versionIndex + 1];
        }
        case 'fetchxml': {
            const match = /<entity[^>]*\sname=(?:"|')([^"']+)(?:"|')/i.exec(query);
            if (match) {
                const entityName = match[1];
                // Only return entity name if it looks complete (more than 2 characters and commonly valid)
                // This prevents fetching attributes for partial names like 'a', 'ac', etc.
                if (entityName.length >= 3) {
                    return entityName;
                }
            }
            return null;
        }
        default:
            return null;
    }
};

const ODATA_KEYWORDS = [
    '$select=',
    '$filter=',
    '$expand=',
    '$orderby=',
    '$top=',
    '$count=',
];

export interface CompletionMetadata {
    attributes: IAttributeMetadata[];
    entities: IEntityMetadata[];
}

export function registerCompletionProviders(
    monaco: any,
    metadataProvider: (entityName: string | null) => Promise<{ attributes: IAttributeMetadata[], entities: IEntityMetadata[] }>
): void {
    console.log('🚀 Starting completion provider registration...');
    
    // Check existing providers
    const existingProviders = monaco.languages.getLanguages();
    console.log('📋 Existing Monaco languages:', existingProviders.map((l: any) => l.id));
    
    const createProvider = (languageId: string, queryType: QueryType) => ({
        triggerCharacters: ['/', '?', '=', '$', '<', '"', "'", ' ', ','],
        
        provideCompletionItems: async (model: any, position: any) => {
            console.log(`🔍 COMPLETION PROVIDER CALLED: ${languageId} (queryType: ${queryType}) at position:`, position);
            
            const textUntilPosition = model.getValueInRange({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });
            const fullQueryText = model.getValue();

            console.log(`📝 Text until position for ${languageId}:`, textUntilPosition);
            
            const entityName = parseEntityName(fullQueryText, queryType);
            console.log(`🏷️ Parsed entity name for ${languageId}:`, entityName);
            
            try {
                const metadata = await metadataProvider(entityName);
                console.log(`📊 Got metadata for ${languageId}:`, { attributeCount: metadata.attributes.length, entityCount: metadata.entities.length });
                
                if (queryType === 'odata') {
                    const result = await provideODataCompletions(textUntilPosition, metadata, position);
                    console.log(`✅ OData completions returned:`, result.suggestions.length);
                    return result;
                } else if (queryType === 'fetchxml') {
                    console.log(`🔥 CALLING FETCHXML COMPLETIONS`);
                    const result = await provideFetchXmlCompletions(textUntilPosition, metadata, position);
                    console.log(`✅ FetchXML completions returned:`, result.suggestions.length);
                    return result;
                } else if (queryType === 'sql') {
                    console.log(`🔥 CALLING SQL COMPLETIONS`);
                    const result = await provideSqlCompletions(fullQueryText, textUntilPosition, metadata, position);
                    console.log(`✅ SQL completions returned:`, result.suggestions.length);
                    return result;
                }
                
                console.log(`❌ No matching queryType for ${languageId}, returning empty suggestions`);
                return { suggestions: [] };
            } catch (error) {
                console.error(`💥 Error in completion provider for ${languageId}:`, error);
                return { suggestions: [] };
            }
        }
    });

    // Register completion providers for each language
    console.log('📝 Registering SQL completion provider...');
    const sqlProvider = monaco.languages.registerCompletionItemProvider('sql', createProvider('sql', 'sql'));
    console.log('✅ SQL provider registered:', sqlProvider);
    
    console.log('📝 Registering OData completion provider...');
    const odataProvider = monaco.languages.registerCompletionItemProvider('odata', createProvider('odata', 'odata'));
    console.log('✅ OData provider registered:', odataProvider);
    
    console.log('📝 Registering FetchXML completion provider for XML language...');
    const xmlProvider = monaco.languages.registerCompletionItemProvider('xml', createProvider('xml', 'fetchxml'));
    console.log('✅ XML/FetchXML provider registered:', xmlProvider);
    
    console.log('🎉 All completion providers registered successfully');
}

async function provideODataCompletions(
    textUntilPosition: string, 
    metadata: { attributes: IAttributeMetadata[], entities: IEntityMetadata[] },
    position: any
): Promise<{ suggestions: any[] }> {
    const suggestions: any[] = [];
    
    // Context: Suggest OData Keywords after ?
    if (textUntilPosition.endsWith('?')) {
        console.log('Suggesting OData keywords');
        ODATA_KEYWORDS.forEach(keyword => {
            suggestions.push({
                label: keyword,
                kind: 15, // CompletionItemKind.Keyword
                insertText: keyword,
            });
        });
    }
    // Context: Suggest attributes after OData parameters
    else if (/\$(select|filter|orderby|expand)=[^&]*$/.test(textUntilPosition)) {
        console.log('Suggesting attributes for OData parameter');
        metadata.attributes.forEach(attr => {
            suggestions.push({
                label: attr.LogicalName,
                kind: 5, // CompletionItemKind.Field
                insertText: attr.LogicalName,
                detail: attr.AttributeType
            });
        });
    }
    // Context: Suggest entities after version path
    else if (/\/v\d\.\d\/$/.test(textUntilPosition) || textUntilPosition.endsWith('data/')) {
        console.log('Suggesting entities for OData path');
        metadata.entities.forEach(entity => {
            suggestions.push({
                label: entity.EntitySetName,
                kind: 19, // CompletionItemKind.Folder
                insertText: entity.EntitySetName,
                detail: entity.LogicalName
            });
        });
    }
    
    console.log(`Returning ${suggestions.length} OData suggestions`);
    return { suggestions };
}

async function provideFetchXmlCompletions(
    textUntilPosition: string,
    metadata: { attributes: IAttributeMetadata[], entities: IEntityMetadata[] },
    position: any
): Promise<{ suggestions: any[] }> {
    const suggestions: any[] = [];
    
    // Get the current line to analyze context
    const lines = textUntilPosition.split('\n');
    const currentLine = lines[lines.length - 1];
    
    console.log('🔍 Analyzing FetchXML line:', JSON.stringify(currentLine));
    console.log('🔍 Full text until position:', JSON.stringify(textUntilPosition));
    
    // More robust approach: check if we're inside quotes after specific attribute patterns
    const entityNamePattern = /<entity[^>]*\s+name\s*=\s*["']([^"']*)$/;
    const attributeNamePattern = /(<attribute[^>]*\s+name\s*=\s*["']([^"']*))$/;
    const orderAttributePattern = /(<order[^>]*\s+attribute\s*=\s*["']([^"']*))$/;
    const conditionAttributePattern = /(<condition[^>]*\s+attribute\s*=\s*["']([^"']*))$/;
    
    console.log('🔍 Pattern matching debug:', {
        entityNameMatch: entityNamePattern.test(currentLine),
        attributeNameMatch: attributeNamePattern.test(currentLine),
        orderAttributeMatch: orderAttributePattern.test(currentLine),
        conditionAttributeMatch: conditionAttributePattern.test(currentLine)
    });
    
    // Check if we're inside an entity name attribute
    if (entityNamePattern.test(currentLine)) {
        console.log('🏢 ✅ MATCHED: Suggesting entity names for <entity name="..."');
        metadata.entities.forEach(entity => {
            suggestions.push({
                label: entity.LogicalName,
                kind: 7, // CompletionItemKind.Class
                insertText: entity.LogicalName,
                detail: entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName
            });
        });
    }
    // Check if we're inside attribute name contexts
    else if (attributeNamePattern.test(currentLine)) {
        console.log('🏷️ Suggesting attribute names for <attribute name="..."');
        if (metadata.attributes && metadata.attributes.length > 0) {
            metadata.attributes.forEach(attr => {
                suggestions.push({
                    label: attr.LogicalName,
                    kind: 5, // CompletionItemKind.Field
                    insertText: attr.LogicalName,
                    detail: attr.AttributeType
                });
            });
        } else {
            console.log('⚠️ No attributes available - entity may not be fully specified or found');
        }
    }
    // Check if we're inside an order attribute context
    else if (orderAttributePattern.test(currentLine)) {
        console.log('📊 Suggesting attributes for <order attribute="..."');
        if (metadata.attributes && metadata.attributes.length > 0) {
            metadata.attributes.forEach(attr => {
                suggestions.push({
                    label: attr.LogicalName,
                    kind: 5, // CompletionItemKind.Field
                    insertText: attr.LogicalName,
                    detail: attr.AttributeType
                });
            });
        }
    }
    // Check if we're inside a condition attribute context
    else if (conditionAttributePattern.test(currentLine)) {
        console.log('🔍 Suggesting attributes for <condition attribute="..."');
        if (metadata.attributes && metadata.attributes.length > 0) {
            metadata.attributes.forEach(attr => {
                suggestions.push({
                    label: attr.LogicalName,
                    kind: 5, // CompletionItemKind.Field
                    insertText: attr.LogicalName,
                    detail: attr.AttributeType
                });
            });
        }
    }
    // If no specific context is detected but we have entities, suggest them
    else if (suggestions.length === 0 && metadata.entities && metadata.entities.length > 0) {
        console.log('🌐 Fallback: suggesting all entities');
        metadata.entities.slice(0, 50).forEach(entity => { // Limit to first 50 for performance
            suggestions.push({
                label: entity.LogicalName,
                kind: 7, // CompletionItemKind.Class
                insertText: entity.LogicalName,
                detail: entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName
            });
        });
    }
    
    console.log(`✅ Returning ${suggestions.length} FetchXML suggestions`);
    return { suggestions };
}

async function provideSqlCompletions(
    fullQueryText: string,
    textUntilPosition: string,
    metadata: { attributes: IAttributeMetadata[], entities: IEntityMetadata[] },
    position: any
): Promise<{ suggestions: any[] }> {
    const suggestions: any[] = [];
    
    // Get the current line and full text for context
    const lines = textUntilPosition.split('\n');
    const currentLine = lines[lines.length - 1];
    const fullText = fullQueryText.toLowerCase();
    
    console.log('🔍 Analyzing SQL line:', JSON.stringify(currentLine));
    console.log('🔍 Full SQL text:', JSON.stringify(fullQueryText));
    
    // Check if we're right after "FROM " (with space) - suggest entities
    const afterFromPattern = /\bfrom\s+$/i;
    const afterFromMatch = afterFromPattern.test(currentLine);
    
    // Check if there's a FROM clause anywhere in the full text
    const fromEntityMatch = /\bfrom\s+([a-zA-Z0-9_]+)/i.exec(fullText);
    const hasFromClause = fromEntityMatch !== null;
    const entityName = hasFromClause ? fromEntityMatch[1] : null;
    
    // Check if we're in a SELECT context (anywhere before a FROM clause or with known FROM entity)
    const hasSelectClause = /\bselect\b/i.test(fullText);
    const beforeFromInSelect = hasSelectClause && (textUntilPosition.toLowerCase().indexOf('from') === -1 || 
        (hasFromClause && textUntilPosition.toLowerCase().indexOf(fromEntityMatch[0]) > textUntilPosition.toLowerCase().indexOf('select')));
    
    // Check if we're typing a partial word (like "nam" for "name")
    const partialWordMatch = currentLine.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)$/);
    const typingPartialWord = partialWordMatch !== null;
    const partialWord = typingPartialWord ? partialWordMatch[1] : '';
    
    console.log('🔍 SQL context detection:', {
        afterFromMatch,
        hasFromClause,
        entityName,
        hasSelectClause,
        beforeFromInSelect,
        typingPartialWord,
        partialWord,
        hasAttributes: metadata.attributes.length
    });
    
    if (afterFromMatch) {
        // User just typed "FROM " - suggest entities
        console.log('🏢 ✅ AFTER FROM: Suggesting entities');
        metadata.entities.forEach(entity => {
            suggestions.push({
                label: entity.LogicalName,
                kind: 7, // CompletionItemKind.Class
                insertText: entity.LogicalName,
                detail: entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName
            });
        });
    } else if (hasFromClause && metadata.attributes.length > 0) {
        // We have a FROM clause with entity - suggest attributes
        console.log('🏷️ ✅ HAS ENTITY: Suggesting attributes for', entityName);
        
        let attributesToSuggest = metadata.attributes;
        
        // If user is typing a partial word, filter attributes that start with that word
        if (typingPartialWord && partialWord.length > 0) {
            console.log('🔍 Filtering attributes that start with:', partialWord);
            attributesToSuggest = metadata.attributes.filter(attr => 
                attr.LogicalName.toLowerCase().startsWith(partialWord.toLowerCase())
            );
        }
        
        attributesToSuggest.forEach(attr => {
            suggestions.push({
                label: attr.LogicalName,
                kind: 5, // CompletionItemKind.Field
                insertText: attr.LogicalName,
                detail: attr.AttributeType,
                // If replacing partial word, specify the range to replace
                ...(typingPartialWord && partialWord.length > 0 ? {
                    range: {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: position.column - partialWord.length,
                        endColumn: position.column
                    }
                } : {})
            });
        });
    } else if (hasSelectClause) {
        // We're in a SELECT context but no entity yet - suggest entities  
        console.log('🌐 IN SELECT: Suggesting entities');
        metadata.entities.slice(0, 50).forEach(entity => {
            suggestions.push({
                label: entity.LogicalName,
                kind: 7, // CompletionItemKind.Class
                insertText: entity.LogicalName,
                detail: entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName
            });
        });
    } else {
        // Fallback: suggest entities
        console.log('🌐 FALLBACK: Suggesting entities');
        metadata.entities.slice(0, 50).forEach(entity => {
            suggestions.push({
                label: entity.LogicalName,
                kind: 7, // CompletionItemKind.Class
                insertText: entity.LogicalName,
                detail: entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName
            });
        });
    }
    
    console.log(`✅ Returning ${suggestions.length} SQL suggestions`);
    return { suggestions };
}
