import React, { useContext } from 'react';
import { Typography } from 'antd';

import { PowerToolsContext } from '../powertools/context';

export const ConnectionView: React.FC = () => {
    const { isLoaded, connectionName } = useContext(PowerToolsContext);

    if (!isLoaded) {
        return (
            <Typography.Paragraph>Loading!</Typography.Paragraph>
        );
    }

    if (!connectionName) {
        return (
            <Typography.Paragraph>Please select a connection.</Typography.Paragraph>
        );
    }

    return (
        <Typography.Paragraph>Hello { connectionName }</Typography.Paragraph>
    );
}
