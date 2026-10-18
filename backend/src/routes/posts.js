import { Router } from 'express';
import { query } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errors.js';
import { slugify, str, toList, pageParams } from '../utils.js';

const router = Router();

const POST_LIST_FIELDS = `p.id, p.title, p.slug, p.summary, p.tags, p.published, p.created_at, p.updated_at,
  json_build_object('username', u.username, 'name', u.name, 'avatar_url', u.avatar_url) AS author`;

/** GET /api/posts?q=&tag=&author=&page=&limit= — public feed of published posts */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { limit, page, offset } = pageParams(req.query);
    const where = ['p.published'];
    const params = [];
    if (req.query.q) {
      params.push(`%${String(req.query.q).trim()}%`);
      where.push(`(p.title ILIKE $${params.length} OR p.summary ILIKE $${params.length})`);
    }
    if (req.query.tag) {
      params.push(String(req.query.tag).trim().toLowerCase());
      where.push(`$${params.length} = ANY(p.tags)`);
    }
    if (req.query.author) {
      params.push(String(req.query.author).trim());
      where.push(`LOWER(u.username) = LOWER($${params.length})`);
    }
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const from = 'FROM posts p JOIN users u ON u.id = p.author_id';

    const total = await query(`SELECT COUNT(*)::int AS n ${from} ${whereSql}`, params);
    params.push(limit, offset);
    const { rows } = await query(
      `SELECT ${POST_LIST_FIELDS} ${from} ${whereSql}
       ORDER BY p.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ posts: rows, page, limit, total: total.rows[0].n });
  })
);

/** GET /api/posts/tags — popular tags */
router.get(
  '/tags',
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT tag, COUNT(*)::int AS count FROM posts, unnest(tags) AS tag
       WHERE published GROUP BY tag ORDER BY count DESC, tag LIMIT 20`
    );
    res.json({ tags: rows });
  })
);

/** GET /api/posts/mine — logged-in user's posts including drafts */
router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT ${POST_LIST_FIELDS} FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.author_id = $1 ORDER BY p.updated_at DESC`,
      [req.user.id]
    );
    res.json({ posts: rows });
  })
);

/** GET /api/posts/:slug — one post with full markdown content (drafts only visible to author) */
router.get(
  '/:slug',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT ${POST_LIST_FIELDS}, p.content, p.author_id
       FROM posts p JOIN users u ON u.id = p.author_id WHERE p.slug = $1`,
      [req.params.slug]
    );
    const post = rows[0];
    if (!post || (!post.published && post.author_id !== req.user?.id)) {
      throw new HttpError(404, 'Post not found');
    }
    res.json({ post });
  })
);

function readPostBody(body, { partial = false } = {}) {
  const b = body || {};
  return {
    title: str(b.title, 'Title', { required: !partial, max: 200 }),
    summary: str(b.summary, 'Summary', { max: 300 }),
    content: str(b.content, 'Content', { required: !partial, max: 100000 }),
    tags: b.tags !== undefined ? toList(b.tags, { max: 8, maxLen: 30, lower: true }) : undefined,
    published: b.published !== undefined ? Boolean(b.published) : undefined,
  };
}

/** POST /api/posts — create a post */
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const d = readPostBody(req.body);
    const { rows } = await query(
      `INSERT INTO posts (author_id, title, slug, summary, content, tags, published)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, d.title, slugify(d.title), d.summary || '', d.content, d.tags || [], d.published ?? true]
    );
    res.status(201).json({ post: rows[0] });
  })
);

async function loadOwnPost(id, userId) {
  const { rows } = await query('SELECT * FROM posts WHERE id = $1', [Number(id) || 0]);
  if (!rows[0]) throw new HttpError(404, 'Post not found');
  if (rows[0].author_id !== userId) throw new HttpError(403, 'You can only change your own posts');
  return rows[0];
}

/** PUT /api/posts/:id — update your own post */
router.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await loadOwnPost(req.params.id, req.user.id);
    const d = readPostBody(req.body, { partial: true });
    const sets = [];
    const params = [];
    for (const [key, value] of Object.entries(d)) {
      if (value === undefined) continue;
      params.push(value);
      sets.push(`${key} = $${params.length}`);
    }
    if (!sets.length) throw new HttpError(400, 'Nothing to update');
    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE posts SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params
    );
    res.json({ post: rows[0] });
  })
);

/** DELETE /api/posts/:id — delete your own post */
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await loadOwnPost(req.params.id, req.user.id);
    await query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.status(204).end();
  })
);

export default router;
