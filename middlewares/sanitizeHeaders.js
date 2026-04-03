/**
 * Sanitize HTTP headers to remove invalid characters
 * Particularly useful for Vercel which has stricter header validation
 * Runs FIRST before any other middleware
 */
export const sanitizeHeaders = (req, res, next) => {
  // Sanitize incoming request headers
  const headers = req.headers;
  
  // ALL headers are sanitized aggressively
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      // Remove all control characters, newlines, carriage returns, null bytes, and tabs
      headers[key] = value
        .trim()
        .replace(/[\r\n\0\t\x00-\x1f\x7f]/g, '');
    } else if (Array.isArray(value)) {
      // Handle array values (some headers can be arrays)
      headers[key] = value.map(v => 
        v.trim().replace(/[\r\n\0\t\x00-\x1f\x7f]/g, '')
      );
    }
  }

  // Also wrap res.setHeader to sanitize outgoing headers
  const originalSetHeader = res.setHeader;
  res.setHeader = function(name, value) {
    if (typeof value === 'string') {
      value = value.trim().replace(/[\r\n\0\t\x00-\x1f\x7f]/g, '');
    }
    return originalSetHeader.call(this, name, value);
  };

  next();
};

