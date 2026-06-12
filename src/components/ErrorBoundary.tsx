import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  variant?: 'page' | 'section';
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    if (this.props.variant === 'section') {
      return (
        <div className="error-section">
          <AlertTriangle size={24} className="error-section-icon" />
          <div>
            <strong>This section failed to load</strong>
            <p>{error.message}</p>
          </div>
          <Button variant="secondary" size="sm" type="button" onClick={this.handleRetry}>
            Retry
          </Button>
        </div>
      );
    }

    return (
      <div className="error-page">
        <AlertTriangle size={48} className="error-page-icon" />
        <h1>Something went wrong</h1>
        <p>The application hit an unexpected error.</p>
        {import.meta.env.DEV ? (
          <pre className="error-page-message">{error.message}</pre>
        ) : null}
        <div className="error-page-actions">
          <Button type="button" onClick={() => window.location.reload()}>
            Reload App
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              void window.api.app.getInfo().then((info) => {
                void window.api.shell.openPath(info.userDataPath);
              });
            }}
          >
            Open Data Folder
          </Button>
        </div>
      </div>
    );
  }
}
