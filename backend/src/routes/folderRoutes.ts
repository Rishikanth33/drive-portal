import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { pool } from '../db';

const router = Router();

// ─── 1. GET ALL FOLDERS ───────────────────────────────
router.get('/', authMiddleware, async (req: Request & AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'admin';
    let sql = 'SELECT * FROM folders WHERE 1=1';
    const params: any[] = [];

    if (!isAdmin) {
      sql += ' AND owner_id = $1';
      params.push(req.user!.id);
    }

    sql += ' ORDER BY name ASC';

    const { rows } = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error('GET folders error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// ─── 2. CREATE FOLDER ────────────────────────────────
router.post('/', authMiddleware, async (req: Request & AuthRequest, res: Response) => {
  try {
    const { name, parent_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name is required' });

    const { rows } = await pool.query(
      'INSERT INTO folders (name, parent_id, owner_id) VALUES ($1, $2, $3) RETURNING id',
      [name, parent_id || null, req.user!.id]
    );

    return res.json({ id: rows[0].id, name, parent_id: parent_id || null });
  } catch (err) {
    console.error('CREATE folder error:', err);
    return res.status(500).json({ error: 'Failed to create folder' });
  }
});

// ─── 3. RENAME FOLDER ────────────────────────────────
router.patch('/:id', authMiddleware, async (req: Request &  AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const { rows } = await pool   .query(
      'SELECT owner_id FROM folders WHERE id = $1',
      [req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Folder not found' });

    if (req.user!.role !== 'admin' && rows[0].owner_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not your folder' });
    }

    await pool.query('UPDATE folders SET name = $1 WHERE id = $2', [name, req.params.id]);
    return res.json({ message: 'Renamed' });
  } catch (err) {
    console.error('RENAME folder error:', err);
    return res.status(500).json({ error: 'Failed to rename' });
  }
});

// ─── 4. DELETE FOLDER ────────────────────────────────
router.delete('/:id', authMiddleware, async (req: Request & AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT owner_id FROM folders WHERE id = $1',
      [req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Folder not found' });

    if (req.user!.role !== 'admin' && rows[0].owner_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not your folder' });
    }

    await pool.query('DELETE FROM folders WHERE id = $1', [req.params.id]);
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE folder error:', err);
    return res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;