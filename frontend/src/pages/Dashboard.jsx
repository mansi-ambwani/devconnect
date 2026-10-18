import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Loading, ErrorBox, Empty, Tags } from '../components/ui.jsx';
import { useTitle, formatDate } from '../hooks.js';
import { api } from '../api/client.js';

export default function Dashboard() {
  useTitle('Dashboard');
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.myPosts().then((d) => setPosts(d.posts)).catch(setError);
  }, []);

  const remove = async (p) => {
    if (!window.confirm(`Delete “${p.title}”? This cannot be undone.`)) return;
    try {
      await api.deletePost(p.id);
      setPosts((list) => list.filter((x) => x.id !== p.id));
    } catch (err) {
      setError(err);
    }
  };

  const togglePublish = async (p) => {
    try {
      const { post } = await api.updatePost(p.id, { published: !p.published });
      setPosts((list) => list.map((x) => (x.id === p.id ? { ...x, published: post.published } : x)));
    } catch (err) {
      setError(err);
    }
  };

  const published = posts?.filter((p) => p.published).length ?? 0;

  return (
    <div className="page">
      <header className="page-head page-head--row">
        <div>
          <h1>Welcome back, {user.name?.split(' ')[0] || user.username}</h1>
          <p className="muted">
            {posts ? `${published} published, ${posts.length - published} drafts` : ' '}
          </p>
        </div>
        <div className="row-actions">
          <Link to={`/u/${user.username}`} className="btn btn--ghost">
            View profile
          </Link>
          <Link to="/settings" className="btn btn--ghost">
            Edit profile
          </Link>
          <Link to="/write" className="btn btn--primary">
            Write a post
          </Link>
        </div>
      </header>

      <ErrorBox error={error} />
      {!posts && !error && <Loading />}
      {posts &&
        (posts.length ? (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Status</th>
                <th scope="col">Updated</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td data-label="Title">
                    <Link to={`/posts/${p.slug}`}>{p.title}</Link>
                    <Tags tags={p.tags} linked={false} />
                  </td>
                  <td data-label="Status">
                    <span className={`badge ${p.published ? 'badge--live' : 'badge--draft'}`}>
                      {p.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td data-label="Updated">{formatDate(p.updated_at)}</td>
                  <td>
                    <div className="table__actions">
                    <Link to={`/edit/${p.slug}`} className="btn btn--ghost btn--sm">
                      Edit
                    </Link>
                    <button className="btn btn--ghost btn--sm" onClick={() => togglePublish(p)}>
                      {p.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button className="btn btn--danger btn--sm" onClick={() => remove(p)}>
                      Delete
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty title="You haven’t written anything yet">
            <p>Posts are written in Markdown with a live preview.</p>
            <Link to="/write" className="btn btn--primary">
              Write your first post
            </Link>
          </Empty>
        ))}
    </div>
  );
}
