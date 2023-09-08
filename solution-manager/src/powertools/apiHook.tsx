import { useContext } from 'react';
import { PowerToolsContext } from './context';

type getParameters = Parameters<typeof window.PowerTools.get>;
type postParameters = Parameters<typeof window.PowerTools.post>;

export function usePowerToolsApi() {
    const { get, post, isLoaded, download } = useContext(PowerToolsContext);

    async function getAsJson<T>(url: getParameters[0], query?: getParameters[1], headers?: getParameters[2]): Promise<T> {
        if (!get) {
            throw new Error('the get method is undefined');
        }

        const res = await get(url, query, headers);

        return await res.asJson<T>();
    }

    async function postAsJson<T>(url: postParameters[0], body?: postParameters[1], headers?: postParameters[2]): Promise<T> {
        if (!post) {
            throw new Error('the post method is undefined');
        }

        const res = await post(url, body, headers);

        return await res.asJson<T>();
    }

    return { get, getAsJson: get ? getAsJson : undefined, post, postAsJson: post ? postAsJson : undefined, isLoaded, download } as const;
}