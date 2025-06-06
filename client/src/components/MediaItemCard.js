import React from 'react';
import './MediaItemCard.css';

const VideoIcon = () => <span role="img" aria-label="video">🎬</span>;
const AudioIcon = () => <span role="img" aria-label="audio">🎵</span>;
const ImageIcon = () => <span role="img" aria-label="image">🖼️</span>;
const UnknownIcon = () => <span role="img" aria-label="unknown">❓</span>;

const MediaItemCard = ({ mediaItem, onPlay }) => {
  const { name, type, metadata } = mediaItem;
  const title = metadata.title || name;

  let IconComponent;
  switch (type) {
    case 'video':
      IconComponent = VideoIcon;
      break;
    case 'audio':
      IconComponent = AudioIcon;
      break;
    case 'image':
      IconComponent = ImageIcon;
      break;
    default:
      IconComponent = UnknownIcon;
  }

  return (
    <div className="MediaItemCard" data-testid={`media-item-card-${mediaItem.id}`} onClick={() => onPlay(mediaItem)}>
      <div className="MediaItemCard-Icon">
        <IconComponent />
      </div>
      <div className="MediaItemCard-Details">
        <h3 title={title}>{title}</h3>
        <p className="MediaItemCard-Type">{type}</p>
        {metadata.artist && <p className="MediaItemCard-Artist">Artist: {metadata.artist}</p>}
        {metadata.album && <p className="MediaItemCard-Album">Album: {metadata.album}</p>}
        {metadata.duration && <p className="MediaItemCard-Duration">Duration: {Math.round(metadata.duration)}s</p>}
      </div>
    </div>
  );
};

export default MediaItemCard;
