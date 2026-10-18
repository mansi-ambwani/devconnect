import { useState } from 'react';
import { Link } from 'react-router-dom';
import Markdown from '../components/Markdown.jsx';
import { PostList, Loading, ErrorBox, Empty } from '../components/ui.jsx';
import { useAsync, useTitle } from '../hooks.js';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const SAMPLE = `## Hi, I'm Priya 👋

I build **fast web apps** with React and Node.

- Shipped a \`PostgreSQL\` search that cut queries from 2s to 40ms
- Currently learning *Docker* and *Azure*

\`\`\`js
const stack = ['React', 'Express', 'Postgres'];
\`\`\`
`;

export default function Home() {
  useTitle('');
  const { user } = useAuth();
  const [draft, setDraft] = useState(SAMPLE);
  const posts = useAsync(() => api.listPosts({ limit: 5 }), []);
  const tags = useAsync(() => api.tags(), []);

  return (
    <>
      <section className="hero">
        <div className="hero__copy">
          <h1>Write in Markdown. Publish a portfolio.</h1>
          <p className="lede">
            DevConnect gives every developer a profile page and a blog. Try it: edit the Markdown and watch the preview
            update as you type.
          </p>
          <div className="hero__actions">
            {user ? (
              <Link to="/write" className="btn btn--primary">
                Write a post
              </Link>
            ) : (
              <Link to="/register" className="btn btn--primary">
                Create your profile
              </Link>
            )}
            <Link to="/developers" className="btn btn--ghost">
              Browse developers
            </Link>
          </div>
        </div>

        <div className="playground" aria-label="Markdown live preview demo">
          <div className="playground__pane">
            <label htmlFor="demo-md" className="playground__label">
              Markdown
            </label>
            <textarea
              id="demo-md"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck="false"
            />
          </div>
          <div className="playground__pane playground__pane--out">
            <span className="playground__label">Preview</span>
            <Markdown className="prose--compact">{draft}</Markdown>
          </div>
        </div>
      </section>

      <section className="home-grid">
        <div>
          <div className="section-head">
            <h2>Latest posts</h2>
            <Link to="/posts">All posts</Link>
          </div>
          {posts.loading && <Loading />}
          <ErrorBox error={posts.error} />
          {posts.data &&
            (posts.data.posts.length ? (
              <PostList posts={posts.data.posts} />
            ) : (
              <Empty title="No posts yet">
                <p>
                  Be the first to publish. <Link to={user ? '/write' : '/register'}>Write a post</Link>.
                </p>
              </Empty>
            ))}
        </div>
        <aside className="side">
          <h2>Popular tags</h2>
          {tags.data?.tags?.length ? (
            <ul className="tag-cloud">
              {tags.data.tags.map((t) => (
                <li key={t.tag}>
                  <Link to={`/posts?tag=${encodeURIComponent(t.tag)}`}>
                    #{t.tag} <span>{t.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Tags show up here once posts are published.</p>
          )}
        </aside>
      </section>
    </>
  );
}
