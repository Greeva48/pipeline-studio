import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import LiveGraph from '../../components/LiveGraph';
import '../../auth.css';

function GithubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M7 0C3.13 0 0 3.13 0 7c0 3.09 2.005 5.715 4.786 6.64.35.064.479-.152.479-.337 0-.166-.007-.716-.01-1.3-1.95.423-2.362-.94-2.362-.94-.318-.81-.778-1.025-.778-1.025-.636-.434.048-.425.048-.425.703.05 1.073.72 1.073.72.625 1.07 1.638.76 2.037.58.063-.452.244-.76.444-.934-1.558-.177-3.195-.779-3.195-3.468 0-.766.274-1.392.72-1.883-.072-.178-.312-.892.069-1.86 0 0 .586-.188 1.92.715A6.686 6.686 0 017 3.53c.594.003 1.192.08 1.75.235 1.333-.903 1.918-.715 1.918-.715.382.969.142 1.682.07 1.86.448.491.72 1.117.72 1.883 0 2.696-1.64 3.289-3.203 3.463.252.217.476.645.476 1.3 0 .939-.008 1.695-.008 1.926 0 .187.126.405.482.337C11.998 12.714 14 10.09 14 7c0-3.87-3.13-7-7-7z"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M13.06 7.16c0-.46-.04-.9-.11-1.33H7v2.51h3.4c-.15.79-.59 1.46-1.25 1.9v1.58h2.02c1.18-1.09 1.87-2.7 1.87-4.66z" fill="#4285F4"/>
      <path d="M7 14c1.7 0 3.12-.56 4.17-1.52l-2.03-1.58c-.56.38-1.28.6-2.14.6-1.65 0-3.05-1.11-3.54-2.61H1.37v1.63C2.41 12.46 4.56 14 7 14z" fill="#34A853"/>
      <path d="M3.46 8.89A4.2 4.2 0 013.24 7.5c0-.48.08-.94.22-1.38V4.49H1.37A7 7 0 000 7.5c0 1.13.27 2.2.74 3.14l2.72-1.75z" fill="#FBBC05"/>
      <path d="M7 2.91c.93 0 1.77.32 2.42.95l1.82-1.82C10.12 1.01 8.7.42 7 .42A7 7 0 001.37 4.5L4.1 6.13C4.59 4.63 6 3.52 7 2.91z" fill="#EA4335"/>
    </svg>
  );
}

export default function SignIn() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null); // 'google' | 'github' | null
  const { signIn, signInWithGoogle, signInWithGitHub, isAuthenticated } = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();
  const from        = location.state?.from?.pathname || '/dashboard';

  // Already authenticated (e.g. OAuth just completed, or visited /signin while
  // logged in) → leave the sign-in page.
  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, from, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-split">

        {/* ── Left: editorial + animated graph ─────────── */}
        <motion.div
          className="auth-left"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="auth-left__wordmark">
            PIPELINE<span className="auth-left__wordmark-dot">●</span>STUDIO
          </span>

          <div className="auth-left__copy">
            <h1 className="auth-left__headline">
              Build AI systems.<br/>
              <span className="auth-left__headline-dim">Not accounts.</span>
            </h1>
            <p className="auth-left__sub">
              Compose, validate, and deploy inference pipelines
              on a typed DAG runtime. Sign in to continue.
            </p>
          </div>

          <div className="auth-left__graph-wrap">
            <div className="auth-left__graph-header">
              <span className="auth-left__graph-file">pipeline.graph</span>
              <span className="auth-left__graph-status">
                <span className="auth-left__graph-dot" />
                LIVE
              </span>
            </div>
            <div className="auth-left__graph-canvas">
              <LiveGraph />
            </div>
          </div>

          <span className="auth-left__meta">Visual AI Pipelines</span>
        </motion.div>

        {/* ── Right: form ──────────────────────────────── */}
        <motion.div
          className="auth-right"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="auth-form-wrap">
            <h2 className="auth-form-wrap__title">Sign in</h2>
            <p className="auth-form-wrap__sub">Continue to Pipeline Studio</p>

            <div className="auth-social">
              <button
                className="auth-social__btn"
                onClick={async () => {
                  setError('');
                  setOauthLoading('github');
                  try { await signInWithGitHub(); }
                  catch (err) { setError(err.message); setOauthLoading(null); }
                }}
                disabled={!!oauthLoading || loading}
                title="Sign in with GitHub"
              >
                <GithubIcon /> {oauthLoading === 'github' ? 'Redirecting…' : 'GitHub'}
              </button>
              <button
                className="auth-social__btn"
                onClick={async () => {
                  setError('');
                  setOauthLoading('google');
                  try { await signInWithGoogle(); }
                  catch (err) { setError(err.message); setOauthLoading(null); }
                }}
                disabled={!!oauthLoading || loading}
                title="Sign in with Google"
              >
                <GoogleIcon /> {oauthLoading === 'google' ? 'Redirecting…' : 'Google'}
              </button>
            </div>

            <div className="auth-divider">or</div>

            {error && (
              <motion.div
                className="auth-message auth-message--error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label className="auth-field__label">Email</label>
                <input
                  type="email"
                  className="auth-field__input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                />
              </div>

              <div className="auth-field">
                <label className="auth-field__label">Password</label>
                <input
                  type="password"
                  className="auth-field__input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>

              <div className="auth-form__row">
                <label className="auth-form__remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                  />
                  Remember me
                </label>
                <Link to="/forgot-password" className="auth-form__link">
                  Forgot password?
                </Link>
              </div>

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="auth-bottom">
              Don't have an account?{' '}
              <Link to="/signup">Create account</Link>
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
