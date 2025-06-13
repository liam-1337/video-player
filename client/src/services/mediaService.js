import axios from 'axios';

// API_URL should now be relative, as the client is served from the same origin.
const API_URL = '/api';
const authAxios = axios.create({ baseURL: API_URL });

// Axios instance for non-authenticated plain requests, if needed for register/login
// However, register/login in this file already use axios.post with full path construction.
// For consistency and if we change register/login to use a base URL, this might be useful.
// For now, we will adjust existing axios.post calls for register/login.
const plainAxios = axios.create({ baseURL: '/' }); // Base for root paths if ever needed

authAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mediaHubToken');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Auth Service ---
export const registerUser = async (username, password, email) => {
  // Using plainAxios or axios directly for public endpoints like register/login
  // as they don't require Authorization header via authAxios interceptor initially.
  // The API_URL is now /api, so the path becomes /api/auth/register.
  try { const response = await axios.post('/api/auth/register', { username, password, email }); return response.data; }
  catch (error) { throw error.response ? error.response.data : new Error('Registration failed'); }
};
export const loginUser = async (username, password) => {
  // Similar to registerUser, using axios directly. Path becomes /api/auth/login.
  try { const response = await axios.post('/api/auth/login', { username, password });
    if (response.data.token && response.data.user) { localStorage.setItem('mediaHubToken', response.data.token); localStorage.setItem('mediaHubUser', JSON.stringify(response.data.user));}
    return response.data;
  } catch (error) { throw error.response ? error.response.data : new Error('Login failed'); }
};
export const logoutUser = () => { localStorage.removeItem('mediaHubToken'); localStorage.removeItem('mediaHubUser'); };
export const getCurrentUser = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
        const userStr = localStorage.getItem('mediaHubUser');
        return userStr ? JSON.parse(userStr) : null;
    }
    return null;
};
export const getToken = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem('mediaHubToken');
    }
    return null;
};
export const getUserProfile = async () => {
    try { const response = await authAxios.get('/auth/profile'); return response.data; }
    catch (error) { throw error.response ? error.response.data : new Error('Could not fetch profile'); }
};

// --- User Preferences Service ---
export const updateUserPreferences = async (preferences) => {
  try { const response = await authAxios.put('/user/preferences', preferences);
    if (response.data.user) localStorage.setItem('mediaHubUser', JSON.stringify(response.data.user)); return response.data;
  } catch (error) { console.error('Pref error:', error.response?.data || error.message); throw error.response ? error.response.data : new Error('Pref update failed'); }
};

// --- Media Progress Service ---
export const saveMediaProgress = async (mediaId, progress, totalDuration) => {
  try { const encodedMediaId = encodeURIComponent(mediaId);
    const response = await authAxios.post(`/user/media/${encodedMediaId}/progress`, { progress, totalDuration }); return response.data;
  } catch (error) { console.warn('Progress save warning:', error.response?.data || error.message); return null; } // Changed to warn
};
export const getContinueWatchingList = async () => {
  try { const response = await authAxios.get('/user/media/continue-watching'); return response.data; }
  catch (error) { console.error('Continue watching error:', error.response?.data || error.message); throw error.response ? error.response.data : new Error('Failed to fetch continue watching list');}
};

// --- Media Sharing Service ---
export const shareMediaItem = async (mediaId, sharedWithUsername) => {
  const encodedMediaId = encodeURIComponent(mediaId);
  try { const response = await authAxios.post(`/media/${encodedMediaId}/share`, { sharedWithUsername }); return response.data; }
  catch (error) { console.error('Share media error:', error.response?.data || error.message); throw error.response ? error.response.data : new Error('Failed to share media item.'); }
};
export const unshareMediaItem = async (mediaId, sharedWithUserId) => {
  const encodedMediaId = encodeURIComponent(mediaId);
  try { const response = await authAxios.delete(`/media/${encodedMediaId}/share`, { data: { sharedWithUserId } }); return response.data; }
  catch (error) { console.error('Unshare media error:', error.response?.data || error.message); throw error.response ? error.response.data : new Error('Failed to unshare media item.');}
};
export const getSharedWithMeList = async () => {
  try { const response = await authAxios.get('/media/shared-with-me'); return response.data; }
  catch (error) { console.error('Get shared with me error:', error.response?.data || error.message); throw error.response ? error.response.data : new Error('Failed to fetch list of media shared with you.');}
};
export const getSharedByMeList = async () => { // Not used in this subtask's UI but good to have
  try { const response = await authAxios.get('/media/shared-by-me'); return response.data; }
  catch (error) { console.error('Get shared by me error:', error.response?.data || error.message); throw error.response ? error.response.data : new Error('Failed to fetch list of media you shared.');}
};

// --- Media Service (existing) ---
export const getMediaList = async (sortBy) => {
  try { let url = '/media'; if (sortBy) url += `?sortBy=${sortBy}`; const response = await authAxios.get(url); return response.data;}
  catch (error) { console.error('Media list error:', error.response?.data || error.message); throw error.response ? error.response.data : new Error('Failed to fetch media list.'); }
};
export const getMediaFileDetails = async (filePath) => {
  try { const encodedFilePath = encodeURIComponent(filePath); const response = await authAxios.get(`/media/file/${encodedFilePath}`); return response.data; }
  catch (error) { console.error('Media detail error:', error.response?.data || error.message); throw error.response ? error.response.data : new Error('Failed to fetch media details.'); }
};
export const getStreamUrl = (filePath) => `/stream/${encodeURIComponent(filePath)}`; // Adjusted to be relative
export const uploadMediaFile = async (file, onUploadProgress) => {
  const formData = new FormData(); formData.append('mediafile', file);
  try { const response = await authAxios.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: e => { if (onUploadProgress && e.total) onUploadProgress(Math.round((e.loaded * 100) / e.total)); } }); return response.data; }
  catch (error) { console.error('Upload error:', error.response?.data || error.message); throw error.response ? error.response.data : new Error('Upload failed'); }
};

// --- External API Search Functions ---
// These are already using relative paths with authAxios, so they should be fine.
// Example: authAxios.get('/e621/search', ...) will become a request to /api/e621/search
export const searchE621 = async (tags) => {
  try {
    const response = await authAxios.get('/e621/search', { params: { tags } });
    return response.data;
  } catch (error) {
    console.error('Error searching e621:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('e621 search failed');
  }
};

export const searchRule34 = async (tags) => {
  try {
    const response = await authAxios.get('/rule34/search', { params: { tags } });
    return response.data;
  } catch (error) {
    console.error('Error searching Rule34:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Rule34 search failed');
  }
};
