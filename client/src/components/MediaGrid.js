import React from 'react';
import MediaItemCard from './MediaItemCard';
import './MediaGrid.css'; // We'll create this CSS file

const MediaGrid = ({ mediaList, onPlayMedia }) => {
  if (!mediaList || mediaList.length === 0) {
    return <p className="MediaGrid-Empty">No media files found. Ensure your media directories are set up correctly on the server, or try scanning for media.</p>;
  }

  return (
    <div className="MediaGrid">
      {mediaList.map((media) => (
        <MediaItemCard key={media.id || media.path} mediaItem={media} onPlay={onPlayMedia} />
      ))}
    </div>
  );
};

export default MediaGrid;
