-- DevConnect database schema
-- Safe to run many times (uses IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(30)  NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  name          VARCHAR(100) NOT NULL DEFAULT '',
  headline      VARCHAR(150) NOT NULL DEFAULT '',
  bio           TEXT         NOT NULL DEFAULT '',
  location      VARCHAR(100) NOT NULL DEFAULT '',
  avatar_url    TEXT         NOT NULL DEFAULT '',
  website       TEXT         NOT NULL DEFAULT '',
  github        VARCHAR(100) NOT NULL DEFAULT '',
  linkedin      VARCHAR(100) NOT NULL DEFAULT '',
  skills        TEXT[]       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id          SERIAL PRIMARY KEY,
  author_id   INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  slug        VARCHAR(255) NOT NULL UNIQUE,
  summary     VARCHAR(300) NOT NULL DEFAULT '',
  content     TEXT         NOT NULL,
  tags        TEXT[]       NOT NULL DEFAULT '{}',
  published   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_author     ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tags       ON posts USING GIN (tags);
