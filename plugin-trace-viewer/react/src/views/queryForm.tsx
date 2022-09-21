import React, { useEffect, useRef, useState } from 'react';
import { Button, Form, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

import { IPluginTraceLog } from 'models/pluginTraceLog';

interface ISearchValues {
    message: string;
    type: string;
    entity: string;
}

interface IQueryFormProps {
    traces: IPluginTraceLog[];
    loading: boolean;
    isSearching: boolean;
    onSearchClick: (searchQuery: string) => Promise<void>;
}

export const QueryForm: React.FC<IQueryFormProps> = (props) => {
    const [form] = Form.useForm<ISearchValues>();
    const [ messages, setMessages ] = useState<Array<string>>([]);
    const [ types, setTypes ] = useState<Array<string>>([]);
    const [ entities, setEntities ] = useState<Array<string>>([]);
    const loadedRef = useRef(false);

    useEffect(() => {
        if (props.loading || props.traces.length === 0 || loadedRef.current) {
            return;
        }

        //force loading this only one time
        loadedRef.current = true;

        const msgs: Array<string> = [];
        const tps: Array<string> = [];
        const es: Array<string> = [];

        props.traces.forEach((t) => {
            if (!msgs.includes(t.messagename)) {
                msgs.push(t.messagename);
            }

            if (!tps.includes(t.typename)) {
                tps.push(t.typename);
            }

            if (!es.includes(t.primaryentity)) {
                es.push(t.primaryentity);
            }
        });

        console.log(msgs, tps);
        setMessages(msgs);
        setTypes(tps);
        setEntities(es);

        // disabling because we only care to load it once and only after it has loaded
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.loading]);

    const messageNameSelect = (
        <Form.Item name="message" label="Message" style={{ width: '250px' }}>
            <Select placeholder="Filter by Message" disabled={!loadedRef.current}>
                { messages.map((m) => <Select.Option key={m}>{ m }</Select.Option>)}
            </Select>
        </Form.Item>
    );

    const typeNameSelect = (
        <Form.Item name="type" label="Type Name" style={{ width: '350px' }}>
            <Select placeholder="Filter by Type Name" disabled={!loadedRef.current}>
                { types.map((t) => <Select.Option key={t}>{ t }</Select.Option>)}
            </Select>
        </Form.Item>
    );

    const entitySelect = (
        <Form.Item name="entity" label="Entity" style={{ width: '200px' }}>
            <Select placeholder="Filter by Entity" disabled={!loadedRef.current}>
                { entities.map((e) => <Select.Option key={e}>{ e }</Select.Option>)}
            </Select>
        </Form.Item>
    );

    const onSearchClick = async () => {
        const values = form.getFieldsValue();
        const filters: Array<string> = [];

        if (values.message) {
            filters.push(`(messagename eq '${ values.message }')`);
        }

        if (values.type) {
            filters.push(`(typename eq '${ values.type }')`);
        }

        if (values.entity) {
            filters.push(`(primaryentity eq '${ values.entity }')`);
        }

        props.onSearchClick(filters.join(' and '));
    };

    const searchButton = (
        <Button
            icon={<SearchOutlined />}
            disabled={props.isSearching || !loadedRef.current}
            loading={props.isSearching}
            onClick={onSearchClick}
        >
            Search
        </Button>
    );

    //TODO: implement a collapse? https://ant.design/components/collapse/
    return (
        <Form<ISearchValues>
            form={form}
            layout="inline"
            style={{ margin: '25px', justifyContent: 'center' }}
            // onFieldsChange={debouncedOnChange}
        >
            { entitySelect }
            { messageNameSelect }
            { typeNameSelect }
            { searchButton }
        </Form>
    );
}
