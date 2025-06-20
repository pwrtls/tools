import { ISystemUser } from "../models/systemUser";
import { PowerTools } from "../powertools/context";

export const getSystemUsers = async (powerTools: PowerTools, viewId?: string, viewType?: 'system' | 'personal', search?: string, fetchAll: boolean = false): Promise<ISystemUser[]> => {
    if (!powerTools.get) {
        return [];
    }

    let url = `/api/data/v9.2/systemusers`;
    let allUsers: ISystemUser[] = [];

    if (viewId && viewType) {
        if (viewType === 'system') {
            url += `?savedQuery=${viewId}`;
        } else {
            url += `?userQuery=${viewId}`;
        }
    } else {
        let select = `?$select=fullname,internalemailaddress,domainname,isdisabled`;
        if (fetchAll) {
            select = `?$select=systemuserid`;
        }
        url += select;
        if (search) {
            url += `&$filter=contains(fullname,'${search}') or contains(internalemailaddress,'${search}')`;
        }
    }

    if (fetchAll) {
        let queryUrl = url;

        do {
            const result = await powerTools.get(queryUrl);
            const jsonResult = await result.asJson<{ value: ISystemUser[]; "@odata.nextLink"?: string }>();
            
            if (jsonResult?.value) {
                allUsers = allUsers.concat(jsonResult.value);
            }

            const fullNextLink = jsonResult ? jsonResult["@odata.nextLink"] : undefined;
            if (fullNextLink) {
                try {
                    const nextUrl = new URL(fullNextLink);
                    queryUrl = `${nextUrl.pathname}${nextUrl.search}`;
                } catch (e) {
                    console.error("Failed to parse nextLink URL, stopping pagination.", e);
                    queryUrl = ''; 
                }
            } else {
                queryUrl = ''; 
            }

        } while (queryUrl);

        return allUsers;
    } else {
        const result = await powerTools.get(url);
        const jsonResult = await result.asJson<{ value: ISystemUser[] }>();
        return jsonResult?.value || [];
    }
}; 