// Adds a demo user and sample posts so the site isn't empty.
// Run with: npm run seed
// Demo login -> username: demo   password: demo12345
import bcrypt from 'bcryptjs';
import { migrate, pool } from './index.js';
import { slugify } from '../utils.js';

const posts = [
  {
    title: 'Getting Started with DevConnect',
    summary: 'A quick tour of writing posts in Markdown on DevConnect.',
    tags: ['devconnect', 'markdown'],
    content: `# Welcome to DevConnect 👋

DevConnect lets developers share a **portfolio** and write **blog posts in Markdown**.

## What you can use

- Headings, **bold**, *italics* and \`inline code\`
- Lists and [links](https://github.com)
- Tables:

| Feature | Supported |
| ------- | --------- |
| Code blocks | ✅ |
| Tables | ✅ |

## Code blocks

\`\`\`js
const greet = (name) => \`Hello, \${name}!\`;
console.log(greet('DevConnect'));
\`\`\`

> Tip: use the live preview in the editor to see your post as you type.
`,
  },
  {
    title: 'Designing a REST API with Express and PostgreSQL',
    summary: 'How the DevConnect backend is organised: routes, auth and SQL.',
    tags: ['nodejs', 'postgresql', 'api'],
    content: `## Overview

The API follows REST conventions:

1. \`GET /api/posts\` — list published posts
2. \`POST /api/posts\` — create a post (requires login)
3. \`PUT /api/posts/:id\` — update your own post
4. \`DELETE /api/posts/:id\` — delete your own post

Passwords are hashed with **bcrypt** and sessions use **JWT** tokens.

\`\`\`sql
SELECT title, slug FROM posts WHERE published ORDER BY created_at DESC;
\`\`\`
`,
  },
];

async function seed() {
  await migrate();
  const hash = await bcrypt.hash('demo12345', 10);
  const { rows } = await pool.query(
    `INSERT INTO users (username, email, password_hash, name, headline, bio, location, github, skills)
     VALUES ('demo', 'demo@devconnect.dev', $1, 'Demo Developer', 'Full-stack developer | React · Node · PostgreSQL',
             'I build web apps and write about what I learn.', 'India', 'octocat',
             ARRAY['React','Node.js','PostgreSQL','Docker','Azure'])
     ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
     RETURNING id`,
    [hash]
  );
  const userId = rows[0].id;
  const existing = await pool.query('SELECT COUNT(*)::int AS n FROM posts WHERE author_id = $1', [userId]);
  if (existing.rows[0].n === 0) {
    for (const p of posts) {
      await pool.query(
        'INSERT INTO posts (author_id, title, slug, summary, content, tags) VALUES ($1,$2,$3,$4,$5,$6)',
        [userId, p.title, slugify(p.title), p.summary, p.content, p.tags]
      );
    }
  }
  console.log('Seed complete. Demo login -> username: demo / password: demo12345');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
