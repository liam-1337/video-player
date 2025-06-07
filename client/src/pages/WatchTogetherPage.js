import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StandardMediaPlayer from '../components/StandardMediaPlayer'; // MediaPlayer now accepts plyrRef
import { getMediaFileDetails, getStreamUrl, getToken } from '../services/mediaService';
import wtService from '../services/watchTogetherService';
import { useAuth } from '../contexts/AuthContext';
import './WatchTogetherPage.css';

const WatchTogetherPage = () => {
  const { mediaId: encodedMediaIdFromUrl } = useParams();
  const mediaId = decodeURIComponent(encodedMediaIdFromUrl);
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [mediaItem, setMediaItem] = useState(null);
  const [loadingError, setLoadingError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const playerRef = useRef(null); // Ref for MediaPlayer component to access Plyr instance
  const isLocalActionRef = useRef(false); // To prevent acting on self-initiated events
  const seekTimeoutRef = useRef(null);
  const lastKnownPlayerTimeRef = useRef(0); // Store last known time from player events

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/watch/${encodedMediaIdFromUrl}/together`);
      return;
    }

    getMediaFileDetails(mediaId)
      .then(data => setMediaItem(data))
      .catch(err => { setLoadingError("Failed to load media."); console.error(err); });

    const token = getToken();
    wtService.connect(mediaId, token);

    wtService.setOnOpenHandler(() => setSocketConnected(true));
    wtService.setOnCloseHandler(() => { setSocketConnected(false); setViewerCount(c => Math.max(0, c-1));}); // Basic count adjustment
    wtService.setOnErrorHandler((errEvent) => { console.error("WT WS Error:", errEvent); setLoadingError("Connection error."); });

    wtService.setOnMessageHandler((data) => {
      if (data.fromUser && currentUser && data.fromUser.id === currentUser.id && data.type !== 'initialState' && data.type !== 'viewerCount' && data.type !== 'userJoined' && data.type !== 'userLeft') {
         return; // Ignore own playback messages unless it's a system/join message
      }
      const plyrInstance = playerRef.current?.plyr;
      if (!plyrInstance && !['viewerCount', 'userJoined', 'userLeft', 'chat'].includes(data.type)) return;

      isLocalActionRef.current = true;
      switch (data.type) {
        case 'play': plyrInstance?.play(); break;
        case 'pause': plyrInstance?.pause(); break;
        case 'seek': if (plyrInstance && Math.abs(plyrInstance.currentTime - data.currentTime) > 1.5) plyrInstance.currentTime = data.currentTime; break;
        case 'initialState':
          if (plyrInstance) {
            if (data.currentTime !== undefined) plyrInstance.currentTime = data.currentTime;
            if (data.status === 'playing') plyrInstance.play(); else plyrInstance.pause();
          }
          break;
        case 'viewerCount': setViewerCount(data.count); break;
        case 'userJoined': setChatMessages(p => [...p, { s: true, t: `${data.username || 'User'} joined (${data.count} viewers)` }]); break;
        case 'userLeft': setChatMessages(p => [...p, { s: true, t: `${data.username || 'User'} left (${data.count} viewers)` }]); break;
        case 'chat': setChatMessages(p => [...p, { u: data.fromUser?.username || 'Guest', t: data.text }]); break;
        default: break;
      }
      setTimeout(() => { isLocalActionRef.current = false; }, 150);
    });
    return () => { wtService.closeConnection(); clearTimeout(seekTimeoutRef.current); };
  }, [mediaId, isAuthenticated, navigate, currentUser, encodedMediaIdFromUrl]);

  const getPlayer = () => playerRef.current?.plyr;

  const handlePlayerEvent = useCallback((type) => {
    if (isLocalActionRef.current) return;
    const player = getPlayer();
    if (!player) return;
    lastKnownPlayerTimeRef.current = player.currentTime; // Update last known time

    const message = { type, currentTime: player.currentTime, duration: player.duration };
    if (type === 'seek') { // Debounce seek
        clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = setTimeout(() => wtService.sendMessage(message), 300);
    } else {
        wtService.sendMessage(message);
    }
  }, []);

  const handleChatSubmit = (e) => {
    e.preventDefault(); if (!chatInput.trim()) return;
    const message = { type: 'chat', text: chatInput };
    wtService.sendMessage(message);
    setChatMessages(p => [...p, { u: currentUser?.username || 'Me', t: chatInput }]);
    setChatInput('');
  };

  if (loadingError) return <div className="App-Status App-Error">{loadingError}</div>;
  if (!mediaItem) return <div className="App-Status App-Loading">Loading media for Watch Together...</div>;

  return (
    <div className="WatchTogetherPage PageContent">
      <div className="MediaPlayerAreaWatchTogether">
        <h3>{mediaItem.metadata?.title || mediaItem.name}</h3>
        <p>Session Status: {socketConnected ? `Connected (${viewerCount} watching)` : 'Disconnected'}</p>
        <StandardMediaPlayer
          plyrRef={playerRef} // Pass ref to MediaPlayer
          mediaItem={mediaItem}
          sourceUrl={getStreamUrl(mediaItem.path)}
          mediaType={mediaItem.type}
          title={mediaItem.metadata?.title || mediaItem.name}
          onPlay={() => handlePlayerEvent('play')}
          onPause={() => handlePlayerEvent('pause')}
          onSeeked={() => handlePlayerEvent('seek')} // Use 'seeked' (after seek) not 'seeking'
          onReady={() => { console.log("Player ready in WT"); playerRef.current.initialSeekTime = mediaItem.userProgress?.progress; }} // Let MediaPlayer handle initial seek
          disableInternalProgressSaving={true}
        />
      </div>
      <div className="ChatArea">
        <h4>Session Chat</h4>
        <div className="ChatMessages">
            {chatMessages.map((msg, i) => ( <div key={i} className={msg.s ? 'chat-system' : 'chat-message'}>{msg.s ? msg.t : <><strong>{msg.u}:</strong> {msg.t}</>}</div> ))}
        </div>
        <form onSubmit={handleChatSubmit} className="ChatInputForm">
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type message..." />
            <button type="submit" disabled={!socketConnected}>Send</button>
        </form>
      </div>
    </div>
  );
};
export default WatchTogetherPage;
