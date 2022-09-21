import React from 'react';
import { Descriptions } from 'antd';

import { ISolution } from 'models/solutions';

export const HeaderContent: React.FC<{ solution: ISolution }> = (props) => {
    return (
        <Descriptions size="small">
            <Descriptions.Item label="Version">{ props.solution.version }</Descriptions.Item>
            { props.solution.installedon ? <Descriptions.Item label="Installed On">{ new Date(props.solution.installedon).toLocaleDateString() }</Descriptions.Item> : null }
            { props.solution.modifiedon ? <Descriptions.Item label="Modified On">{ new Date(props.solution.modifiedon).toLocaleDateString() }</Descriptions.Item> : null }
            <Descriptions.Item label="Publisher">{ props.solution.publisherid?.friendlyname || '-' }</Descriptions.Item>
            <Descriptions.Item label="Publisher Unique Name">{ props.solution.publisherid?.uniquename || '-' }</Descriptions.Item>
            <Descriptions.Item label="Solution ID">{ props.solution.solutionid }</Descriptions.Item>
        </Descriptions>
    );
}
