import { AnalyticsService } from '@/services/analytics.service';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown> | undefined;
  timestamp: string;
}

const isDev = import.meta.env.DEV;

function formatEntry(entry: LogEntry): string {
  return `[Electra:${entry.level.toUpperCase()}] ${entry.timestamp} - ${entry.message}`;
}

export const logger = {
  /**
   * Emits an informational development log entry.
   *
   * @param message - Human-readable log message.
   * @param data - Optional structured metadata payload.
   * @returns No return value.
   * @throws {Error} Never thrown directly; logging failures are ignored.
   */
  info(message: string, data?: Record<string, unknown>): void {
    if (isDev) {
      const entry: LogEntry = {
        level: 'info',
        message,
        data,
        timestamp: new Date().toISOString(),
      };
      // eslint-disable-next-line no-console -- dev-only structured logger
      console.info(formatEntry(entry), data ?? '');
    }
  },

  /**
   * Emits a warning log entry.
   *
   * @param message - Human-readable warning message.
   * @param data - Optional structured metadata payload.
   * @returns No return value.
   * @throws {Error} Never thrown directly; logging failures are ignored.
   */
  warn(message: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: 'warn',
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    if (isDev) {
      // eslint-disable-next-line no-console -- dev-only structured logger
      console.warn(formatEntry(entry), data ?? '');
    }
  },

  /**
   * Emits an error log entry and forwards telemetry.
   *
   * @param message - Human-readable error summary.
   * @param error - Optional unknown error payload.
   * @returns No return value.
   * @throws {Error} Never thrown directly; telemetry failures are ignored.
   */
  error(message: string, error?: unknown): void {
    const entry: LogEntry = {
      level: 'error',
      message,
      data: { error: String(error) },
      timestamp: new Date().toISOString(),
    };
    if (isDev) {
      // eslint-disable-next-line no-console -- dev-only structured logger
      console.error(formatEntry(entry), error ?? '');
    }
    AnalyticsService.trackError(message, String(error));
  },
};
