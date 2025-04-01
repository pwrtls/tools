import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Row, Col, Card, Space, Spin, Alert, Result, Input, Button, Typography, Checkbox, message } from 'antd';
import { ArrowLeftOutlined, SearchOutlined, FileTextOutlined, FileOutlined, DownloadOutlined } from '@ant-design/icons';
import { FlowList } from './components/FlowList';
import { FlowVisualizer } from './components/FlowVisualizer';
import { DocumentGenerator } from './components/DocumentGenerator';
import { Flow, FlowDetails, FlowAnalysisResult } from './models/Flow';
import { PowerToolsContextProvider } from './powertools/context';
import { useFlowService } from './api/flowService';
import './App.css';

const { Header, Content } = Layout;
const { Search } = Input;
const { Title } = Typography;

const AppContent: React.FC = () => {
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [flowDetails, setFlowDetails] = useState<FlowDetails | null>(null);
  const [flowAnalysis, setFlowAnalysis] = useState<FlowAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isAnalysisView, setIsAnalysisView] = useState(false);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [filteredFlows, setFilteredFlows] = useState<Flow[]>([]);
  const [selectedFlows, setSelectedFlows] = useState<string[]>([]);
  const [flowsLoading, setFlowsLoading] = useState(true);
  
  const { isLoaded, analyzeFlow, getFlowDetails, getFlows, testApiConnection } = useFlowService();

  useEffect(() => {
    if (selectedFlow && !flowAnalysis) {
      analyzeSelectedFlow();
    }
  }, [selectedFlow]);
  
  // Load flows on component mount
  useEffect(() => {
    let isMounted = true;
    
    // Add a ref to track if we've already loaded the flows to prevent duplicate requests
    if (flowsLoading && flows.length === 0) {
      const loadFlows = async () => {
        try {
          setError(null); // Clear any existing errors
          console.log('Loading flows...');
          const data = await getFlows();
          
          // Only update state if component is still mounted
          if (isMounted) {
            console.log(`Successfully loaded ${data.length} flows`);
            setFlows(data);
            setFilteredFlows(data);
          }
        } catch (err: any) {
          console.error('Error loading flows:', err);
          // Add an error state to show to the user
          if (isMounted) {
            const errorMessage = err.message || 'Failed to load flows. Please check your connection and permissions.';
            console.error('Setting error message:', errorMessage);
            setError(errorMessage);
          }
        } finally {
          // Only update state if component is still mounted
          if (isMounted) {
            setFlowsLoading(false);
          }
        }
      };

      // Execute immediately when component mounts
      loadFlows();
    }
    
    // Cleanup function to handle component unmounting
    return () => {
      isMounted = false;
    };
  }, [getFlows, flows.length, flowsLoading]);

  const handleFlowSelect = (flow: Flow) => {
    setSelectedFlow(flow);
    setFlowDetails(null);
    setFlowAnalysis(null);
    setError(null);
    setIsAnalysisView(true);
  };

  const handleBackToList = () => {
    setIsAnalysisView(false);
  };

  // Handle search functionality
  const handleSearch = (value: string) => {
    setSearchText(value);
    if (!value.trim()) {
      setFilteredFlows(flows);
      return;
    }
    
    const searchTerms = value.toLowerCase().split(' ').filter(term => term);
    const results = flows.filter(flow => {
      const nameMatch = flow.name.toLowerCase().includes(value.toLowerCase());
      const descMatch = flow.description?.toLowerCase().includes(value.toLowerCase());
      
      // Check if all search terms are found in either name or description
      const termsMatch = searchTerms.every(term => 
        flow.name.toLowerCase().includes(term) || 
        (flow.description && flow.description.toLowerCase().includes(term))
      );
      
      return nameMatch || descMatch || termsMatch;
    });
    
    setFilteredFlows(results);
  };

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFlows(filteredFlows.map(flow => flow.id));
    } else {
      setSelectedFlows([]);
    }
  };

  // Handle batch document generation
  const handleBatchDocumentation = () => {
    if (selectedFlows.length === 0) {
      message.warning('Please select at least one flow');
      return;
    }
    
    const selectedFlowObjects = flows.filter(flow => selectedFlows.includes(flow.id));
    alert(`Selected ${selectedFlows.length} flows for documentation: ${selectedFlowObjects.map(f => f.name).join(', ')}`);
  };

  // Set whether a flow is selected or not (for use in FlowList)
  const handleFlowSelection = (id: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedFlows(prev => [...prev, id]);
    } else {
      setSelectedFlows(prev => prev.filter(flowId => flowId !== id));
    }
  };

  const analyzeSelectedFlow = async () => {
    if (!selectedFlow) return;

    try {
      setLoading(true);
      
      // First get flow details
      const details = await getFlowDetails(selectedFlow.id);
      console.log('Flow details loaded:', {
        id: details.id,
        name: details.name,
        actionsLength: details.actions.length,
        triggersLength: details.triggers.length,
        connectionReferencesLength: details.connectionReferences.length
      });
      setFlowDetails(details);
      
      // Then analyze the flow
      const analysis = await analyzeFlow(selectedFlow.id);
      console.log('Flow analysis completed:', {
        connectorsLength: analysis.connectors.length,
        issuesLength: analysis.issues.length,
        recommendationsLength: analysis.recommendations.length
      });
      setFlowAnalysis(analysis);
    } catch (err) {
      console.error('Error analyzing flow:', err);
      setError('Failed to analyze the flow. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add a function to test the API connection
  const handleTestConnection = async () => {
    try {
      setError(null);
      const result = await testApiConnection();
      if (result) {
        message.success('API connection successful!');
        // If connection is successful, retry loading flows
        setFlowsLoading(true);
      } else {
        setError('API connection test failed. Please check your connection and permissions.');
      }
    } catch (err: any) {
      console.error('Error testing connection:', err);
      setError(`Connection test error: ${err.message || 'Unknown error'}`);
    }
  };

  // If PowerTools API is not loaded, let the context provider handle it
  if (!isLoaded) {
    return null;
  }

  const renderAnalysisContent = () => {
    if (!selectedFlow) {
      return (
        <Result
          status="info"
          title="Select a Flow"
          subTitle="Please select a flow from the list to analyze"
        />
      );
    }

    if (error) {
      return (
        <Alert 
          type="error" 
          message={error} 
          action={
            <Button type="primary" onClick={handleBackToList}>
              Return to Flow List
            </Button>
          }
        />
      );
    }

    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Analyzing flow: {selectedFlow.name}</div>
        </div>
      );
    }

    if (flowAnalysis && flowDetails) {
      return (
        <div>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card 
                title="Flow Visualization" 
                extra={<DocumentGenerator flow={selectedFlow} flowDetails={flowDetails} analysis={flowAnalysis} />}
              >
                <FlowVisualizer flow={selectedFlow} flowDetails={flowDetails} />
              </Card>
            </Col>
          </Row>
          
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Card title="Connectors">
                <ul>
                  {flowAnalysis.connectors.map((connector, index) => (
                    <li key={index}>
                      <strong>{connector.displayName}</strong>
                      {connector.critical && <span style={{ color: 'red' }}> (Critical)</span>}
                      {connector.count && <span> - {connector.count} references</span>}
                    </li>
                  ))}
                </ul>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Issues & Recommendations">
                {flowAnalysis.issues.length > 0 ? (
                  <ul>
                    {flowAnalysis.issues.map((issue, index) => (
                      <li key={index}>
                        <strong>[{issue.severity}]</strong> {issue.description}
                        {issue.impact && <div><small>Impact: {issue.impact}</small></div>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>No issues detected.</div>
                )}
                
                {flowAnalysis.recommendations.length > 0 && (
                  <>
                    <h4>Recommendations</h4>
                    <ul>
                      {flowAnalysis.recommendations.map((recommendation, index) => (
                        <li key={index}>
                          <strong>{recommendation.title}</strong> ({recommendation.priority})
                          <div>{recommendation.description}</div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>
            </Col>
          </Row>
        </div>
      );
    }

    return null;
  };

  // Check if all filtered flows are selected
  const isAllSelected = filteredFlows.length > 0 && 
    filteredFlows.every(flow => selectedFlows.includes(flow.id));

  // Render the flow list view with error handling
  const renderFlowListContent = () => {
    if (error) {
      return (
        <Result
          status="error"
          title="Error Loading Flows"
          subTitle={error}
          extra={[
            <Button 
              key="retry" 
              type="primary" 
              onClick={() => {
                setError(null);
                setFlowsLoading(true);
              }}
            >
              Retry
            </Button>,
            <Button
              key="test"
              onClick={handleTestConnection}
            >
              Test Connection
            </Button>
          ]}
        />
      );
    }
    
    if (flowsLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading flows from Power Platform...</div>
        </div>
      );
    }
    
    if (flows.length === 0) {
      return (
        <Result
          status="info"
          title="No Flows Found"
          subTitle="No cloud flows were found in this environment. Make sure you have the necessary permissions."
        />
      );
    }
    
    return (
      <FlowList 
        onFlowSelect={handleFlowSelect}
        searchText={searchText}
        filteredFlows={filteredFlows}
        selectedFlows={selectedFlows}
        onSelectFlow={handleFlowSelection}
        loading={flowsLoading}
      />
    );
  };

  return (
    <Layout className="app-container">
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {isAnalysisView ? (
          <>
            <Button 
              type="link" 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBackToList}
              style={{ marginRight: '16px', fontSize: '16px' }}
            >
              Back to Flow List
            </Button>
            <h1 className="header-title">{selectedFlow?.name || 'Flow Analysis'}</h1>
          </>
        ) : (
          <>
            <div className="header-search" style={{ display: 'flex', flexGrow: 1 }}>
              <Search
                placeholder="Search flows by name or description"
                allowClear
                enterButton={<SearchOutlined />}
                size="middle"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onSearch={handleSearch}
                style={{ width: '400px' }}
              />
            </div>
            <div className="header-actions">
              <Space>
                <Checkbox 
                  checked={isAllSelected} 
                  onChange={e => handleSelectAll(e.target.checked)}
                  disabled={filteredFlows.length === 0 || flowsLoading}
                >
                  Select All
                </Checkbox>
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  onClick={handleBatchDocumentation}
                  disabled={selectedFlows.length === 0}
                >
                  Generate Documentation ({selectedFlows.length})
                </Button>
              </Space>
            </div>
          </>
        )}
      </Header>
      <Content style={{ padding: '24px' }}>
        {isAnalysisView ? (
          renderAnalysisContent()
        ) : (
          renderFlowListContent()
        )}
      </Content>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <PowerToolsContextProvider showNoConnection>
      <AppContent />
    </PowerToolsContextProvider>
  );
};

export default App; 