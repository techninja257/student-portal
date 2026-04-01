import express from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import { v2 as cloudinary } from 'cloudinary';
import { parse } from 'csv-parse/sync';
import pool from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

function isStrongPassword(pwd) {
  return pwd && pwd.length >= 8 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /\d/.test(pwd);
}
import { deletePDF } from '../cloudinary.js';

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
    }
  },
});

const uploadCSV = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

function uploadProfileImage(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'student-portal/profiles',
        transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

function extractPublicId(url) {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  return match ? match[1] : null;
}

// Strip sensitive fields before returning a student object
function safeStudent(row) {
  const { password_hash, ...rest } = row;
  return rest;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Neutralise CSV injection: prefix formula-triggering chars with an apostrophe
function sanitizeCSVField(val) {
  if (typeof val === 'string' && /^[=+\-@\t\r]/.test(val)) return "'" + val;
  return val;
}

// POST /api/students/bulk-upload
router.post('/bulk-upload', requireAdmin, uploadCSV.single('csv'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No CSV file provided' });

    let records;
    try {
      records = parse(req.file.buffer.toString('utf8'), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseErr) {
      return res.status(400).json({ error: 'Invalid CSV format: ' + parseErr.message });
    }

    // Pre-load all departments and levels for name lookups
    const [{ rows: deptRows }, { rows: lvlRows }] = await Promise.all([
      pool.query('SELECT id, name FROM departments'),
      pool.query('SELECT id, name FROM levels'),
    ]);
    const deptMap = Object.fromEntries(deptRows.map(d => [d.name.toLowerCase(), d.id]));
    const lvlMap = Object.fromEntries(lvlRows.map(l => [l.name.toLowerCase(), l.id]));

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // 1-based, +1 for header
      const name = sanitizeCSVField(row.name);
      const email = sanitizeCSVField(row.email);
      const matric_no = sanitizeCSVField(row.matric_no);
      const department = sanitizeCSVField(row.department);
      const level = sanitizeCSVField(row.level);
      const default_password = row.default_password;

      if (!name || !email || !matric_no || !department || !level || !default_password) {
        errors.push({ row: rowNum, email: email || '', reason: 'Missing required fields' });
        skipped++;
        continue;
      }

      if (!EMAIL_RE.test(email)) {
        errors.push({ row: rowNum, email, reason: 'Invalid email format' });
        skipped++;
        continue;
      }

      const dept_id = deptMap[department.toLowerCase()];
      if (!dept_id) {
        errors.push({ row: rowNum, email, reason: `Department '${department}' not found` });
        skipped++;
        continue;
      }

      const lvl_id = lvlMap[level.toLowerCase()];
      if (!lvl_id) {
        errors.push({ row: rowNum, email, reason: `Level '${level}' not found` });
        skipped++;
        continue;
      }

      try {
        const password_hash = await bcrypt.hash(default_password, 10);
        const { rows } = await pool.query(
          `INSERT INTO students (name, email, matric_no, department_id, level_id, password_hash, must_change_password)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING *`,
          [name, email, matric_no, dept_id, lvl_id, password_hash]
        );

        const student = rows[0];
        created++;

        // Send welcome email (non-blocking, per-student)
        try {
          await resend.emails.send({
            from: 'Student Portal <noreply@studentportal.name.ng>',
            to: student.email,
            subject: 'Your Student Portal Account',
            html: `<p>Hi ${student.name},</p>
<p>Your Student Portal account has been created.</p>
<p><strong>Email:</strong> ${student.email}<br>
<strong>Default Password:</strong> ${default_password}</p>
<p>Please log in with your email and the default password provided, then change your password on first login.</p>
<p>— Student Portal</p>`,
          });
        } catch (emailErr) {
          console.error('Failed to send welcome email to', email, emailErr);
        }
      } catch (dbErr) {
        if (dbErr.code === '23505') {
          // Unique constraint violation (email or matric_no already exists)
          errors.push({ row: rowNum, email, reason: 'Email or matric number already exists' });
        } else {
          errors.push({ row: rowNum, email, reason: 'Database error: ' + dbErr.message });
        }
        skipped++;
      }
    }

    res.json({ created, skipped, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/students
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    const page = Math.max(1, Math.min(10000, parseInt(req.query.page) || 1));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const whereParams = [];
    let whereClause = '';
    if (search) {
      whereParams.push(`%${search}%`);
      whereClause = ` WHERE s.name ILIKE $1 OR s.email ILIKE $1 OR s.matric_no ILIKE $1`;
    }

    const dataQuery = `
      SELECT s.*, d.name as department_name, l.name as level_name
      FROM students s
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN levels l ON s.level_id = l.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*) FROM students s${whereClause}
    `;

    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query(dataQuery, [...whereParams, limit, offset]),
      pool.query(countQuery, whereParams),
    ]);

    const total = parseInt(countRows[0].count);
    res.json({ students: rows.map(safeStudent), total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/students/:id
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, d.name as department_name, l.name as level_name
       FROM students s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN levels l ON s.level_id = l.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Student not found' });
    res.json(safeStudent(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/students
router.post('/', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    const { name, email, matric_no, department_id, level_id, default_password } = req.body;

    if (!name || !email || !matric_no) {
      return res.status(400).json({ error: 'name, email, and matric_no are required' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!default_password) {
      return res.status(400).json({ error: 'default_password is required' });
    }
    if (!isStrongPassword(default_password)) {
      return res.status(400).json({ error: 'default_password must be at least 8 characters and include uppercase, lowercase, and a number' });
    }

    const { rows: deptRows } = await pool.query(
      'SELECT id FROM departments WHERE id = $1',
      [department_id]
    );
    if (!deptRows[0]) return res.status(400).json({ error: 'Department not found' });

    const { rows: levelRows } = await pool.query(
      'SELECT id FROM levels WHERE id = $1',
      [level_id]
    );
    if (!levelRows[0]) return res.status(400).json({ error: 'Level not found' });

    let profile_image_url = null;
    if (req.file) {
      profile_image_url = await uploadProfileImage(req.file.buffer);
    }

    const password_hash = await bcrypt.hash(default_password, 10);

    const { rows } = await pool.query(
      `INSERT INTO students (name, email, matric_no, department_id, level_id, profile_image_url, password_hash, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING *`,
      [name, email, matric_no, department_id, level_id, profile_image_url, password_hash]
    );

    const student = rows[0];

    // Send welcome email (non-blocking)
    try {
      await resend.emails.send({
        from: 'Student Portal <noreply@studentportal.name.ng>',
        to: student.email,
        subject: 'Your Student Portal Account',
        html: `<p>Hi ${student.name},</p>
<p>Your Student Portal account has been created.</p>
<p><strong>Email:</strong> ${student.email}<br>
<strong>Default Password:</strong> ${default_password}</p>
<p>Please log in with your email and the default password provided, then change your password on first login.</p>
<p>— Student Portal</p>`,
      });
    } catch (emailErr) {
      console.error('Failed to send welcome email:', emailErr);
    }

    res.status(201).json(safeStudent(student));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/students/:id
router.put('/:id', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    const { name, email, matric_no, department_id, level_id } = req.body;

    if (req.file) {
      const newUrl = await uploadProfileImage(req.file.buffer);
      const { rows } = await pool.query(
        `UPDATE students
         SET name = $1, email = $2, matric_no = $3, department_id = $4, level_id = $5, profile_image_url = $6
         WHERE id = $7 RETURNING *`,
        [name, email, matric_no, department_id, level_id, newUrl, req.params.id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Student not found' });
      return res.json(safeStudent(rows[0]));
    }

    const { rows } = await pool.query(
      `UPDATE students
       SET name = $1, email = $2, matric_no = $3, department_id = $4, level_id = $5
       WHERE id = $6 RETURNING *`,
      [name, email, matric_no, department_id, level_id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Student not found' });
    res.json(safeStudent(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/students/:id/reset-password
router.put('/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const { default_password } = req.body;

    if (!default_password) {
      return res.status(400).json({ error: 'default_password is required' });
    }
    if (!isStrongPassword(default_password)) {
      return res.status(400).json({ error: 'default_password must be at least 8 characters and include uppercase, lowercase, and a number' });
    }

    const { rows: studentRows } = await pool.query(
      'SELECT name, email FROM students WHERE id = $1',
      [req.params.id]
    );
    if (!studentRows[0]) return res.status(404).json({ error: 'Student not found' });

    const student = studentRows[0];
    const password_hash = await bcrypt.hash(default_password, 10);

    await pool.query(
      'UPDATE students SET password_hash = $1, must_change_password = TRUE WHERE id = $2',
      [password_hash, req.params.id]
    );

    // Send reset email (non-blocking)
    try {
      await resend.emails.send({
        from: 'Student Portal <noreply@studentportal.name.ng>',
        to: student.email,
        subject: 'Password Reset \u2014 Student Portal',
        html: `<p>Hi ${student.name},</p>
<p>Your Student Portal password has been reset.</p>
<p><strong>Your new default password is:</strong> ${default_password}</p>
<p>Please log in and change it immediately.</p>
<p>— Student Portal</p>`,
      });
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr);
    }

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/students/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows: studentRows } = await pool.query(
      'SELECT profile_image_url FROM students WHERE id = $1',
      [req.params.id]
    );

    if (studentRows[0]?.profile_image_url) {
      const publicId = extractPublicId(studentRows[0].profile_image_url);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        } catch (err) {
          console.warn('Failed to delete profile image:', publicId, err.message);
        }
      }
    }

    const { rows: results } = await pool.query(
      'SELECT cloudinary_public_id FROM results WHERE student_id = $1',
      [req.params.id]
    );

    for (const result of results) {
      try {
        await deletePDF(result.cloudinary_public_id);
      } catch (err) {
        console.warn('Failed to delete Cloudinary file:', result.cloudinary_public_id, err.message);
      }
    }

    await pool.query('DELETE FROM results WHERE student_id = $1', [req.params.id]);
    await pool.query('DELETE FROM students WHERE id = $1', [req.params.id]);

    res.json({ message: 'Student deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
