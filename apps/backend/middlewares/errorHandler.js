/**
 * Error handler middleware
 */
function errorHandler(err, req, res, next) {
    console.error('Error:', err.stack);
  
    // Default error
    let status = err.status || 500;
    let message = err.message || 'Internal Server Error';
  
    // Handle specific error types
    if (err.name === 'ValidationError') {
      status = 400;
      message = 'Validation Error';
    } else if (err.name === 'UnauthorizedError') {
      status = 401;
      message = 'Unauthorized';
    }
  
    res.status(status).json({
      success: false,
      error: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
  
  /**
   * 404 handler
   */
  function notFoundHandler(req, res) {
    res.status(404).json({
      success: false,
      error: 'Route not found',
      path: req.originalUrl
    });
  }
  
  module.exports = {
    errorHandler,
    notFoundHandler
  };