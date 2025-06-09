import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/admin';

const adminAuthAxios = axios.create({
  baseURL: API_URL,
});

adminAuthAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mediaHubToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const getUsers = async () => {
  try {
    const response = await adminAuthAxios.get('/users');
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error.response || error.message);
    throw error.response ? error.response.data : new Error('Network error or server is unreachable');
  }
};

export const updateUserAdminStatus = async (userId, isAdmin) => {
  try {
    const response = await adminAuthAxios.put(`/users/${userId}`, { isAdmin });
    return response.data;
  } catch (error) {
    console.error(`Error updating admin status for user ${userId}:`, error.response || error.message);
    throw error.response ? error.response.data : new Error('Network error or server is unreachable');
  }
};

export const deleteUser = async (userId) => {
  try {
    const response = await adminAuthAxios.delete(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error.response || error.message);
    throw error.response ? error.response.data : new Error('Network error or server is unreachable');
  }
};

export const getMedia = async () => {
  try {
    const response = await adminAuthAxios.get('/media');
    return response.data;
  } catch (error) {
    console.error('Error fetching media:', error.response || error.message);
    throw error.response ? error.response.data : new Error('Network error or server is unreachable');
  }
};

export const rescanMedia = async () => {
  try {
    const response = await adminAuthAxios.post('/media/rescan');
    return response.data;
  } catch (error) {
    console.error('Error triggering media rescan:', error.response || error.message);
    throw error.response ? error.response.data : new Error('Network error or server is unreachable');
  }
};

export const getSystemStatus = async () => {
  try {
    const response = await adminAuthAxios.get('/system/status');
    return response.data;
  } catch (error) {
    console.error('Error fetching system status:', error.response || error.message);
    throw error.response ? error.response.data : new Error('Network error or server is unreachable');
  }
};

export const getLogs = async (logType) => {
  try {
    const response = await adminAuthAxios.get(`/logs/${logType}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${logType} logs:`, error.response || error.message);
    throw error.response ? error.response.data : new Error('Network error or server is unreachable');
  }
};

export const getDashboardStats = async () => {
  try {
    // The service returns the data directly, no need for .data in the component
    // if adminAuthAxios is configured to do so, or if you handle it here.
    // Assuming adminAuthAxios directly returns response.data from interceptor or by default for successful calls.
    return await adminAuthAxios.get('/stats');
  } catch (error) {
    console.error('Error fetching dashboard stats:', error.response || error.message);
    throw error.response ? error.response.data : new Error('Network error or server is unreachable');
  }
};

export default adminAuthAxios;
