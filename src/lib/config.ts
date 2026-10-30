// src/lib/config.ts -- Feature flags and configuration
// Centralized config for feature toggles that can be controlled via env vars

/**
 * Content encryption feature flag.
 * When true, the player uses encrypted audio/text/image delivery.
 * When false, the current behavior is preserved (direct audio stream, public images).
 * Default: false (opt-in until fully validated).
 *
 * Set PUBLIC_ENABLE_ENCRYPTION=true in .env.local to enable.
 */
export const ENABLE_ENCRYPTION: boolean =
  typeof import.meta !== 'undefined' &&
  typeof import.meta.env !== 'undefined' &&
  import.meta.env.PUBLIC_ENABLE_ENCRYPTION === 'true'
