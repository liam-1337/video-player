import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom'; // Import MemoryRouter
import { AuthProvider } from '../../contexts/AuthContext'; // Import AuthProvider
import MediaItemCard from '../MediaItemCard';

// Helper function to render with providers
const renderWithProviders = (ui, { providerProps, ...renderOptions } = {}) => {
  return render(
    <MemoryRouter>
      <AuthProvider {...providerProps}>{ui}</AuthProvider>
    </MemoryRouter>,
    renderOptions
  );
};

describe('MediaItemCard', () => {
  const mockMediaItem = {
    id: '1',
    name: 'Test Video.mp4',
    type: 'video',
    metadata: {
      title: 'Test Video Title',
      artist: 'Test Artist',
      album: 'Test Album',
      duration: 120,
    },
  };

  const mockAudioItem = {
    id: '2',
    name: 'Test Audio.mp3',
    type: 'audio',
    metadata: {
      title: 'Test Audio Title',
    },
  };

  // Mock the AuthProvider value to control isAuthenticated
  const authenticatedProviderProps = {
    value: {
      isAuthenticated: true,
      currentUser: { id: 'test-user', username: 'test', preferences: {} }, // Mock user data
      token: 'test-token',
      // Mock other functions from AuthContext if MediaItemCard uses them directly or indirectly
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateUserPreferences: jest.fn(),
      clearAuthError: jest.fn(),
      loadingAuth: false,
      authError: null,
    }
  };

  test('renders video item correctly', () => {
    renderWithProviders(<MediaItemCard mediaItem={mockMediaItem} onPlay={() => {}} />, { providerProps: authenticatedProviderProps });
    expect(screen.getByText('Test Video Title')).toBeInTheDocument();
    expect(screen.getByText('Artist: Test Artist')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /video/i })).toBeInTheDocument();
  });

  test('renders audio item with minimal metadata correctly', () => {
    renderWithProviders(<MediaItemCard mediaItem={mockAudioItem} onPlay={() => {}} />, { providerProps: authenticatedProviderProps });
    expect(screen.getByText('Test Audio Title')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /audio/i })).toBeInTheDocument();
    expect(screen.queryByText(/Artist:/)).toBeNull();
    expect(screen.queryByText(/Album:/)).toBeNull();
  });

  test('calls onPlay when clicked', () => {
    const handlePlay = jest.fn();
    renderWithProviders(<MediaItemCard mediaItem={mockMediaItem} onPlay={handlePlay} />, { providerProps: authenticatedProviderProps });
    // Corrected data-testid to match what's in MediaItemCard.js
    fireEvent.click(screen.getByTestId(`media-item-${mockMediaItem.id}`));
    expect(handlePlay).toHaveBeenCalledWith(mockMediaItem);
  });
});
