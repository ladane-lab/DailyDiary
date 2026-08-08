import sanitizeHtml from 'sanitize-html';

/**
 * Sanitizer Service wrapper utilizing sanitize-html library.
 * 
 * DESIGN DECISION: Why we use sanitize-html instead of custom regex:
 * 1. Custom regex parsers are notoriously fragile and can be bypassed using XML namespace tricks,
 *    nested HTML tags, and obscure SVG/MathML handlers.
 * 2. sanitize-html parses strings into an Abstract Syntax Tree (AST), ensuring all malformed tags
 *    are closed, and recursively strips any tags/attributes not explicitly whitelisted.
 * 3. We restrict sanitization ONLY to fields where HTML formatting is intentionally permitted (e.g. 
 *    journal entry bodies). Standard string fields (email, names, IDs, query keys) are checked strictly 
 *    via Zod validations.
 */

const SAFE_SANITIZATION_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
    'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
    'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'span', 'u'
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    span: ['style', 'class'],
    div: ['style', 'class'],
    p: ['style', 'class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {},
  allowProtocolRelative: false,
};

/**
 * Sanitizes rich text HTML content using sanitize-html.
 */
export function sanitizeRichText(htmlContent: string): string {
  if (!htmlContent) return '';
  return sanitizeHtml(htmlContent, SAFE_SANITIZATION_OPTIONS);
}

/**
 * Recursively scans and sanitizes permitted HTML text inside objects/arrays.
 */
export function sanitizeInput<T>(input: T): T {
  if (typeof input === 'string') {
    return sanitizeRichText(input) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item)) as unknown as T;
  }

  if (input !== null && typeof input === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitizedObj[key] = sanitizeInput(value);
    }
    return sanitizedObj as unknown as T;
  }

  return input;
}
