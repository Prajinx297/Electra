/**
 * Shared Firebase Analytics instance for frontend telemetry.
 *
 * @returns {import('firebase/analytics').Analytics | null} Active analytics instance when supported.
 * @throws {Error} Never thrown directly from this export.
 */
export { analytics } from '../firebase/config';
