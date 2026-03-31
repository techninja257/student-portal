import express from 'express';
import pool from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/departments
router.get('/', requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query('SELECT * FROM departments ORDER BY name ASC LIMIT $1 OFFSET $2', [limit, offset]),
      pool.query('SELECT COUNT(*) FROM departments'),
    ]);

    const total = parseInt(countRows[0].count);
    res.json({ departments: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/departments
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO departments (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/departments/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const { rows } = await pool.query(
      'UPDATE departments SET name = $1 WHERE id = $2 RETURNING *',
      [name, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Department not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/departments/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) FROM students WHERE department_id = $1',
      [req.params.id]
    );
    if (parseInt(countRows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete: students are assigned to this department' });
    }
    await pool.query('DELETE FROM departments WHERE id = $1', [req.params.id]);
    res.json({ message: 'Department deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
