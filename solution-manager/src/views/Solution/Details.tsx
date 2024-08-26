import React, { useEffect, useState } from 'react'; 
import { useNavigate, useParams } from 'react-router-dom'; 
import { PageContainer } from '@ant-design/pro-components'; 
import { ArrowLeftOutlined } from '@ant-design/icons'; 

import { usePowerToolsApi } from 'powertools/apiHook'; 
import { SolutionManagedTag } from 'utils/info'; 

import { IoDataResponse } from 'models/oDataResponse'; 
import { ISolution } from 'models/solutions'; 

import { HeaderContent } from './headerContent'; 
import { ComponentsTable } from './componentsTable'; 
import { HistoryTable } from './historyTable'; 


export const SolutionDetails: React.FC = () => { 
    const { get } = usePowerToolsApi(); 
    const { solutionId } = useParams(); 
    const navigate = useNavigate(); 
    const [ isLoading, setLoading ] = useState(true); 
    const [ activeTab, setActiveTab ] = useState<string>('components'); 
    const [ solution, setSolution ] = useState<ISolution | undefined>(); 
    
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
            ]} 
        > 
            { activeTab === 'components' ? <ComponentsTable solutionId={solutionId} /> : null } 
            { activeTab === 'history' ? <HistoryTable solutionId={solutionId} /> : null } 
        </PageContainer> 
    ); 
}