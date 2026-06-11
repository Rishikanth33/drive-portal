import { Router, Response, NextFunction } from 'express';
import { auth, AuthRequest } from '../middleware/authMiddleware';
import db from '../db';
import fs from 'fs';
import path from 'path';

const router = Router();

interface FileRow {
  owner_id: string;
  is_deleted: boolean;
  stored_name: string;
  is_starred: boolean;
}

interface ReqWithFile extends AuthRequest {
  fileRow?: FileRow;
  files?: any;
}

// ─── HELPER: CHECK OWNERSHIP MIDDLEWARE ───────────────────────────
async function checkOwner(req: ReqWithFile, res: Response, next: NextFunction) {
  try {
    const { rows } = await db.query(
      'SELECT owner_id, is_deleted, stored_name, is_starred FROM files WHERE id = $1',
      [req.params.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    req.fileRow = rows[0];

    if (req.user!.role === 'admin') return next();

    if (rows[0].owner_id !== req.user!.id) {
      return res.status(403).json({ error: 'You can only modify your own files' });
    }

    return next();
  } catch (err) {
    console.error('Ownership verification error:', err);
    return res.status(500).json({ error: 'Database verification failed' });
  }
}

// ─── GET /FILES ────────────────────────────────────────
router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { sort, search, folder_id, starred, trashed } = req.query;
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    let sql = 'SELECT * FROM files WHERE 1=1';
    const params: any[] = [];
    let i = 1;

    if (trashed === 'true') {
      sql += ' AND is_deleted = true';
    } else {
      sql += ' AND is_deleted = false';
    }

    if (starred === 'true') {
      sql += ' AND is_starred = true';
    }

    if (!isAdmin) {
      sql += ` AND owner_id = $${i++}`;
      params.push(userId);
    }

    if (folder_id) {
      sql += ` AND folder_id = $${i++}`;
      params.push(folder_id);
    } else if (!starred && trashed !== 'true') {
      sql += ' AND folder_id IS NULL';
    }

    if (search) {
      sql += ` AND original_name ILIKE $${i++}`;
      params.push(`%${search}%`);
    }

    if (sort === 'name') {
      sql += ' ORDER BY original_name ASC';
    } else if (sort === 'size') {
      sql += ' ORDER BY file_size DESC';
    } else {
      sql += ' ORDER BY uploaded_at DESC';
    }

    const { rows } = await db.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error('GET /files error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// ─── UPLOAD FILE ────────────────────────────────────────────
router.post('/upload', auth, async (req: ReqWithFile, res: Response) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.files.file;
    const folder_id = req.body.folder_id || null;
    const ext = file.name.split('.').pop().toLowerCase();
    const storedName = `${Date.now()}-${file.name}`;

    const { rows } = await db.query(
      `INSERT INTO files (original_name, stored_name, file_type, file_size, folder_id, owner_id, is_starred, is_deleted, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, $6, false, false, NOW()) RETURNING id`,
      [file.name, storedName, ext, file.size, folder_id, req.user!.id]
    );

    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    file.mv(path.join(uploadDir, storedName), (mvErr: any) => {
      if (mvErr) {
        console.error('File save error:', mvErr);
        return res.status(500).json({ error: 'File save failed' });
      }
      return res.json({ id: rows[0].id, message: 'Uploaded successfully' });
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// ─── TOGGLE STAR STATUS ───────────────────────────────────────
router.patch('/:id/star', auth, checkOwner, async (req: ReqWithFile, res: Response) => {
  try {
    const newStar = !req.fileRow!.is_starred;

    await db.query(
      'UPDATE files SET is_starred = $1 WHERE id = $2',
      [newStar, req.params.id]
    );

    return res.json({ is_starred: newStar });
  } catch (err) {
    console.error('Star toggle error:', err);
    return res.status(500).json({ error: 'Failed to update star status' });
  }
});

// ─── SOFT DELETE (Move To Trash) ───────────────────────
router.delete('/:id', auth, checkOwner, async (req: ReqWithFile, res: Response) => {
  try {
    await db.query(
      'UPDATE files SET is_deleted = true, deleted_at = NOW() WHERE id = $1',
      [req.params.id]
    );
    return res.json({ message: 'Moved to trash' });
  } catch (err) {
    console.error('Soft delete error:', err);
    return res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ─── RESTORE FROM TRASH ────────────────────────────────
router.patch('/:id/restore', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      'SELECT owner_id FROM files WHERE id = $1 AND is_deleted = true',
      [req.params.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'File not found in trash' });
    }

    if (req.user!.role !== 'admin' && rows[0].owner_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not your file' });
    }

    await db.query(
      'UPDATE files SET is_deleted = false, deleted_at = NULL WHERE id = $1',
      [req.params.id]
    );

    return res.json({ message: 'File restored' });
  } catch (err) {
    console.error('Restore error:', err);
    return res.status(500).json({ error: 'Failed to restore' });
  }
});

// ─── PERMANENT DELETION ──────────────────────────────────
router.delete('/:id/permanent', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      'SELECT owner_id, stored_name FROM files WHERE id = $1 AND is_deleted = true',
      [req.params.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'File not found in trash' });
    }

    if (req.user!.role !== 'admin' && rows[0].owner_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not your file' });
    }

    const storedName = rows[0].stored_name;

    await db.query('DELETE FROM files WHERE id = $1', [req.params.id]);

    const filePath = path.join(__dirname, '../uploads', storedName);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
    }

    return res.json({ message: 'Permanently deleted' });
  } catch (err) {
    console.error('Permanent delete error:', err);
    return res.status(500).json({ error: 'Failed to delete permanently' });
  }
});

// ─── DOWNLOAD ──────────────────────────────────────────
router.get('/:id/download', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      'SELECT stored_name, original_name, owner_id FROM files WHERE id = $1 AND is_deleted = false',
      [req.params.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (req.user!.role !== 'admin' && rows[0].owner_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not your file' });
    }

    const filePath = path.join(__dirname, '../uploads', rows[0].stored_name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File missing on disk' });
    }

    return res.download(filePath, rows[0].original_name);
  } catch (err) {
    console.error('Download error:', err);
    return res.status(500).json({ error: 'Download failed' });
  }
});

export default router;