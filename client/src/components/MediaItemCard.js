import React, { useState } from 'react';
import './MediaItemCard.css';
import ShareModal from './sharing/ShareModal';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const VideoIcon = () => <span role="img" aria-label="video">🎬</span>;
const AudioIcon = () => <span role="img" aria-label="audio">🎵</span>;
const ImageIcon = () => <span role="img" aria-label="image">🖼️</span>;
const UnknownIcon = () => <span role="img" aria-label="unknown">❓</span>;

const MediaItemCard = ({ mediaItem, onPlay, userProgress, sharedBy }) => {
  const { isAuthenticated } = useAuth();
  const [showShareModal, setShowShareModal] = useState(false);
  const { name, type, metadata, id, isVR } = mediaItem; // Added isVR
  const title = metadata?.title || name;
  let IconComponent;
  switch (type) {
    case 'video': IconComponent = VideoIcon; break;
    case 'audio': IconComponent = AudioIcon; break;
    case 'image': IconComponent = ImageIcon; break;
    default: IconComponent = UnknownIcon; break;
  }
  const progressPercent = userProgress && userProgress.totalDuration && userProgress.totalDuration > 0
    ? (userProgress.progress / userProgress.totalDuration) * 100
    : 0;

  const handleShareClick = (e) => { e.stopPropagation(); setShowShareModal(true); };
  const watchTogetherUrl = `/watch/${encodeURIComponent(id)}/together`; // Use id from mediaItem

  return (
    <>
      {/* Corrected data-testid syntax */}
      <div className="MediaItemCard" onClick={() => onPlay(mediaItem)} data-testid={`media-item-${id}`}>
        <div className="MediaItemCard-Icon"><IconComponent /></div>
        <div className="MediaItemCard-Details">
          <h3 title={title}>{title} {isVR && <span className="VRBadge" title="360° VR Video">(VR)</span>}</h3>
          <p className="MediaItemCard-Type">{type}</p>
          {sharedBy && <p className="MediaItemCard-SharedBy">Shared by: {sharedBy}</p>}
          {metadata?.artist && <p className="MediaItemCard-Artist">Artist: {metadata.artist}</p>}
          {metadata?.album && <p className="MediaItemCard-Album">Album: {metadata.album}</p>}
          {metadata?.duration && (!userProgress || progressPercent === 0) && <p className="MediaItemCard-Duration">Duration: {Math.round(metadata.duration)}s</p>}
        </div>
        {userProgress && userProgress.progress > 0.1 && progressPercent < 98 && (
             <div className="MediaItemCard-ProgressContainer" title={`Watched ${Math.round(userProgress.progress)}s / ${Math.round(userProgress.totalDuration || 0)}s (${progressPercent.toFixed(1)}%)`}><div className="MediaItemCard-ProgressBar" style={{ width: `${Math.min(progressPercent, 100)}%` }}/></div>
        )}
        <div className="MediaItemCard-Actions">
            {isAuthenticated && (type === 'video' || type === 'audio') && id && (
            <>
                <Link to={watchTogetherUrl} className="MediaItemCard-ActionBtn WTBtn" onClick={(e) => e.stopPropagation()} title="Watch Together">📺</Link>
                <button className="MediaItemCard-ActionBtn ShareBtn" onClick={handleShareClick} title="Share">🔗</button>
            </>
            )}
        </div>
      </div>
      {showShareModal && <ShareModal mediaItem={mediaItem} onClose={() => setShowShareModal(false)} onShareSuccess={() => console.log("Shared from card")} />}
    </>
  );
};
export default MediaItemCard;
