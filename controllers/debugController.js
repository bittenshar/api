/**
 * Debug endpoint to help troubleshoot header issues on Vercel
 * Accessible at GET /api/debug/headers
 * Shows all headers received by the server
 */

export const debugHeaders = (req, res) => {
  // Get all headers
  const headers = { ...req.headers };
  
  // Analyze each header
  const analysis = {};
  for (const [key, value] of Object.entries(headers)) {
    const strValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    analysis[key] = {
      type: Array.isArray(value) ? 'array' : typeof value,
      length: strValue.length,
      hasNewline: /[\r\n]/.test(strValue),
      hasNull: /[\0\x00]/.test(strValue),
      hasControl: /[\x00-\x1f\x7f]/.test(strValue),
      value: strValue.substring(0, 100), // First 100 chars
    };
  }

  res.status(200).json({
    success: true,
    method: req.method,
    path: req.path,
    headers,
    analysis,
    timestamp: new Date().toISOString(),
  });
};
