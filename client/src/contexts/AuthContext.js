import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import {
    getCurrentUser as getStoredUser,
    loginUser as serviceLogin,
    registerUser as serviceRegister,
    logoutUser as serviceLogout,
    getToken as serviceGetToken,
    updateUserPreferences as serviceUpdateUserPreferences
} from '../services/mediaService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null); // Initialized in useEffect
  const [token, setToken] = useState(null); // Initialized in useEffect
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const user = getStoredUser();
    const storedToken = serviceGetToken();
    if (user && storedToken) {
      setCurrentUser(user); setToken(storedToken);
    }
    setLoadingAuth(false);
  }, []);

  const login = useCallback(async (username, password) => {
    setLoadingAuth(true); setAuthError(null);
    try {
      const data = await serviceLogin(username, password);
      setCurrentUser(data.user); setToken(data.token);
      setAuthError(null); return data.user;
    } catch (err) {
      setAuthError(err.error || 'Login failed. Please check your credentials.'); throw err;
    } finally { setLoadingAuth(false); }
  }, []);

  const register = useCallback(async (username, password, email) => {
    setLoadingAuth(true); setAuthError(null);
    try {
      await serviceRegister(username, password, email);
      setAuthError(null);
    } catch (err) {
      setAuthError(err.error || 'Registration failed. Please try again.'); throw err;
    } finally { setLoadingAuth(false); }
  }, []);

  const logout = useCallback(() => {
    serviceLogout(); setCurrentUser(null); setToken(null); setAuthError(null);
  }, []);

  const updateUserPreferences = useCallback(async (preferences) => {
    try {
        const data = await serviceUpdateUserPreferences(preferences);
        if (data.user) {
            setCurrentUser(data.user); // Update context with new user details
        }
        return data.user;
    } catch (error) {
        console.error("AuthContext: Failed to update preferences", error);
        throw error;
    }
  }, []);

  const value = {
    currentUser, token, loadingAuth, authError, login, register, logout, updateUserPreferences,
    isAuthenticated: !!token,
    clearAuthError: () => setAuthError(null)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
