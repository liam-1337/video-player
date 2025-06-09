import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, currentUser, loadingAuth } = useAuth();
  const location = useLocation();

  if (loadingAuth) {
    return <div>Loading admin access...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!currentUser || !currentUser.isAdmin) {
    // Redirect to home page with an error state that can be displayed
    return <Navigate to="/" state={{ from: location, error: 'unauthorized' }} replace />;
  }

  return children;
};

export default AdminRoute;
