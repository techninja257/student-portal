import express from 'express';
import pool from '../db.js';
import { requireStudent } from '../middleware/auth.js';

const router = express.Router();

router.use(requireStudent);

// GET /api/student/me
router.get('/me', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.name, s.email, s.matric_no, s.profile_image_url, d.name as department_name, l.name as level_name
       FROM students s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN levels l ON s.level_id = l.id
       WHERE s.id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Student not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/student/results
router.get('/results', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.title, r.cloudinary_url, r.original_name, r.uploaded_at, sem.name as semester_name
       FROM results r
       JOIN semesters sem ON r.semester_id = sem.id
       WHERE r.student_id = $1
       ORDER BY r.uploaded_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
