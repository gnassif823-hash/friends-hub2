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
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent mb-4">
                        Something went wrong.
                    </h1>
                    <p className="text-slate-400 mb-8 max-w-md">
                        The application crashed. This is likely due to missing configuration or a temporary glitch.
                    </p>
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-left overflow-auto max-w-2xl w-full mb-6">
                        <code className="text-red-400 font-mono text-sm">
                            {this.state.error && this.state.error.toString()}
                        </code>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors font-bold"
                    >
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
