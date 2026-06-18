const bcrypt = require('bcryptjs');
const db = require('../config/db');

const ROLE_IDS = {
  Admin: 1,
  'Project Manager': 2,
  Collaborator: 3,
};

function generateTempPassword() {
  return Math.random().toString(36).slice(-8);
}

exports.createUser = async (req, res) => {
  const { name, email, role } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Bad Request', message: 'Name, email, and role are required' });
  }

  const roleId = ROLE_IDS[role];
  if (!roleId) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid role' });
  }

  const tempPassword = generateTempPassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  db.query(
    `INSERT INTO users (role_id, full_name, email, password_hash, is_first_login, is_active)
     VALUES (?, ?, ?, ?, TRUE, TRUE)`,
    [roleId, name, email, hashedPassword],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'Bad Request', message: 'Email already exists' });
        }
        return res.status(500).json({ error: 'Internal Server Error', message: err.message });
      }

      console.log(`Temp password for ${email}: ${tempPassword}`);
      res.status(201).json({ message: 'User created successfully', userId: result.insertId });
    }
  );
};

exports.getUsers = (req, res) => {
  const sql = `
    SELECT u.id, u.full_name AS name, u.email, r.role_name AS role, u.is_active, u.created_at
    FROM users u
    JOIN roles r ON u.role_id = r.id
    ORDER BY u.id
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Internal Server Error', message: err.message });
    res.json(results);
  });
};

exports.updateUser = (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;
  const roleId = ROLE_IDS[role];

  if (!roleId) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid role' });
  }

  db.query(
    'UPDATE users SET full_name = ?, email = ?, role_id = ? WHERE id = ?',
    [name, email, roleId, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Internal Server Error', message: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Not Found', message: 'User not found' });
      res.json({ message: 'User updated successfully' });
    }
  );
};

exports.deactivateUser = (req, res) => {
  const { id } = req.params;

  db.query('UPDATE users SET is_active = 0 WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Internal Server Error', message: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    res.json({ message: 'User deactivated successfully' });
  });
};
