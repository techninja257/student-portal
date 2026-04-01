import express from 'express';
import pool from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/levels
router.get('/', requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query('SELECT * FROM levels ORDER BY name ASC LIMIT $1 OFFSET $2', [limit, offset]),
      pool.query('SELECT COUNT(*) FROM levels'),
    ]);

    const total = parseInt(countRows[0].count);
    res.json({ levels: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/levels
router.post('/', requireAdmin, async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 200) return res.status(400).json({ error: 'name is required and must be under 200 characters' });
    const { rows } = await pool.query(
      'INSERT INTO levels (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/levels/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 200) return res.status(400).json({ error: 'name is required and must be under 200 characters' });
    const { rows } = await pool.query(
      'UPDATE levels SET name = $1 WHERE id = $2 RETURNING *',
      [name, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Level not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/levels/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) FROM students WHERE level_id = $1',
      [req.params.id]
    );
    if (parseInt(countRows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete: students are assigned to this level' });
    }
    await pool.query('DELETE FROM levels WHERE id = $1', [req.params.id]);
    res.json({ message: 'Level deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
