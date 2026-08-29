const config = require('../config/env');

const errorHandler = (err, req, res, next) => {
  console.error('[Error]:', err.message);
  
  if (config.env === 'development') {
    console.error(err.stack);
  }

  const statusCode = err.status || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  
  const message = (statusCode === 500 && config.env === 'production') 
    ? 'An unexpected error occurred.' 
    : err.message || 'An unexpected error occurred.';

  res.status(statusCode).json({
    error: { code: errorCode, message }
  });
};

module.exports = { errorHandler };
