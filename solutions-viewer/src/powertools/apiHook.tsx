import { useContext } from 'react';

import { PowerToolsContext } from './context';

export function usePowerToolsApi() {
    const { get, isLoaded, download } = useContext(PowerToolsContext);

    return { get, isLoaded, download } as const;
}
