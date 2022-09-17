import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';

export const ViewSolutionDetailsButton: React.FC<{ solutionId: string }> = (props) => {
    const navigate = useNavigate();

    const onViewClick = () => {
        navigate(`/${ props.solutionId }`);
    }

    return (
        <Button size="small" onClick={onViewClick}>View</Button>
    );
}
