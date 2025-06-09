import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom'; // Not strictly needed if no Links, but good practice
import AdminMediaManagementPage from './AdminMediaManagementPage';

// Mock the adminService
jest.mock('../../services/adminService', () => ({
  getMedia: jest.fn(),
  rescanMedia: jest.fn(),
}));

// Import the mocked functions
const { getMedia, rescanMedia } = require('../../services/adminService');

// Helper to render with MemoryRouter if needed, though this component doesn't have Links
const renderMediaManagementPage = () => {
  return render(
    <MemoryRouter>
      <AdminMediaManagementPage />
    </MemoryRouter>
  );
};

describe('AdminMediaManagementPage', () => {
  const mockMedia = [
    { id: 'm1', name: 'video.mp4', type: 'video', path: '/videos/video.mp4', size: 1024000, lastModified: new Date().toISOString() },
    { id: 'm2', name: 'audio.mp3', type: 'audio', path: '/music/audio.mp3', size: 512000, lastModified: new Date().toISOString() },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially then fetches and displays media items', async () => {
    getMedia.mockResolvedValue(mockMedia);
    renderMediaManagementPage();

    expect(screen.getByText(/Loading media items.../i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('video.mp4')).toBeInTheDocument());
    expect(screen.getByText('audio.mp3')).toBeInTheDocument();
    expect(screen.getByText('1000 KB')).toBeInTheDocument(); // Formatted size for video.mp4 (1024000 Bytes / 1024)
    expect(screen.getByText('500 KB')).toBeInTheDocument();  // Formatted size for audio.mp3 (512000 Bytes / 1024)
    expect(getMedia).toHaveBeenCalledTimes(1);
  });

  test('displays an error message if fetching media fails', async () => {
    getMedia.mockRejectedValue(new Error('Failed to fetch media'));
    renderMediaManagementPage();

    await waitFor(() => expect(screen.getByText(/Failed to fetch media items./i)).toBeInTheDocument());
  });

  test('displays "No media items found" when list is empty', async () => {
    getMedia.mockResolvedValue([]);
    renderMediaManagementPage();
    await waitFor(() => expect(screen.getByText(/No media items found. Try rescanning./i)).toBeInTheDocument());
  });


  test('handles rescan library successfully', async () => {
    getMedia.mockResolvedValue(mockMedia); // Initial load
    rescanMedia.mockResolvedValue({ message: 'Rescan complete!', itemCount: 3 });

    // Mock getMedia for the second call after successful rescan
    const newMockMedia = [...mockMedia, { id: 'm3', name: 'new.mkv', type: 'video', path: 'new.mkv', size: 2048000, lastModified: new Date().toISOString()}];
    getMedia.mockResolvedValueOnce(mockMedia) // First call
             .mockResolvedValueOnce(newMockMedia); // Second call after rescan

    renderMediaManagementPage();
    await waitFor(() => expect(screen.getByText('video.mp4')).toBeInTheDocument()); // Ensure initial load is done

    const rescanButton = screen.getByRole('button', { name: /Rescan Media Library/i });
    fireEvent.click(rescanButton);

    expect(screen.getByRole('button', { name: /Rescanning.../i})).toBeInTheDocument(); // Button text changes
    expect(rescanMedia).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(screen.getByText(/Rescan complete!/i)).toBeInTheDocument());
    // Check if getMedia was called again to refresh the list
    expect(getMedia).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByText('new.mkv')).toBeInTheDocument()); // Check for new media after rescan
  });

  test('handles rescan library failure', async () => {
    getMedia.mockResolvedValue(mockMedia); // Initial load
    rescanMedia.mockRejectedValue(new Error('Rescan failed miserably'));

    renderMediaManagementPage();
    await waitFor(() => expect(screen.getByText('video.mp4')).toBeInTheDocument());

    const rescanButton = screen.getByRole('button', { name: /Rescan Media Library/i });
    fireEvent.click(rescanButton);

    expect(rescanMedia).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText(/Rescan failed miserably/i)).toBeInTheDocument());
    // Ensure the button text reverts from "Rescanning..."
    expect(screen.getByRole('button', { name: /Rescan Media Library/i})).toBeInTheDocument();
  });
});
