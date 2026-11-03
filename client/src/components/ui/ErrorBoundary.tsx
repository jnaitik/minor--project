// ============================================================================
// ErrorBoundary.tsx — React Error Boundary for crash resilience
//
// Prevents the application from showing a blank screen if any unexpected
// render error occurs in child components.
// ============================================================================

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-dark-900/95 border border-red-500/40 rounded-lg text-dark-100 backdrop-blur-md m-2 shadow-2xl">
          <div className="flex items-center gap-2 text-red-400 font-semibold text-sm mb-1">
            <AlertTriangle size={18} />
            <span>{this.props.fallbackTitle || 'A component error occurred'}</span>
          </div>
          <p className="text-xs text-dark-300 mb-3">
            {this.props.fallbackMessage || this.state.error?.message || 'Something went wrong while rendering this section.'}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-xs text-dark-200 rounded border border-dark-600 transition-colors"
          >
            <RefreshCw size={12} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

