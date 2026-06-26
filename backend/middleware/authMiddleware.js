const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'Invalid or expired token' });
    }

    // RC-2: re-derive identity from the database on every request instead of
    // trusting the (up to 1-day-old) claims in the JWT. This makes admin
    // deactivation and role reassignment take effect immediately, mirroring
    // the live-state check blockIfMustResetPassword already performs.
    try {
      const [rows] = await db.promise().query(
        `SELECT u.id, u.is_active, r.role_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.id = ?`,
        [decoded.id]
      );

      if (!rows.length) {
        return res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'Account no longer exists' });
      }

      if (!rows[0].is_active) {
        return res.status(403).json({ errorCode: 'ACCOUNT_DEACTIVATED', message: 'Account is deactivated' });
      }

      req.user = { id: rows[0].id, role: rows[0].role_name };
      next();
    } catch (lookupErr) {
      console.error('verifyToken account lookup failed:', lookupErr.message);
      return res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: 'Failed to verify account status' });
    }
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