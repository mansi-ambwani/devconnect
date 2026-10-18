import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar } from './ui.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <div className="topbar__inner">
          <Link to="/" className="logo">
            <span className="logo__mark" aria-hidden="true">
              &lt;/&gt;
            </span>
            DevConnect
          </Link>
          <button className="menu-toggle" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen((o) => !o)}>
            Menu
          </button>
          <nav id="site-nav" className={`nav ${open ? 'nav--open' : ''}`}>
            <NavLink to="/posts">Posts</NavLink>
            <NavLink to="/developers">Developers</NavLink>
            {user ? (
              <>
                <NavLink to="/dashboard">Dashboard</NavLink>
                <Link to="/write" className="btn btn--primary btn--sm">
                  Write a post
                </Link>
                <Link to={`/u/${user.username}`} className="nav__me" title="Your profile">
                  <Avatar user={user} size={30} />
                  <span className="sr-only">Your profile</span>
                </Link>
                <button
                  className="linklike"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login">Log in</NavLink>
                <Link to="/register" className="btn btn--primary btn--sm">
                  Create account
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main" className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <p>DevConnect — portfolios and Markdown blogs for developers.</p>
        <p>
          Built with React, Express, PostgreSQL and Docker.
        </p>
      </footer>
    </div>
  );
}
