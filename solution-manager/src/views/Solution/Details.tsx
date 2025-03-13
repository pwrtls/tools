import React, { useEffect, useState, useCallback } from 'react'; 
import { useNavigate, useParams } from 'react-router-dom'; 
import { PageContainer } from '@ant-design/pro-components'; 
import { ArrowLeftOutlined } from '@ant-design/icons'; 
import { Space, Typography } from 'antd';

import { usePowerToolsApi } from 'powertools/apiHook'; 
import { SolutionManagedTag } from 'utils/info'; 

import { IoDataResponse } from 'models/oDataResponse'; 
import { ISolution } from 'models/solutions'; 
import { ISolutionComponentSummary } from 'models/solutionComponentSummary';

import { HeaderContent } from './headerContent'; 
import { ComponentsTable } from './componentsTable'; 
import { HistoryTable } from './historyTable'; 
import { LayerManagement } from '../../components/LayerManagement';
import { BulkLayerPromotion } from '../../components/BulkLayerPromotion';

export const SolutionDetails: React.FC = () => { 
    const { get } = usePowerToolsApi(); 
    const { solutionId } = useParams(); 
    const navigate = useNavigate(); 
    const [ isLoading, setLoading ] = useState(true); 
    const [ activeTab, setActiveTab ] = useState<string>('components'); 
    const [ solution, setSolution ] = useState<ISolution | undefined>();
    const [ selectedComponent, setSelectedComponent ] = useState<ISolutionComponentSummary | null>(null);
    const [ components, setComponents ] = useState<ISolutionComponentSummary[]>([]);
    
    useEffect(() => { 
        if (!get) { 
            return; 
        } 
        
        const loadSolution = async () => { 
            setLoading(true); 
            
            try {
                const query = new URLSearchParams(); 
                query.set(`$expand`, `publisherid`); 
                query.set(`$filter`, `(solutionid eq ${ solutionId })`); 

                const res = await get('/api/data/v9.0/solutions', query); 
                const js = await res.asJson<IoDataResponse<ISolution>>(); 
                
                if (!js || !Array.isArray(js.value)) { 
                    return; 
                } 
                
                if (js.value.length !== 1) { 
                    return; 
                }            
                setSolution(js.value[0]); 
            } catch (error) {
                console.error('Failed to load solution:', error);
                // Consider adding error state and displaying to user
            } finally {
                setLoading(false);
            }
        }; 
        
        loadSolution(); 
    }, [get, solutionId]); 

    const loadComponents = useCallback(async () => {
        if (!get || !solutionId) return;

        try {
            const query = new URLSearchParams({
                $filter: `(msdyn_solutionid eq ${solutionId})`,
                $orderby: 'msdyn_name asc'
            });

            const res = await get('/api/data/v9.0/msdyn_solutioncomponentsummaries', query);
            const js = await res.asJson<IoDataResponse<ISolutionComponentSummary>>();

            if (js && Array.isArray(js.value)) {
                setComponents(js.value);
            }
        } catch (error) {
            console.error('Failed to load components:', error);
        }
    }, [get, solutionId]);

    useEffect(() => {
        loadComponents();
    }, [loadComponents]);
    
    return ( 
        <PageContainer 
            className="solution-details" 
            loading={isLoading} 
            header={{ 
                backIcon: <ArrowLeftOutlined />, 
                onBack: () => navigate(-1), 
                title: solution?.friendlyname || null, 
                subTitle: solution?.uniquename || null, 
                tags: <SolutionManagedTag isManaged={solution?.ismanaged} />, 
                children: solution ? <HeaderContent solution={solution} /> : null, 
            }} 
            tabActiveKey={activeTab} 
            onTabChange={setActiveTab} 
            tabList={isLoading ? undefined : [ 
                { key: 'components', tab: 'Components' }, 
                { key: 'history', tab: 'History' },
                { key: 'layers', tab: 'Layer Management' }
            ]} 
        > 
            { activeTab === 'components' ? <ComponentsTable solutionId={solutionId} /> : null } 
            { activeTab === 'history' ? <HistoryTable solutionId={solutionId} /> : null }
            { activeTab === 'layers' && solutionId ? (
                <div>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Space>
                            <Typography.Text>
                                Select a component from the list below to manage its layers, or use the bulk promotion option.
                            </Typography.Text>
                            <BulkLayerPromotion
                                solutionId={solutionId}
                                components={components}
                                onComplete={loadComponents}
                            />
                        </Space>
                        <ComponentsTable 
                            solutionId={solutionId}
                            onComponentSelect={(component) => {
                                setSelectedComponent(component);
                                return null;
                            }}
                        />
                        {selectedComponent && (
                            <LayerManagement
                                componentId={selectedComponent.msdyn_objectid}
                                componentType={selectedComponent.msdyn_componenttype}
                                solutionId={solutionId}
                            />
                        )}
                    </Space>
                </div>
            ) : null }
        </PageContainer> 
    ); 
}