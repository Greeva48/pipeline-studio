// OAuth implicit-flow callback target.
// Supabase (detectSessionInUrl) parses the #access_token from the URL during
// AuthContext init. This page waits for that to finish, then routes the user
// on — to /dashboard if a session was established, otherwise /signin.
//
// It also surfaces any OAuth error the provider returns. OAuth data can arrive
// in the hash (#access_token / #error) OR the query string (?code / ?error);
// when the provider returns an error (or a code the implicit client can't use)
// the session silently fails to establish — so we read both and show why
// instead of bouncing the user with no explanation.
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLoading from '../../components/AuthLoading';

function readOAuthError() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const pick = (k) => hash.get(k) || query.get(k);
  const error = pick('error');
  if (!error) return null;
  return pick('error_description') || error;
}

export default function Callback() {
  const { initializing, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [oauthError] = useState(readOAuthError);

  useEffect(() => {
    if (oauthError || initializing) return;
    navigate(isAuthenticated ? '/dashboard' : '/signin', { replace: true });
  }, [oauthError, initializing, isAuthenticated, navigate]);

  if (oauthError) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          background: 'var(--bg-base, #0B0D10)',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', color: 'var(--status-error, #F87171)' }}>
          Sign-in failed
        </span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-secondary, #9CA3AF)', maxWidth: 420 }}>
          {oauthError}
        </span>
        <Link
          to="/signin"
          style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', color: 'var(--text-primary, #FAFAFA)' }}
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return <AuthLoading label="Finishing sign-in…" />;
}
