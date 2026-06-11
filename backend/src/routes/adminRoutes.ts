// backend/src/routes/adminRoutes.ts
import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';//  FIXED IMPORT PATH
import { pool } from '../db';

const router = Router();

// All routes below require admin role
function adminOnly(req: Request & AuthRequest, res: Response, next: Function) {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.use(authMiddleware, adminOnly);

// ... The rest of your route handlers stay exactly the same

// ─── 1. GET ALL USERS WITH STATS ─────────────────────
router.get('/users', async (req: Request & AuthRequest, res: Response) => {
  try {
    const { rows: users } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.created_at,
              COUNT(f.id) as total_files,
              COALESCE(SUM(CAST(f.file_size AS BIGINT)), 0) as total_storage
       FROM users u
       LEFT JOIN files f ON f.owner_id = u.id AND f.is_deleted = false
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    return res.json(users);
  } catch (err) {
    console.error('GET admin users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─── 2. GET SPECIFIC USER'S FILES ────────────────────
router.get('/users/:id/files', async (req: Request & AuthRequest, res: Response) => {
  try {
    const { rows: userRows } = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [req.params.id]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });

    const { rows: files } = await pool.query(
      'SELECT * FROM files WHERE owner_id = $1 AND is_deleted = false ORDER BY uploaded_at DESC',
      [req.params.id]
    );

    return res.json({ user: userRows[0], files });
  } catch (err) {
    console.error('GET user files error:', err);
    return res.status(500).json({ error: 'Failed to fetch user files' });
  }
});

// ─── 3. GET SPECIFIC USER'S FOLDERS ──────────────────
router.get('/users/:id/folders', async (req: Request & AuthRequest, res: Response) => {
  try {
    const { rows: userRows } = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [req.params.id]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });

    const { rows: folders } = await pool.query(
      'SELECT * FROM folders WHERE owner_id = $1 ORDER BY name ASC',
      [req.params.id]
    );

    return res.json({ user: userRows[0], folders });
  } catch (err) {
    console.error('GET user folders error:', err);
    return res.status(500).json({ error: 'Failed to fetch user folders' });
  }
});

// ─── 4. CHANGE USER ROLE ─────────────────────────────
router.patch('/users/:id/role', async (req: Request & AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "user" or "admin"' });
    }

    // Prevent admin from demoting themselves
    if (req.params.id === req.user!.id && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    const { rows } = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role', [role, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    return res.json({ message: 'Role updated', user: rows[0] });
  } catch (err) {
    console.error('CHANGE ROLE error:', err);
    return res.status(500).json({ error: 'Failed to change role' });
  }
});

// ─── 5. EDIT USER INFO ──────────────────────────────
router.patch('/users/:id', async (req: Request & AuthRequest, res: Response) => {
  try {
    const { name, email } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (name) { updates.push(`name = $${i++}`); params.push(name); }
    if (email) { updates.push(`email = $${i++}`); params.push(email); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    params.push(req.params.id);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, name, email, role`;

    const { rows } = await pool.query(sql, params);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    return res.json({ message: 'User updated', user: rows[0] });
  } catch (err) {
    console.error('EDIT USER error:', err);
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

// ─── 6. DELETE USER ─────────────────────────────────
router.delete('/users/:id', async (req: Request & AuthRequest, res: Response) => {
  try {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    // Delete user's files from disk
    const { rows: fileRows } = await pool.query('SELECT stored_name FROM files WHERE owner_id = $1', [req.params.id]);
    const fs = require('fs');
    const path = require('path');
    for (const f of fileRows) {
      const fp = path.join(__dirname, '../../uploads', f.stored_name);
      if (fs.existsSync(fp)) {
        try { fs.unlinkSync(fp); } catch { /* ignore */ }
      }
    }

    // Delete user's files, folders, then user (cascade would handle this too)
    await pool.query('DELETE FROM files WHERE owner_id = $1', [req.params.id]);
    await pool.query('DELETE FROM folders WHERE owner_id = $1', [req.params.id]);
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);

    return res.json({ message: 'User deleted permanently' });
  } catch (err) {
    console.error('DELETE USER error:', err);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ─── 7. ADMIN DASHBOARD STATS ────────────────────────
router.get('/stats', async (req: Request & AuthRequest, res: Response) => {
  try {
    const { rows: userCount } = await pool.query('SELECT COUNT(*) as count FROM users');
    const { rows: fileCount } = await pool.query('SELECT COUNT(*) as count FROM files WHERE is_deleted = false');
    const { rows: folderCount } = await pool.query('SELECT COUNT(*) as count FROM folders');
    const { rows: storage } = await pool.query('SELECT COALESCE(SUM(CAST(file_size AS BIGINT)), 0) as total FROM files WHERE is_deleted = false');
    const { rows: trashCount } = await pool.query('SELECT COUNT(*) as count FROM files WHERE is_deleted = true');

    return res.json({
      users: Number(userCount[0].count),
      files: Number(fileCount[0].count),
      folders: Number(folderCount[0].count),
      storage: Number(storage[0].total),
      trashed: Number(trashCount[0].count),
    });
  } catch (err) {
    console.error('GET ADMIN STATS error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;