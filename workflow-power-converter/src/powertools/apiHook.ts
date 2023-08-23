import { useContext } from 'react';
import { PowerToolsContext } from './context';

type getParameters = Parameters<typeof window.PowerTools.get>;

export function usePowerToolsApi() {
  const { get, isLoaded, download } = useContext(PowerToolsContext);

  async function getAsJson<T>(url: getParameters[0], query?: getParameters[1], headers?: getParameters[2]): Promise<T> {
    if (!get) {
      throw new Error('the get is undefined');
    }

    const res = await get(url, query, headers);

    return await res.asJson<T>();
  }

  return { get, getAsJson: get ? getAsJson : undefined, isLoaded, download } as const;
}
