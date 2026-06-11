import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import pool from '../db';
import fs from 'fs';
import path from 'path';

export const uploadFiles = async (req: AuthRequest, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const { folder_id } = req.body;
  if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
  try {
    const inserted = [];
    for (const file of files) {
      const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
      const result = await pool.query(
        `INSERT INTO files (filename, original_name, file_type, file_size, storage_path, folder_id, owner_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [file.filename, file.originalname, ext, file.size, file.path, folder_id || null, req.user!.id]
      );
      inserted.push(result.rows[0]);
    }
    res.status(201).json({ message: 'Files uploaded', files: inserted });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
};

export const getFiles = async (req: AuthRequest, res: Response) => {
  const { folder_id, search, sort } = req.query;
  const isAdmin = req.user!.role === 'admin';
  let query = 'SELECT * FROM files WHERE 1=1';
  const params: any[] = [];
  if (!isAdmin) { params.push(req.user!.id); query += ` AND owner_id=$${params.length}`; }
  if (folder_id) { params.push(folder_id); query += ` AND folder_id=$${params.length}`; }
  if (search) { params.push(`%${search}%`); query += ` AND original_name ILIKE $${params.length}`; }
  const sortMap: any = { name: 'original_name ASC', size: 'file_size DESC', date: 'uploaded_at DESC' };
  query += ` ORDER BY ${sortMap[sort as string] || 'uploaded_at DESC'}`;
  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
};

export const renameFile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const file = await pool.query('SELECT * FROM files WHERE id=$1', [id]);
    if (!file.rows[0]) return res.status(404).json({ error: 'File not found' });
    if (file.rows[0].owner_id !== req.user!.id && req.user!.role !== 'admin')
      return res.status(403).json({ error: 'Access denied' });
    const result = await pool.query('UPDATE files SET original_name=$1 WHERE id=$2 RETURNING *', [name, id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Rename failed' });
  }
};

export const deleteFile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const file = await pool.query('SELECT * FROM files WHERE id=$1', [id]);
    if (!file.rows[0]) return res.status(404).json({ error: 'File not found' });
    if (file.rows[0].owner_id !== req.user!.id && req.user!.role !== 'admin')
      return res.status(403).json({ error: 'Access denied' });
    try { fs.unlinkSync(file.rows[0].storage_path); } catch {}
    await pool.query('DELETE FROM files WHERE id=$1', [id]);
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
};

export const downloadFile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const file = await pool.query('SELECT * FROM files WHERE id=$1', [id]);
    if (!file.rows[0]) return res.status(404).json({ error: 'File not found' });
    if (file.rows[0].owner_id !== req.user!.id && req.user!.role !== 'admin')
      return res.status(403).json({ error: 'Access denied' });
    res.download(file.rows[0].storage_path, file.rows[0].original_name);
  } catch (err) {
    res.status(500).json({ error: 'Download failed' });
  }
};

export const moveFile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { folder_id } = req.body;
  try {
    const file = await pool.query('SELECT * FROM files WHERE id=$1', [id]);
    if (!file.rows[0]) return res.status(404).json({ error: 'File not found' });
    if (file.rows[0].owner_id !== req.user!.id && req.user!.role !== 'admin')
      return res.status(403).json({ error: 'Access denied' });
    const result = await pool.query('UPDATE files SET folder_id=$1 WHERE id=$2 RETURNING *', [folder_id || null, id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Move failed' });
  }
};