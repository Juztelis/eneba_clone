import { Link } from 'react-router-dom';
import { Empty } from '../components/ui';

export function NotFoundPage() {
  return <div className="container"><Empty title="Page not found"><Link to="/">Go to the homepage</Link></Empty></div>;
}
