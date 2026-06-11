"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const register = async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({
            error: 'Name, email and password required',
        });
    }
    try {
        const existing = await db_1.pool.query('SELECT id FROM users WHERE email=$1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({
                error: 'Email already registered',
            });
        }
        const hash = await bcryptjs_1.default.hash(password, 10);
        const userRole = role === 'admin'
            ? 'admin'
            : 'user';
        const result = await db_1.pool.query(`
      INSERT INTO users
      (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role
      `, [name, email, hash, userRole]);
        res.status(201).json({
            message: 'Registered successfully',
            user: result.rows[0],
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Server error',
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db_1.pool.query('SELECT * FROM users WHERE email=$1', [email]);
        const user = result.rows[0];
        if (!user) {
            return res.status(400).json({
                error: 'Invalid credentials',
            });
        }
        const match = await bcryptjs_1.default.compare(password, user.password);
        if (!match) {
            return res.status(400).json({
                error: 'Invalid credentials',
            });
        }
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role,
        }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            error: 'Server error',
        });
    }
};
exports.login = login;
