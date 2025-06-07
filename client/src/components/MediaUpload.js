import React, { useState, useRef } from 'react'; // Added useRef
import { uploadMediaFile } from '../services/mediaService';
import './MediaUpload.css';

const MediaUpload = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null); // To reset file input

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setMessage('');
    setError('');
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    setIsUploading(true);
    setError('');
    setMessage('Starting upload...');
    setUploadProgress(0); // Explicitly reset progress at start of upload

    try {
      const response = await uploadMediaFile(selectedFile, (progress) => {
        setUploadProgress(progress);
        setMessage(`Uploading: ${progress}%`);
      });
      setMessage(response.message || 'File uploaded successfully!');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = null; // Reset file input
      }
      if (onUploadSuccess) {
        onUploadSuccess(response.fileDetails);
      }
    } catch (err) {
      setError(err.error || 'Upload failed. Please try again.');
      setMessage('');
    } finally {
      setIsUploading(false);
      // Keep uploadProgress at 100 if successful, or reset if preferred.
      // For now, it will stay at the last value (hopefully 100 or error).
      // Let's reset it if it was not a full success, or keep it to show completion.
      // If error, progress might not be 100. If success, it should be.
      // Consider resetting progress after a short delay on success.
    }
  };

  return (
    <div className="MediaUpload">
      <h4>Upload New Media</h4>
      <input type="file" id="fileInput" ref={fileInputRef} onChange={handleFileChange} disabled={isUploading} />
      <button onClick={handleUpload} disabled={isUploading || !selectedFile}>
        {isUploading ? `Uploading (${uploadProgress}%)` : 'Upload'}
      </button>
      {error && <p className="MediaUpload-Error">{error}</p>}
      {message && !error && <p className="MediaUpload-Message">{message}</p>}
      {isUploading && ( // Only show progress bar when actively uploading
        <div className="MediaUpload-ProgressBarContainer">
          <div
            className="MediaUpload-ProgressBar"
            style={{ width: `${uploadProgress}%` }}
          >
            {uploadProgress > 0 ? `${uploadProgress}%` : ''}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaUpload;
