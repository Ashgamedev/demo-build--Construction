import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Changing this clears the error - pass the current route so navigating
   *  away from a broken page recovers instead of staying stuck. */
  resetKey?: string;
  /** "page" keeps the surrounding shell (sidebar, header) usable.
   *  "app" is the last resort when even the shell failed. */
  variant?: 'page' | 'app';
}

interface State {
  error: Error | null;
  showDetails: boolean;
}

/**
 * Stops one broken screen taking down the whole CRM.
 *
 * Without this, a single render error blanks the entire page - which is
 * exactly what happened in testing: an unrelated stale module left the user
 * staring at a white screen with no way back.
 *
 * The message stays in plain language for the person using it, but the real
 * error is kept and shown on request rather than swallowed, so it can be
 * reported accurately.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, showDetails: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Caught by ErrorBoundary:', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    // Navigating to a different page should clear a previous page's error.
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null, showDetails: false });
    }
  }

  render() {
    const { error, showDetails } = this.state;
    if (!error) return this.props.children;

    const isApp = this.props.variant === 'app';

    return (
      <div className={isApp ? 'min-h-screen bg-slate-50 flex items-center justify-center p-6' : 'p-6'}>
        <div className="max-w-lg w-full bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {isApp ? 'Something went wrong' : 'This page could not be shown'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {isApp
                  ? 'The app hit a problem it could not recover from. Nothing you saved has been lost.'
                  : 'Something on this page failed to load. The rest of the system is still working — you can carry on elsewhere. Nothing you saved has been lost.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            <button
              onClick={() => this.setState({ error: null, showDetails: false })}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Home className="w-4 h-4" /> Back to dashboard
            </a>
          </div>

          {/* The real error is kept, not swallowed - so it can be reported. */}
          <button
            onClick={() => this.setState({ showDetails: !showDetails })}
            className="mt-4 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            {showDetails ? 'Hide technical details' : 'Show technical details'}
          </button>

          {showDetails && (
            <pre className="mt-2 p-3 bg-slate-50 border border-gray-200 rounded text-[11px] text-gray-700 overflow-x-auto whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
