import React, { useState, useEffect } from 'react';

/* ============================================================
   AuthGate — lightweight frontend login/logout wrapper.
   Academic demonstration only: a client-side credential check
   appropriate for a synthetic-data MBA prototype, not a claim of
   real security, encryption, or backend authentication.

   This component does not import, read, or touch patientsData.js,
   calculations.js, forecast.js, whatIf.js, or any existing screen.
   It simply decides whether to render its children (the existing
   <App/>) or a login form.
   ============================================================ */

const DEMO_USERNAME = 'admin';
const DEMO_PASSWORD = 'admin123';
const SESSION_KEY = 'hospitalOpsAuth';

const COLORS = {
  ink: '#10202C', inkSoft: '#4B5C67', bg: '#EEF2F5', surface: '#FFFFFF',
  line: '#DAE2E8', accent: '#0F6E7A', bad: '#B23A34', badSoft: '#FBEAE9',
};

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (username === DEMO_USERNAME && password === DEMO_PASSWORD) {
      setError('');
      onLogin();
    } else {
      setError('Invalid username or password.');
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: COLORS.bg, fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    }}>
      <form onSubmit={handleSubmit} style={{
        background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 10,
        padding: '32px 30px', width: '100%', maxWidth: 380, boxSizing: 'border-box',
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.ink, marginBottom: 4 }}>
          Hospital Operations Management System
        </div>
        <div style={{ fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 24 }}>
          Patient Flow &amp; Waiting-Time Optimization
        </div>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.inkSoft, marginBottom: 5 }}>
          Username
        </label>
        <input
          type="text" value={username} onChange={(e) => setUsername(e.target.value)}
          autoComplete="username" autoFocus
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, padding: '9px 11px', marginBottom: 14,
                   borderRadius: 7, border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
        />

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.inkSoft, marginBottom: 5 }}>
          Password
        </label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input
            type={showPassword ? 'text' : 'password'} value={password}
            onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
            style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', fontSize: 13, padding: '9px 11px',
                     borderRadius: 7, border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
          />
          <button type="button" onClick={() => setShowPassword((s) => !s)} style={{
            fontSize: 11.5, padding: '0 10px', borderRadius: 7, border: `1px solid ${COLORS.line}`,
            background: COLORS.surface, color: COLORS.inkSoft, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: COLORS.bad, background: COLORS.badSoft, borderRadius: 6,
                        padding: '8px 10px', marginTop: 8, marginBottom: 4 }}>
            {error}
          </div>
        )}

        <button type="submit" style={{
          width: '100%', marginTop: 16, padding: '10px 0', borderRadius: 7, border: 'none',
          background: COLORS.accent, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
        }}>
          Login
        </button>

        <div style={{ fontSize: 10.5, color: COLORS.inkSoft, marginTop: 16, textAlign: 'center' }}>
          Academic demonstration login.
        </div>
      </form>
    </div>
  );
}

export default function AuthGate({ children }) {
  const [authed, setAuthed] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === 'true'; } catch { return false; }
  });

  function handleLogin() {
    try { sessionStorage.setItem(SESSION_KEY, 'true'); } catch {}
    setAuthed(true);
  }
  function handleLogout() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    setAuthed(false);
  }

  if (!authed) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={handleLogout} title="Logout" style={{
        position: 'fixed', top: 14, right: 18, zIndex: 1000, fontSize: 11.5, fontWeight: 600,
        padding: '6px 13px', borderRadius: 7, border: `1px solid ${COLORS.line}`,
        background: COLORS.surface, color: COLORS.inkSoft, cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(16,32,44,0.12)',
      }}>
        Logout
      </button>
      {children}
    </div>
  );
}
