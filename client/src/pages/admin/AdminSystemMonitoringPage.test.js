import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminSystemMonitoringPage from './AdminSystemMonitoringPage';

// Mock the adminService
jest.mock('../../services/adminService', () => ({
  getSystemStatus: jest.fn(),
  getLogs: jest.fn(),
}));

const { getSystemStatus, getLogs } = require('../../services/adminService');

const renderSystemMonitoringPage = () => {
  return render(
    <MemoryRouter> {/* Included for potential future Links or routing context needs */}
      <AdminSystemMonitoringPage />
    </MemoryRouter>
  );
};

describe('AdminSystemMonitoringPage', () => {
  const mockStatus = {
    uptime: 12345,
    platform: 'testOS',
    architecture: 'x64',
    nodeVersion: 'v16.0.0',
    totalMemory: 1024 * 1024 * 1024 * 8, // 8GB
    freeMemory: 1024 * 1024 * 1024 * 4,  // 4GB
    cpuCount: 4,
  };
  const mockAppLogs = ['App log line 1', 'App log line 2'];
  const mockErrorLogs = ['Error log line 1'];

  beforeEach(() => {
    jest.clearAllMocks();
    getSystemStatus.mockResolvedValue(mockStatus);
    getLogs.mockImplementation(logType => {
      if (logType === 'app') return Promise.resolve(mockAppLogs);
      if (logType === 'error') return Promise.resolve(mockErrorLogs);
      return Promise.reject(new Error('Invalid log type'));
    });
  });

  test('renders loading states initially then fetches and displays status and logs', async () => {
    renderSystemMonitoringPage();

    // Initial loading states
    expect(screen.getByText(/Loading system status.../i)).toBeInTheDocument();
    expect(screen.getByText(/Loading application logs.../i)).toBeInTheDocument();
    expect(screen.getByText(/Loading error logs.../i)).toBeInTheDocument();

    // Wait for status and logs to appear
    await waitFor(() => expect(screen.getByText(mockStatus.platform)).toBeInTheDocument());
    expect(screen.getByText(formatUptimeForTest(mockStatus.uptime))).toBeInTheDocument(); // Using a helper for uptime format
    expect(screen.getByText('8 GB')).toBeInTheDocument(); // Total Memory

    await waitFor(() => expect(screen.getByText('App log line 1')).toBeInTheDocument());
    expect(screen.getByText('App log line 2')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Error log line 1')).toBeInTheDocument());

    expect(getSystemStatus).toHaveBeenCalledTimes(1);
    expect(getLogs).toHaveBeenCalledWith('app');
    expect(getLogs).toHaveBeenCalledWith('error');
    expect(getLogs).toHaveBeenCalledTimes(2); // Once for app, once for error
  });

  test('displays error message if fetching system status fails', async () => {
    getSystemStatus.mockRejectedValue(new Error('Status fetch failed'));
    renderSystemMonitoringPage();
    await waitFor(() => expect(screen.getByText(/Failed to fetch system status./i)).toBeInTheDocument());
  });

  test('displays error message if fetching app logs fails', async () => {
    getLogs.mockImplementation(logType => {
      if (logType === 'app') return Promise.reject(new Error('App logs fetch failed'));
      if (logType === 'error') return Promise.resolve(mockErrorLogs); // error logs still fine
      return Promise.reject(new Error('Invalid log type'));
    });
    renderSystemMonitoringPage();
    await waitFor(() => expect(screen.getByText(/Failed to fetch application logs./i)).toBeInTheDocument());
  });

  test('displays error message if fetching error logs fails', async () => {
    getLogs.mockImplementation(logType => {
      if (logType === 'app') return Promise.resolve(mockAppLogs); // app logs fine
      if (logType === 'error') return Promise.reject(new Error('Error logs fetch failed'));
      return Promise.reject(new Error('Invalid log type'));
    });
    renderSystemMonitoringPage();
    await waitFor(() => expect(screen.getByText(/Failed to fetch error logs./i)).toBeInTheDocument());
  });

  test('displays "No logs found" message when logs are empty', async () => {
    getLogs.mockImplementation(logType => Promise.resolve([])); // Both log types return empty
    renderSystemMonitoringPage();
    await waitFor(() => {
      const appLogSection = screen.getByText("Application Logs (Last 100 lines)").closest('.monitor-section');
      expect(appLogSection.querySelector('.no-logs')).toHaveTextContent("No application logs found or logs are empty.");

      const errorLogSection = screen.getByText("Error Logs (Last 100 lines)").closest('.monitor-section');
      expect(errorLogSection.querySelector('.no-logs')).toHaveTextContent("No error logs found or logs are empty.");
    });
  });

  test('refresh app logs button calls fetchAppLogs', async () => {
    renderSystemMonitoringPage();
    // Wait for initial load
    await waitFor(() => expect(getLogs).toHaveBeenCalledWith('app'));
    getLogs.mockClear(); // Clear initial calls before testing refresh
    getLogs.mockResolvedValue(['Refreshed app log']);


    const refreshAppLogsButton = screen.getByRole('button', { name: /Refresh App Logs/i });
    fireEvent.click(refreshAppLogsButton);

    expect(getLogs).toHaveBeenCalledWith('app');
    await waitFor(() => expect(screen.getByText('Refreshed app log')).toBeInTheDocument());
  });

  test('refresh error logs button calls fetchErrorLogs', async () => {
    renderSystemMonitoringPage();
    await waitFor(() => expect(getLogs).toHaveBeenCalledWith('error'));
    getLogs.mockClear();
    getLogs.mockResolvedValue(['Refreshed error log']);

    const refreshErrorLogsButton = screen.getByRole('button', { name: /Refresh Error Logs/i });
    fireEvent.click(refreshErrorLogsButton);

    expect(getLogs).toHaveBeenCalledWith('error');
    await waitFor(() => expect(screen.getByText('Refreshed error log')).toBeInTheDocument());
  });
});

// Helper to ensure consistent uptime formatting with the component
const formatUptimeForTest = (seconds) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
};
