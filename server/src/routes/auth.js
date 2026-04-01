import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import pool from '../db.js';

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

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

// POST /api/auth/student/request-otp
router.post('/student/request-otp', async (req, res) => {
  try {
    const { email } = req.body;

    const { rows } = await pool.query(
      'SELECT id FROM students WHERE email = $1',
      [email]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const otp = Math.random().toString().slice(2, 8);

    await pool.query(
      'DELETE FROM otp_codes WHERE email = $1 AND used = FALSE',
      [email]
    );

    await pool.query(
      `INSERT INTO otp_codes (email, code, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [email, otp]
    );

    try {
      if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');

      await resend.emails.send({
        from: 'Student Portal <noreply@studentportal.name.ng>',
        to: email,
        subject: 'Your Login OTP',
        html: `<p>Your OTP code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
      });
    } catch (emailErr) {
      console.warn('Email send failed, OTP fallback:', otp, emailErr.message);
    }

    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Request OTP error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/auth/student/verify-otp
router.post('/student/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;

    const { rows: otpRows } = await pool.query(
      `SELECT id FROM otp_codes
       WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()`,
      [email, code]
    );

    if (!otpRows[0]) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    await pool.query(
      'UPDATE otp_codes SET used = TRUE WHERE id = $1',
      [otpRows[0].id]
    );

    const { rows: studentRows } = await pool.query(
      'SELECT id, name, email FROM students WHERE email = $1',
      [email]
    );

    const student = studentRows[0];

    const token = jwt.sign(
      { id: student.id, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: student.id, name: student.name, email: student.email, role: 'student' },
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
