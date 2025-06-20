import { PowerTools } from "../powertools/context";
import { IRole } from "../models/role";

export const getRoles = async (powerTools: PowerTools): Promise<IRole[]> => {
    if (!powerTools.get) {
        return [];
    }

    try {
        let allRoles: IRole[] = [];
        let nextLink: string | undefined = `/api/data/v9.2/roles?$select=name,roleid&$orderby=name`;

        while (nextLink) {
            const result = await powerTools.get(nextLink);
            const jsonResult = await result.asJson<{ value: IRole[], "@odata.nextLink"?: string }>();

            if (jsonResult?.value) {
                allRoles.push(...jsonResult.value);
            }

            if (jsonResult && jsonResult["@odata.nextLink"]) {
                const url = new URL(jsonResult["@odata.nextLink"]);
                nextLink = `${url.pathname}${url.search}`;
            } else {
                nextLink = undefined;
            }
        }
        
        return allRoles;
    } catch (error) {
        console.error('Error fetching security roles:', error);
        return [];
    }
};

export const assignRolesToUser = async (powerTools: PowerTools, userId: string, roleIds: string[]): Promise<void> => {
    if (!powerTools.post || !powerTools.connectionName) {
        return;
    }

    const errors = [];

    for (const roleId of roleIds) {
        const connection = powerTools.connectionName.replace(/\s/g, '');
        const odataId = `https://${connection}.api.crm.dynamics.com/api/data/v9.2/roles(${roleId})`;
        
        const payload = {
            "@odata.id": odataId
        };

        try {
            const headers = { 'Content-Type': 'application/json' };
            const result = await powerTools.post(`/api/data/v9.2/systemusers(${userId})/systemuserroles_association/$ref`, payload, headers);
            if (result.statusCode < 200 || result.statusCode >= 300) {
                const errorMessage = `Failed to assign role ${roleId} to user ${userId}: ${result.statusCode} - ${result.content}`;
                errors.push(errorMessage);
            }
        } catch (error) {
            const exceptionMessage = `Exception assigning role ${roleId} to user ${userId}: ${error}`;
            errors.push(exceptionMessage);
        }
    }

    if (errors.length > 0) {
        throw new Error(errors.join('\n'));
    }
}; 