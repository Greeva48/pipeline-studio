import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import LiveGraph from '../../components/LiveGraph';
import '../../auth.css';

export default function SignUp() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const { signUp } = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.needsConfirmation) {
        setConfirmed(true);
      } else {
        setError(err.message);
      }
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
              Compose inference<br/>
              <span className="auth-left__headline-dim">architectures.</span>
            </h1>
            <p className="auth-left__sub">
              Nine primitive node types. Typed data flows. Real-time DAG validation.
              Start building the moment you sign up.
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
            {confirmed ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="auth-form-wrap__title">Check your email</h2>
                <p className="auth-form-wrap__sub">
                  We sent a confirmation link to <strong>{email}</strong>.<br/>
                  Click it to activate your account, then sign in.
                </p>
                <div style={{ marginTop: 32 }}>
                  <Link to="/signin" className="auth-submit">
                    Go to sign in
                  </Link>
                </div>
              </motion.div>
            ) : (
              <>
                <h2 className="auth-form-wrap__title">Create account</h2>
                <p className="auth-form-wrap__sub">Start building with Pipeline Studio</p>

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
                    <label className="auth-field__label">Full name</label>
                    <input
                      type="text"
                      className="auth-field__input"
                      placeholder="Your full name"
                      value={name}
                      onChange={e => { setName(e.target.value); setError(''); }}
                      autoComplete="name"
                      autoFocus
                      disabled={loading}
                    />
                  </div>

                  <div className="auth-field">
                    <label className="auth-field__label">Work email</label>
                    <input
                      type="email"
                      className="auth-field__input"
                      placeholder="you@company.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>

                  <div className="auth-field" style={{ marginBottom: 22 }}>
                    <label className="auth-field__label">Password</label>
                    <input
                      type="password"
                      className="auth-field__input"
                      placeholder="8+ characters"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                  </div>

                  <button type="submit" className="auth-submit" disabled={loading}>
                    {loading ? 'Creating account…' : 'Create account'}
                  </button>
                </form>

                <p className="auth-bottom">
                  Already have an account?{' '}
                  <Link to="/signin">Sign in</Link>
                </p>
              </>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
