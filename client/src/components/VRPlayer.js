import React, { useEffect, useRef } from 'react';
import './VRPlayer.css';

const VRPlayer = ({ src, title, onClose }) => {
  const videoRef = useRef(null); // Ref for the video element

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('keydown', handleEsc);

    // Attempt to play video when component mounts, if browser allows
    // Some browsers require user interaction. A-Frame's play-on-click component might be needed for robust autoplay.
    if (videoRef.current) {
        videoRef.current.play().catch(error => {
            console.warn("VR Video autoplay prevented:", error);
            // You might want to show a play button overlay if autoplay fails
        });
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      // A-Frame scene might need explicit cleanup if entities were added programmatically
      // For declarative scenes, this is often not an issue.
    };
  }, [onClose]);

  if (!src) return <div className="VRPlayer-Error">No video source for VR Player.</div>;

  return (
    <div className="VRPlayerContainer">
      <a-scene embedded class="VRSceneFullScreen" vr-mode-ui="enabled: true"> {/* Enable VR mode UI */}
        <a-assets>
          <video id="vrVideoSource" ref={videoRef} src={src} crossOrigin="anonymous" loop={false} playsInline webkit-playsinline="true" preload="auto"></video>
        </a-assets>
        <a-videosphere src="#vrVideoSource" rotation="0 -90 0"></a-videosphere>
        <a-camera position="0 1.6 0"> {/* Default camera height */}
            <a-cursor color="#FFFF00" /> {/* Yellow cursor for gaze interaction */}
        </a-camera>
        {/* Sky to make it less jarring if video doesn't load immediately */}
        <a-sky color="#333"></a-sky>
      </a-scene>
       {onClose && (
         <button onClick={onClose} className="VRPlayer-CloseButtonModal" title="Close VR Player">&times;</button>
       )}
    </div>
  );
};
export default VRPlayer;
