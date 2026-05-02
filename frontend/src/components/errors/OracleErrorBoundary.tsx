import React from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class OracleErrorBoundary extends React.Component<Props, State> {
  public override state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('OracleErrorBoundary caught error', {
      componentStack: info.componentStack,
      error: error.message,
    });
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div role="alert" aria-live="assertive" className="oracle-error">
            <h2>Something went wrong with the Oracle.</h2>
            <p>We have logged the issue. Please try refreshing.</p>
            <button
              type="button"
              onClick={(): void => this.setState({ hasError: false, error: null })}
              aria-label="Retry Oracle rendering"
            >
              Try Again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
