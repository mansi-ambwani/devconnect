import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { query } from '../db/index.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errors.js';
import { str } from '../utils.js';
import { PUBLIC_USER_FIELDS } from './users.js';

const router = Router();

// Slow down password guessing: max 20 auth attempts per 15 minutes per IP.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const username = str(req.body.username, 'Username', { required: true, max: 30 });
    const email = str(req.body.email, 'Email', { required: true, max: 255 }).toLowerCase();
    const password = str(req.body.password, 'Password', { required: true, min: 8, max: 128 });
    const name = str(req.body.name, 'Name', { max: 100 }) || username;

    if (!USERNAME_RE.test(username)) {
      throw new HttpError(400, 'Username must be 3-30 characters: letters, numbers or underscore');
    }
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email');

    const exists = await query('SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) OR email = $2', [username, email]);
    if (exists.rowCount) throw new HttpError(409, 'Username or email is already registered');

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (username, email, password_hash, name)
       VALUES ($1, $2, $3, $4) RETURNING ${PUBLIC_USER_FIELDS}, email`,
      [username, email, hash, name]
    );
    const user = rows[0];
    res.status(201).json({ token: signToken(user), user });
  })
);

router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    // "login" can be an email or a username
    const login = str(req.body.login ?? req.body.email, 'Email or username', { required: true });
    const password = str(req.body.password, 'Password', { required: true });

    const { rows } = await query(
      `SELECT ${PUBLIC_USER_FIELDS}, email, password_hash FROM users
       WHERE email = LOWER($1) OR LOWER(username) = LOWER($1)`,
      [login]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new HttpError(401, 'Incorrect email/username or password');
    }
    delete user.password_hash;
    res.json({ token: signToken(user), user });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT ${PUBLIC_USER_FIELDS}, email FROM users WHERE id = $1`, [req.user.id]);
    if (!rows[0]) throw new HttpError(404, 'User no longer exists');
    res.json({ user: rows[0] });
  })
);

export default router;
