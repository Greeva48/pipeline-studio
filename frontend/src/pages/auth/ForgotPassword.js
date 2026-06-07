import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import '../../auth.css';

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword }     = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-split">

        <div className="auth-left">
          <span className="auth-left__wordmark">
            PIPELINE<span className="auth-left__wordmark-dot">●</span>STUDIO
          </span>

          <div className="auth-left__copy">
            <h1 className="auth-left__headline">
              Continue<br/>
              <span className="auth-left__headline-dim">building.</span>
            </h1>
            <p className="auth-left__sub">
              We'll send a reset link to your email address.
              You'll be back inside your workspace in seconds.
            </p>
          </div>

          <span className="auth-left__meta">Visual AI Pipelines</span>
        </div>

        <div className="auth-right">
          <div className="auth-forgot-wrap">
            <Link to="/signin" className="auth-forgot-wrap__back">
              ← Back to sign in
            </Link>

            <h2 className="auth-form-wrap__title">Reset password</h2>
            <p className="auth-form-wrap__sub">Enter your email to receive a reset link</p>

            {sent ? (
              <div className="auth-message auth-message--success">
                Reset link sent. Check your inbox.
              </div>
            ) : (
              <>
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
                  <div className="auth-field" style={{ marginBottom: 22 }}>
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

                  <button type="submit" className="auth-submit" disabled={loading || !email}>
                    {loading ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
