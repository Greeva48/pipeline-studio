// Neutral full-screen placeholder shown while Supabase resolves the session
// (initial load / OAuth callback). Mirrors the app's existing loading style.
export default function AuthLoading({ label = 'Loading…' }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base, #0B0D10)',
      }}
    >
      <span
        style={{
          fontFamily: 'Space Mono, monospace',
          fontSize: '12px',
          letterSpacing: '0.08em',
          color: 'var(--text-tertiary, #6B7280)',
        }}
      >
        {label}
      </span>
    </div>
  );
}
