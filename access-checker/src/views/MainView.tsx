import React, { useContext, useEffect, useState } from 'react';
import { Row, Col, Card, Spin, Typography, Form } from 'antd';
import { useLocation } from 'react-router-dom';

import { IoDataResponse } from 'models/oDataResponse';
import { ISolution } from 'models/solutions';

import { PowerToolsContext } from 'powertools/context';
import { usePowerToolsApi } from 'powertools/apiHook';

import { InfoForm } from './infoForm';

export const MainView: React.FC = () => {
    const { connectionName } = useContext(PowerToolsContext);
    const { getAsJson, isLoaded } = usePowerToolsApi();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ISolution[]>([]);
    const location = useLocation();

    useEffect(() => {
        console.log(location);
    }, [location]);

    useEffect(() => {
        setLoading(true);

        const loadSolutions = async () => {
            if (!getAsJson) {
                return;
            }

            const query = new URLSearchParams();
            query.set(`$select`, `friendlyname,uniquename`);
            query.set(`$expand`, `publisherid`);
            query.set(`$filter`, `(isvisible eq true)`);
            query.set(`$orderby`, `createdon desc`);

            const res = await getAsJson<IoDataResponse<ISolution>>("/api/data/v9.0/solutions", query);

            setData(res.value);
        }

        Promise.all([loadSolutions()]).then(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoaded, connectionName]);

    function onCheckAccessClick() {
        console.log('check access clicked');
    }

    return (
        <Spin spinning={!isLoaded}>
            <InfoForm onCheckAccess={onCheckAccessClick} />

            <Row gutter={16} style={{ marginLeft: '16px', marginRight: '16px' }}>
                <Col span={8}>
                    <Card title="Create" bordered>Yes or no?</Card>
                </Col>

                <Col span={8}>
                    <Card title="Update" bordered>Yes or no?</Card>
                </Col>

                <Col span={8}>
                    <Card title="Delete" bordered>Yes or no?</Card>
                </Col>
            </Row>
        </Spin>
    );
}
