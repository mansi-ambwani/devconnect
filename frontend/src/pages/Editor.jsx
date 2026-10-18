import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Markdown from '../components/Markdown.jsx';
import { Loading, ErrorBox } from '../components/ui.jsx';
import { useTitle } from '../hooks.js';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const EMPTY = { title: '', summary: '', tags: '', content: '' };

export default function Editor() {
  const { slug } = useParams();
  const editing = Boolean(slug);
  useTitle(editing ? 'Edit post' : 'Write a post');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [postId, setPostId] = useState(null);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('write'); // for small screens

  useEffect(() => {
    if (!editing) return;
    api
      .getPost(slug)
      .then(({ post }) => {
        if (post.author.username !== user.username) throw new Error('You can only edit your own posts');
        setPostId(post.id);
        setForm({ title: post.title, summary: post.summary, tags: post.tags.join(', '), content: post.content });
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [slug, editing, user.username]);

  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  const save = async (published) => {
    setBusy(true);
    setError(null);
    const body = { ...form, tags: form.tags, published };
    try {
      const { post } = editing ? await api.updatePost(postId, body) : await api.createPost(body);
      navigate(`/posts/${post.slug}`);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="editor">
      <header className="page-head page-head--row">
        <h1>{editing ? 'Edit post' : 'Write a post'}</h1>
        <div className="row-actions">
          <Link to="/dashboard" className="btn btn--ghost">
            Cancel
          </Link>
          <button className="btn btn--ghost" disabled={busy} onClick={() => save(false)}>
            Save draft
          </button>
          <button className="btn btn--primary" disabled={busy} onClick={() => save(true)}>
            {busy ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </header>
      <ErrorBox error={error} />

      <form className="form editor__meta" onSubmit={(e) => e.preventDefault()}>
        <label>
          Title
          <input required maxLength={200} placeholder="What are you writing about?" {...field('title')} />
        </label>
        <label>
          Summary <span className="hint">optional, shown in post lists</span>
          <input maxLength={300} {...field('summary')} />
        </label>
        <label>
          Tags <span className="hint">comma separated, up to 8</span>
          <input placeholder="react, postgresql, docker" {...field('tags')} />
        </label>
      </form>

      <div className="editor__tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'write'} onClick={() => setTab('write')}>
          Write
        </button>
        <button role="tab" aria-selected={tab === 'preview'} onClick={() => setTab('preview')}>
          Preview
        </button>
      </div>
      <div className={`editor__panes editor__panes--${tab}`}>
        <label className="editor__write">
          <span className="sr-only">Content in Markdown</span>
          <textarea
            placeholder={'# Start writing\n\nMarkdown works here: **bold**, `code`, lists, tables…'}
            spellCheck="true"
            {...field('content')}
          />
        </label>
        <div className="editor__preview" aria-live="polite">
          {form.content.trim() ? (
            <Markdown className="prose--article">{form.content}</Markdown>
          ) : (
            <p className="muted">Your preview will appear here as you type.</p>
          )}
        </div>
      </div>
    </div>
  );
}
