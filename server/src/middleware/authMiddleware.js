import jwt from 'jsonwebtoken';

/**
 * Validates JWT token and attaches user to request
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback-secret-key-123'
    );
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Restricts access to specific roles
 */
export const authorize = (roles = []) => {
  if (typeof roles === 'string') roles = [roles];

  return (req, res, next) => {
    if (!req.user || (roles.length && !roles.includes(req.user.role))) {
      return res.status(403).json({ error: 'Access denied. Unauthorized role.' });
    }
    next();
  };
};
