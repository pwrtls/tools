import { Select, Input, Button, Row, Col, Tag } from 'antd';
import { IView } from '../models/view';

interface ToolbarProps {
    groupedViews: { personal: IView[], system: IView[] };
    handleViewChange: (viewId: string) => void;
    clearViewSelection: () => void;
    handleSearch: (value: string) => void;
    selectedView?: string;
    handleAssignRolesClick: () => void;
    hasSelected: boolean;
    selectedRowCount: number;
}

export const Toolbar = ({
    groupedViews,
    handleViewChange,
    clearViewSelection,
    handleSearch,
    selectedView,
    handleAssignRolesClick,
    hasSelected,
    selectedRowCount
}: ToolbarProps) => {
    return (
        <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col>
                    <Select
                        style={{ width: 350 }}
                        placeholder="Select a view"
                        onChange={handleViewChange}
                        onClear={clearViewSelection}
                        allowClear
                        value={selectedView}
                    >
                        {groupedViews.system.length > 0 && (
                            <Select.OptGroup label="System Views">
                                {groupedViews.system.map(view => (
                                    <Select.Option key={view.id} value={view.id} label={view.name}>
                                        <Tag color="blue">System</Tag>
                                        {view.name}
                                        {view.isdefault && <Tag color="orange" style={{ marginLeft: 4 }}>Default</Tag>}
                                    </Select.Option>
                                ))}
                            </Select.OptGroup>
                        )}
                        {groupedViews.personal.length > 0 && (
                            <Select.OptGroup label="Personal Views">
                                {groupedViews.personal.map(view => (
                                    <Select.Option key={view.id} value={view.id} label={view.name}>
                                        <Tag color="green">Personal</Tag>
                                        {view.name}
                                        {view.ownerid && (
                                            <span style={{ fontSize: '0.8em', color: '#666', marginLeft: 4 }}>
                                                ({view.ownerid.name || view.ownerid._value || 'Unknown Owner'})
                                            </span>
                                        )}
                                    </Select.Option>
                                ))}
                            </Select.OptGroup>
                        )}
                    </Select>
                </Col>
                <Col>
                    <Input.Search
                        placeholder="Search users"
                        onSearch={handleSearch}
                        disabled={!!selectedView}
                        style={{ width: 300 }}
                    />
                </Col>
            </Row>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Button type="primary" onClick={handleAssignRolesClick} disabled={!hasSelected}>
                    Assign Security Roles
                </Button>
                <span style={{ marginLeft: 8 }}>
                    {hasSelected ? `Selected ${selectedRowCount} items` : ''}
                </span>
            </div>
        </>
    );
}; 