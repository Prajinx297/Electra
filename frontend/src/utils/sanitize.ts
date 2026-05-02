const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#x27;',
  '<': '&lt;',
  '>': '&gt;',
};

/**
 * Sanitizes free-form user input before sending to API services.
 *
 * @param input - Raw untrusted user text.
 * @returns Trimmed, length-limited, and HTML-escaped safe string.
 * @throws {Error} Never thrown directly for normal string input.
 */
export function sanitizeUserInput(input: string): string {
  return input
    .trim()
    .slice(0, 2000)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>&"']/g, (char): string => HTML_ESCAPE_MAP[char] ?? char);
}
