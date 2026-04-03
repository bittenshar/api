/**
 * Strict header validation middleware
 * Logs details about headers that might cause issues
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
    console.warn('⚠️  Headers with suspicious characters detected:', headersWithIssues);
    
    // For Authorization header specifically, log more details
    if (req.headers.authorization && invalidCharRegex.test(req.headers.authorization)) {
      console.warn('🔴 CRITICAL: Authorization header contains invalid characters');
      console.warn('Value preview:', JSON.stringify(req.headers.authorization));
      
      return res.status(400).json({
        success: false,
        error: {
          message: 'Authorization header contains invalid characters (newlines, null bytes, etc). Ensure token is clean.',
          statusCode: 400,
          tip: 'Check your .env file for trailing newlines. Environment variables should be trimmed.',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  next();
};
