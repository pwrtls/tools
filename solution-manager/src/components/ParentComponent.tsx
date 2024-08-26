import React, { ErrorInfo } from 'react';
import { SolutionCopy } from './SolutionCopy';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
    constructor(props: {children: React.ReactNode}) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_: Error) {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.log('Error in SolutionCopy:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <h1>Something went wrong with SolutionCopy.</h1>;
        }

        return this.props.children;
    }
}

export const ParentComponent: React.FC = () => {
    return (
        <div>
            <h1>Parent Component</h1>
            <SolutionCopy sourceSolutionId="source-id" targetSolutionId="target-id" />
        </div>
    );
};