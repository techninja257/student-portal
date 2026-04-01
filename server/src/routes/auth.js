import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { requireAdmin, requireStudent } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/admin/login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows } = await pool.query(
      'SELECT * FROM admins WHERE email = $1',
      [email]
    );

    const admin = rows[0];
    if (!admin) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: admin.id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: admin.id, name: admin.name, email: admin.email, role: 'admin' },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/auth/admin/change-password
router.put('/admin/change-password', requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const { rows } = await pool.query('SELECT * FROM admins WHERE id = $1', [req.user.id]);
    const admin = rows[0];

    const valid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admins SET password_hash = $1 WHERE id = $2', [hash, admin.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/auth/student/login
router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows } = await pool.query(
      'SELECT * FROM students WHERE email = $1',
      [email]
    );

    const student = rows[0];
    if (!student) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!student.password_hash) {
      return res.status(401).json({ message: 'Account not set up. Contact admin.' });
    }

    const valid = await bcrypt.compare(password, student.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: student.id, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: student.id,
        name: student.name,
        email: student.email,
        role: 'student',
        must_change_password: student.must_change_password,
      },
    });
  } catch (err) {
    console.error('Student login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/auth/student/change-password
router.put('/student/change-password', requireStudent, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const { rows } = await pool.query('SELECT * FROM students WHERE id = $1', [req.user.id]);
    const student = rows[0];

    const valid = await bcrypt.compare(currentPassword, student.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE students SET password_hash = $1, must_change_password = FALSE WHERE id = $2',
      [hash, student.id]
    );

    res.json({
      message: 'Password changed successfully',
      user: {
        id: student.id,
        name: student.name,
        email: student.email,
        role: 'student',
        must_change_password: false,
      },
    });
  } catch (err) {
    console.error('Student change password error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
