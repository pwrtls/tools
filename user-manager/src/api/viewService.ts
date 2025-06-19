import { IView } from "../models/view";
import { PowerTools } from "../powertools/context";

const getAllViews = async (powerTools: PowerTools, entityName: string): Promise<IView[]> => {
    if (!powerTools.get) {
        return [];
    }
    const allViews: IView[] = [];

    // Fetch personal views first
    const personalViewsResult = await powerTools.get(`/api/data/v9.2/userqueries?$select=name,userqueryid,ownerid,fetchxml,layoutxml,returnedtypecode`);
    const personalViewsJson = await personalViewsResult.asJson<{ value: any[] }>();
    if (personalViewsJson?.value) {
        const filteredPersonalViews = personalViewsJson.value
            .filter(v => v.returnedtypecode === entityName)
            .map((view): IView => ({
                id: view.userqueryid,
                name: view.name,
                type: 'personal',
                layoutxml: view.layoutxml,
                fetchxml: view.fetchxml,
                isdefault: false,
                ownerid: {
                    id: view['_ownerid_value'],
                    name: view['_ownerid_value@OData.Community.Display.V1.FormattedValue'],
                    _value: view['_ownerid_value'],
                },
            }));
        allViews.push(...filteredPersonalViews);
    }

    // Then fetch system views
    const systemViewsResult = await powerTools.get(`/api/data/v9.2/savedqueries?$select=name,savedqueryid,fetchxml,layoutxml,isdefault,returnedtypecode`);
    const systemViewsJson = await systemViewsResult.asJson<{ value: any[] }>();

    if (systemViewsJson?.value) {
        const filteredSystemViews = systemViewsJson.value
            .filter(v => v.returnedtypecode === entityName)
            .map((view): IView => ({
                id: view.savedqueryid,
                name: view.name,
                type: 'system',
                layoutxml: view.layoutxml,
                fetchxml: view.fetchxml,
                isdefault: view.isdefault,
                ownerid: null,
            }));
        allViews.push(...filteredSystemViews);
    }

    return allViews.sort((a, b) => a.name.localeCompare(b.name));
};

export const getViewsForEntity = async (powerTools: PowerTools, entityName: string): Promise<IView[]> => {
    if (!powerTools.get) {
        return [];
    }

    try {
        const allViews = await getAllViews(powerTools, entityName);
        return allViews;
    } catch (error) {
        console.error(`Error fetching views for ${entityName}:`, error);
        return [];
    }
}; 