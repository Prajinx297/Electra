import { z } from 'zod';

import { logger } from './logger';

/**
 * Zod schema describing a trusted civic source metadata object.
 *
 * @returns Zod object schema for source metadata validation.
 * @throws {Error} Never thrown during schema declaration.
 */
export const SourceSchema = z.object({
  title: z.string(),
  publisher: z.string(),
  url: z.string().url(),
  lastVerified: z.string().datetime(),
});

/**
 * Zod schema for trust metadata bundled with Oracle responses.
 *
 * @returns Zod object schema for trust payload validation.
 * @throws {Error} Never thrown during schema declaration.
 */
export const TrustSchema = z.object({
  sources: z.array(SourceSchema),
  confidence: z.number().min(0).max(100),
  rationale: z.string(),
});

/**
 * Zod schema for full Oracle response validation.
 *
 * @returns Zod object schema for Oracle response payloads.
 * @throws {Error} Never thrown during schema declaration.
 */
export const OracleResponseSchema = z.object({
  message: z.string(),
  tone: z.enum(['five-year-old', 'citizen', 'policy-expert']),
  render: z.string().optional(),
  renderProps: z.record(z.string(), z.unknown()).optional(),
  primaryAction: z.object({ label: z.string(), action: z.string() }).optional(),
  secondaryAction: z.object({ label: z.string(), action: z.string() }).optional(),
  progress: z.number().min(0).max(100).optional(),
  proactiveWarning: z.string().optional(),
  stateTransition: z.string().optional(),
  cognitiveLevel: z.enum(['simple', 'standard', 'expert']).optional(),
  nextAnticipated: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(100),
  trust: TrustSchema,
});

/**
 * Type-safe Oracle response inferred from `OracleResponseSchema`.
 */
export type ValidatedOracleResponse = z.infer<typeof OracleResponseSchema>;

/**
 * Validates unknown Oracle API payloads against the canonical schema.
 *
 * @param raw - Unknown payload returned from the Oracle endpoint.
 * @returns A strongly typed and schema-validated Oracle response object.
 * @throws {Error} When payload validation fails.
 */
export function validateOracleResponse(raw: unknown): ValidatedOracleResponse {
  const result = OracleResponseSchema.safeParse(raw);
  if (!result.success) {
    logger.error('Oracle response validation failed', result.error.flatten());
    throw new Error(`Oracle response schema mismatch: ${result.error.message}`);
  }
  return result.data;
}
