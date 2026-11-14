import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFilters } from '../lib/hooks';
import { SearchBox } from './SearchBox';

export function Header() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { data } = useFilters();

  return (
    <header className="site-header">
      <div className="container header-row">
        <Link to="/" className="logo" aria-label="Keyhub home"><span className="logo-mark" aria-hidden="true">⚿</span>keyhub</Link>
        <SearchBox />
        <nav className="header-actions" aria-label="Account">
          {user ? (
            <>
              <Link to="/orders">Orders</Link>
              <button className="link-btn" onClick={logout} title={user.email}>Sign out ({user.username})</button>
            </>
          ) : (
            <Link to="/login">Sign in</Link>
          )}
          <Link to="/cart" className="cart-link" aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
            <span aria-hidden="true">🛒</span>
            {count > 0 && <span className="cart-count">{count}</span>}
          </Link>
        </nav>
      </div>
      <nav className="subnav" aria-label="Platforms">
        <div className="container subnav-row">
          <NavLink to="/store" end>All games</NavLink>
          {data?.platforms.map((p) => <NavLink key={p.slug} to={`/store?platform=${p.slug}`}>{p.name}</NavLink>)}
        </div>
      </nav>
    </header>
  );
}
