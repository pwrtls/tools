import React from 'react';
import { Tag, Typography } from 'antd';

export const SolutionManagedTag: React.FC<{ isManaged?: boolean }> = (props) => {
    if (typeof props.isManaged !== 'boolean') {
        return null;
    }

    return (
        <Tag color={props.isManaged ? 'warning' : 'processing'}>{ props.isManaged ? 'Managed' : 'Unmanaged' }</Tag>
    );
}

export const SolutionInfo: React.FC<{ friendlyName?: string, isManaged?: boolean }> = (props) => {
    if (!props.friendlyName || typeof props.isManaged !== 'boolean') {
        return null;
    }

    return (
        <React.Fragment>
            <Typography.Text>{ props.friendlyName }</Typography.Text> <SolutionManagedTag isManaged={props.isManaged} />
        </React.Fragment>
    );
}
