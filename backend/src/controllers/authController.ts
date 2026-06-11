import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db';

export const register = async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: 'Name, email and password required',
    });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email=$1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: 'Email already registered',
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const userRole = role === 'admin'
      ? 'admin'
      : 'user';

    const result = await pool.query(
      `
      INSERT INTO users
      (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role
      `,
      [name, email, hash, userRole]
    );

    res.status(201).json({
      message: 'Registered successfully',
      user: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Server error',
    });
  }
};
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email=$1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({
        error: 'Invalid credentials',
      });
    }

    const match = await bcrypt.compare(
      password,
      user.password
    );

    if (!match) {
      return res.status(400).json({
        error: 'Invalid credentials',
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Server error',
    });
  }
};