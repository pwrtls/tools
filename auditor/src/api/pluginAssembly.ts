import { IoDataResponse } from "models/oDataResponse";

export const downloadPluginAssembly = async (pluginAssemblyId: string): Promise<void> => {
    const query = new URLSearchParams();
    query.set('$select', 'content,name');
    query.set('$filter', `pluginassemblyid eq ${ pluginAssemblyId }`);

    const res = await window.PowerTools.get('/api/data/v9.0/pluginassemblies', query);
    const js = await res.asJson<IoDataResponse<Partial<{ content: string, name: string }>>>();

    if (!js || !js.value || !Array.isArray(js.value) || js.value.length !== 1 || !js.value[0].content || !js.value[0].name) {
        return;
    }

    window.PowerTools.download(atob(js.value[0].content), js.value[0].name+'.dll');
};
