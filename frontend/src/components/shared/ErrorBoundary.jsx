/*
 * @name ErrorBoundary
 * @file /docman/frontend/src/components/shared/ErrorBoundary.jsx
 * @component ErrorBoundary
 * @description React error boundary component for graceful error handling and user feedback
 * @author Richard Bakos
 * @version 2.2.0
 * @license UNLICENSED
 */
import { Component } from "react";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import PropTypes from "prop-types";

/**
 * Error boundary component for catching and handling React errors
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    /**
     * Static method to update state when an error occurs
     * @param {Error} error - The error that occurred
     * @returns {Object} New state object
     */
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error
        };
    }

    /**
     * Lifecycle method called when an error occurs
     * @param {Error} error - The error that occurred
     * @param {Object} errorInfo - Additional error information
     */
    componentDidCatch(error, errorInfo) {
        this.setState({
            error,
            errorInfo
        });

        // Log error to console in development
        if (process.env.NODE_ENV === "development") {
            console.error("Error caught by ErrorBoundary:", error, errorInfo);
        }

        // Call onError callback if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    /**
     * Reset error state to retry rendering
     */
    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI if provided
            if (this.props.fallback) {
                return this.props.fallback(
                    this.state.error,
                    this.state.errorInfo,
                    this.handleRetry
                );
            }

            // Default error UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-base-100 p-4">
                    <div className="max-w-md w-full text-center">
                        <div className="bg-base-200 rounded-lg p-8 shadow-lg">
                            {/* Error Icon */}
                            <div className="flex justify-center mb-4">
                                <AlertTriangleIcon className="w-16 h-16 text-error" />
                            </div>

                            {/* Error Title */}
                            <h1 className="text-2xl font-bold text-base-content mb-2">
                                {this.props.title || "Something went wrong"}
                            </h1>

                            {/* Error Message */}
                            <p className="text-base-content/70 mb-6">
                                {this.props.message || 
                                 "We're sorry, but something unexpected happened. Please try refreshing the page."}
                            </p>

                            {/* Error Details (Development Only) */}
                            {process.env.NODE_ENV === "development" && this.state.error && (
                                <details className="text-left mb-6 bg-base-300 rounded p-4">
                                    <summary className="cursor-pointer font-medium text-sm mb-2">
                                        Error Details (Development)
                                    </summary>
                                    <pre className="text-xs overflow-auto max-h-32 text-error">
                                        {this.state.error.toString()}
                                        {this.state.errorInfo?.componentStack}
                                    </pre>
                                </details>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <button
                                    onClick={this.handleRetry}
                                    className="btn btn-primary"
                                >
                                    <RefreshCwIcon className="w-4 h-4 mr-2" />
                                    Try Again
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="btn btn-outline"
                                >
                                    Refresh Page
                                </button>
                            </div>

                            {/* Additional Actions */}
                            {this.props.showHomeButton && (
                                <div className="mt-4">
                                    <button
                                        onClick={() => window.location.href = "/"}
                                        className="btn btn-ghost btn-sm"
                                    >
                                        Go to Home
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
    fallback: PropTypes.func,
    onError: PropTypes.func,
    title: PropTypes.string,
    message: PropTypes.string,
    showHomeButton: PropTypes.bool
};

export default ErrorBoundary;
