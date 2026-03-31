import express from 'express';
import multer from 'multer';
import pool from '../db.js';
import { requireAdmin, verifyToken } from '../middleware/auth.js';
import { uploadPDF, deletePDF } from '../cloudinary.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
});

// GET /api/results
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { student_id } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const whereParams = [];
    let whereClause = '';
    if (student_id) {
      whereParams.push(student_id);
      whereClause = ` WHERE r.student_id = $1`;
    }

    const dataQuery = `
      SELECT r.*, s.name as student_name, s.matric_no, sem.name as semester_name
      FROM results r
      JOIN students s ON r.student_id = s.id
      JOIN semesters sem ON r.semester_id = sem.id
      ${whereClause}
      ORDER BY r.uploaded_at DESC
      LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*) FROM results r${whereClause}
    `;

    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query(dataQuery, [...whereParams, limit, offset]),
      pool.query(countQuery, whereParams),
    ]);

    const total = parseInt(countRows[0].count);
    res.json({ results: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/results
router.post('/', requireAdmin, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    const { student_id, semester_id, title } = req.body;

    const { url, public_id } = await uploadPDF(req.file.buffer, req.file.originalname);

    const { rows } = await pool.query(
      `INSERT INTO results (student_id, semester_id, title, cloudinary_url, cloudinary_public_id, original_name)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [student_id, semester_id, title, url, public_id, req.file.originalname]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.message === 'Only PDF files are allowed') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/results/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM results WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Result not found' });

    try {
      await deletePDF(rows[0].cloudinary_public_id);
    } catch (err) {
      console.warn('Failed to delete Cloudinary file:', rows[0].cloudinary_public_id, err.message);
    }

    await pool.query('DELETE FROM results WHERE id = $1', [req.params.id]);
    res.json({ message: 'Result deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/results/:id/download
router.get('/:id/download', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM results WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Result not found' });

    const result = rows[0];
    if (req.user.role === 'student' && result.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ url: result.cloudinary_url, filename: result.original_name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
