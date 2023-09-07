import React, { useContext, useEffect, useState } from 'react'; 
import { Spin, Table } from 'antd';

import { IoDataResponse } from 'models/oDataResponse'; 
import { ISolution } from 'models/solutions'; 
import { usePowerToolsApi } from 'powertools/apiHook';

import { solutionsColumns } from 'utils/columns'; 

import { PowerToolsContext } from 'powertools/context'; 
import { ViewSolutionDetailsButton } from '../utils/buttons';
import { useNavigate } from 'react-router-dom';

export const SolutionsView: React.FC = () => { 
    const { get } = usePowerToolsApi(); 
    const { connectionName } = useContext(PowerToolsContext); 
    const [loading, setLoading] = useState(true); 
    const [solutions, setSolutions] = useState<ISolution[]>([]); 
    
    useEffect(() => { 
        setLoading(true); 
        if (!get) { 
            return; 
        } 

        const loadSolutions = () => { 
            const query = new URLSearchParams(); 
            query.set('$select', 'friendlyname,uniquename,version,ismanaged,modifiedon'); 
            query.set('$expand', 'publisherid'); 
            query.set('$filter', '(isvisible eq true)'); 
            query.set('$orderby', 'modifiedon desc'); 
            
            const endpoint = '/api/data/v9.0/solutions?'; 
            debugger;
            return get(endpoint, query).then(res => { 
                return res.asJson<IoDataResponse<ISolution>>().then(js => { 
                    setSolutions(js.value); 
                }); 
            }); 
        }; 
        
        Promise.all([loadSolutions()]).then(() => setLoading(false)); 
    }, [connectionName]); 
    
        const navigate = useNavigate();
      
        const onViewClick = (solutionId: string) => {
          navigate(`/${solutionId}`);
        };

    return ( 
        <Spin spinning={loading}> 
            <Table 
                columns={solutionsColumns} 
                loading={loading} 
                dataSource={solutions} 
                rowKey="solutionid" 
                onRow={(record) => ({
                    onClick: () => onViewClick(record.solutionid),
                  })}
                pagination={{ 
                    hideOnSinglePage: true, 
                    pageSize: 150, 
                }} 
            /> 
        </Spin> 
    ); 
};

export const SolutionPicker: React.FC = () => { 
    const { get } = usePowerToolsApi(); 
    const { connectionName } = useContext(PowerToolsContext); 
    const [loading, setLoading] = useState(true); 
    const [solutions, setSolutions] = useState<ISolution[]>([]); 
    
    useEffect(() => { 
        setLoading(true); 
        if (!get) { 
            return; 
        } 
        
        const loadSolutions = () => { 
            const query = new URLSearchParams(); 
            query.set('$select', 'friendlyname,uniquename,version,ismanaged,modifiedon'); 
            query.set('$expand', 'publisherid'); 
            query.set('$filter', '(isvisible eq true)'); 
            query.set('$orderby', 'modifiedon desc'); 
            
            const endpoint = '/api/data/v9.0/solutions?' + query.toString(); 
            return get(endpoint).then(res => { 
                return res.asJson<IoDataResponse<ISolution>>().then(js => { 
                    setSolutions(js.value); 
                }); 
            }); 
        }; 
        
        Promise.all([loadSolutions()]).then(() => setLoading(false)); 
    }, [connectionName]); 

    return ( 
        <Spin spinning={loading}> 
            <Table 
                columns={solutionsColumns} 
                loading={loading} 
                dataSource={solutions} 
                rowKey="solutionid" 
                onRow={(record) => ({
                    onClick: () => {return record.uniquename}
                  })}
                pagination={{ 
                    hideOnSinglePage: true, 
                    pageSize: 150, 
                }} 
            /> 
        </Spin> 
    ); 
};