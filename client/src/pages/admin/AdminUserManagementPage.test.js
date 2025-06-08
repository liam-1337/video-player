import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import AdminUserManagementPage from './AdminUserManagementPage';

// Mock the adminService
jest.mock('../../services/adminService', () => ({
  getUsers: jest.fn(),
  updateUserAdminStatus: jest.fn(),
  deleteUser: jest.fn(),
}));

// Import the mocked functions after jest.mock has been called
const { getUsers, updateUserAdminStatus, deleteUser } = require('../../services/adminService');

const mockAdminContext = (currentUserId = 99) => ({
  currentUser: { id: currentUserId, username: 'testAdmin', isAdmin: true },
  // Add other context properties if AdminUserManagementPage uses them
});

// Helper to render with context and router
const renderUserManagementPage = (authContextValue = mockAdminContext()) => {
  return render(
    <AuthContext.Provider value={authContextValue}>
      <MemoryRouter>
        <AdminUserManagementPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
};


describe('AdminUserManagementPage', () => {
  const mockUsers = [
    { id: 1, username: 'userOne', email: 'one@example.com', isAdmin: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 2, username: 'userTwo', email: 'two@example.com', isAdmin: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.confirm for delete operations
    window.confirm = jest.fn();
    // Mock window.alert for self-action preventions (optional, as behavior might not rely on alert)
    window.alert = jest.fn();
  });

  test('renders loading state initially then fetches and displays users', async () => {
    getUsers.mockResolvedValue(mockUsers);
    renderUserManagementPage();

    expect(screen.getByText(/Loading users.../i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('userOne')).toBeInTheDocument());
    expect(screen.getByText('userTwo')).toBeInTheDocument();
    expect(getUsers).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Loading users.../i)).not.toBeInTheDocument();
  });

  test('displays an error message if fetching users fails', async () => {
    getUsers.mockRejectedValue(new Error('Failed to fetch'));
    renderUserManagementPage();

    await waitFor(() => expect(screen.getByText(/Failed to fetch users./i)).toBeInTheDocument());
  });

  test('handles toggle admin status for another user', async () => {
    getUsers.mockResolvedValue([mockUsers[0]]); // User 'userOne' (id: 1, isAdmin: false)
    updateUserAdminStatus.mockResolvedValue({ ...mockUsers[0], isAdmin: true }); // Simulate successful update

    renderUserManagementPage();
    await waitFor(() => expect(screen.getByText('userOne')).toBeInTheDocument());

    const toggleButton = screen.getByRole('button', { name: /Promote/i });
    fireEvent.click(toggleButton);

    expect(updateUserAdminStatus).toHaveBeenCalledWith(1, true);
    // The page re-fetches users on successful update
    await waitFor(() => expect(getUsers).toHaveBeenCalledTimes(2)); // Initial fetch + fetch after update
  });

  test('prevents toggling self admin status', async () => {
    getUsers.mockResolvedValue([mockUsers[1]]); // User 'userTwo' (id: 2, isAdmin: true)
    // Current admin user ID is 2 for this test
    renderUserManagementPage(mockAdminContext(2));

    await waitFor(() => expect(screen.getByText('userTwo')).toBeInTheDocument());

    const toggleButton = screen.getByRole('button', { name: /Demote/i });
    expect(toggleButton).toBeDisabled(); // Check if button is disabled as per implementation
    fireEvent.click(toggleButton); // Even if not disabled, the handler should prevent action

    expect(updateUserAdminStatus).not.toHaveBeenCalled();
    // expect(window.alert).toHaveBeenCalledWith("You cannot change your own admin status."); // If alert is used
  });

  test('handles delete user after confirmation', async () => {
    getUsers.mockResolvedValue([mockUsers[0]]); // User 'userOne' (id: 1)
    deleteUser.mockResolvedValue({}); // Simulate successful delete
    window.confirm.mockReturnValue(true); // User confirms deletion

    renderUserManagementPage();
    await waitFor(() => expect(screen.getByText('userOne')).toBeInTheDocument());

    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete user "userOne" (ID: 1)? This action cannot be undone.');
    expect(deleteUser).toHaveBeenCalledWith(1);
    await waitFor(() => expect(getUsers).toHaveBeenCalledTimes(2)); // Initial fetch + fetch after delete
  });

  test('does not delete user if confirmation is cancelled', async () => {
    getUsers.mockResolvedValue([mockUsers[0]]);
    window.confirm.mockReturnValue(false); // User cancels deletion

    renderUserManagementPage();
    await waitFor(() => expect(screen.getByText('userOne')).toBeInTheDocument());

    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  test('prevents deleting self', async () => {
    getUsers.mockResolvedValue([mockUsers[1]]); // User 'userTwo' (id: 2)
    renderUserManagementPage(mockAdminContext(2)); // Current admin user ID is 2

    await waitFor(() => expect(screen.getByText('userTwo')).toBeInTheDocument());

    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    expect(deleteButton).toBeDisabled(); // Check if button is disabled
    fireEvent.click(deleteButton);

    expect(deleteUser).not.toHaveBeenCalled();
    // expect(window.alert).toHaveBeenCalledWith("You cannot delete yourself."); // If alert is used
  });
});
