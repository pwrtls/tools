import React, { useContext, useEffect, useState } from 'react';
import { Spin } from 'antd';

import { IoDataResponse } from 'models/oDataResponse';
import { IPluginTraceLog } from 'models/pluginTraceLog';

import { PowerToolsContext } from 'powertools/context';
import { usePowerToolsApi } from 'powertools/apiHook';

import { PluginTraceTable } from './pluginTraceTable';
import { QueryForm } from './queryForm';

export const MainView: React.FC = () => {
    const { connectionName } = useContext(PowerToolsContext);
    const { getAsJson, isLoaded } = usePowerToolsApi();
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [data, setData] = useState<IPluginTraceLog[]>([]);

    const loadTraces = async (searchString?: string) => {
        if (!getAsJson) {
            return;
        }

        const headers: IHeaders = {
            Prefer: `odata.include-annotations=OData.Community.Display.V1.FormattedValue`,
        };

        const query = new URLSearchParams();
        if (searchString) {
            query.set('$filter', searchString);
        }

        const res = await getAsJson<IoDataResponse<IPluginTraceLog>>('/api/data/v9.0/plugintracelogs', query, headers);

        console.log('result', res);
        setData(res.value);
    };

    useEffect(() => {
        setLoading(true);

        // const loadSolutions = async () => {
        //     const query = new URLSearchParams();
        //     query.set(`$select`, `friendlyname,uniquename`);
        //     query.set(`$expand`, `publisherid`);
        //     query.set(`$filter`, `(isvisible eq true)`);
        //     query.set(`$orderby`, `createdon desc`);

        //     const res = await window.PowerTools.get("/api/data/v9.0/solutions", query); //view history: /api/data/v9.0/solutionhistories
        //     const js = await res.asJson<IoDataResponse<ISolution>>();

        //     setData(js.value);
        // }

        Promise.all([loadTraces()]).then(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoaded, connectionName]);

    const onSearchClick = async (searchQuery: string) => {
        setSearching(true);

        console.log(searchQuery);

        try {
            await loadTraces(searchQuery);
        } catch (e) {
            console.warn('failed to load the traces:', e);
        } finally {
            setSearching(false);
        }
    };

    return (
        <Spin spinning={!isLoaded}>
            <QueryForm
                traces={data}
                loading={loading}
                isSearching={searching}
                onSearchClick={onSearchClick}
            />

            <PluginTraceTable
                traces={data}
                loading={loading}
                searching={searching}
            />
        </Spin>
    );
}
