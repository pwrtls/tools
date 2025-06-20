import { IView } from "../models/view";
import { PowerTools } from "../powertools/context";

export const getViews = async (powerTools: PowerTools, entityName: string): Promise<IView[]> => {
    if (!powerTools.get) {
        throw new Error('PowerTools API not available');
    }

    // Validate entity name
    if (!entityName || typeof entityName !== 'string') {
        throw new Error('Valid entity name is required');
    }

    try {
        // System views
        const systemViewsResult = await powerTools.get(
            `/api/data/v9.2/savedqueries?$select=savedqueryid,name,layoutxml&$filter=returnedtypecode eq '${entityName}' and statecode eq 0&$orderby=name`
        );
        const systemViewsJson = await systemViewsResult.asJson<{ value: any[] }>();
        const systemViews: IView[] = (systemViewsJson?.value || []).map(view => ({
            id: view.savedqueryid,
            name: view.name,
            type: 'system' as const,
            layoutxml: view.layoutxml
        }));

        // Personal views
        const personalViewsResult = await powerTools.get(
            `/api/data/v9.2/userqueries?$select=userqueryid,name,layoutxml&$filter=returnedtypecode eq '${entityName}' and statecode eq 0&$orderby=name`
        );
        const personalViewsJson = await personalViewsResult.asJson<{ value: any[] }>();
        const personalViews: IView[] = (personalViewsJson?.value || []).map(view => ({
            id: view.userqueryid,
            name: view.name,
            type: 'personal' as const,
            layoutxml: view.layoutxml
        }));

        return [...systemViews, ...personalViews];
        
    } catch (error: any) {
        // Log detailed error in development only
        if (process.env.NODE_ENV === 'development') {
            console.error(`Error fetching views for ${entityName}:`, error);
        }
        
        // Re-throw with user-friendly message
        throw new Error(`Failed to load views for ${entityName}. Please try again.`);
    }
}; 