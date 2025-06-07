import React, { useEffect, useRef, useCallback, useImperativeHandle } from 'react';
import Plyr from 'plyr-react';
import 'plyr-react/dist/plyr.css';
import { saveMediaProgress as serviceSaveMediaProgress } from '../services/mediaService';
import { useAuth } from '../contexts/AuthContext';

const MediaPlayer = React.forwardRef(({ mediaItem, sourceUrl, mediaType, title,
                                       onReady, onPlay, onPause, onSeeked, onTimeUpdate,
                                       disableInternalProgressSaving = false
                                     }, ref) => {
  const internalPlyrRef = useRef(null);
  const { isAuthenticated } = useAuth();
  const lastSavedTimeRef = useRef(0);
  const saveInterval = 10000;

  useImperativeHandle(ref, () => ({
    get plyr() { return internalPlyrRef.current?.plyr; },
    initialSeekTime: undefined
  }));

  const localSaveProgress = useCallback((player) => {
    if (disableInternalProgressSaving || !isAuthenticated || !mediaItem || !mediaItem.id || !player) return;
    const currentTime = player.currentTime; const duration = player.duration;
    if (duration > 0 && (Math.abs(currentTime - lastSavedTimeRef.current) > (saveInterval/1000 -1) || currentTime === duration)) {
      serviceSaveMediaProgress(mediaItem.id, currentTime, duration);
      lastSavedTimeRef.current = currentTime;
    }
  }, [isAuthenticated, mediaItem, saveInterval, disableInternalProgressSaving]);

  useEffect(() => {
    const player = internalPlyrRef.current?.plyr;
    if (!player) return;

    let internalTimeUpdateHandler, internalPauseHandler, internalEndedHandler, canPlayHandler;

    if (!disableInternalProgressSaving && isAuthenticated && mediaItem) {
        internalTimeUpdateHandler = () => localSaveProgress(player);
        internalPauseHandler = () => localSaveProgress(player);
        internalEndedHandler = () => { if (player.duration > 0) localSaveProgress(player); };
        player.on('timeupdate', internalTimeUpdateHandler);
        player.on('pause', internalPauseHandler);
        player.on('ended', internalEndedHandler);
    }

    if (onReady) player.on('ready', onReady);
    if (onPlay) player.on('play', onPlay);
    if (onPause) player.on('pause', onPause);
    if (onSeeked) player.on('seeked', onSeeked);
    if (onTimeUpdate) player.on('timeupdate', onTimeUpdate);

    const doSeek = () => {
      if (player.duration > 0 && mediaItem?.userProgress?.progress > 0 &&
          mediaItem.userProgress.progress < player.duration * 0.98) {
        player.currentTime = mediaItem.userProgress.progress;
        lastSavedTimeRef.current = mediaItem.userProgress.progress;
      }
    };

    if (!disableInternalProgressSaving && mediaItem?.userProgress) {
        canPlayHandler = doSeek;
        player.on('canplay', canPlayHandler); // Use canplay for seeking
    }

    return () => {
      if (player && player.source) {
        if (!disableInternalProgressSaving && isAuthenticated && mediaItem) {
            localSaveProgress(player);
            if(internalTimeUpdateHandler) player.off('timeupdate', internalTimeUpdateHandler);
            if(internalPauseHandler) player.off('pause', internalPauseHandler);
            if(internalEndedHandler) player.off('ended', internalEndedHandler);
        }
        if (onReady) player.off('ready', onReady);
        if (onPlay) player.off('play', onPlay);
        if (onPause) player.off('pause', onPause);
        if (onSeeked) player.off('seeked', onSeeked);
        if (onTimeUpdate) player.off('timeupdate', onTimeUpdate);
        if (canPlayHandler) player.off('canplay', canPlayHandler);
      }
    };
  }, [isAuthenticated, mediaItem, localSaveProgress, disableInternalProgressSaving, onReady, onPlay, onPause, onSeeked, onTimeUpdate]);

  if (!sourceUrl) return <div className="MediaPlayer-Error">No media source.</div>;
  const plyrProps = { source: { type: mediaType, title: title || 'Media', sources: [{ src: sourceUrl }] }, options: { autoplay: true, controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'] } };

  return (<div className="MediaPlayerComponent"><Plyr ref={internalPlyrRef} {...plyrProps} /></div>);
});
export default MediaPlayer;
