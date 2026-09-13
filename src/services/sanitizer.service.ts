/**
 * Text Sanitizer Service
 * Strips control characters, normalizes whitespace, and caps length to protect AI prompt limits.
 */

export function sanitizeText(text: string, maxLength = 12000): string {
  if (!text || typeof text !== 'string') return '';

  return text
    // Remove null bytes and non-printable control characters (except newline, tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize unicode linebreaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Reduce excessive multiple empty lines
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, maxLength);
}

/**
 * Basic redaction helper for obvious social security numbers or credit card numbers if present
 */
export function redactSensitivePII(text: string): string {
  return text
    // SSN pattern: 000-00-0000
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
    // 16-digit credit card pattern
    .replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, '[REDACTED_CC]');
}
