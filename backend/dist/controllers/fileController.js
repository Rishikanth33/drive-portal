"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.moveFile = exports.downloadFile = exports.deleteFile = exports.renameFile = exports.getFiles = exports.uploadFiles = void 0;
const db_1 = require("../db");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uploadFiles = async (req, res) => {
    const files = req.files;
    const { folder_id } = req.body;
    if (!files || files.length === 0)
        return res.status(400).json({ error: 'No files uploaded' });
    try {
        const inserted = [];
        for (const file of files) {
            const ext = path_1.default.extname(file.originalname).replace('.', '').toLowerCase();
            const result = await db_1.pool.query(`INSERT INTO files (filename, original_name, file_type, file_size, storage_path, folder_id, owner_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [file.filename, file.originalname, ext, file.size, file.path, folder_id || null, req.user.id]);
            inserted.push(result.rows[0]);
        }
        res.status(201).json({ message: 'Files uploaded', files: inserted });
    }
    catch (err) {
        res.status(500).json({ error: 'Upload failed' });
    }
};
exports.uploadFiles = uploadFiles;
const getFiles = async (req, res) => {
    const { folder_id, search, sort } = req.query;
    const isAdmin = req.user.role === 'admin';
    let query = 'SELECT * FROM files WHERE 1=1';
    const params = [];
    if (!isAdmin) {
        params.push(req.user.id);
        query += ` AND owner_id=$${params.length}`;
    }
    if (folder_id) {
        params.push(folder_id);
        query += ` AND folder_id=$${params.length}`;
    }
    if (search) {
        params.push(`%${search}%`);
        query += ` AND original_name ILIKE $${params.length}`;
    }
    const sortMap = { name: 'original_name ASC', size: 'file_size DESC', date: 'uploaded_at DESC' };
    query += ` ORDER BY ${sortMap[sort] || 'uploaded_at DESC'}`;
    try {
        const result = await db_1.pool.query(query, params);
        res.json(result.rows);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch files' });
    }
};
exports.getFiles = getFiles;
const renameFile = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        const file = await db_1.pool.query('SELECT * FROM files WHERE id=$1', [id]);
        if (!file.rows[0])
            return res.status(404).json({ error: 'File not found' });
        if (file.rows[0].owner_id !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ error: 'Access denied' });
        const result = await db_1.pool.query('UPDATE files SET original_name=$1 WHERE id=$2 RETURNING *', [name, id]);
        res.json(result.rows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Rename failed' });
    }
};
exports.renameFile = renameFile;
const deleteFile = async (req, res) => {
    const { id } = req.params;
    try {
        const file = await db_1.pool.query('SELECT * FROM files WHERE id=$1', [id]);
        if (!file.rows[0])
            return res.status(404).json({ error: 'File not found' });
        if (file.rows[0].owner_id !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ error: 'Access denied' });
        try {
            fs_1.default.unlinkSync(file.rows[0].storage_path);
        }
        catch { }
        await db_1.pool.query('DELETE FROM files WHERE id=$1', [id]);
        res.json({ message: 'File deleted' });
    }
    catch (err) {
        res.status(500).json({ error: 'Delete failed' });
    }
};
exports.deleteFile = deleteFile;
const downloadFile = async (req, res) => {
    const { id } = req.params;
    try {
        const file = await db_1.pool.query('SELECT * FROM files WHERE id=$1', [id]);
        if (!file.rows[0])
            return res.status(404).json({ error: 'File not found' });
        if (file.rows[0].owner_id !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ error: 'Access denied' });
        res.download(file.rows[0].storage_path, file.rows[0].original_name);
    }
    catch (err) {
        res.status(500).json({ error: 'Download failed' });
    }
};
exports.downloadFile = downloadFile;
const moveFile = async (req, res) => {
    const { id } = req.params;
    const { folder_id } = req.body;
    try {
        const file = await db_1.pool.query('SELECT * FROM files WHERE id=$1', [id]);
        if (!file.rows[0])
            return res.status(404).json({ error: 'File not found' });
        if (file.rows[0].owner_id !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ error: 'Access denied' });
        const result = await db_1.pool.query('UPDATE files SET folder_id=$1 WHERE id=$2 RETURNING *', [folder_id || null, id]);
        res.json(result.rows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Move failed' });
    }
};
exports.moveFile = moveFile;
