import { Link } from 'react-router-dom';
import { useTitle } from '../hooks.js';

export default function NotFound({ what = 'page' }) {
  useTitle('Not found');
  return (
    <div className="notfound">
      <p className="notfound__code" aria-hidden="true">404</p>
      <h1>That {what} doesn’t exist</h1>
      <p className="muted">It may have been deleted, or the link has a typo.</p>
      <p>
        <Link to="/" className="btn btn--primary">
          Go to the home page
        </Link>
      </p>
    </div>
  );
}
