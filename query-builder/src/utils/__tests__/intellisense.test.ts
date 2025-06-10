import { parseEntityName, registerCompletionProviders } from '../intellisense';
import { IAttributeMetadata } from '../../models';

const createMonaco = () => {
    const providers: Record<string, any> = {};
    return {
        languages: {
            CompletionItemKind: { Field: 'Field', Class: 'Class' },
            registerCompletionItemProvider: jest.fn((lang, provider) => {
                providers[lang] = provider;
            })
        },
        providers
    } as any;
};

describe('parseEntityName', () => {
    it('parses SQL from clause', () => {
        expect(parseEntityName('SELECT name FROM account', 'sql')).toBe('account');
    });

    it('parses odata path', () => {
        expect(parseEntityName('/api/data/v9.2/accounts?$top=1', 'odata')).toBe('accounts');
    });

    it('parses fetchxml entity', () => {
        const fx = '<fetch><entity name="contact"></entity></fetch>';
        expect(parseEntityName(fx, 'fetchxml')).toBe('contact');
    });
});

describe('completion provider', () => {
    it('returns suggestions using metadata function', async () => {
        const monaco = createMonaco();
        const mockGetMeta = jest.fn(async (name: string | null) => ({
            attributes: [{ 
                LogicalName: 'name',
                SchemaName: 'name',
                MetadataId: '123',
                AttributeType: 'String',
                IsValidForRead: true,
                IsValidForCreate: true,
                IsValidForUpdate: true,
            } as IAttributeMetadata],
            entities: []
        }));

        registerCompletionProviders(monaco, mockGetMeta);

        const provider = (monaco as any).providers['sql'];
        const model = { 
            getValue: () => 'SELECT na FROM account',
            getValueInRange: () => 'SELECT na'
        } as any;
        const position = { lineNumber: 1, column: 10 };
        const result = await provider.provideCompletionItems(model, position);
        expect(mockGetMeta).toHaveBeenCalledWith('account');
        expect(result.suggestions.some((s: any) => s.label === 'name')).toBe(true);
    });
});
