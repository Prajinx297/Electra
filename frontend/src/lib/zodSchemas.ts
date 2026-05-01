import { z } from "zod";

export const SourceSchema = z.object({
  title: z.string(),
  publisher: z.string(),
  url: z.string().url(),
  lastVerified: z.string().datetime()
});

export const TrustSchema = z.object({
  sources: z.array(SourceSchema),
  confidence: z.number().min(0).max(100),
  rationale: z.string()
});

export const OracleResponseSchema = z.object({
  message: z.string(),
  tone: z.enum(["five-year-old", "citizen", "policy-expert"]),
  render: z.string().optional(),
  renderProps: z.record(z.string(), z.unknown()).optional(),
  primaryAction: z.object({ label: z.string(), action: z.string() }).optional(),
  secondaryAction: z.object({ label: z.string(), action: z.string() }).optional(),
  progress: z.number().min(0).max(100).optional(),
  proactiveWarning: z.string().optional(),
  stateTransition: z.string().optional(),
  cognitiveLevel: z.enum(["simple", "standard", "expert"]).optional(),
  nextAnticipated: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(100),
  trust: TrustSchema
});

export type ValidatedOracleResponse = z.infer<typeof OracleResponseSchema>;

export function validateOracleResponse(raw: unknown): ValidatedOracleResponse {
  const result = OracleResponseSchema.safeParse(raw);
  if (!result.success) {
    console.error("[ELECTRA] Oracle response validation failed:", result.error.flatten());
    throw new Error(`Oracle response schema mismatch: ${result.error.message}`);
  }
  return result.data;
}
