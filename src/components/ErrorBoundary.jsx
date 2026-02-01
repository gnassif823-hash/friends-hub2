import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100">
                    <h1 className="text-3xl font-bold text-red-500 mb-4">Something went wrong</h1>
                    <p className="text-slate-400 mb-6 max-w-md">
                        The application crashed. This is likely due to missing configuration or a temporary glitch.
                    </p>
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-left font-mono text-xs text-red-400 max-w-lg overflow-auto mb-6">
                        {this.state.error?.toString()}
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-colors"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
