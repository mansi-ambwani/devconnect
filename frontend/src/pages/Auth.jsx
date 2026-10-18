import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox } from '../components/ui.jsx';
import { useTitle } from '../hooks.js';

export function Login() {
  useTitle('Log in');
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form.login.trim(), form.password);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <h1>Log in</h1>
      <form onSubmit={submit} className="form">
        <ErrorBox error={error} />
        <label>
          Email or username
          <input
            required
            autoComplete="username"
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
          />
        </label>
        <label>
          Password
          <input
            required
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>
        <button className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="auth__alt">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}

export function Register() {
  useTitle('Create account');
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({ ...form, username: form.username.trim(), email: form.email.trim() });
      navigate('/settings', { replace: true, state: { welcome: true } });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <h1>Create your account</h1>
      <form onSubmit={submit} className="form">
        <ErrorBox error={error} />
        <label>
          Full name
          <input required autoComplete="name" maxLength={100} {...field('name')} />
        </label>
        <label>
          Username
          <input
            required
            autoComplete="username"
            pattern="[A-Za-z0-9_]{3,30}"
            title="3 to 30 letters, numbers or underscores"
            {...field('username')}
          />
          <span className="hint">Your profile will live at /u/{form.username || 'username'}</span>
        </label>
        <label>
          Email
          <input required type="email" autoComplete="email" {...field('email')} />
        </label>
        <label>
          Password
          <input required type="password" minLength={8} autoComplete="new-password" {...field('password')} />
          <span className="hint">At least 8 characters</span>
        </label>
        <button className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="auth__alt">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
