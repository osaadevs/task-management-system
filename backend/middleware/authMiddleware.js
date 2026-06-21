const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
};

exports.requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ errorCode: 'FORBIDDEN', message: 'You do not have permission for this action' });
    }
    next();
  };
};