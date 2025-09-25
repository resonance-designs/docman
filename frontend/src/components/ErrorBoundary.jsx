/*
 * @name Error Boundary Component
 * @file /docman/frontend/src/components/ErrorBoundary.jsx
 * @component ErrorBoundary
 * @description Component for catching and displaying React errors
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import React from "react";

/**
 * Error boundary component to catch and display React errors
 * @class ErrorBoundary
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error for debugging
        console.error("🚨 React Error Boundary caught an error:", error);
        console.error("🚨 Error Info:", errorInfo);
        
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div className="min-h-screen bg-base-100 flex items-center justify-center">
                    <div className="text-center p-8 max-w-md mx-auto">
                        <h1 className="text-2xl font-bold text-red-600 mb-4">
                            Something went wrong
                        </h1>
                        <p className="text-gray-600 mb-4">
                            The application encountered an error. This is usually caused by invalid data or network issues.
                        </p>
                        <div className="space-y-2">
                            <button
                                className="btn btn-primary w-full"
                                onClick={() => window.location.reload()}
                            >
                                Reload Page
                            </button>
                            <button
                                className="btn btn-ghost w-full"
                                onClick={() => {
                                    localStorage.clear();
                                    window.location.href = '/';
                                }}
                            >
                                Clear Data & Go Home
                            </button>
                        </div>
                        {process.env.NODE_ENV === 'development' && (
                            <details className="mt-4 text-left">
                                <summary className="cursor-pointer text-sm text-gray-500">
                                    Error Details (Development)
                                </summary>
                                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                                    {this.state.error && this.state.error.toString()}
                                    <br />
                                    {this.state.errorInfo?.componentStack || 'No component stack available'}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
