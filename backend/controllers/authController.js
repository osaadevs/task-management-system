const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { PASSWORD_REGEX, validationError, internalError } = require('../utils/errors');
const generateTempPassword = require('../utils/generateTempPassword');
const { sendForgotPasswordEmail, isEmailConfigured } = require('../utils/sendEmail');

const FORGOT_PASSWORD_SUCCESS_MESSAGE =
  'If an account matches that email or name, a temporary password has been sent. Check your inbox and sign in to set a new password.';

const DB_UNAVAILABLE =
  /connection is in closed state|Connection terminated|ECONNRESET|ENOTFOUND|ETIMEDOUT|connection timeout|All database connection attempts failed/i;

exports.login = async (req, res) => {
  try {
    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      const errors = [];
      if (!email) errors.push({ field: 'email', message: 'Email is required' });
      if (!password) errors.push({ field: 'password', message: 'Password is required' });
      return validationError(res, errors, 'Email and password are required');
    }

    const query = `SELECT u.*, r.role_name
                   FROM users u
                   JOIN roles r ON u.role_id = r.id
                   WHERE LOWER(u.email) = ?`;
    const [results] = await db.promise().query(query, [email]);

    if (results.length === 0) {
      return res.status(401).json({
        errorCode: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({
        errorCode: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        errorCode: 'FORBIDDEN',
        message: 'Account is deactivated',
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role_name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      mustResetPassword: !!user.is_first_login,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role_name,
      },
    });
  } catch (err) {
    if (DB_UNAVAILABLE.test(err.message)) {
      return res.status(503).json({
        errorCode: 'DATABASE_UNAVAILABLE',
        message:
          'Cannot reach the database. Ensure the backend is running and connected (check terminal for "PostgreSQL connected").',
      });
    }
    return internalError(res, err, 'Login failed');
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const body = req.body || {};
    const identifier = String(body.email || body.username || '').trim();

    if (!identifier) {
      return validationError(res, [{ field: 'email', message: 'Work email or name is required' }]);
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({
        errorCode: 'EMAIL_NOT_CONFIGURED',
        message: 'Password reset email is not available. Set RESEND_API_KEY on the server (Render dashboard), then redeploy.',
      });
    }

    const [rows] = await db.promise().query(
      `SELECT u.id, u.full_name, u.email, u.is_active
       FROM users u
       WHERE LOWER(u.email) = LOWER(?) OR LOWER(u.full_name) = LOWER(?)
       LIMIT 1`,
      [identifier, identifier]
    );

    if (!rows.length) {
      return res.json({
        success: true,
        message: FORGOT_PASSWORD_SUCCESS_MESSAGE,
      });
    }

    const user = rows[0];

    // BE-1: a public, unauthenticated reset must never resurrect an account an
    // admin has deactivated. Skip silently (same generic response as "no match")
    // so the endpoint still doesn't reveal whether the account exists.
    if (!user.is_active) {
      return res.json({
        success: true,
        message: FORGOT_PASSWORD_SUCCESS_MESSAGE,
      });
    }

    const temporaryPassword = generateTempPassword();

    try {
      await sendForgotPasswordEmail(user.email, user.full_name, temporaryPassword);
    } catch (emailErr) {
      console.error('Forgot password email error:', emailErr);
      return res.status(503).json({
        errorCode: 'EMAIL_SEND_FAILED',
        message: emailErr.message || 'Could not send the reset email. Please try again later or contact your administrator.',
      });
    }

    const hashed = await bcrypt.hash(temporaryPassword, 10);
    await db.promise().query(
      'UPDATE users SET password_hash = ?, is_first_login = TRUE WHERE id = ?',
      [hashed, user.id]
    );

    res.json({
      success: true,
      message: FORGOT_PASSWORD_SUCCESS_MESSAGE,
    });
  } catch (err) {
    return internalError(res, err, 'Password reset request failed');
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body || {};
    const userId = req.user.id;

    if (!newPassword || !PASSWORD_REGEX.test(newPassword)) {
      return validationError(res, [
        { field: 'newPassword', message: 'Password must be at least 8 characters and include upper, lower, a number, and a symbol' },
      ]);
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.promise().query(
      'UPDATE users SET password_hash = ?, is_first_login = FALSE WHERE id = ?',
      [hashed, userId]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    return internalError(res, err, 'Password reset failed');
  }
};