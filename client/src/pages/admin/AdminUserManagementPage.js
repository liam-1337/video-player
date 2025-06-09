import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, updateUserAdminStatus, deleteUser } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import './AdminUserManagementPage.css';

const AdminUserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10); // Or make this configurable

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getUsers();
      setUsers(data);
      // setCurrentPage(1); // Reset to first page whenever users are re-fetched
    } catch (err) {
      setError(err.message || 'Failed to fetch users.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset to page 1 if users list changes in a way that current page might be invalid
  // e.g. after delete last item on a page or after search/filter if implemented
  useEffect(() => {
    const totalPages = Math.ceil(users.length / usersPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (currentPage === 0 && totalPages > 0) {
        setCurrentPage(1);
    } else if (users.length === 0) {
        setCurrentPage(1); // Or handle as no pages
    }
  }, [users, usersPerPage, currentPage]);


  const handleToggleAdmin = useCallback(async (userToUpdate) => {
    if (userToUpdate.id === currentUser.id) {
      alert("You cannot change your own admin status.");
      return;
    }
    setError('');
    try {
      await updateUserAdminStatus(userToUpdate.id, !userToUpdate.isAdmin);
      await fetchUsers(); // Re-fetch to get updated list and potentially re-calculate pages
    } catch (err) {
      setError(err.message || `Failed to update admin status for ${userToUpdate.username}.`);
      console.error(err);
    }
  }, [currentUser, fetchUsers]);

  const handleDeleteUser = useCallback(async (userIdToDelete, username) => {
    if (userIdToDelete === currentUser.id) {
      alert("You cannot delete yourself.");
      return;
    }
    if (window.confirm(`Are you sure you want to delete user "${username}" (ID: ${userIdToDelete})? This action cannot be undone.`)) {
      setError('');
      try {
        await deleteUser(userIdToDelete);
        await fetchUsers(); // Re-fetch users
        // Adjust current page if the last item on the current page was deleted
        const newTotalUsers = users.length - 1; // Assuming users state hasn't updated yet from fetchUsers
        const newTotalPages = Math.ceil(newTotalUsers / usersPerPage);
        if (currentPage > newTotalPages && newTotalPages > 0) {
            setCurrentPage(newTotalPages);
        } else if (newTotalUsers === 0) {
            setCurrentPage(1);
        }

      } catch (err) {
        setError(err.message || `Failed to delete user ${username}.`);
        console.error(err);
      }
    }
  }, [currentUser, fetchUsers, users, currentPage, usersPerPage]);


  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsersToDisplay = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);

  const paginate = useCallback((pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  }, [totalPages]);


  if (loading && users.length === 0) { // Show loading only on initial load or if users array is empty
    return <div className="AdminUserManagementPage"><p className="loading">Loading users...</p></div>;
  }

  return (
    <div className="AdminUserManagementPage">
      <h2>User Management</h2>
      {error && <p className="error">{error}</p>}
      {loading && <p className="loading">Refreshing user list...</p>}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Email</th>
            <th>Admin</th>
            <th>Created At</th>
            <th>Updated At</th>
            <th className="action-cell">Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentUsersToDisplay.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.username}</td>
              <td>{user.email || 'N/A'}</td>
              <td>{user.isAdmin ? 'Yes' : 'No'}</td>
              <td>{new Date(user.createdAt).toLocaleString()}</td>
              <td>{new Date(user.updatedAt).toLocaleString()}</td>
              <td className="action-cell">
                <button
                  onClick={() => handleToggleAdmin(user)}
                  disabled={user.id === currentUser.id}
                  className="toggle-admin-btn"
                  title={user.id === currentUser.id ? "Cannot change own status" : (user.isAdmin ? "Demote to User" : "Promote to Admin")}
                >
                  {user.isAdmin ? 'Demote' : 'Promote'}
                </button>
                <button
                  onClick={() => handleDeleteUser(user.id, user.username)}
                  disabled={user.id === currentUser.id}
                  className="delete-btn"
                  title={user.id === currentUser.id ? "Cannot delete self" : "Delete User"}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {users.length === 0 && !loading && (
            <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>No users found.</td>
            </tr>
          )}
        </tbody>
      </table>
      {users.length > usersPerPage && totalPages > 1 && (
        <div className="pagination-controls">
          <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
            Previous
          </button>
          <span> Page {currentPage} of {totalPages} </span>
          <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagementPage;
