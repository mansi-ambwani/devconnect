import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox, Avatar } from '../components/ui.jsx';
import { useTitle } from '../hooks.js';
import { api } from '../api/client.js';

const FIELDS = ['name', 'headline', 'location', 'bio', 'avatar_url', 'website', 'github', 'linkedin'];

export default function Settings() {
  useTitle('Edit profile');
  const { user, setUser } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState(() => ({
    ...Object.fromEntries(FIELDS.map((f) => [f, user[f] || ''])),
    skills: (user.skills || []).join(', '),
  }));
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const field = (key) => ({
    value: form[key],
    onChange: (e) => {
      setSaved(false);
      setForm({ ...form, [key]: e.target.value });
    },
  });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user: updated } = await api.updateMe(form);
      setUser(updated);
      setSaved(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page--narrow">
      <header className="page-head">
        <h1>Edit profile</h1>
        {location.state?.welcome && !saved && (
          <p className="notice">Your account is ready. Fill in your profile so other developers can find you.</p>
        )}
      </header>
      <form className="form" onSubmit={submit}>
        <ErrorBox error={error} />
        <div className="form__avatar">
          <Avatar user={{ ...user, avatar_url: form.avatar_url, name: form.name }} size={72} />
          <label>
            Photo URL <span className="hint">link to an image, e.g. https://github.com/{form.github || 'you'}.png</span>
            <input type="url" {...field('avatar_url')} />
          </label>
        </div>
        <label>
          Full name
          <input maxLength={100} {...field('name')} />
        </label>
        <label>
          Headline <span className="hint">one line, e.g. “Backend developer, Node and PostgreSQL”</span>
          <input maxLength={150} {...field('headline')} />
        </label>
        <label>
          Location
          <input maxLength={100} {...field('location')} />
        </label>
        <label>
          Bio <span className="hint">Markdown supported</span>
          <textarea rows={6} maxLength={5000} {...field('bio')} />
        </label>
        <label>
          Skills <span className="hint">comma separated</span>
          <input placeholder="React, Node.js, PostgreSQL" {...field('skills')} />
        </label>
        <div className="form__row">
          <label>
            GitHub username
            <input {...field('github')} />
          </label>
          <label>
            LinkedIn username
            <input {...field('linkedin')} />
          </label>
        </div>
        <label>
          Website
          <input type="url" placeholder="https://" {...field('website')} />
        </label>
        <div className="form__actions">
          <button className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save profile'}
          </button>
          {saved && (
            <p className="saved" role="status">
              Profile saved. <Link to={`/u/${user.username}`}>View your profile</Link>
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
