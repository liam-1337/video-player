import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../../services/adminService';
import './AdminDashboardPage.css';

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    getDashboardStats()
      .then(response => {
        // Axios automatically unwraps the data property for successful responses
        setStats(response.data);
        setLoadingStats(false);
      })
      .catch(error => {
        console.error("Error fetching dashboard stats:", error);
        // error.message is from the new Error created in adminService for network/other issues
        // error.data.message would be from the server if it sent a JSON error response
        const errorMessage = error.data?.message || error.message || "Failed to load dashboard statistics.";
        setStatsError(errorMessage);
        setLoadingStats(false);
      });
  }, []);

  return (
    <div className="AdminDashboardPage">
      <h1>Admin Dashboard</h1>

      <div className="dashboard-stats admin-section">
        <h2>Overview</h2>
        {loadingStats && <p>Loading statistics...</p>}
        {statsError && <p className="error-message">{statsError}</p>}
        {stats && !loadingStats && !statsError && (
          <div className="stats-grid">
            <div className="stat-item">
              <h4>Total Users</h4>
              <p>{stats.users}</p>
            </div>
            <div className="stat-item">
              <h4>Total Media Items</h4>
              <p>{stats.media}</p>
            </div>
            {/* Add more stats here as they become available */}
          </div>
        )}
      </div>

      <nav>
        <ul>
          <li><Link to="/admin/users">User Management</Link></li>
          <li><Link to="/admin/media">Media Library</Link></li>
          <li><Link to="/admin/system">System Status</Link></li>
        </ul>
      </nav>
      <div className="admin-section">
        <p>Welcome to the admin dashboard. Select a section to manage.</p>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
