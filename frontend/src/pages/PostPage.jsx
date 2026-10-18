import { useParams, Link, useNavigate } from 'react-router-dom';
import Markdown from '../components/Markdown.jsx';
import { Avatar, Tags, Loading, ErrorBox } from '../components/ui.jsx';
import { useAsync, useTitle, formatDate, readingTime } from '../hooks.js';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import NotFound from './NotFound.jsx';

export default function PostPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading } = useAsync(() => api.getPost(slug), [slug, user?.id]);
  const post = data?.post;
  useTitle(post?.title || 'Post');

  if (loading) return <Loading />;
  if (error?.status === 404) return <NotFound what="post" />;
  if (error) return <ErrorBox error={error} />;

  const isOwner = user && user.username === post.author.username;

  const remove = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    await api.deletePost(post.id);
    navigate('/dashboard');
  };

  return (
    <article className="article">
      <header className="article__head">
        {!post.published && <p className="badge badge--draft">Draft — only you can see this</p>}
        <h1>{post.title}</h1>
        {post.summary && <p className="lede">{post.summary}</p>}
        <div className="article__meta">
          <Link to={`/u/${post.author.username}`} className="byline">
            <Avatar user={post.author} size={36} />
            <span>
              <strong>{post.author.name || post.author.username}</strong>
              <span className="muted">
                {formatDate(post.created_at)}, {readingTime(post.content)} min read
              </span>
            </span>
          </Link>
          {isOwner && (
            <div className="article__actions">
              <Link to={`/edit/${post.slug}`} className="btn btn--ghost btn--sm">
                Edit
              </Link>
              <button className="btn btn--danger btn--sm" onClick={remove}>
                Delete
              </button>
            </div>
          )}
        </div>
        <Tags tags={post.tags} />
      </header>
      <Markdown className="prose--article">{post.content}</Markdown>
    </article>
  );
}
