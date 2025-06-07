import React from 'react';
import ExternalMediaItemCard from './ExternalMediaItemCard';
import './ExternalMediaGrid.css';

const ExternalMediaGrid = ({ mediaItems, isLoading }) => {
  if (isLoading) {
    return <div className="loading-indicator">Loading results...</div>;
  }

  if (!mediaItems || mediaItems.length === 0) {
    return <div className="no-results-message">No results found. Try different tags.</div>;
  }

  return (
    <div className="external-media-grid">
      {mediaItems.map((item) => (
        <ExternalMediaItemCard key={`${item.source_api}-${item.id}`} mediaItem={item} />
      ))}
    </div>
  );
};

export default ExternalMediaGrid;
