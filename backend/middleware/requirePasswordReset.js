const db = require('../config/db');

exports.blockIfMustResetPassword = async (req, res, next) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT is_first_login FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length && rows[0].is_first_login) {
      return res.status(403).json({
        errorCode: 'PASSWORD_RESET_REQUIRED',
        message: 'Password reset required before accessing this resource',
        description: 'Complete your first-login password reset to continue',
      });
    }

    next();
  } catch (err) {
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to verify account status',
      description: err.message,
    });
  }
};
