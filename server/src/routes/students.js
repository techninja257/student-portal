import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import pool from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { deletePDF } from '../cloudinary.js';

const router = express.Router();

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
  // Extracts "student-portal/profiles/xxxxx" from a Cloudinary URL
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  return match ? match[1] : null;
}

// GET /api/students
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
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
    res.json({ students: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
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
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/students
router.post('/', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    const { name, email, matric_no, department_id, level_id } = req.body;

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

    const { rows } = await pool.query(
      `INSERT INTO students (name, email, matric_no, department_id, level_id, profile_image_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, email, matric_no, department_id, level_id, profile_image_url]
    );
    res.status(201).json(rows[0]);
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
      return res.json(rows[0]);
    }

    const { rows } = await pool.query(
      `UPDATE students
       SET name = $1, email = $2, matric_no = $3, department_id = $4, level_id = $5
       WHERE id = $6 RETURNING *`,
      [name, email, matric_no, department_id, level_id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Student not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/students/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    // Get student to check for profile image
    const { rows: studentRows } = await pool.query(
      'SELECT profile_image_url FROM students WHERE id = $1',
      [req.params.id]
    );

    // Delete profile image from Cloudinary if it exists
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

    // Delete result PDFs from Cloudinary
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
