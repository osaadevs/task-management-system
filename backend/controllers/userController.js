const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { sendWelcomeEmail, isEmailConfigured } = require('../utils/sendEmail');
const { createNotification } = require('../services/notificationService');
const { PASSWORD_REGEX } = require('../utils/errors');
const generateTempPassword = require('../utils/generateTempPassword');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getRoleId(roleName) {
  const [rows] = await db.promise().query('SELECT id FROM roles WHERE role_name = ?', [roleName]);
  return rows.length > 0 ? rows[0].id : null;
}

async function rollbackNewUser(userId) {
  await db.promise().query('DELETE FROM notifications WHERE user_id = ?', [userId]);
  await db.promise().query('DELETE FROM users WHERE id = ?', [userId]);
}

exports.createUser = async (req, res) => {
  try {
    const full_name = req.body.full_name || req.body.name;
    const { email, role } = req.body;

    if (!full_name || !email || !role) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Full name, email, and role are required',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Email must be valid',
      });
    }

    const validRoles = ['Admin', 'Project Manager', 'Collaborator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Invalid role',
      });
    }

    const roleId = await getRoleId(role);
    if (!roleId) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Role not found in database',
      });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({
        errorCode: 'EMAIL_NOT_CONFIGURED',
        message:
          'Email is not configured on the server. Add RESEND_API_KEY and EMAIL_FROM on Render, then redeploy.',
      });
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const [rows] = await db.promise().query(
      'INSERT INTO users (full_name, email, password_hash, role_id, is_first_login) VALUES (?, ?, ?, ?, TRUE) RETURNING id',
      [full_name, email, hashedPassword, roleId]
    );

    const userId = rows[0]?.id;

    try {
      await sendWelcomeEmail(email, full_name, tempPassword);
    } catch (emailErr) {
      console.error('Welcome email error:', emailErr.message);
      await rollbackNewUser(userId);
      return res.status(502).json({
        errorCode: 'EMAIL_SEND_FAILED',
        message: `Could not send welcome email to ${email}. ${emailErr.message}`,
      });
    }

    try {
      await createNotification(
        userId,
        'Welcome to Taskora',
        'Your account was created. Check your email for login details.',
        'admin_update'
      );
    } catch (notifyErr) {
      console.error('User welcome notification error:', notifyErr.message);
    }

    res.status(201).json({
      message: `User created. Welcome email sent to ${email}.`,
      userId,
      emailSent: true,
    });

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.code === '23505') {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'Email already exists' });
    }
    res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: err.message });
  }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const [results] = await db.promise().query(
      `SELECT u.id, u.full_name AS name, u.email, r.role_name AS role, u.is_active
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.is_active = TRUE
       ORDER BY u.full_name`
    );
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: err.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const [results] = await db.promise().query(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.created_at, r.role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.id`
    );
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const full_name = req.body.full_name || req.body.name;
    const { email, role } = req.body;

    if (!full_name || !email || !role) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Full name, email, and role are required',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Email must be valid',
      });
    }

    const roleId = await getRoleId(role);
    if (!roleId) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Invalid role',
      });
    }

    const [result] = await db.promise().query(
      'UPDATE users SET full_name = ?, email = ?, role_id = ? WHERE id = ?',
      [full_name, email, roleId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'User not found' });
    }

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: err.message });
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.promise().query('UPDATE users SET is_active = FALSE WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'User not found' });
    }

    res.json({ message: 'User deactivated successfully' });
  } catch (err) {
    res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: err.message });
  }
};

exports.activateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.promise().query('UPDATE users SET is_active = TRUE WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'User not found' });
    }

    res.json({ message: 'User activated successfully' });
  } catch (err) {
    res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: err.message });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.created_at, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'User not found' });
    }

    const user = rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role_name,
        is_active: user.is_active !== false && user.is_active !== 0,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: err.message });
  }
};

exports.changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Current password and new password are required',
      });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'New password must be at least 8 characters and include upper, lower, and a number',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'New password must be different from your current password',
      });
    }

    const [rows] = await db.promise().query(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'User not found' });
    }

    const matches = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!matches) {
      return res.status(401).json({
        errorCode: 'INVALID_PASSWORD',
        message: 'Current password is incorrect',
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.promise().query(
      'UPDATE users SET password_hash = ?, is_first_login = FALSE WHERE id = ?',
      [hashed, req.user.id]
    );

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: err.message });
  }
};