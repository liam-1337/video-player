import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import './AuthForm.css';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, authError, loadingAuth, clearAuthError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Clear any previous auth errors when component mounts or location changes
    clearAuthError();
    if (location.search.includes('registration=success')) {
      setMessage('Registration successful! Please login.');
    }
  }, [clearAuthError, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); // Clear local message
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      // Error is set in AuthContext and displayed by this component
      console.error("Login attempt failed locally:", err);
    }
  };

  return (
    <div className="auth-form-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Login</h2>
        {message && <p className="auth-success-msg">{message}</p>}
        {authError && <p className="auth-error">{authError}</p>}
        <div className="form-group">
          <label htmlFor="login-username">Username</label>
          <input type="text" id="login-username" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={loadingAuth} />
        </div>
        <div className="form-group">
          <label htmlFor="login-password">Password</label>
          <input type="password" id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loadingAuth} />
        </div>
        <button type="submit" disabled={loadingAuth} className="auth-button">
          {loadingAuth ? 'Logging in...' : 'Login'}
        </button>
        <p className="auth-switch-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </form>
    </div>
  );
};
export default LoginForm;
