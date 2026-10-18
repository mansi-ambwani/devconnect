import { Router } from 'express';
import { query } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errors.js';
import { str, toList, pageParams } from '../utils.js';

const router = Router();

// Fields that are safe to show publicly (never email or password hash).
export const PUBLIC_USER_FIELDS =
  'id, username, name, headline, bio, location, avatar_url, website, github, linkedin, skills, created_at';

/** GET /api/users?search=&skill=&page=&limit= — developer directory */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { limit, page, offset } = pageParams(req.query);
    const search = req.query.search ? `%${String(req.query.search).trim()}%` : null;
    const skill = req.query.skill ? String(req.query.skill).trim() : null;

    const where = [];
    const params = [];
    if (search) {
      params.push(search);
      where.push(`(u.username ILIKE $${params.length} OR u.name ILIKE $${params.length} OR u.headline ILIKE $${params.length})`);
    }
    if (skill) {
      params.push(skill);
      where.push(`EXISTS (SELECT 1 FROM unnest(u.skills) s WHERE LOWER(s) = LOWER($${params.length}))`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = await query(`SELECT COUNT(*)::int AS n FROM users u ${whereSql}`, params);
    params.push(limit, offset);
    const { rows } = await query(
      `SELECT ${PUBLIC_USER_FIELDS.split(', ').map((f) => 'u.' + f).join(', ')},
              (SELECT COUNT(*)::int FROM posts p WHERE p.author_id = u.id AND p.published) AS post_count
       FROM users u ${whereSql}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ users: rows, page, limit, total: total.rows[0].n });
  })
);

/** PUT /api/users/me — update your own profile */
router.put(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const updates = {
      name: str(b.name, 'Name', { max: 100 }),
      headline: str(b.headline, 'Headline', { max: 150 }),
      bio: str(b.bio, 'Bio', { max: 5000 }),
      location: str(b.location, 'Location', { max: 100 }),
      avatar_url: str(b.avatar_url, 'Avatar URL', { max: 500 }),
      website: str(b.website, 'Website', { max: 500 }),
      github: str(b.github, 'GitHub username', { max: 100 }),
      linkedin: str(b.linkedin, 'LinkedIn username', { max: 100 }),
      skills: b.skills !== undefined ? toList(b.skills, { max: 30 }) : undefined,
    };
    for (const urlField of ['avatar_url', 'website']) {
      if (updates[urlField] && !/^https?:\/\//i.test(updates[urlField])) {
        throw new HttpError(400, `${urlField === 'website' ? 'Website' : 'Avatar URL'} must start with http:// or https://`);
      }
    }

    const sets = [];
    const params = [];
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      params.push(value);
      sets.push(`${key} = $${params.length}`);
    }
    if (!sets.length) throw new HttpError(400, 'Nothing to update');

    params.push(req.user.id);
    const { rows } = await query(
      `UPDATE users SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length} RETURNING ${PUBLIC_USER_FIELDS}, email`,
      params
    );
    res.json({ user: rows[0] });
  })
);

/** GET /api/users/:username — public portfolio with published posts */
router.get(
  '/:username',
  asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE LOWER(username) = LOWER($1)`, [
      req.params.username,
    ]);
    const user = rows[0];
    if (!user) throw new HttpError(404, 'Developer not found');

    const posts = await query(
      `SELECT id, title, slug, summary, tags, created_at, updated_at
       FROM posts WHERE author_id = $1 AND published ORDER BY created_at DESC`,
      [user.id]
    );
    res.json({ user, posts: posts.rows });
  })
);

export default router;
