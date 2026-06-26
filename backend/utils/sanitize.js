// BE-6: defense-in-depth against stored XSS. The frontend already auto-escapes
// (React, no dangerouslySetInnerHTML), but stored values can reach other
// consumers (emails, exports, future templating), so strip HTML on input rather
// than relying on a single output layer. Plain text is preserved; only markup is
// removed (e.g. "a < b" stays, "<script>x</script>" and "<img onerror=…>" go).
function sanitizeText(value) {
  if (typeof value !== 'string') return value;
  return value
    // Drop <script>/<style> blocks together with their contents.
    .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    // Drop any remaining HTML tags (opening, closing, self-closing).
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .trim();
}

module.exports = { sanitizeText };
