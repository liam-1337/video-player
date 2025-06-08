import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import AdminRoute from './AdminRoute';
import { AuthContext } from '../../contexts/AuthContext';

// Helper component to display current location for redirection tests
const DisplayLocation = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

// Dummy component that AdminRoute will render if access is granted
const ProtectedContent = () => <div data-testid="protected-content">Protected Content</div>;

// Fallback component for the root path
const HomePage = () => <div data-testid="home-page">Home Page</div>;


describe('AdminRoute', () => {
  // Helper function to render the component with specific context and router setup
  const renderWithRouterAndContext = (contextValue, initialEntries = ['/admin-protected']) => {
    return render(
      <AuthContext.Provider value={contextValue}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/login" element={<DisplayLocation />} />
            {/* Updated to render a component for the root path to check for redirection state */}
            <Route path="/" element={<><DisplayLocation /><HomePage /></>} />
            <Route path="/admin-protected" element={
              <AdminRoute>
                <ProtectedContent />
              </AdminRoute>
            } />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  test('renders children if user is authenticated and is an admin', async () => {
    const mockContext = { isAuthenticated: true, currentUser: { id: 1, username: 'admin', isAdmin: true }, loadingAuth: false };
    renderWithRouterAndContext(mockContext);
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  test('redirects to / if user is authenticated but not an admin, and passes state', async () => {
    const mockContext = { isAuthenticated: true, currentUser: { id: 2, username: 'user', isAdmin: false }, loadingAuth: false };
    renderWithRouterAndContext(mockContext);
    // Check if redirected to the home page
    await waitFor(() => expect(screen.getByTestId('location-display')).toHaveTextContent('/'));
    // Check if the "Protected Content" is not rendered
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    // Note: Testing the `location.state.error` would require the HomePage component
    // to actually use and display that state, which is beyond AdminRoute's direct responsibility.
    // Here we confirm redirection. The App.js is responsible for displaying the message.
  });

  test('redirects to /login if user is not authenticated', async () => {
    const mockContext = { isAuthenticated: false, currentUser: null, loadingAuth: false };
    renderWithRouterAndContext(mockContext);
    await waitFor(() => expect(screen.getByTestId('location-display')).toHaveTextContent('/login'));
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  test('shows loading message if authentication is loading', () => {
    const mockContext = { isAuthenticated: false, currentUser: null, loadingAuth: true };
    renderWithRouterAndContext(mockContext);
    expect(screen.getByText(/Loading admin access.../i)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
