import React, { useState } from 'react';
import { Button } from 'antd';

import { usePowerToolsApi } from 'powertools/apiHook';
import { IoDataResponse } from 'models/oDataResponse';
import { IWebResource } from 'models/webresoures';

interface IDownloadButtonProps {
    webresourceid: string;
}

export const DownloadButton: React.FC<IDownloadButtonProps> = (props) => {
    const { get, download } = usePowerToolsApi();
    const [ downloading, setDownloading ] = useState(false);

    const onClick = async () => {
        if (!get || !download) {
            return;
        }

        setDownloading(true);

        const query = new URLSearchParams();
        query.set('$select', 'content,name');
        query.set('$filter', `webresourceid eq ${ props.webresourceid }`);

        const res = await get('/api/data/v9.0/webresourceset', query);
        const jsonRes = await res.asJson<IoDataResponse<Partial<IWebResource>>>();

        if (!jsonRes || !jsonRes.value || !Array.isArray(jsonRes.value) || jsonRes.value.length !== 1 || !jsonRes.value[0].content || !jsonRes.value[0].name) {
            setDownloading(false);
            return;
        }

        try {
            download(atob(jsonRes.value[0].content), jsonRes.value[0].name);
        } catch (e) {
            console.warn('failed to download');
        } finally {
            setDownloading(false);
        }
    };

    if (!get || !download) {
        return null;
    }

    return (
        <Button type="link" onClick={onClick} loading={downloading} disabled={downloading}>Download</Button>
    );
}
