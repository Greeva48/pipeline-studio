import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLoading from './AuthLoading';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  // Wait for Supabase to finish initializing (incl. parsing the OAuth hash)
  // before deciding — otherwise a fresh OAuth redirect would bounce to /signin
  // before the session is established.
  if (initializing) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return children;
}
