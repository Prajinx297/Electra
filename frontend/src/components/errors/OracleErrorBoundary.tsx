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

/**
 * Catches rendering failures inside Oracle-driven panels and shows a recoverable fallback.
 *
 * Keeps dynamic civic components from blanking the whole application when a response
 * payload renders an invalid component tree.
 */
export class OracleErrorBoundary extends React.Component<Props, State> {
  public override state: State = { hasError: false, error: null };

  /**
   * Stores the thrown error so the boundary renders its fallback UI.
   *
   * @param error - Error raised by a descendant during render or lifecycle work
   * @returns Updated boundary state indicating that fallback UI should be shown
   */
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * Records Oracle component failures with React component stack context.
   *
   * @param error - Error raised by the descendant component
   * @param info - React component stack for the failed render path
   */
  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('OracleErrorBoundary caught error', {
      componentStack: info.componentStack,
      error: error.message,
    });
  }

  /**
   * Renders children until an Oracle rendering error requires fallback UI.
   *
   * @returns Descendant content, a supplied fallback, or the default retry panel
   */
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
