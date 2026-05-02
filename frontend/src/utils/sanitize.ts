const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#x27;',
  '<': '&lt;',
  '>': '&gt;',
};

export function sanitizeUserInput(input: string): string {
  return input
    .trim()
    .slice(0, 2000)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>&"']/g, (char): string => HTML_ESCAPE_MAP[char] ?? char);
}
