import React, { useState, useEffect, useMemo } from 'react';
import { getMediaList, getStreamUrl } from './services/mediaService';
import MediaGrid from './components/MediaGrid';
import MediaPlayer from './components/MediaPlayer'; // Import the new player
import 'plyr-react/dist/plyr.css'; // Import Plyr's CSS globally here
import './App.css';

function App() {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMedia, setCurrentMedia] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        setLoading(true);
        const data = await getMediaList();
        setMediaList(data);
        setError(null);
      } catch (err) {
        setError('Failed to load media list. Make sure the backend server is running and accessible.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, []);

  const handlePlayMedia = (mediaItem) => {
    // Only attempt to play video or audio types
    if (mediaItem.type === 'video' || mediaItem.type === 'audio') {
      setCurrentMedia(mediaItem);
      setShowPlayer(true);
    } else {
      console.log("Cannot play media of type:", mediaItem.type);
      // Optionally, handle images differently (e.g., show in a lightbox)
    }
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
    setCurrentMedia(null);
  };

  const filteredMediaList = useMemo(() => {
    if (!searchQuery) {
      return mediaList;
    }
    return mediaList.filter(item => {
      const query = searchQuery.toLowerCase();
      const title = (item.metadata.title || item.name || '').toLowerCase();
      const artist = (item.metadata.artist || '').toLowerCase();
      const album = (item.metadata.album || '').toLowerCase();
      return title.includes(query) || artist.includes(query) || album.includes(query);
    });
  }, [mediaList, searchQuery]);

  if (loading) {
    return <div className="App-Status App-Loading">Loading media library...</div>;
  }

  if (error) {
    return <div className="App-Status App-Error">Error: {error}</div>;
  }

  return (
    <div className="App">
      <header className="App-Header">
        <h1>My Media Hub</h1>
        <div className="App-SearchContainer">
          <input
            type="text"
            placeholder="Search media by title, artist, album..."
            className="App-SearchInput"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <main className="App-MainContent">
        <MediaGrid mediaList={filteredMediaList} onPlayMedia={handlePlayMedia} />
      </main>

      {showPlayer && currentMedia && (
        <div className="MediaPlayerOverlay">
          <div className="MediaPlayerContainer">
            <button onClick={handleClosePlayer} className="MediaPlayer-CloseButton">&times;</button>
            <MediaPlayer
              key={currentMedia.id || currentMedia.path}
              sourceUrl={getStreamUrl(currentMedia.path)}
              mediaType={currentMedia.type}
              title={currentMedia.metadata.title || currentMedia.name}
              onPlayerClose={handleClosePlayer}
            />
          </div>
        </div>
      )}

      <footer className="App-Footer">
        <p>Media Player App &copy; 2023</p>
      </footer>
    </div>
  );
}

export default App;
