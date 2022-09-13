import React, { useMemo } from 'react';
import { Form, Input, Select } from 'antd';
import debounce from 'lodash.debounce';

interface IFormValues {
    field: 'name' | 'displayname';
    operator: 'eq' | 'endswith' | 'startswith' | 'substringof';
    value: string;
}

interface ISearchFormProps {
    onChange?: (filterValue: string) => void;
}

export const SearchForm: React.FC<ISearchFormProps> = (props) => {
    const [form] = Form.useForm<IFormValues>();

    const onChange = () => {
        const values: IFormValues = form.getFieldsValue(true);
        console.log('values:', values);

        if (!values.value || !values.value.trim()) {
            return;
        }

        let filterValue = `(${ values.field } eq ${ values.value })`;
        switch (values.operator) {
            case 'endswith':
            case 'startswith':
            case 'substringof':
                filterValue = `(${ values.operator }(${ values.field }, '${ values.value }'))`;
                break;
        }

        console.log('filter value:', filterValue);

        if (typeof props.onChange !== 'function') {
            return;
        }

        props.onChange(filterValue);
    };

    const debouncedOnChange = useMemo(
        () => debounce(onChange, 500)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    , [form]);

    const searchFieldSelect = (
        <Form.Item name="field" label="Column" style={{ width: '200px' }}>
            <Select>
                <Select.Option value="name">Name</Select.Option>
                <Select.Option value="displayname">Display Name</Select.Option>
            </Select>
        </Form.Item>
    );

    const searchOperator = (
        <Form.Item name="operator" label="Column" style={{ width: '200px' }}>
            <Select>
                <Select.Option value="eq">Equals</Select.Option>
                <Select.Option value="endswith">Ends With</Select.Option>
                <Select.Option value="startswith">Starts With</Select.Option>
                <Select.Option value="substringof">Substring Of</Select.Option>
            </Select>
        </Form.Item>
    );

    const searchValue = (
        <Form.Item name="value" label="Search Value">
            <Input />
        </Form.Item>
    );

    return (
        <Form<IFormValues>
            form={form}
            layout="inline"
            style={{ margin: '25px', justifyContent: 'center' }}
            onFieldsChange={debouncedOnChange}
            initialValues={{
                field: 'name',
                operator: 'eq',
                value: '',
            }}
        >
            { searchFieldSelect }
            { searchOperator }
            { searchValue }
        </Form>
    );
}
