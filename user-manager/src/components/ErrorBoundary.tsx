import React from 'react';
import { Result, Button } from 'antd';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
    errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ error, errorInfo });
        
        // Log error in development only
        if (process.env.NODE_ENV === 'development') {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ 
                    padding: '50px', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    minHeight: '50vh'
                }}>
                    <Result
                        status="error"
                        title="Something went wrong"
                        subTitle={
                            process.env.NODE_ENV === 'development' 
                                ? `Error: ${this.state.error?.message}` 
                                : "An unexpected error occurred. Please try refreshing the page."
                        }
                        extra={[
                            <Button type="primary" key="retry" onClick={this.handleReset}>
                                Try Again
                            </Button>,
                            <Button key="reload" onClick={() => window.location.reload()}>
                                Reload Page
                            </Button>,
                        ]}
                    />
                </div>
            );
        }

        return this.props.children;
    }
}