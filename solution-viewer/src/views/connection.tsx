import React, { useCallback, useState } from 'react';
import { Typography } from 'antd';

export const ConnectionView: React.FC = () => {
    const [connectionName, setConnectionName] = useState('');

    const connectionChangeCallback = useCallback((connectionName: string | undefined) => {
        setConnectionName(connectionName || '');
    }, []);

    window.PowerTools.addConnectionChangeListener(connectionChangeCallback);

    return (
        <Typography.Paragraph>Hello { connectionName || 'Loading...' }</Typography.Paragraph>
    );
}
