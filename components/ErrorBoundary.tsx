
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                    <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 md:p-12 text-center">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>

                        <h1 className="text-2xl font-black text-slate-900 mb-3">Algo salió mal</h1>
                        <p className="text-slate-500 font-medium mb-8">
                            La aplicación ha encontrado un error crítico y no puede continuar.
                        </p>

                        {this.state.error && (
                            <div className="text-left bg-slate-900 rounded-2xl p-4 overflow-auto max-h-60 mb-8 border border-slate-800">
                                <p className="text-red-400 font-mono text-xs font-bold mb-2">Error: {this.state.error.toString()}</p>
                                {this.state.errorInfo && (
                                    <pre className="text-slate-500 font-mono text-[10px] whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => window.location.href = '/'}
                            className="px-8 py-4 bg-[#d3b3a8] hover:bg-[#c4a499] text-white rounded-xl font-black text-sm shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 mx-auto active:scale-95"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            RECARGAR APLICACIÓN
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
