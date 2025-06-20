import { useState, useContext, useMemo, useCallback } from 'react';
import { IRole } from '../models/role';
import { getRoles } from '../api/roleService';
import { PowerToolsContext } from '../powertools/context';

export const useRoles = () => {
    const powerTools = useContext(PowerToolsContext);
    const [roles, setRoles] = useState<IRole[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    const loadRoles = useCallback(async () => {
        if (hasLoaded || loading) return;
        
        setLoading(true);
        try {
            const rolesData = await getRoles(powerTools);
            setRoles(rolesData);
            setHasLoaded(true);
        } catch (error) {
            console.error('Failed to load roles:', error);
        } finally {
            setLoading(false);
        }
    }, [powerTools, hasLoaded, loading]);

    const uniqueRoles = useMemo(() => {
        const seen = new Set();
        return roles.filter(role => {
            const duplicate = seen.has(role.name);
            seen.add(role.name);
            return !duplicate;
        });
    }, [roles]);

    return { 
        roles: uniqueRoles, 
        loading, 
        loadRoles, 
        hasLoaded 
    };
}; 