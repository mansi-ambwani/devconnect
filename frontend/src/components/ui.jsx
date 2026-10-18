import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate } from '../hooks.js';

export function Avatar({ user, size = 40 }) {
  const initials = (user?.name || user?.username || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  if (user?.avatar_url) {
    return <img className="avatar" src={user.avatar_url} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  }
  return (
    <span className="avatar avatar--initials" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials}
    </span>
  );
}

export function Tags({ tags = [], linked = true }) {
  if (!tags.length) return null;
  return (
    <ul className="tags">
      {tags.map((t) => (
        <li key={t}>{linked ? <Link to={`/posts?tag=${encodeURIComponent(t)}`}>#{t}</Link> : <span>#{t}</span>}</li>
      ))}
    </ul>
  );
}

export function Loading({ label = 'Loading' }) {
  return (
    <p className="status" role="status">
      <span className="spinner" aria-hidden="true" /> {label}…
    </p>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <p className="error" role="alert">
      {error.message || String(error)}
    </p>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {children}
    </div>
  );
}

export function PostList({ posts, showAuthor = true }) {
  return (
    <ol className="post-list">
      {posts.map((p) => (
        <li key={p.id} className="post-row">
          <div className="post-row__meta">
            {showAuthor && p.author && (
              <Link to={`/u/${p.author.username}`} className="byline">
                <Avatar user={p.author} size={24} />
                {p.author.name || p.author.username}
              </Link>
            )}
            <time dateTime={p.created_at}>{formatDate(p.created_at)}</time>
          </div>
          <h3 className="post-row__title">
            <Link to={`/posts/${p.slug}`}>{p.title}</Link>
          </h3>
          {p.summary && <p className="post-row__summary">{p.summary}</p>}
          <Tags tags={p.tags} />
        </li>
      ))}
    </ol>
  );
}

export function Pager({ page, limit, total, onChange }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <button className="btn btn--ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Newer
      </button>
      <span>
        Page {page} of {pages}
      </span>
      <button className="btn btn--ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Older
      </button>
    </nav>
  );
}

/** Redirects to /login if not signed in. */
export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
