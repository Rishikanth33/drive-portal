"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFolder = exports.renameFolder = exports.createFolder = exports.getFolders = void 0;
const db_1 = require("../db");
const getFolders = async (req, res) => {
    const isAdmin = req.user.role === 'admin';
    try {
        const result = isAdmin
            ? await db_1.pool.query('SELECT * FROM folders ORDER BY created_at ASC')
            : await db_1.pool.query('SELECT * FROM folders WHERE owner_id=$1 ORDER BY created_at ASC', [req.user.id]);
        res.json(result.rows);
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch folders' });
    }
};
exports.getFolders = getFolders;
const createFolder = async (req, res) => {
    const { name, parent_id } = req.body;
    if (!name)
        return res.status(400).json({ error: 'Folder name required' });
    try {
        const result = await db_1.pool.query('INSERT INTO folders (name, parent_id, owner_id) VALUES ($1,$2,$3) RETURNING *', [name, parent_id || null, req.user.id]);
        res.status(201).json(result.rows[0]);
    }
    catch {
        res.status(500).json({ error: 'Failed to create folder' });
    }
};
exports.createFolder = createFolder;
const renameFolder = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        const folder = await db_1.pool.query('SELECT * FROM folders WHERE id=$1', [id]);
        if (!folder.rows[0])
            return res.status(404).json({ error: 'Folder not found' });
        if (folder.rows[0].owner_id !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ error: 'Access denied' });
        const result = await db_1.pool.query('UPDATE folders SET name=$1 WHERE id=$2 RETURNING *', [name, id]);
        res.json(result.rows[0]);
    }
    catch {
        res.status(500).json({ error: 'Rename failed' });
    }
};
exports.renameFolder = renameFolder;
const deleteFolder = async (req, res) => {
    const { id } = req.params;
    try {
        const folder = await db_1.pool.query('SELECT * FROM folders WHERE id=$1', [id]);
        if (!folder.rows[0])
            return res.status(404).json({ error: 'Folder not found' });
        if (folder.rows[0].owner_id !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ error: 'Access denied' });
        await db_1.pool.query('DELETE FROM folders WHERE id=$1', [id]);
        res.json({ message: 'Folder deleted' });
    }
    catch {
        res.status(500).json({ error: 'Delete failed' });
    }
};
exports.deleteFolder = deleteFolder;
