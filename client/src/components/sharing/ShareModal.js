import React, { useState } from 'react';
import { shareMediaItem } from '../../services/mediaService'; // Corrected path
import './ShareModal.css';

const ShareModal = ({ mediaItem, onClose, onShareSuccess }) => {
  const [sharedWithUsername, setSharedWithUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sharedWithUsername.trim()) {
      setError('Please enter a username.');
      return;
    }
    setLoading(true); setError(''); setSuccessMessage('');
    try {
      const response = await shareMediaItem(mediaItem.id, sharedWithUsername);
      setSuccessMessage(response.message || 'Shared successfully!');
      setSharedWithUsername('');
      if (onShareSuccess) onShareSuccess();
      setTimeout(() => { onClose(); setSuccessMessage(''); }, 1500);
    } catch (err) {
      setError(err.error || 'Failed to share. User may not exist or media already shared.');
      console.error(err);
    } finally { setLoading(false); }
  };

  if (!mediaItem) return null;

  return (
    <div className="ShareModalOverlay" onClick={onClose}>
      <div className="ShareModalContainer" onClick={(e) => e.stopPropagation()}>
        <h3>Share "{mediaItem.metadata?.title || mediaItem.name}"</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="share-username">Share with (Username):</label>
            <input type="text" id="share-username" value={sharedWithUsername} onChange={(e) => setSharedWithUsername(e.target.value)} placeholder="Enter username" required />
          </div>
          {error && <p className="share-error">{error}</p>}
          {successMessage && <p className="share-success">{successMessage}</p>}
          <div className="share-actions">
            <button type="button" onClick={onClose} disabled={loading} className="cancel-btn">Cancel</button>
            <button type="submit" disabled={loading || !sharedWithUsername.trim()} className="confirm-btn">
              {loading ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default ShareModal;
