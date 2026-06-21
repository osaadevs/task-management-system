const bcrypt = require('bcryptjs');
const db = require('../config/db');

function generateTempPassword() {
  return Math.random().toString(36).slice(-8);
}

// Maps role name (from frontend) to role_id (for the database)
async function getRoleId(roleName) {
  const [rows] = await db.promise().query('SELECT id FROM roles WHERE role_name = ?', [roleName]);
  return rows.length > 0 ? rows[0].id : null;
}

exports.createUser = async (req, res) => {
  try {
    const { full_name, email, role } = req.body;

    if (!full_name || !email || !role) {
      return res.status(400).json({ error: 'Bad Request', message: 'Full name, email, and role are required' });
    }

    const validRoles = ['Admin', 'Project Manager', 'Collaborator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid role' });
    }

    const roleId = await getRoleId(role);
    if (!roleId) {
      return res.status(400).json({ error: 'Bad Request', message: 'Role not found in database' });
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const [result] = await db.promise().query(
      'INSERT INTO users (full_name, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
      [full_name, email, hashedPassword, roleId]
    );

    // TODO: send tempPassword via nodemailer instead of console.log
    console.log(`Temp password for ${email}: ${tempPassword}`);

    res.status(201).json({ message: 'User created successfully', userId: result.insertId });

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Bad Request', message: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
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
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role } = req.body;

    let roleId = null;
    if (role) {
      roleId = await getRoleId(role);
      if (!roleId) {
        return res.status(400).json({ error: 'Bad Request', message: 'Role not found in database' });
      }
    }

    const [result] = await db.promise().query(
      'UPDATE users SET full_name = ?, email = ?, role_id = COALESCE(?, role_id) WHERE id = ?',
      [full_name, email, roleId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.promise().query('UPDATE users SET is_active = 0 WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    res.json({ message: 'User deactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};