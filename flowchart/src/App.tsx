import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout, Row, Col, Card, Spin, Alert, Result, Input, Button, Checkbox, message } from 'antd';
import { ArrowLeftOutlined, SearchOutlined, FileTextOutlined } from '@ant-design/icons';
import { FlowList } from './components/FlowList';
import { FlowVisualizer } from './components/FlowVisualizer';
import { DocumentGenerator } from './components/DocumentGenerator';
import { Flow, FlowDetails, FlowAnalysisResult } from './models/Flow';
import { PowerToolsContextProvider } from './powertools/context';
import { useFlowService, PaginatedFlowsResponse } from './api/flowService';
import './App.css';
import './flowchart.css';

const { Header, Content } = Layout;
const { Search } = Input;

// Debounce timeout in milliseconds
const SEARCH_DEBOUNCE_DELAY = 500;
// Default page size
const DEFAULT_PAGE_SIZE = 50;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalFlows, setTotalFlows] = useState<number | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(false);
  
  // Debounce search timer reference
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { 
    isLoaded, 
    analyzeFlow, 
    getFlowDetailsWithChildren,
    getFlows, 
    testApiConnection 
  } = useFlowService();

  // Load flows on component mount or when pagination/search changes
  useEffect(() => {
    let isMounted = true;
    
    if (flowsLoading) {
      const loadFlows = async () => {
        try {
          setError(null); // Clear any existing errors
          console.log(`Loading flows, page ${currentPage}, size ${pageSize}...`);
          
          // Load flows with current search and pagination
          const response = await getFlows(searchText, pageSize, currentPage);
          
          // Only update state if component is still mounted
          if (isMounted) {
            console.log(`Successfully loaded ${response.flows.length} flows`);
            setFlows(response.flows);
            setFilteredFlows(response.flows);
            setTotalFlows(response.totalCount);
            setHasNextPage(response.hasNextPage);
          }
        } catch (err: any) {
          console.error('Error loading flows:', err);
          if (isMounted) {
            const errorMessage = err.message || 'Failed to load flows. Please check your connection and permissions.';
            console.error('Setting error message:', errorMessage);
            setError(errorMessage);
          }
        } finally {
          if (isMounted) {
            setFlowsLoading(false);
          }
        }
      };

      loadFlows();
    }
    
    // Cleanup function to handle component unmounting
    return () => {
      isMounted = false;
    };
  }, [getFlows, currentPage, pageSize, flowsLoading, searchText]);

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

  // Handle search functionality with debounce
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    
    // Clear any existing timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    
    // Set a new timer to delay the search execution
    searchTimerRef.current = setTimeout(() => {
      // Reset to first page when searching
      setCurrentPage(1);
      setFlowsLoading(true);
    }, SEARCH_DEBOUNCE_DELAY);
  };
  
  // Handle search button click or Enter key
  const handleSearch = (value: string) => {
    // Clear any existing debounced search
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    
    // Set search text and reset pagination
    setSearchText(value);
    setCurrentPage(1);
    setFlowsLoading(true);
  };

  // Handle page change
  const handlePageChange = (page: number, size?: number) => {
    console.log(`Changing to page ${page}, size ${size}`);
    setCurrentPage(page);
    if (size && size !== pageSize) {
      setPageSize(size);
    }
    setFlowsLoading(true);
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

  const analyzeSelectedFlow = useCallback(async () => {
    if (!selectedFlow) return;

    try {
      setLoading(true);
      
      // Check if we already have flow details for this flow
      let details = flowDetails;
      if (!details || details.id !== selectedFlow.id) {
        // Only fetch details if we don't have them or they're for a different flow
        console.log('Fetching flow details for', selectedFlow.id);
        details = await getFlowDetailsWithChildren(selectedFlow.id);
        console.log('Flow details loaded:', {
          id: details.id,
          name: details.name,
          actionsLength: details.actions.length,
          triggersLength: details.triggers.length,
          connectionReferencesLength: details.connectionReferences.length,
          childFlowsLength: details.childFlows?.length || 0
        });
        setFlowDetails(details);
      } else {
        console.log('Using existing flow details, no need to refetch');
      }
      
      // Similarly, only analyze if we don't already have analysis results
      if (!flowAnalysis) {
        // Pass the cached details to analyzeFlow to avoid redundant API calls
        const analysis = await analyzeFlow(selectedFlow.id, details);
        console.log('Flow analysis completed:', {
          connectorsLength: analysis.connectors.length,
          issuesLength: analysis.issues.length,
          recommendationsLength: analysis.recommendations.length
        });
        setFlowAnalysis(analysis);
      } else {
        console.log('Using existing flow analysis, no need to reanalyze');
      }
    } catch (err) {
      console.error('Error analyzing flow:', err);
      setError('Failed to analyze the flow. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedFlow, flowDetails, flowAnalysis, analyzeFlow, getFlowDetailsWithChildren]);

  // Add effect to analyze selected flow when it changes
  useEffect(() => {
    if (selectedFlow && !flowAnalysis) {
      analyzeSelectedFlow();
    }
  }, [selectedFlow, flowAnalysis, analyzeSelectedFlow]);

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
            {/* Flow Summary Section - full width */}
            <Col span={24}>
              <Card 
                title="Flow Summary" 
                className="summary-card"
              >
                <div>
                  <p>
                    <strong>Triggers:</strong> {flowDetails.triggers?.length || 0} | 
                    <strong> Actions:</strong> {flowDetails.actions?.length || 0} | 
                    <strong> Connectors:</strong> {flowDetails.connectionReferences?.length || 0}
                  </p>
                </div>
              </Card>
            </Col>

            {/* Connectors and Issues & Recommendations on same row */}
            <Col xs={24} md={12}>
              {flowDetails.connectionReferences && flowDetails.connectionReferences.length > 0 && (
                <Card 
                  title="Connectors" 
                  className="connectors-card"
                  style={{ height: '100%' }}
                >
                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    {flowDetails.connectionReferences.map((connector, index) => (
                      <li key={`connector-${index}`}>
                        <strong>{connector.displayName}</strong>
                        {connector.connectorName && ` (${connector.connectorName})`}
                        {connector.critical && <span style={{ color: 'red', marginLeft: '8px' }}>Critical</span>}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </Col>

            {/* Issues & Recommendations Section - beside connectors */}
            <Col xs={24} md={12}>
              {(flowAnalysis.issues?.length > 0 || flowAnalysis.recommendations?.length > 0) && (
                <Card 
                  title="Issues & Recommendations" 
                  className="issues-card"
                  style={{ height: '100%' }}
                >
                  <Row gutter={[16, 0]}>
                    {/* Issues Section */}
                    <Col span={flowAnalysis.recommendations?.length > 0 ? 12 : 24}>
                      {flowAnalysis.issues && flowAnalysis.issues.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <h3>Issues</h3>
                          <ul style={{ paddingLeft: '20px' }}>
                            {flowAnalysis.issues.map((issue, index) => (
                              <li key={`issue-${index}`} style={{ marginBottom: '8px' }}>
                                <div>
                                  <strong style={{ 
                                    color: issue.severity === 'Error' ? 'red' : 
                                          issue.severity === 'Warning' ? 'orange' : 'gray'
                                  }}>
                                    {issue.severity}:
                                  </strong> {issue.description}
                                </div>
                                {issue.impact && (
                                  <div style={{ fontSize: '0.9em', marginTop: '4px' }}>
                                    <em>Impact: {issue.impact}</em>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </Col>

                    {/* Recommendations Section */}
                    <Col span={flowAnalysis.issues?.length > 0 ? 12 : 24}>
                      {flowAnalysis.recommendations && flowAnalysis.recommendations.length > 0 && (
                        <div>
                          <h3>Recommendations</h3>
                          <ul style={{ paddingLeft: '20px' }}>
                            {flowAnalysis.recommendations.map((rec, index) => (
                              <li key={`rec-${index}`} style={{ marginBottom: '8px' }}>
                                <div><strong>{rec.title}</strong> ({rec.priority})</div>
                                <div style={{ fontSize: '0.9em', marginTop: '4px' }}>{rec.description}</div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </Col>
                  </Row>
                </Card>
              )}
            </Col>

            {/* Flow Visualization Section - always full width */}
            <Col span={24}>
              <Card 
                title="Flowchart" 
                className="flowchart-card"
                extra={<DocumentGenerator flow={selectedFlow} flowDetails={flowDetails} analysis={flowAnalysis} />}
              >
                <FlowVisualizer 
                  flow={selectedFlow} 
                  flowDetails={flowDetails} 
                  flowAnalysis={flowAnalysis} 
                />
              </Card>
            </Col>
          </Row>
        </div>
      );
    }

    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Result
          status="info"
          title="No Flow Details"
          subTitle="Unable to load flow details. Try selecting a different flow."
          extra={
            <Button type="primary" onClick={handleBackToList}>
              Return to Flow List
            </Button>
          }
        />
      </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Checkbox
                onChange={(e) => handleSelectAll(e.target.checked)}
                checked={selectedFlows.length === filteredFlows.length && filteredFlows.length > 0}
              >
                Select All
              </Checkbox>
              <Button
                icon={<FileTextOutlined />}
                onClick={handleBatchDocumentation}
                disabled={selectedFlows.length === 0}
              >
                Generate Documentation ({selectedFlows.length})
              </Button>
            </div>
            <Search
              placeholder="Search by name, status, owner, dates, etc."
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              value={searchText}
              onChange={handleSearchInputChange}
              style={{ width: 400 }}
            />
          </>
        )}
      </Header>
      <Content style={{ padding: '24px', backgroundColor: '#f0f2f5' }}>
        {isAnalysisView ? (
          renderAnalysisContent()
        ) : (
          <>
            {error ? (
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
            ) : flowsLoading ? (
              <div style={{ textAlign: 'center', padding: '50px 0' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Loading flows from Power Platform...</div>
              </div>
            ) : flows.length === 0 ? (
              <Result
                status="info"
                title="No Flows Found"
                subTitle="No cloud flows were found in this environment. Make sure you have the necessary permissions."
              />
            ) : (
              <FlowList
                onFlowSelect={handleFlowSelect}
                searchText={searchText}
                filteredFlows={filteredFlows}
                selectedFlows={selectedFlows}
                onSelectFlow={handleFlowSelection}
                loading={flowsLoading}
                currentPage={currentPage}
                pageSize={pageSize}
                totalCount={totalFlows}
                onPageChange={handlePageChange}
              />
            )}
          </>
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