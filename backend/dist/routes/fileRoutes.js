"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const db_1 = require("../db");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
// ─── HELPER: CHECK OWNERSHIP MIDDLEWARE ───────────────────────────
async function checkOwner(req, res, next) {
    try {
        const fileId = req.params.id;
        const { rows } = await db_1.pool.query('SELECT owner_id, is_deleted, stored_name, is_starred FROM files WHERE id = $1', [fileId]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }
        req.fileRow = rows[0];
        // Safely parse user profile metrics
        if (req.user && req.user.role === 'admin')
            return next();
        if (!req.user || rows[0].owner_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only modify your own files' });
        }
        return next();
    }
    catch (err) {
        console.error('Ownership verification error:', err);
        return res.status(500).json({ error: 'Database verification failed' });
    }
}
// ─── GET /FILES ────────────────────────────────────────
router.get('/', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const { sort, search, folder_id, starred, trashed } = req.query;
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized user payload context' });
        }
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';
        let sql = 'SELECT * FROM files WHERE 1=1';
        const params = [];
        let i = 1;
        if (trashed === 'true') {
            sql += ' AND is_deleted = true';
        }
        else {
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
        }
        else if (!starred && trashed !== 'true') {
            sql += ' AND folder_id IS NULL';
        }
        if (search) {
            sql += ` AND original_name ILIKE $${i++}`;
            params.push(`%${search}%`);
        }
        if (sort === 'name') {
            sql += ' ORDER BY original_name ASC';
        }
        else if (sort === 'size') {
            sql += ' ORDER BY file_size DESC';
        }
        else {
            sql += ' ORDER BY uploaded_at DESC';
        }
        const { rows } = await db_1.pool.query(sql, params);
        return res.json(rows);
    }
    catch (err) {
        console.error('GET /files error:', err);
        return res.status(500).json({ error: 'Database error' });
    }
});
// ─── UPLOAD FILE ────────────────────────────────────────────
router.post('/upload', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication signature context missing' });
        }
        const file = req.files.file;
        const folder_id = req.body.folder_id || null;
        const ext = file.name.split('.').pop().toLowerCase();
        const storedName = `${Date.now()}-${file.name}`;
        const { rows } = await db_1.pool.query(`INSERT INTO files (original_name, stored_name, file_type, file_size, folder_id, owner_id, is_starred, is_deleted, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, $6, false, false, NOW()) RETURNING id`, [file.name, storedName, ext, file.size, folder_id, req.user.id]);
        const uploadDir = path_1.default.join(__dirname, '../uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        file.mv(path_1.default.join(uploadDir, storedName), (mvErr) => {
            if (mvErr) {
                console.error('File save error:', mvErr);
                return res.status(500).json({ error: 'File save failed' });
            }
            return res.json({ id: rows[0].id, message: 'Uploaded successfully' });
        });
    }
    catch (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ error: 'Upload failed' });
    }
});
// ─── TOGGLE STAR STATUS ───────────────────────────────────────
router.patch('/:id/star', authMiddleware_1.authMiddleware, checkOwner, async (req, res) => {
    try {
        const fileId = req.params.id;
        const newStar = !req.fileRow.is_starred;
        await db_1.pool.query('UPDATE files SET is_starred = $1 WHERE id = $2', [newStar, fileId]);
        return res.json({ is_starred: newStar });
    }
    catch (err) {
        console.error('Star toggle error:', err);
        return res.status(500).json({ error: 'Failed to update star status' });
    }
});
// ─── SOFT DELETE (Move To Trash) ───────────────────────
router.delete('/:id', authMiddleware_1.authMiddleware, checkOwner, async (req, res) => {
    try {
        const fileId = req.params.id;
        await db_1.pool.query('UPDATE files SET is_deleted = true, deleted_at = NOW() WHERE id = $1', [fileId]);
        return res.json({ message: 'Moved to trash' });
    }
    catch (err) {
        console.error('Soft delete error:', err);
        return res.status(500).json({ error: 'Failed to delete file' });
    }
});
// ─── RESTORE FROM TRASH ────────────────────────────────
router.patch('/:id/restore', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const fileId = req.params.id;
        if (!req.user) {
            return res.status(401).json({ error: 'Missing session signature context' });
        }
        const { rows } = await db_1.pool.query('SELECT owner_id FROM files WHERE id = $1 AND is_deleted = true', [fileId]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'File not found in trash' });
        }
        if (req.user.role !== 'admin' && rows[0].owner_id !== req.user.id) {
            return res.status(403).json({ error: 'Not your file' });
        }
        await db_1.pool.query('UPDATE files SET is_deleted = false, deleted_at = NULL WHERE id = $1', [fileId]);
        return res.json({ message: 'File restored' });
    }
    catch (err) {
        console.error('Restore error:', err);
        return res.status(500).json({ error: 'Failed to restore' });
    }
});
// ─── PERMANENT DELETION ──────────────────────────────────
router.delete('/:id/permanent', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const fileId = req.params.id;
        if (!req.user) {
            return res.status(401).json({ error: 'User mapping sequence failed' });
        }
        const { rows } = await db_1.pool.query('SELECT owner_id, stored_name FROM files WHERE id = $1 AND is_deleted = true', [fileId]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'File not found in trash' });
        }
        if (req.user.role !== 'admin' && rows[0].owner_id !== req.user.id) {
            return res.status(403).json({ error: 'Not your file' });
        }
        const storedName = rows[0].stored_name;
        await db_1.pool.query('DELETE FROM files WHERE id = $1', [fileId]);
        const filePath = path_1.default.join(__dirname, '../uploads', storedName);
        if (fs_1.default.existsSync(filePath)) {
            try {
                fs_1.default.unlinkSync(filePath);
            }
            catch (e) {
                console.warn('Physical cleanup trace unlinked or dropped:', e);
            }
        }
        return res.json({ message: 'Permanently deleted' });
    }
    catch (err) {
        console.error('Permanent delete error:', err);
        return res.status(500).json({ error: 'Failed to delete permanently' });
    }
});
// ─── DOWNLOAD ──────────────────────────────────────────
router.get('/:id/download', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const fileId = req.params.id;
        if (!req.user) {
            return res.status(401).json({ error: 'User reference trace contextual breakdown' });
        }
        const { rows } = await db_1.pool.query('SELECT stored_name, original_name, owner_id FROM files WHERE id = $1 AND is_deleted = false', [fileId]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }
        if (req.user.role !== 'admin' && rows[0].owner_id !== req.user.id) {
            return res.status(403).json({ error: 'Not your file' });
        }
        const filePath = path_1.default.join(__dirname, '../uploads', rows[0].stored_name);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'File missing on disk' });
        }
        return res.download(filePath, rows[0].original_name);
    }
    catch (err) {
        console.error('Download error:', err);
        return res.status(500).json({ error: 'Download failed' });
    }
});
exports.default = router;
