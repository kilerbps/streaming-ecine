/** Types de problèmes RFC 9457 émis par l'API (miroir de apps/api/src/common/problem.ts). */
export const PROBLEM = {
  validation: 'urn:ecine:problem:validation',
  rateLimit: 'urn:ecine:problem:rate-limit',
  unauthenticated: 'urn:ecine:problem:unauthenticated',
  mfaRequired: 'urn:ecine:problem:mfa-required',
  publishBlocked: 'urn:ecine:problem:publish-blocked',
} as const;
