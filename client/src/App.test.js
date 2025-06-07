import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom'; // Keep MemoryRouter for tests
// DO NOT import BrowserRouter here if App.js uses it.
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import { getMediaList } from './services/mediaService';

// This is the actual jest.fn() that will be manipulated.
const mockUseAuthFn = jest.fn();

// Mock the mediaService
jest.mock('./services/mediaService');

// Mock AuthContext's useAuth export
jest.mock('./contexts/AuthContext', () => ({
  ...jest.requireActual('./contexts/AuthContext'),
  useAuth: () => mockUseAuthFn(),
}));

// Mock BrowserRouter to prevent nested router issue if App.js uses it.
// Link, Routes, Route etc. from RRD will still work with MemoryRouter.
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }) => <>{children}</>,
}));


// Helper function to render App with providers and initial route
const renderApp = (initialRoute = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}> {/* This MemoryRouter is now the primary router */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('App Component', () => {
  beforeEach(() => {
    getMediaList.mockReset();
    mockUseAuthFn.mockReturnValue({
      isAuthenticated: true,
      currentUser: { id: 'test-user', username: 'test', preferences: { theme: 'light', layout: 'grid'} },
      token: 'test-token',
      loadingAuth: false,
      authError: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateUserPreferences: jest.fn(),
      clearAuthError: jest.fn(),
    });
  });

  test('initially shows loading state (and not main content) when authenticated', () => {
    getMediaList.mockReturnValue(new Promise(() => {}));
    renderApp('/');
    expect(screen.getByText(/Loading media.../i)).toBeInTheDocument(); // Adjusted text
    expect(screen.getByText(/My Media Hub/i)).toBeInTheDocument();
  });

  test('displays header and media items after loading when authenticated', async () => {
    const mockMedia = [
      { id: '1', name: 'Video 1.mp4', type: 'video', metadata: { title: 'Video Title 1' } },
      { id: '2', name: 'Audio 1.mp3', type: 'audio', metadata: { title: 'Audio Title 1' } },
    ];
    getMediaList.mockResolvedValue(mockMedia);
    renderApp('/');
    await waitFor(() => {
      expect(screen.queryByText(/Loading media.../i)).not.toBeInTheDocument(); // Adjusted text
    });
    expect(screen.getByText(/My Media Hub/i)).toBeInTheDocument();
    expect(screen.getByText(/Video Title 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Audio Title 1/i)).toBeInTheDocument();
  });

  test('displays error message if fetching media fails when authenticated', async () => {
    getMediaList.mockRejectedValue(new Error('Failed to fetch'));
    renderApp('/');
    await waitFor(() => {
      expect(screen.queryByText(/Loading media.../i)).not.toBeInTheDocument(); // Adjusted text
    });
    expect(screen.getByText(/Error: Failed to load media list/i)).toBeInTheDocument();
    expect(screen.getByText(/My Media Hub/i)).toBeInTheDocument();
  });

  test('redirects to login if not authenticated and trying to access home', () => {
    mockUseAuthFn.mockReturnValue({
      isAuthenticated: false,
      loadingAuth: false,
      currentUser: null,
      token: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateUserPreferences: jest.fn(),
      clearAuthError: jest.fn(),
      authError: null,
    });
    getMediaList.mockResolvedValue([]);
    renderApp('/');
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
});
