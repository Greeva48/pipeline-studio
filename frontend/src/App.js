import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './layouts/AppShell';

import Landing from './pages/Landing';
import Studio from './pages/Studio';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import Callback from './pages/auth/Callback';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Deployments from './pages/Deployments';
import Validation from './pages/Validation';
import Blocks from './pages/Blocks';
import Settings from './pages/Settings';

// Wrapper inside BrowserRouter so useLocation is available
function RouterContent() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>

        {/* ── Public ──────────────────────────────────── */}
        <Route path="/"               element={<Landing />} />
        <Route path="/signin"         element={<SignIn />} />
        <Route path="/signup"         element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/callback"  element={<Callback />} />

        {/* ── Studio — full-screen, no transition wrapper */}
        <Route path="/studio" element={
          <ProtectedRoute><Studio /></ProtectedRoute>
        } />

        {/* ── App shell pages ─────────────────────────── */}
        <Route element={
          <ProtectedRoute><AppShell /></ProtectedRoute>
        }>
          <Route path="/dashboard"   element={<Dashboard />} />
          <Route path="/projects"    element={<Projects />} />
          <Route path="/deployments" element={<Deployments />} />
          <Route path="/validation"  element={<Validation />} />
          <Route path="/blocks"      element={<Blocks />} />
          <Route path="/settings"    element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RouterContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
