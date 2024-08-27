import { IoDataResponse } from "models/oDataResponse";

export const downloadWebResource = async (webResourceId: string): Promise<void> => {
    try {
        const query = new URLSearchParams();
        query.set('$select', 'content,name');
        query.set('$filter', `webresourceid eq ${webResourceId}`);

        const res = await window.PowerTools.get('/api/data/v9.0/webresourceset', query);
        const js = await res.asJson<IoDataResponse<Partial<{ content: string, name: string }>>>();

        if (!js?.value?.[0]?.content || !js.value[0].name) {
            throw new Error('Invalid web resource data');
        }

        await window.PowerTools.download(atob(js.value[0].content), js.value[0].name);
    } catch (error) {
        console.error('Failed to download web resource:', error);
        // TODO: Add user-facing error message
    }
};