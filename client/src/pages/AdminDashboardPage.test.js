import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom'; // MemoryRouter for Link components
import AdminDashboardPage from './AdminDashboardPage';

// Mock the adminService
jest.mock('../../services/adminService', () => ({
  getDashboardStats: jest.fn(),
}));

// Import the mocked function after jest.mock has been called
const { getDashboardStats } = require('../../services/adminService');

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    // Clear all mock implementations and calls before each test
    jest.clearAllMocks();
  });

  test('renders correctly with stats and navigation links', async () => {
    // Mock successful API call
    getDashboardStats.mockResolvedValue({ data: { users: 5, media: 10 } });

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    // Check for the main heading
    expect(screen.getByRole('heading', { name: /Admin Dashboard/i })).toBeInTheDocument();

    // Wait for stats to be loaded and displayed
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // Assuming '5' is the number of users
    });
    expect(screen.getByText('10')).toBeInTheDocument(); // Assuming '10' is the number of media items

    // Check for navigation links
    expect(screen.getByRole('link', { name: /User Management/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Media Library/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /System Status/i })).toBeInTheDocument();

    // Check for section titles within the stats display
    expect(screen.getByRole('heading', { name: /Overview/i})).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Total Users/i})).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Total Media Items/i})).toBeInTheDocument();

    // Ensure no error message is shown
    expect(screen.queryByText(/Failed to load dashboard statistics./i)).not.toBeInTheDocument();
  });

  test('handles loading stats state', () => {
    // Mock a non-resolving promise to keep it in loading state
    getDashboardStats.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    // Check for loading message
    expect(screen.getByText(/Loading statistics.../i)).toBeInTheDocument();
  });

  test('handles error fetching stats', async () => {
    // Mock a rejected API call
    getDashboardStats.mockRejectedValue(new Error('API Error'));

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    // Wait for error message to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to load dashboard statistics./i)).toBeInTheDocument();
    });

    // Ensure stats numbers are not displayed
    expect(screen.queryByText('5')).not.toBeInTheDocument();
    expect(screen.queryByText('10')).not.toBeInTheDocument();
  });
});
