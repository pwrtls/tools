export const getEntityDefinitionAsTypeScript = async (logicalName: string): Promise<string> => {
    try {
        const defRes = await window.PowerTools.get(`/api/data/v9.0/EntityDefinitions(LogicalName='${logicalName}')`);
        const defResJs = await defRes.asJson<{ SchemaName: string }>();

        const attributes = await window.PowerTools.get(`/api/data/v9.0/EntityDefinitions(LogicalName='${logicalName}')/Attributes`);
        const attributesJs = await attributes.asJson<{ value: Array<{ LogicalName: string, AttributeType: string }> }>();

        // Generate TypeScript interface
        let tsInterface = `interface I${defResJs.SchemaName} {\n`;
        attributesJs.value.forEach((attr) => {
            tsInterface += `  ${attr.LogicalName}: ${mapCrmTypeToTypeScript(attr.AttributeType)};\n`;
        });
        tsInterface += `}\n`;

        return tsInterface;
    } catch (error) {
        console.error('Failed to get entity definition:', error);
        throw error;
    }
};

function mapCrmTypeToTypeScript(crmType: string): string {
    // Map CRM types to TypeScript types
    const typeMap: { [key: string]: string } = {
        'String': 'string',
        'Integer': 'number',
        'Double': 'number',
        'DateTime': 'Date',
        'Boolean': 'boolean',
        // Add more mappings as needed
    };
    return typeMap[crmType] || 'any';
}