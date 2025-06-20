import { useState, useEffect, useContext, useMemo } from 'react';
import { IRole } from '../models/role';
import { getRoles } from '../api/roleService';
import { PowerToolsContext } from '../powertools/context';

export const useRoles = () => {
    const powerTools = useContext(PowerToolsContext);
    const [roles, setRoles] = useState<IRole[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (powerTools.isLoaded) {
            setLoading(true);
            getRoles(powerTools)
                .then(setRoles)
                .finally(() => setLoading(false));
        }
    }, [powerTools]);

    const uniqueRoles = useMemo(() => {
        const seen = new Set();
        return roles.filter(role => {
            const duplicate = seen.has(role.name);
            seen.add(role.name);
            return !duplicate;
        });
    }, [roles]);

    return { roles: uniqueRoles, loading };
}; 