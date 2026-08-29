const config = require('../config/env');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header. Expected Format: Bearer <token>' }
    });
  }

  const token = authHeader.split(' ')[1];

  if (token !== config.internalApiKey) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid API key.' }
    });
  }
  next();
};

module.exports = { authenticate };
