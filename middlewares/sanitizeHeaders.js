/**
 * Sanitize HTTP headers to remove invalid characters
 * Particularly useful for Vercel which has stricter header validation
 */
export const sanitizeHeaders = (req, res, next) => {
  // Sanitize incoming request headers
  const headers = req.headers;
  
  // Critical headers to sanitize
  const headersToSanitize = [
    'authorization',
    'x-api-key',
    'content-type',
    'user-agent',
    'accept',
    'referer',
    'origin'
  ];

  headersToSanitize.forEach((headerName) => {
    if (headers[headerName]) {
      // Remove trailing newlines, carriage returns, and null bytes
      headers[headerName] = headers[headerName]
        .toString()
        .trim()
        .replace(/[\r\n\0]/g, '');
    }
  });

  // Also wrap res.setHeader to sanitize outgoing headers
  const originalSetHeader = res.setHeader;
  res.setHeader = function(name, value) {
    if (typeof value === 'string') {
      value = value.trim().replace(/[\r\n\0]/g, '');
    }
    return originalSetHeader.call(this, name, value);
  };

  next();
};

