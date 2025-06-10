import { QueryType, IAttributeMetadata, IEntityMetadata } from '../models';

export const parseEntityName = (query: string, type: QueryType): string | null => {
    if (!query) return null;

    switch (type) {
        case 'sql': {
            const match = /from\s+([a-zA-Z0-9_]+)/i.exec(query);
            if (match) {
                return match[1];
            }
            return null;
        }
        case 'odata': {
            try {
                const url = new URL(query, 'https://dummy');
                const parts = url.pathname.split('/').filter(Boolean);
                return parts[parts.length - 1] || null;
            } catch {
                const path = query.split('?')[0];
                const parts = path.split('/').filter(Boolean);
                return parts[parts.length - 1] || null;
            }
        }
        case 'fetchxml': {
            const match = /<entity[^>]*\sname=(?:"|')([^"']+)(?:"|')/i.exec(query);
            return match ? match[1] : null;
        }
        default:
            return null;
    }
};

export interface CompletionMetadata {
    attributes: IAttributeMetadata[];
    entities: IEntityMetadata[];
}

export const registerCompletionProviders = (
    monaco: any,
    getMetadataFn: (entityName: string | null) => Promise<CompletionMetadata>
) => {
    const createProvider = (lang: string, type: QueryType) => ({
        triggerCharacters: ['.', ' '],
        provideCompletionItems: async (model: any) => {
            const query = model.getValue();
            const entity = parseEntityName(query, type);
            const meta = await getMetadataFn(entity);
            const suggestions = [] as any[];
            if (meta.entities && !entity) {
                meta.entities.forEach(e => {
                    suggestions.push({
                        label: e.LogicalName,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: e.LogicalName
                    });
                });
            }
            if (meta.attributes && entity) {
                meta.attributes.forEach(attr => {
                    suggestions.push({
                        label: attr.LogicalName,
                        kind: monaco.languages.CompletionItemKind.Field,
                        insertText: attr.LogicalName
                    });
                });
            }
            return { suggestions };
        }
    });

    monaco.languages.registerCompletionItemProvider('sql', createProvider('sql', 'sql'));
    monaco.languages.registerCompletionItemProvider('odata', createProvider('odata', 'odata'));
    monaco.languages.registerCompletionItemProvider('xml', createProvider('xml', 'fetchxml'));
};
