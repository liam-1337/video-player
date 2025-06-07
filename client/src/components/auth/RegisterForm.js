import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './AuthForm.css';

const RegisterForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const { register, authError, loadingAuth, clearAuthError } = useAuth();
  const [localError, setLocalError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    clearAuthError(); // Clear context errors on mount
  }, [clearAuthError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (password !== confirmPassword) {
      setLocalError("Passwords don't match!");
      return;
    }
    try {
      await register(username, password, email);
      navigate('/login?registration=success');
    } catch (err) {
      // AuthContext will set authError, but localError can also be used for form-specific issues
      // If register throws and sets authError, that will be displayed by the form.
      console.error("Registration attempt failed locally:", err);
    }
  };

  return (
    <div className="auth-form-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Register</h2>
        {localError && <p className="auth-error">{localError}</p>}
        {authError && !localError && <p className="auth-error">{authError}</p>}
        <div className="form-group">
          <label htmlFor="register-username">Username</label>
          <input type="text" id="register-username" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={loadingAuth} />
        </div>
         <div className="form-group">
          <label htmlFor="register-email">Email</label>
          <input type="email" id="register-email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="register-password">Password</label>
          <input type="password" id="register-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loadingAuth} />
        </div>
        <div className="form-group">
          <label htmlFor="register-confirm-password">Confirm Password</label>
          <input type="password" id="register-confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loadingAuth} />
        </div>
        <button type="submit" disabled={loadingAuth} className="auth-button">
          {loadingAuth ? 'Registering...' : 'Register'}
        </button>
         <p className="auth-switch-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </form>
    </div>
  );
};
export default RegisterForm;
