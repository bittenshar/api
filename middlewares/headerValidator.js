/**
 * Strict header validation middleware
 * Logs details about headers that might cause issues
 * Does NOT reject requests - just provides diagnostics
 */
export const headerValidator = (req, res, next) => {
  const invalidCharRegex = /[\r\n\0\x00-\x1f]/;
  const headersWithIssues = [];

  // Check each header for invalid characters
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string' && invalidCharRegex.test(value)) {
      headersWithIssues.push({
        header: key,
        hasNewline: /[\r\n]/.test(value),
        hasNull: /[\0\x00]/.test(value),
        hasControl: /[\x00-\x1f]/.test(value),
        length: value.length,
      });
    }
  }

  if (headersWithIssues.length > 0) {
    console.warn('⚠️  Headers with suspicious characters detected (after sanitization):', headersWithIssues);
    
    // For Authorization header specifically, log more details
    if (req.headers.authorization && invalidCharRegex.test(req.headers.authorization)) {
      console.warn('🔴 WARNING: Authorization header contains invalid characters (should have been sanitized)');
      console.warn('Value length:', req.headers.authorization.length);
      
      // Don't reject - let it through but log for debugging
      console.warn('💡 Tip: Ensure your Authorization token is properly formatted without newlines/spaces');
    }
  }

  // Always proceed - don't reject
  next();
};

