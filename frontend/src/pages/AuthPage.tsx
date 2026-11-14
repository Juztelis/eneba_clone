import { useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

/** Only same-site paths are accepted as a post-login destination (no open redirects). */
const safeNext = (n: string | null): string => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/');

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, login, register } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';

  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErrors({}); setMessage(null);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.email, form.username, form.password);
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.fields); if (!Object.keys(err.fields).length) setMessage(err.message); }
      else setMessage('Something went wrong. Please try again.');
    } finally { setBusy(false); }
  };

  const bind = (k: keyof typeof form) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value })), 'aria-invalid': !!errors[k] });
  const other = `${isLogin ? '/register' : '/login'}${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="container auth">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>{isLogin ? 'Sign in' : 'Create your account'}</h1>
        {message && <div className="notice notice-error" role="alert">{message}</div>}
        <div className={`field${errors.email ? ' has-error' : ''}`}>
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="email" required {...bind('email')} />
          {errors.email && <p className="field-error" role="alert">{errors.email}</p>}
        </div>
        {!isLogin && (
          <div className={`field${errors.username ? ' has-error' : ''}`}>
            <label htmlFor="username">Username</label>
            <input id="username" autoComplete="username" required {...bind('username')} />
            {errors.username && <p className="field-error" role="alert">{errors.username}</p>}
          </div>
        )}
        <div className={`field${errors.password ? ' has-error' : ''}`}>
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} required {...bind('password')} />
          {errors.password ? <p className="field-error" role="alert">{errors.password}</p> : !isLogin && <p className="muted small">At least 8 characters.</p>}
        </div>
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}</button>
        <p className="muted">{isLogin ? 'New here?' : 'Already have an account?'} <Link to={other}>{isLogin ? 'Create an account' : 'Sign in'}</Link></p>
      </form>
    </div>
  );
}
