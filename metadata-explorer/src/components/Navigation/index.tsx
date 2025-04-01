import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'antd';
import { 
    DatabaseOutlined, 
    AppstoreOutlined, 
    LinkOutlined
} from '@ant-design/icons';

const Navigation: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Determine current selected key based on the route
    const getSelectedKey = () => {
        const path = location.pathname;
        if (path.includes('/entities/')) return 'entities';
        if (path.includes('/option-sets')) return 'option-sets';
        if (path.includes('/relationships')) return 'relationships';
        return 'entities';
    };
    
    // Handle menu item click
    const handleMenuClick = ({ key }: { key: string }) => {
        switch (key) {
            case 'entities':
                navigate('/');
                break;
            case 'option-sets':
                navigate('/option-sets');
                break;
            case 'relationships':
                navigate('/relationships');
                break;
            default:
                navigate('/');
        }
    };
    
    return (
        <Menu
            mode="horizontal"
            selectedKeys={[getSelectedKey()]}
            onClick={handleMenuClick}
            items={[
                {
                    key: 'entities',
                    icon: <DatabaseOutlined />,
                    label: 'Entities'
                },
                {
                    key: 'option-sets',
                    icon: <AppstoreOutlined />,
                    label: 'Option Sets'
                },
                {
                    key: 'relationships',
                    icon: <LinkOutlined />,
                    label: 'Relationships'
                }
            ]}
        />
    );
};

export default Navigation; 