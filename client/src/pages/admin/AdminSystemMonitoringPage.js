import React, { useState, useEffect, useCallback } from 'react';
import { getSystemStatus, getLogs } from '../../services/adminService';
import './AdminSystemMonitoringPage.css';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === undefined || bytes === null || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatUptime = (seconds) => {
  if (seconds === undefined || seconds === null) return 'N/A';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
};

const AdminSystemMonitoringPage = () => {
  const [status, setStatus] = useState({});
  const [appLogs, setAppLogs] = useState([]);
  const [errorLogs, setErrorLogs] = useState([]);
  const [loading, setLoading] = useState({ status: true, appLogs: true, errorLogs: true });
  const [errors, setErrors] = useState({ status: '', appLogs: '', errorLogs: '' });

  const fetchSystemStatus = useCallback(async () => {
    setLoading(prev => ({ ...prev, status: true }));
    setErrors(prev => ({ ...prev, status: '' }));
    try {
      const data = await getSystemStatus();
      setStatus(data);
    } catch (err) {
      setErrors(prev => ({ ...prev, status: err.message || 'Failed to fetch system status.' }));
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, status: false }));
    }
  }, []);

  const fetchAppLogs = useCallback(async () => {
    setLoading(prev => ({ ...prev, appLogs: true }));
    setErrors(prev => ({ ...prev, appLogs: '' }));
    try {
      const data = await getLogs('app');
      setAppLogs(data);
    } catch (err) {
      setErrors(prev => ({ ...prev, appLogs: err.message || 'Failed to fetch application logs.' }));
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, appLogs: false }));
    }
  }, []);

  const fetchErrorLogs = useCallback(async () => {
    setLoading(prev => ({ ...prev, errorLogs: true }));
    setErrors(prev => ({ ...prev, errorLogs: '' }));
    try {
      const data = await getLogs('error');
      setErrorLogs(data);
    } catch (err) {
      setErrors(prev => ({ ...prev, errorLogs: err.message || 'Failed to fetch error logs.' }));
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, errorLogs: false }));
    }
  }, []);

  useEffect(() => {
    fetchSystemStatus();
    fetchAppLogs();
    fetchErrorLogs();
  }, [fetchSystemStatus, fetchAppLogs, fetchErrorLogs]);

  return (
    <div className="AdminSystemMonitoringPage">
      <h1>System Monitoring</h1>

      <div className="monitor-section">
        <h2>System Status</h2>
        {loading.status && <p className="loading">Loading system status...</p>}
        {errors.status && <p className="error">{errors.status}</p>}
        {!loading.status && !errors.status && Object.keys(status).length > 0 && (
          <div>
            <div className="status-item"><strong>Uptime:</strong> <span>{formatUptime(status.uptime)}</span></div>
            <div className="status-item"><strong>Platform:</strong> <span>{status.platform}</span></div>
            <div className="status-item"><strong>Architecture:</strong> <span>{status.architecture}</span></div>
            <div className="status-item"><strong>Node.js Version:</strong> <span>{status.nodeVersion}</span></div>
            <div className="status-item"><strong>Total Memory:</strong> <span>{formatBytes(status.totalMemory)}</span></div>
            <div className="status-item"><strong>Free Memory:</strong> <span>{formatBytes(status.freeMemory)}</span></div>
            <div className="status-item"><strong>CPUs:</strong> <span>{status.cpuCount} cores</span></div>
          </div>
        )}
      </div>

      <div className="monitor-section">
        <h2>Application Logs (Last 100 lines)</h2>
        <div className="logs-controls">
            <button onClick={fetchAppLogs} disabled={loading.appLogs}>Refresh App Logs</button>
        </div>
        {loading.appLogs && <p className="loading">Loading application logs...</p>}
        {errors.appLogs && <p className="error">{errors.appLogs}</p>}
        {!loading.appLogs && !errors.appLogs && (
          <div className="logs-container">
            {appLogs.length > 0 ? <pre>{appLogs.join('\n')}</pre> : <p className="no-logs">No application logs found or logs are empty.</p>}
          </div>
        )}
      </div>

      <div className="monitor-section">
        <h2>Error Logs (Last 100 lines)</h2>
        <div className="logs-controls">
            <button onClick={fetchErrorLogs} disabled={loading.errorLogs}>Refresh Error Logs</button>
        </div>
        {loading.errorLogs && <p className="loading">Loading error logs...</p>}
        {errors.errorLogs && <p className="error">{errors.errorLogs}</p>}
        {!loading.errorLogs && !errors.errorLogs && (
          <div className="logs-container">
            {errorLogs.length > 0 ? <pre>{errorLogs.join('\n')}</pre> : <p className="no-logs">No error logs found or logs are empty.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSystemMonitoringPage;
