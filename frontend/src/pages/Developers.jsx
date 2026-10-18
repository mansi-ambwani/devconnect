import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Avatar, Loading, ErrorBox, Empty, Pager } from '../components/ui.jsx';
import { useAsync, useTitle } from '../hooks.js';
import { api } from '../api/client.js';

export default function Developers() {
  useTitle('Developers');
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const skill = params.get('skill') || '';
  const page = Number(params.get('page')) || 1;
  const [text, setText] = useState(search);

  const { data, error, loading } = useAsync(() => api.listUsers({ search, skill, page, limit: 12 }), [search, skill, page]);

  const set = (next) => {
    const merged = { search, skill, ...next };
    setParams(Object.fromEntries(Object.entries(merged).filter(([, v]) => v)));
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>{skill ? `Developers who know ${skill}` : 'Developers'}</h1>
        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set({ search: text.trim(), page: '' });
          }}
        >
          <label htmlFor="dev-search" className="sr-only">
            Search developers
          </label>
          <input
            id="dev-search"
            type="search"
            placeholder="Search by name, username or headline"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn btn--primary">Search</button>
        </form>
        {(search || skill) && (
          <p className="filters">
            <Link to="/developers">Clear filters</Link>
          </p>
        )}
      </header>

      {loading && <Loading />}
      <ErrorBox error={error} />
      {data &&
        (data.users.length ? (
          <>
            <ul className="dev-grid">
              {data.users.map((u) => (
                <li key={u.id} className="dev">
                  <Link to={`/u/${u.username}`} className="dev__link">
                    <Avatar user={u} size={56} />
                    <span className="dev__name">{u.name || u.username}</span>
                    <span className="dev__handle">@{u.username}</span>
                  </Link>
                  {u.headline && <p className="dev__headline">{u.headline}</p>}
                  {u.skills?.length > 0 && (
                    <ul className="skills skills--small">
                      {u.skills.slice(0, 5).map((s) => (
                        <li key={s}>
                          <button type="button" onClick={() => set({ skill: s, page: '' })}>
                            {s}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="dev__count">
                    {u.post_count} {u.post_count === 1 ? 'post' : 'posts'}
                  </p>
                </li>
              ))}
            </ul>
            <Pager page={page} limit={data.limit} total={data.total} onChange={(p) => set({ page: String(p) })} />
          </>
        ) : (
          <Empty title="No developers found">
            <p>Try another search, or <Link to="/developers">see everyone</Link>.</p>
          </Empty>
        ))}
    </div>
  );
}
