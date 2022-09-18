import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dropdown, Menu, MenuProps, Space } from 'antd';
import { DownOutlined, FileOutlined, FileTextOutlined, UploadOutlined } from '@ant-design/icons';
import { ItemType } from 'antd/lib/menu/hooks/useItems';

import { usePowerToolsApi } from 'powertools/apiHook';

import { SolutionComponentType } from 'models/solutionComponentSummary';
import { IoDataResponse } from 'models/oDataResponse';

export const ViewSolutionDetailsButton: React.FC<{ solutionId: string }> = (props) => {
    const navigate = useNavigate();

    const onViewClick = () => {
        navigate(`/${props.solutionId}`);
    }

    return (
        <Button size="small" onClick={onViewClick}>View</Button>
    );
};

interface ISolutionComponentActionButtonProps {
    solutionId?: string;
    componentId: string;
    isCustomizable: boolean;
    componentType: SolutionComponentType;
}

export const SolutionComponentActionButton: React.FC<ISolutionComponentActionButtonProps> = (props) => {
    const { get, download } = usePowerToolsApi();

    const menuItems: ItemType[] = [];

    if (props.componentType === SolutionComponentType.Entity) {
        menuItems.push({ key: 'download-ts', label: 'Download TS', icon: <FileTextOutlined /> });
    }

    if (props.componentType === SolutionComponentType.WebResource) {
        menuItems.push({ key: 'download-wr', label: 'Download File', icon: <FileOutlined /> });

        if (props.isCustomizable) {
            menuItems.push({ key: 'upload-wr', label: 'Upload & Publish', icon: <UploadOutlined /> });
        }
    }

    const onMenuClick: MenuProps['onClick'] = async (e) => {
        console.log(e, props);

        switch (e.key) {
            case 'download-wr':
                //TODO: Ideally this would be broke out into a helper function
                if (!get || !download) return;

                const query = new URLSearchParams();
                query.set('$select', 'content,name');
                query.set('$filter', `webresourceid eq ${ props.componentId }`);

                const res = await get('/api/data/v9.0/webresourceset', query);
                const jsonRes = await res.asJson<IoDataResponse<Partial<{ content: string, name: string }>>>();

                if (!jsonRes || !jsonRes.value || !Array.isArray(jsonRes.value) || jsonRes.value.length !== 1 || !jsonRes.value[0].content || !jsonRes.value[0].name) {
                    return;
                }

                try {
                    download(atob(jsonRes.value[0].content), jsonRes.value[0].name);
                } catch (e) {
                    console.warn('failed to download');
                }
                return;
        }
    }

    const menu = (
        <Menu
            onClick={onMenuClick}
            items={menuItems}
        />
    );

    if (menuItems.length === 0) {
        return (
            <React.Fragment>-</React.Fragment>
        );
    }

    return (
        <Dropdown overlay={menu}>
            <Button size="small">
                <Space>
                    Actions
                    <DownOutlined />
                </Space>
            </Button>
        </Dropdown>
    );
}
