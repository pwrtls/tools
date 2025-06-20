import { IRole } from "../models/role";
import { PowerTools } from "../powertools/context";

export const getRoles = async (powerTools: PowerTools): Promise<IRole[]> => {
    if (!powerTools.get) {
        throw new Error('PowerTools API not available');
    }

    try {
        const result = await powerTools.get('/api/data/v9.2/roles?$select=roleid,name&$orderby=name');
        const jsonResult = await result.asJson<{ value: IRole[] }>();
        return jsonResult?.value || [];
    } catch (error: any) {
        // Log in development only
        if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching security roles:', error);
        }
        
        // Re-throw with user-friendly message
        throw new Error('Failed to load security roles. Please try again.');
    }
};

export const assignRolesToUser = async (
    powerTools: PowerTools, 
    userId: string, 
    roleIds: string[]
): Promise<void> => {
    if (!powerTools.post) {
        throw new Error('PowerTools API not available');
    }

    if (!userId || !roleIds || roleIds.length === 0) {
        throw new Error('Invalid user ID or role IDs provided');
    }

    try {
        // Validate userId format (should be a GUID)
        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!guidRegex.test(userId)) {
            throw new Error('Invalid user ID format');
        }

        // Validate each role ID
        for (const roleId of roleIds) {
            if (!guidRegex.test(roleId)) {
                throw new Error(`Invalid role ID format: ${roleId}`);
            }
        }

        // Assign roles one by one
        const assignmentPromises = roleIds.map(async (roleId) => {
            const url = `/api/data/v9.2/systemusers(${userId})/systemuserroles_association/$ref`;
            const body = {
                "@odata.id": `/api/data/v9.2/roles(${roleId})`
            };
            
            // Ensure post method exists (TypeScript safety)
            if (!powerTools.post) {
                throw new Error('PowerTools POST method not available');
            }
            
            return powerTools.post(url, JSON.stringify(body), {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            });
        });

        // Execute all assignments
        await Promise.all(assignmentPromises);
        
    } catch (error: any) {
        // Log detailed error in development only
        if (process.env.NODE_ENV === 'development') {
            console.error('Error assigning roles to user:', { userId, roleIds, error });
        }
        
        // Re-throw with user-friendly message
        const message = error.message || 'Failed to assign roles to user';
        throw new Error(message);
    }
}; 