// Integration tests: run against a real PostgreSQL database.
// Run with: npm test   (needs DATABASE_URL and JWT_SECRET set, e.g. via .env)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { migrate, pool } from '../src/db/index.js';

let server;
let base;
const uid = Date.now().toString(36);
const alice = { username: `alice_${uid}`, email: `alice_${uid}@test.dev`, password: 'password123', name: 'Alice' };
const bob = { username: `bob_${uid}`, email: `bob_${uid}@test.dev`, password: 'password123' };
let aliceToken, bobToken, postId, postSlug, draftSlug;

async function api(method, path, { body, token } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

before(async () => {
  await migrate();
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await pool.query('DELETE FROM users WHERE username = ANY($1)', [[alice.username, bob.username]]);
  server.close();
  await pool.end();
});

test('health check reports database connected', async () => {
  const r = await api('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.data.database, 'connected');
});

test('register validates input', async () => {
  assert.equal((await api('POST', '/api/auth/register', { body: { ...alice, password: 'short' } })).status, 400);
  assert.equal((await api('POST', '/api/auth/register', { body: { ...alice, username: 'a b' } })).status, 400);
  assert.equal((await api('POST', '/api/auth/register', { body: { ...alice, email: 'nope' } })).status, 400);
});

test('register and login', async () => {
  const r = await api('POST', '/api/auth/register', { body: alice });
  assert.equal(r.status, 201);
  assert.ok(r.data.token);
  assert.equal(r.data.user.password_hash, undefined);
  aliceToken = r.data.token;

  const dup = await api('POST', '/api/auth/register', { body: alice });
  assert.equal(dup.status, 409);

  bobToken = (await api('POST', '/api/auth/register', { body: bob })).data.token;

  const bad = await api('POST', '/api/auth/login', { body: { login: alice.email, password: 'wrongpass' } });
  assert.equal(bad.status, 401);
  const byName = await api('POST', '/api/auth/login', { body: { login: alice.username, password: alice.password } });
  assert.equal(byName.status, 200);

  const me = await api('GET', '/api/auth/me', { token: aliceToken });
  assert.equal(me.data.user.username, alice.username);
  assert.equal((await api('GET', '/api/auth/me')).status, 401);
});

test('update profile', async () => {
  const r = await api('PUT', '/api/users/me', {
    token: aliceToken,
    body: { headline: 'React dev', skills: 'React, Node.js, react', website: 'https://alice.dev' },
  });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.user.skills, ['React', 'Node.js', 'react']);
  const bad = await api('PUT', '/api/users/me', { token: aliceToken, body: { website: 'javascript:alert(1)' } });
  assert.equal(bad.status, 400);
});

test('create, read, update posts', async () => {
  assert.equal((await api('POST', '/api/posts', { body: { title: 'x', content: 'y' } })).status, 401);
  assert.equal((await api('POST', '/api/posts', { token: aliceToken, body: { title: 'x' } })).status, 400);

  const r = await api('POST', '/api/posts', {
    token: aliceToken,
    body: { title: 'Hello World!', content: '# Hi\n\nSome **markdown**', tags: ['Intro', 'React'] },
  });
  assert.equal(r.status, 201);
  assert.match(r.data.post.slug, /^hello-world-[0-9a-f]{6}$/);
  assert.deepEqual(r.data.post.tags, ['intro', 'react']);
  postId = r.data.post.id;
  postSlug = r.data.post.slug;

  const draft = await api('POST', '/api/posts', {
    token: aliceToken,
    body: { title: 'Secret draft', content: 'wip', published: false },
  });
  draftSlug = draft.data.post.slug;

  const one = await api('GET', `/api/posts/${postSlug}`);
  assert.equal(one.status, 200);
  assert.equal(one.data.post.author.username, alice.username);

  // drafts: hidden from public and other users, visible to author
  assert.equal((await api('GET', `/api/posts/${draftSlug}`)).status, 404);
  assert.equal((await api('GET', `/api/posts/${draftSlug}`, { token: bobToken })).status, 404);
  assert.equal((await api('GET', `/api/posts/${draftSlug}`, { token: aliceToken })).status, 200);

  const mine = await api('GET', '/api/posts/mine', { token: aliceToken });
  assert.equal(mine.data.posts.length, 2);

  // only owner can edit
  assert.equal((await api('PUT', `/api/posts/${postId}`, { token: bobToken, body: { title: 'hacked' } })).status, 403);
  const upd = await api('PUT', `/api/posts/${postId}`, { token: aliceToken, body: { title: 'Hello Again' } });
  assert.equal(upd.data.post.title, 'Hello Again');
});

test('listing, filters and profiles', async () => {
  const byTag = await api('GET', '/api/posts?tag=intro&author=' + alice.username);
  assert.equal(byTag.data.total, 1);
  const search = await api('GET', '/api/posts?q=hello&author=' + alice.username);
  assert.equal(search.data.posts.length, 1);
  const tags = await api('GET', '/api/posts/tags');
  assert.ok(tags.data.tags.some((t) => t.tag === 'intro'));

  const devs = await api('GET', `/api/users?search=${alice.username}`);
  assert.equal(devs.data.users.length, 1);
  assert.equal(devs.data.users[0].post_count, 1);
  assert.equal(devs.data.users[0].email, undefined);
  const bySkill = await api('GET', `/api/users?skill=node.js&search=${alice.username}`);
  assert.equal(bySkill.data.users.length, 1);

  const profile = await api('GET', `/api/users/${alice.username.toUpperCase()}`);
  assert.equal(profile.status, 200);
  assert.equal(profile.data.posts.length, 1); // draft not shown
  assert.equal((await api('GET', '/api/users/nobody_here_xyz')).status, 404);
});

test('delete post', async () => {
  assert.equal((await api('DELETE', `/api/posts/${postId}`, { token: bobToken })).status, 403);
  assert.equal((await api('DELETE', `/api/posts/${postId}`, { token: aliceToken })).status, 204);
  assert.equal((await api('GET', `/api/posts/${postSlug}`)).status, 404);
});

test('unknown routes and bad JSON', async () => {
  assert.equal((await api('GET', '/api/nope')).status, 404);
  const res = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{bad json',
  });
  assert.equal(res.status, 400);
});
