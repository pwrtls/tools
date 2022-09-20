import { IoDataResponse } from "models/oDataResponse";

export const downloadWebResource = async (webResourceId: string): Promise<void> => {
    const query = new URLSearchParams();
    query.set('$select', 'content,name');
    query.set('$filter', `webresourceid eq ${ webResourceId }`);

    const res = await window.PowerTools.get('/api/data/v9.0/webresourceset', query);
    const js = await res.asJson<IoDataResponse<Partial<{ content: string, name: string }>>>();

    if (!js || !js.value || !Array.isArray(js.value) || js.value.length !== 1 || !js.value[0].content || !js.value[0].name) {
        return;
    }

    window.PowerTools.download(atob(js.value[0].content), js.value[0].name);
};
