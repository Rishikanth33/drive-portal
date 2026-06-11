import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import pool from '../db';

export const getFolders = async (req: AuthRequest, res: Response) => {
  const isAdmin = req.user!.role === 'admin';
  try {
    const result = isAdmin
      ? await pool.query('SELECT * FROM folders ORDER BY created_at ASC')
      : await pool.query('SELECT * FROM folders WHERE owner_id=$1 ORDER BY created_at ASC', [req.user!.id]);
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Failed to fetch folders' }); }
};

export const createFolder = async (req: AuthRequest, res: Response) => {
  const { name, parent_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Folder name required' });
  try {
    const result = await pool.query(
      'INSERT INTO folders (name, parent_id, owner_id) VALUES ($1,$2,$3) RETURNING *',
      [name, parent_id || null, req.user!.id]
    );
    res.status(201).json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Failed to create folder' }); }
};

export const renameFolder = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const folder = await pool.query('SELECT * FROM folders WHERE id=$1', [id]);
    if (!folder.rows[0]) return res.status(404).json({ error: 'Folder not found' });
    if (folder.rows[0].owner_id !== req.user!.id && req.user!.role !== 'admin')
      return res.status(403).json({ error: 'Access denied' });
    const result = await pool.query('UPDATE folders SET name=$1 WHERE id=$2 RETURNING *', [name, id]);
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Rename failed' }); }
};

export const deleteFolder = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const folder = await pool.query('SELECT * FROM folders WHERE id=$1', [id]);
    if (!folder.rows[0]) return res.status(404).json({ error: 'Folder not found' });
    if (folder.rows[0].owner_id !== req.user!.id && req.user!.role !== 'admin')
      return res.status(403).json({ error: 'Access denied' });
    await pool.query('DELETE FROM folders WHERE id=$1', [id]);
    res.json({ message: 'Folder deleted' });
  } catch { res.status(500).json({ error: 'Delete failed' }); }
};