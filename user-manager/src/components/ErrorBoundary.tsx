import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // You can log the error to an error reporting service here
        this.setState({
            error,
            errorInfo
        });

        // Log error details (but avoid logging sensitive information)
        const errorDetails = {
            message: error.message,
            stack: error.stack?.substring(0, 500), // Limit stack trace length
            componentStack: errorInfo.componentStack?.substring(0, 500),
            timestamp: new Date().toISOString()
        };

        // In a real application, you would send this to an error tracking service
        // For now, we'll just log it to help with debugging
        if (process.env.NODE_ENV === 'development') {
            console.error('ErrorBoundary caught an error:', errorDetails);
        }
    }

    private handleReload = () => {
        // Reset the error state
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
        
        // Optionally reload the page
        window.location.reload();
    };

    private handleRetry = () => {
        // Just reset the error state to retry rendering
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    public render() {
        if (this.state.hasError) {
            // If a custom fallback is provided, use it
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div style={{ 
                    padding: '20px', 
                    minHeight: '400px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                }}>
                    <Result
                        status="error"
                        title="Something went wrong"
                        subTitle="An unexpected error occurred while loading this component. Please try again."
                        extra={[
                            <Button key="retry" type="primary" onClick={this.handleRetry}>
                                Try Again
                            </Button>,
                            <Button key="reload" onClick={this.handleReload}>
                                Reload Page
                            </Button>
                        ]}
                    >
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div style={{ 
                                textAlign: 'left', 
                                background: '#f5f5f5', 
                                padding: '10px', 
                                marginTop: '20px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontFamily: 'monospace'
                            }}>
                                <strong>Error Details (Development Only):</strong>
                                <br />
                                <strong>Message:</strong> {this.state.error.message}
                                <br />
                                {this.state.error.stack && (
                                    <>
                                        <strong>Stack:</strong>
                                        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '11px' }}>
                                            {this.state.error.stack.substring(0, 1000)}
                                        </pre>
                                    </>
                                )}
                            </div>
                        )}
                    </Result>
                </div>
            );
        }

        return this.props.children;
    }
} 