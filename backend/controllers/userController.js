const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { createNotification } = require('../services/notificationService');

const ROLE_IDS = {
  Admin: 1,
  'Project Manager': 2,
  Collaborator: 3,
};

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#';
  let password = 'Aa1';
  for (let i = 0; i < 9; i += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

exports.createUser = async (req, res) => {
  const { name, email, role } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({
      errorCode: 'VALIDATION_ERROR',
      message: 'Name, email, and role are required',
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      errorCode: 'VALIDATION_ERROR',
      message: 'Email must be valid',
    });
  }

  const roleId = ROLE_IDS[role];
  if (!roleId) {
    return res.status(400).json({
      errorCode: 'VALIDATION_ERROR',
      message: 'Invalid role',
    });
  }

  const tempPassword = generateTempPassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  db.query(
    `INSERT INTO users (role_id, full_name, email, password_hash, is_first_login, is_active)
     VALUES (?, ?, ?, ?, TRUE, TRUE)
     RETURNING id`,
    [roleId, name, email, hashedPassword],
    async (err, result) => {
      if (err) {
        if (err.code === '23505') {
          return res.status(400).json({
            errorCode: 'VALIDATION_ERROR',
            message: 'Email already exists',
          });
        }
        return res.status(500).json({
          errorCode: 'INTERNAL_ERROR',
          message: err.message,
        });
      }

      try {
        await createNotification(
          result.insertId,
          'Welcome to TMS',
          'Your account was created. Use your temporary password on first login, then reset it.',
          'admin_update'
        );
      } catch (notifyErr) {
        console.error('User welcome notification error:', notifyErr.message);
      }

      res.status(201).json({
        message: 'User created successfully',
        userId: result.insertId,
        tempPassword,
      });
    }
  );
};

exports.getTeamMembers = (req, res) => {
  const sql = `
    SELECT u.id, u.full_name AS name, u.email, r.role_name AS role, u.is_active
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.is_active = TRUE
    ORDER BY u.full_name
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        errorCode: 'INTERNAL_ERROR',
        message: err.message,
      });
    }
    res.json({ success: true, data: results });
  });
};

exports.getUsers = (req, res) => {
  const sql = `
    SELECT u.id, u.full_name AS name, u.email, r.role_name AS role, u.is_active, u.created_at
    FROM users u
    JOIN roles r ON u.role_id = r.id
    ORDER BY u.id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        errorCode: 'INTERNAL_ERROR',
        message: err.message,
      });
    }
    res.json(results);
  });
};

exports.updateUser = (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;
  const roleId = ROLE_IDS[role];

  if (!name || !email || !role) {
    return res.status(400).json({
      errorCode: 'VALIDATION_ERROR',
      message: 'Name, email, and role are required',
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      errorCode: 'VALIDATION_ERROR',
      message: 'Email must be valid',
    });
  }

  if (!roleId) {
    return res.status(400).json({
      errorCode: 'VALIDATION_ERROR',
      message: 'Invalid role',
    });
  }

  db.query(
    'UPDATE users SET full_name = ?, email = ?, role_id = ? WHERE id = ?',
    [name, email, roleId, id],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          errorCode: 'INTERNAL_ERROR',
          message: err.message,
        });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({
          errorCode: 'NOT_FOUND',
          message: 'User not found',
        });
      }
      res.json({ message: 'User updated successfully' });
    }
  );
};

exports.deactivateUser = (req, res) => {
  const { id } = req.params;

  db.query('UPDATE users SET is_active = FALSE WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({
        errorCode: 'INTERNAL_ERROR',
        message: err.message,
      });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({
        errorCode: 'NOT_FOUND',
        message: 'User not found',
      });
    }
    res.json({ message: 'User deactivated successfully' });
  });
};

exports.activateUser = (req, res) => {
  const { id } = req.params;

  db.query('UPDATE users SET is_active = TRUE WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({
        errorCode: 'INTERNAL_ERROR',
        message: err.message,
      });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({
        errorCode: 'NOT_FOUND',
        message: 'User not found',
      });
    }
    res.json({ message: 'User activated successfully' });
  });
};
