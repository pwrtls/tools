import { Select, Input, Button, Tag } from 'antd';
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
    onClearSelection: () => void;
    rolesLoading?: boolean;
}

export const Toolbar = ({
    groupedViews,
    handleViewChange,
    clearViewSelection,
    handleSearch,
    selectedView,
    handleAssignRolesClick,
    hasSelected,
    selectedRowCount,
    onClearSelection,
    rolesLoading = false
}: ToolbarProps) => {
    return (
        <>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: 16,
                gap: 16
            }}>
                {/* Left side - empty for now, can be used for future elements */}
                <div></div>
                
                {/* Right side - view selector and search */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
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
                    <Input.Search
                        placeholder={selectedView ? "Search across all columns in view" : "Search across all columns"}
                        onSearch={handleSearch}
                        style={{ width: 300 }}
                    />
                </div>
            </div>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Button 
                    type="primary" 
                    onClick={handleAssignRolesClick} 
                    disabled={!hasSelected}
                    loading={rolesLoading}
                >
                    Assign Security Roles
                </Button>
                <Button onClick={onClearSelection} disabled={!hasSelected}>
                    Clear Selection
                </Button>
                <span style={{ marginLeft: 8 }}>
                    {hasSelected ? `Selected ${selectedRowCount} items` : ''}
                </span>
            </div>
        </>
    );
}; 