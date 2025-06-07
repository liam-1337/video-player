import React from 'react';
import './ExternalMediaItemCard.css';

const ExternalMediaItemCard = ({ mediaItem }) => {
  if (!mediaItem) {
    return <div className="media-item-card error">No media item data provided.</div>;
  }

  const { id, preview_url, file_url, tags, score, source_api } = mediaItem;

  const getOriginalPostUrl = () => {
    if (source_api === 'e621') {
      return `https://e621.net/posts/${id}`;
    } else if (source_api === 'rule34') {
      return `https://rule34.xxx/index.php?page=post&s=view&id=${id}`;
    }
    return '#'; // Fallback
  };

  const displayTags = Array.isArray(tags) ? tags.slice(0, 5).join(', ') : 'No tags';
  const allTags = Array.isArray(tags) ? tags.join(', ') : '';

  return (
    <div className="media-item-card">
      <div className="media-thumbnail-container">
        {preview_url ? (
          <a href={file_url || getOriginalPostUrl()} target="_blank" rel="noopener noreferrer">
            <img src={preview_url} alt={`Preview for item ${id}`} className="media-thumbnail" />
          </a>
        ) : (
          <div className="media-thumbnail-placeholder">No Preview</div>
        )}
      </div>
      <div className="media-info">
        <p className="media-score" title={`Score: ${score || 'N/A'}`}>Score: {score || 'N/A'}</p>
        <p className="media-tags" title={allTags}>
          Tags: {displayTags}{tags && tags.length > 5 ? '...' : ''}
        </p>
        <a href={getOriginalPostUrl()} target="_blank" rel="noopener noreferrer" className="media-source-link">
          View Original ({source_api})
        </a>
      </div>
    </div>
  );
};

export default ExternalMediaItemCard;
