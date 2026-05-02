import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OracleErrorBoundary } from '@/components/errors/OracleErrorBoundary';

const ThrowingChild = ({ shouldThrow }: { shouldThrow: boolean }): JSX.Element => {
  if (shouldThrow) {
    throw new Error('Oracle failure');
  }

  return <div>Oracle content loaded</div>;
};

describe('OracleErrorBoundary', (): void => {
  it('renders children when no error', (): void => {
    render(
      <OracleErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </OracleErrorBoundary>,
    );
    expect(screen.getByText('Oracle content loaded')).toBeInTheDocument();
  });

  it('renders fallback UI on error', (): void => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation((): undefined => undefined);
    render(
      <OracleErrorBoundary>
        <ThrowingChild shouldThrow />
      </OracleErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('allows retry after error', async (): Promise<void> => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation((): undefined => undefined);
    render(
      <OracleErrorBoundary>
        <ThrowingChild shouldThrow />
      </OracleErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: /retry/i }));
    consoleError.mockRestore();
  });
});
