import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { getMediaList } from './services/mediaService';

// Mock the mediaService
jest.mock('./services/mediaService');

describe('App Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    getMediaList.mockReset();
  });

  test('initially shows loading state (and not main content)', () => {
    getMediaList.mockResolvedValue([]); // Mock API call for initial load
    render(<App />);

    expect(screen.getByText(/Loading media library.../i)).toBeInTheDocument();
    // Header and other content should not be present during initial full-screen loading
    expect(screen.queryByText(/My Media Hub/i)).not.toBeInTheDocument();
  });

  test('displays header and media items after loading', async () => {
    const mockMedia = [
      { id: '1', name: 'Video 1.mp4', type: 'video', metadata: { title: 'Video Title 1' } },
      { id: '2', name: 'Audio 1.mp3', type: 'audio', metadata: { title: 'Audio Title 1' } },
    ];
    getMediaList.mockResolvedValue(mockMedia);

    render(<App />);

    // Wait for loading to disappear
    await waitFor(() => {
      expect(screen.queryByText(/Loading media library.../i)).not.toBeInTheDocument();
    });

    // Now check for header and media items
    expect(screen.getByText(/My Media Hub/i)).toBeInTheDocument();
    expect(screen.getByText(/Video Title 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Audio Title 1/i)).toBeInTheDocument();
  });

  test('displays error message if fetching media fails', async () => {
    getMediaList.mockRejectedValue(new Error('Failed to fetch'));
    render(<App />);

    // Wait for loading to disappear and error to be shown
    await waitFor(() => {
      expect(screen.queryByText(/Loading media library.../i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Error: Failed to load media list/i)).toBeInTheDocument();
     // Header should also not be present on error if it's a full-screen error message
    expect(screen.queryByText(/My Media Hub/i)).not.toBeInTheDocument();
  });
});
