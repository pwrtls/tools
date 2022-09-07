import { useContext } from 'react';

import { PowerToolsContext } from './context';

export function usePowerToolsApi() {
    const { get, isLoaded } = useContext(PowerToolsContext);

    return { get, isLoaded } as const;
}
