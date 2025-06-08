import React, { useState, useEffect, useCallback } from 'react';
import { getMedia, rescanMedia } from '../../services/adminService';
import './AdminMediaManagementPage.css';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const AdminMediaManagementPage = () => {
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRescanning, setIsRescanning] = useState(false);
  const [error, setError] = useState('');
  const [rescanStatus, setRescanStatus] = useState({ message: '', type: '' });
  const [mediaCurrentPage, setMediaCurrentPage] = useState(1);
  const [mediaItemsPerPage] = useState(10);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMedia();
      setMediaItems(data);
      // setMediaCurrentPage(1); // Reset to first page after fetching
    } catch (err) {
      setError(err.message || 'Failed to fetch media items.');
      setMediaItems([]); // Clear items on error
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Effect to reset page if items change affecting total pages
  useEffect(() => {
    const totalMediaPages = Math.ceil(mediaItems.length / mediaItemsPerPage);
    if (mediaCurrentPage > totalMediaPages && totalMediaPages > 0) {
      setMediaCurrentPage(totalMediaPages);
    } else if (mediaCurrentPage === 0 && totalMediaPages > 0) {
      setMediaCurrentPage(1);
    } else if (mediaItems.length === 0) {
      setMediaCurrentPage(1);
    }
  }, [mediaItems, mediaItemsPerPage, mediaCurrentPage]);


  const handleRescanLibrary = useCallback(async () => {
    setIsRescanning(true);
    setError('');
    setRescanStatus({ message: '', type: '' });
    try {
      const response = await rescanMedia();
      setRescanStatus({ message: response.message || `Library rescan initiated. Found ${response.itemCount} items.`, type: 'success' });
      setMediaCurrentPage(1); // Reset to first page after successful rescan
      await fetchMedia(); // Refresh the list
    } catch (err) {
      setError(err.message || 'Failed to trigger media rescan.');
      setRescanStatus({ message: err.message || 'Failed to trigger media rescan.', type: 'error' });
      console.error(err);
    } finally {
      setIsRescanning(false);
    }
  }, [fetchMedia]);

  // Pagination logic
  const indexOfLastItem = mediaCurrentPage * mediaItemsPerPage;
  const indexOfFirstItem = indexOfLastItem - mediaItemsPerPage;
  const currentMediaToDisplay = mediaItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalMediaPages = Math.ceil(mediaItems.length / mediaItemsPerPage);

  const paginateMedia = useCallback((pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalMediaPages) {
      setMediaCurrentPage(pageNumber);
    }
  }, [totalMediaPages]);

  return (
    <div className="AdminMediaManagementPage">
      <h2>Media Library Management</h2>
      <div className="controls">
        <button onClick={handleRescanLibrary} disabled={isRescanning || loading} className="rescan-btn">
          {isRescanning ? 'Rescanning...' : (loading && !isRescanning ? 'Loading...' : 'Rescan Media Library')}
        </button>
      </div>

      {loading && mediaItems.length === 0 && !isRescanning && <p className="loading">Loading media items...</p>}
      {error && <p className={`message error`}>{error}</p>}
      {rescanStatus.message && <p className={`message ${rescanStatus.type}`}>{rescanStatus.message}</p>}

      {!loading || mediaItems.length > 0 ? ( // Show table if not initial loading OR if items are already there
        <>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Path</th>
              <th>Size</th>
              <th>Last Modified</th>
            </tr>
          </thead>
          <tbody>
            {currentMediaToDisplay.length === 0 && !loading && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>No media items found on this page. Try rescanning or check other pages.</td>
              </tr>
            )}
            {currentMediaToDisplay.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>{item.type}</td>
                <td>{item.path}</td>
                <td>{formatBytes(item.size)}</td>
                <td>{new Date(item.lastModified).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {mediaItems.length > mediaItemsPerPage && totalMediaPages > 1 && (
          <div className="pagination-controls">
            <button onClick={() => paginateMedia(mediaCurrentPage - 1)} disabled={mediaCurrentPage === 1}>
              Previous
            </button>
            <span> Page {mediaCurrentPage} of {totalMediaPages} </span>
            <button onClick={() => paginateMedia(mediaCurrentPage + 1)} disabled={mediaCurrentPage === totalMediaPages}>
              Next
            </button>
          </div>
        )}
        </>
      ) : ( // This case handles when loading is done, there's no error, but mediaItems array is still empty
         !error && <p>No media items found. Try rescanning the library.</p>
      )}
    </div>
  );
};

export default AdminMediaManagementPage;
