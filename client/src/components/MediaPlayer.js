import React from 'react';
import Plyr from 'plyr-react';
// It's generally better to import CSS specific to a component within that component,
// or if it's global, in App.js or index.js.
// For Plyr, its CSS is foundational for its appearance.
// import 'plyr-react/dist/plyr.css'; // This is also a valid place

const MediaPlayer = ({ sourceUrl, mediaType, title, onPlayerClose }) => {
  if (!sourceUrl) {
    return <div className="MediaPlayer-Error">No media source provided.</div>;
  }

  // Ensure mediaType is 'video' or 'audio' as expected by Plyr's source prop
  const plyrSourceType = mediaType === 'video' ? 'video' : 'audio';

  const plyrProps = {
    source: {
      type: plyrSourceType,
      title: title || 'Playing Media',
      sources: [
        {
          src: sourceUrl,
          // Plyr usually infers type from the src extension (e.g. .mp4, .mp3)
          // Forcing a type here (e.g., 'video/mp4') can sometimes be necessary if inference fails
          // or if the URL doesn't have a standard extension.
        },
      ],
    },
    options: {
      // Standard controls. You can customize this array.
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'download', 'fullscreen'],
      autoplay: true,
      // Other Plyr options:
      // tooltips: { controls: true, seek: true },
      // keyboard: { focused: true, global: true },
      // resetOnEnd: true,
    },
  };

  return (
    <div className="MediaPlayerComponent"> {/* Wrapper div for potential future styling */}
      <Plyr {...plyrProps} />
    </div>
  );
};

export default MediaPlayer;
