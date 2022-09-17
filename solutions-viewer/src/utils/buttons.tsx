import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dropdown, Menu, MenuProps, Space } from 'antd';
import { DownOutlined, FileTextOutlined } from '@ant-design/icons';
import { ItemType } from 'antd/lib/menu/hooks/useItems';

import { SolutionComponentType } from 'models/solutionComponentSummary';

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
    componentType: SolutionComponentType;
}

export const SolutionComponentActionButton: React.FC<ISolutionComponentActionButtonProps> = (props) => {
    const menuItems: ItemType[] = [];

    if (props.componentType === SolutionComponentType.Entity) {
        menuItems.push({ key: 'download-ts', label: 'Download TS', icon: <FileTextOutlined /> });
    }

    const onMenuClick: MenuProps['onClick'] = (e) => {
        console.log(e, props);
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
