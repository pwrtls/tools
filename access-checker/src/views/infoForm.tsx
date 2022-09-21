import React from 'react';
import { Form, Select } from 'antd';

interface IInfoFormValues {}

interface IInfoFormProps {
    onCheckAccess: () => void;
}

export const InfoForm: React.FC<IInfoFormProps> = (props) => {
    const [form] = Form.useForm<IInfoFormValues>();

    return (
        <Form<IInfoFormValues>
            form={form}
            layout="inline"
            style={{ margin: '25px', justifyContent: 'center' }}
        >
            <Form.Item name="entity" label="Entity/Table" style={{ width: '200px' }}>
                <Select>
                    <Select.Option key="test">Test</Select.Option>
                </Select>
            </Form.Item>
        </Form>
    );
}
