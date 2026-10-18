import { useParams, Link } from 'react-router-dom';
import Markdown from '../components/Markdown.jsx';
import { Avatar, PostList, Loading, ErrorBox, Empty } from '../components/ui.jsx';
import { useAsync, useTitle, formatDate } from '../hooks.js';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import NotFound from './NotFound.jsx';

export default function Profile() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const { data, error, loading } = useAsync(() => api.getUser(username), [username]);
  useTitle(data?.user ? data.user.name || data.user.username : 'Profile');

  if (loading) return <Loading />;
  if (error?.status === 404) return <NotFound what="developer" />;
  if (error) return <ErrorBox error={error} />;

  const { user, posts } = data;
  const isMe = me?.username === user.username;
  const links = [
    user.github && { label: 'GitHub', href: `https://github.com/${user.github}` },
    user.linkedin && { label: 'LinkedIn', href: `https://www.linkedin.com/in/${user.linkedin}` },
    user.website && { label: user.website.replace(/^https?:\/\//, '').replace(/\/$/, ''), href: user.website },
  ].filter(Boolean);

  return (
    <div className="profile">
      <header className="profile__head">
        <Avatar user={user} size={112} />
        <div className="profile__id">
          <h1 className="profile__name">{user.name || user.username}</h1>
          <p className="profile__handle">
            @{user.username}
            {user.location && <> in {user.location}</>}
          </p>
          {user.headline && <p className="profile__headline">{user.headline}</p>}
          {links.length > 0 && (
            <ul className="profile__links">
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {isMe && (
            <Link to="/settings" className="btn btn--ghost btn--sm">
              Edit profile
            </Link>
          )}
        </div>
      </header>

      <div className="profile__body">
        <section className="profile__main">
          <h2>About</h2>
          {user.bio ? (
            <Markdown>{user.bio}</Markdown>
          ) : (
            <p className="muted">
              {isMe ? (
                <>
                  Your bio is empty. <Link to="/settings">Add one</Link> so visitors know what you work on.
                </>
              ) : (
                'No bio yet.'
              )}
            </p>
          )}

          <h2>Posts</h2>
          {posts.length ? (
            <PostList posts={posts} showAuthor={false} />
          ) : (
            <Empty title={isMe ? 'You haven’t published anything yet' : 'No posts yet'}>
              {isMe && (
                <p>
                  <Link to="/write">Write your first post</Link>.
                </p>
              )}
            </Empty>
          )}
        </section>

        <aside className="profile__side">
          <h2>Stack</h2>
          {user.skills?.length ? (
            <ul className="stack">
              {user.skills.map((s) => (
                <li key={s}>
                  <Link to={`/developers?skill=${encodeURIComponent(s)}`}>{s}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No skills listed.</p>
          )}
          <p className="muted small">Member since {formatDate(user.created_at)}</p>
        </aside>
      </div>
    </div>
  );
}
