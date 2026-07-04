import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('resetToken') || '';
  const [email, setEmail] = useState('abhishekchouhan@gmail.com');
  const [password, setPassword] = useState('hk@123');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>(resetToken ? 'reset' : 'login');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const res = await apiFetch<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setInfo(res.message || 'If that email exists, a reset link has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const onResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    if (!resetToken) {
      setLoading(false);
      setError('Reset token is missing from URL.');
      return;
    }
    if (newPassword.length < 6) {
      setLoading(false);
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLoading(false);
      setError('Passwords do not match.');
      return;
    }
    try {
      const res = await apiFetch<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword })
      });
      setInfo(res.message || 'Password reset successful. Please sign in.');
      setMode('login');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      {mode === 'login' && (
        <form className="card login-card" onSubmit={onSubmit}>
          <p className="eyebrow">Secure Access</p>
          <h2>Volunteer Login</h2>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          <label>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          {error && <p className="error">{error}</p>}
          {info && <p className="ok">{info}</p>}
          <div className="login-actions-row">
            <button className="btn primary" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
            <button className="btn ghost" type="button" onClick={() => { setError(''); setInfo(''); setMode('forgot'); }}>
              Forgot Password?
            </button>
          </div>
        </form>
      )}

      {mode === 'forgot' && (
        <form className="card login-card" onSubmit={onForgotPassword}>
          <p className="eyebrow">Account Recovery</p>
          <h2>Forgot Password</h2>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          {error && <p className="error">{error}</p>}
          {info && <p className="ok">{info}</p>}
          <div className="login-actions-row">
            <button className="btn primary" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
            <button className="btn ghost" type="button" onClick={() => { setError(''); setInfo(''); setMode('login'); }}>
              Back to Login
            </button>
          </div>
        </form>
      )}

      {mode === 'reset' && (
        <form className="card login-card" onSubmit={onResetPassword}>
          <p className="eyebrow">Account Recovery</p>
          <h2>Reset Password</h2>
          <label>New Password</label>
          <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" required />
          <label>Confirm New Password</label>
          <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" required />
          {error && <p className="error">{error}</p>}
          {info && <p className="ok">{info}</p>}
          <div className="login-actions-row">
            <button className="btn primary" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</button>
            <button className="btn ghost" type="button" onClick={() => { setError(''); setInfo(''); setMode('login'); navigate('/login', { replace: true }); }}>
              Back to Login
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
