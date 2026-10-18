import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PostList, Loading, ErrorBox, Empty, Pager } from '../components/ui.jsx';
import { useAsync, useTitle } from '../hooks.js';
import { api } from '../api/client.js';

export default function Posts() {
  useTitle('Posts');
  const [params, setParams] = useSearchParams();
  const tag = params.get('tag') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page')) || 1;
  const [search, setSearch] = useState(q);

  useEffect(() => setSearch(q), [q]);

  const { data, error, loading } = useAsync(() => api.listPosts({ tag, q, page, limit: 10 }), [tag, q, page]);

  const update = (next) => {
    const merged = { tag, q, page: 1, ...next };
    setParams(Object.fromEntries(Object.entries(merged).filter(([k, v]) => v && !(k === 'page' && v === 1))));
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>{tag ? `Posts tagged #${tag}` : 'Posts'}</h1>
        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: search.trim() });
          }}
        >
          <label htmlFor="post-search" className="sr-only">
            Search posts
          </label>
          <input
            id="post-search"
            type="search"
            placeholder="Search titles and summaries"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn--primary">Search</button>
        </form>
        {(tag || q) && (
          <p className="filters">
            Showing {data?.total ?? '…'} results{q && <> for “{q}”</>}.{' '}
            <Link to="/posts">Clear filters</Link>
          </p>
        )}
      </header>

      {loading && <Loading />}
      <ErrorBox error={error} />
      {data &&
        (data.posts.length ? (
          <>
            <PostList posts={data.posts} />
            <Pager page={page} limit={data.limit} total={data.total} onChange={(p) => update({ page: p })} />
          </>
        ) : (
          <Empty title="No posts match">
            <p>Try a different search, or <Link to="/posts">see all posts</Link>.</p>
          </Empty>
        ))}
    </div>
  );
}
