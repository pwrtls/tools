import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dropdown, Menu, MenuProps, Space } from 'antd';
import { DownOutlined, FileOutlined, FileTextOutlined, UploadOutlined } from '@ant-design/icons';
import { ItemType } from 'antd/lib/menu/hooks/useItems';

import { ISolutionComponentSummary, SolutionComponentType } from 'models/solutionComponentSummary';

import { downloadWebResource } from 'api/webResources';
import { getEntityDefinitionAsTypeScript } from 'api/entityDefinitions';
import { downloadPluginAssembly } from 'api/pluginAssembly';

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
    component: ISolutionComponentSummary;
}

export const SolutionComponentActionButton: React.FC<ISolutionComponentActionButtonProps> = (props) => {
    const menuItems: ItemType[] = [];

    if (props.component.msdyn_componenttype === SolutionComponentType.Entity) {
        menuItems.push({ key: 'download-as-ts', label: 'Download TS', icon: <FileTextOutlined /> });
    }

    if (props.component.msdyn_componenttype === SolutionComponentType.WebResource) {
        menuItems.push({ key: 'download-wr', label: 'Download File', icon: <FileOutlined /> });

        if (props.component.msdyn_iscustomizable) {
            menuItems.push({ key: 'upload-wr', label: 'Upload & Publish', icon: <UploadOutlined />, disabled: true });
        }
    }

    if (props.component.msdyn_componenttype === SolutionComponentType.PluginAssembly) {
        menuItems.push({ key: 'download-pl-assembly', label: 'Download Assembly', icon: <FileOutlined /> });
    }

    const onMenuClick: MenuProps['onClick'] = async (e) => {
        console.log(e, props);

        switch (e.key) {
            case 'download-as-ts':
                console.log('would be downloading');
                getEntityDefinitionAsTypeScript(props.component.msdyn_name);
                return;
            case 'download-wr':
                downloadWebResource(props.component.msdyn_objectid);
                return;
            case 'download-pl-assembly':
                downloadPluginAssembly(props.component.msdyn_objectid);
                return;
        }
    };

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
