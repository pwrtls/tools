export const getEntityDefinitionAsTypeScript = async (logicalName: string): Promise<void> => {
    console.log(logicalName);

    const defRes = await window.PowerTools.get(`/api/data/v9.0/EntityDefinitions(LogicalName='${ logicalName }')`);
    const defResJs = await defRes.asJson();

    console.log('entity definition:', defResJs);

    const attributes = await window.PowerTools.get(`/api/data/v9.0/EntityDefinitions(LogicalName='${ logicalName }')/Attributes`);
    const attributesJs = await attributes.asJson();

    console.log('attributes:', attributesJs);
};
