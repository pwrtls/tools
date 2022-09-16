import React from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export const ViewSolutionDetailsButton: React.FC<{ solutionId: string }> = (props) => {
    const navigate = useNavigate();

    const onViewClick = () => {
        navigate(`/${ props.solutionId }`);
    }

    return (
        <Button size="small" onClick={onViewClick}>View</Button>
    );
}
