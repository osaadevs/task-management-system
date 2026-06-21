const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.login = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'Bad Request', message: 'Email and password are required' });
    }

    const query = `SELECT u.*, r.role_name 
                   FROM users u 
                   JOIN roles r ON u.role_id = r.id 
                   WHERE u.email = ?`;

    const [results] = await db.promise().query(query, [email]);

    if (results.length === 0) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
    }

    const user = results[0];

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Forbidden', message: 'Account is deactivated' });
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
      user: { id: user.id, name: user.full_name, email: user.email, role: user.role_name }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Bad Request', message: 'Password must be at least 8 characters' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.promise().query(
      'UPDATE users SET password_hash = ?, is_first_login = FALSE WHERE id = ?',
      [hashed, userId]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};