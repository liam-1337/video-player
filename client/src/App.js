import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate as useRouterNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { getMediaList, getStreamUrl, /*getUserProfile,*/ updateUserPreferences as serviceUpdateUserPreferences } from './services/mediaService';

import MediaGrid from './components/MediaGrid';
import MediaUpload from './components/MediaUpload';
import StandardMediaPlayer from './components/StandardMediaPlayer'; // Renamed
import VRPlayer from './components/VRPlayer'; // Import VRPlayer
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ContinueWatchingSection from './components/sections/ContinueWatchingSection';
import SharedWithMePage from './pages/SharedWithMePage';
import WatchTogetherPage from './pages/WatchTogetherPage';
import ExternalMediaSearchPage from './pages/ExternalMediaSearchPage'; // Import the new page

import 'plyr/dist/plyr.css';
import './App.css';

const getInitialTheme = (user) => { if (user && user.preferredTheme) return user.preferredTheme; if (typeof window !== 'undefined' && window.localStorage) { const t = localStorage.getItem('mediaHubTheme'); if (t) return t; if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'; } return 'light'; };
const getInitialSortOption = (user) => { if (user && user.defaultSortOption) return user.defaultSortOption; return 'lastModified_desc'; };

function ProtectedRoute({ children }) { const { isAuthenticated, loadingAuth } = useAuth(); let loc = useLocation(); if (loadingAuth) return <div className="App-Status App-Loading">Authenticating...</div>; if (!isAuthenticated) return <Navigate to="/login" state={{ from: loc }} replace />; return children; };

function AppContent() {
  const { isAuthenticated, currentUser, logout, updateUserPreferences: authUpdateUserPreferences, loadingAuth } = useAuth();
  const navigate = useRouterNavigate();

  const [mediaList, setMediaList] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [currentStandardMedia, setCurrentStandardMedia] = useState(null);
  const [showStandardPlayer, setShowStandardPlayer] = useState(false);
  const [currentVRMedia, setCurrentVRMedia] = useState(null);
  const [showVRPlayer, setShowVRPlayer] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(() => getInitialTheme(currentUser));
  const [sortOption, setSortOption] = useState(() => getInitialSortOption(currentUser));
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { if (currentUser) { setTheme(currentUser.preferredTheme || 'light'); setSortOption(currentUser.defaultSortOption || 'lastModified_desc'); } else { setTheme(getInitialTheme(null)); setSortOption(getInitialSortOption(null));} }, [currentUser]);
  useEffect(() => { if (typeof window !== 'undefined' && window.document?.body) { document.body.className = ''; document.body.classList.add(`theme-${theme}`); if (isAuthenticated) localStorage.setItem('mediaHubTheme', theme); else localStorage.removeItem('mediaHubTheme'); }}, [theme, isAuthenticated]);

  const handleThemeToggle = useCallback(async () => { const newTheme = theme === 'light' ? 'dark' : 'light'; setTheme(newTheme); if (isAuthenticated) { try { await authUpdateUserPreferences({ preferredTheme: newTheme }); } catch (err) { console.error("Failed to save theme pref", err); }}}, [theme, isAuthenticated, authUpdateUserPreferences]);

  const fetchMedia = useCallback(async () => { if (!isAuthenticated) { setMediaList([]); setLoadingMedia(false); return; } if (!loadingMedia && !isRefreshing) setIsRefreshing(true); setError(null); try { const data = await getMediaList(sortOption); setMediaList(data); } catch (err) { setError('Failed to load media list.'); console.error(err); if(err.response && (err.response.status === 401 || err.response.status === 403)){logout(); navigate('/login');} } finally { if (loadingMedia) setLoadingMedia(false); setIsRefreshing(false); }}, [sortOption, loadingMedia, isRefreshing, isAuthenticated, logout, navigate]);
  useEffect(() => { if(isAuthenticated) fetchMedia(); else { setMediaList([]); setLoadingMedia(false); } }, [refreshKey, fetchMedia, isAuthenticated]);

  const handlePlayMedia = (mediaItem) => {
    if (mediaItem.isVR && mediaItem.type === 'video') { // Ensure it's a video for VR player
      setCurrentVRMedia(mediaItem); setShowVRPlayer(true); setShowStandardPlayer(false);
    } else if (mediaItem.type === 'video' || mediaItem.type === 'audio') {
      setCurrentStandardMedia(mediaItem); setShowStandardPlayer(true); setShowVRPlayer(false);
    } else { console.log("Cannot play item of type:", mediaItem.type); }
  };
  const handleCloseStandardPlayer = () => { setShowStandardPlayer(false); setCurrentStandardMedia(null); setRefreshKey(k => k+1); };
  const handleCloseVRPlayer = () => { setShowVRPlayer(false); setCurrentVRMedia(null); /* No progress for VR yet */ };
  const handleUploadSuccess = useCallback(() => setRefreshKey(k => k + 1), []);
  const handleSortChange = useCallback(async (event) => { const newSortOption = event.target.value; setSortOption(newSortOption); if (isAuthenticated) { try { await authUpdateUserPreferences({ defaultSortOption: newSortOption }); } catch (err) { console.error("Failed to save sort pref", err); }}}, [isAuthenticated, authUpdateUserPreferences]);

  const filteredMediaList = useMemo(() => { if (!searchQuery) return mediaList; return mediaList.filter(item => { const q = searchQuery.toLowerCase(); const title = (item.metadata?.title || item.name || '').toLowerCase(); const artist = (item.metadata?.artist || '').toLowerCase(); const album = (item.metadata?.album || '').toLowerCase(); return title.includes(q) || artist.includes(q) || album.includes(q); });}, [mediaList, searchQuery]);

  let location = useLocation();
  if (loadingAuth) return <div className="App-Status App-Loading">Initializing Application...</div>;

  return (
    <div className="App">
      <header className="App-Header">
        <div className="App-Header-TopRow"> <Link to="/" className="App-Logo"><h1>My Media Hub</h1></Link> <div className="App-Header-UserControls"> {isAuthenticated && currentUser ? (
          <>
            <span className="UserInfo">Hi, {currentUser.username}!</span>
            <Link to="/shared-with-me" className="AuthBtn SmallBtn" title="Media shared with you">Shared</Link>
            <Link to="/search-external" className="AuthBtn SmallBtn" title="Search External Media">External Search</Link>
            <button onClick={() => { logout(); navigate('/login'); }} className="AuthBtn">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="AuthBtn">Login</Link>
            <Link to="/register" className="AuthBtn">Register</Link>
          </>
        )} <button onClick={handleThemeToggle} className="ThemeToggleBtn" aria-label="Toggle theme">{theme === 'light' ? '🌙' : '☀️'}</button> </div> </div>
        {isAuthenticated && (<> <div className="App-Controls"> <div className="App-SearchContainer"><input type="text" placeholder="Search..." className="App-SearchInput" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div> <div className="App-SortContainer"><label htmlFor="sortOptions">Sort: </label><select id="sortOptions" value={sortOption} onChange={handleSortChange} className="App-SortSelect"><option value="lastModified_desc">Date (Newest)</option><option value="lastModified_asc">Date (Oldest)</option><option value="title_asc">Title (A-Z)</option><option value="title_desc">Title (Z-A)</option><option value="size_asc">Size (Smallest)</option><option value="size_desc">Size (Largest)</option><option value="recentlyPlayed_desc">Recently Played</option></select></div></div> <MediaUpload onUploadSuccess={handleUploadSuccess} /> </>)}
        {isRefreshing && isAuthenticated && <div className="App-Status App-Refreshing">Refreshing...</div>}
        {error && !isRefreshing && isAuthenticated && <div className="App-Status App-Error-Inline">Error fetching media: {error}</div>}
        {location.pathname === '/login' && location.search.includes('registration=success') && !isAuthenticated && <p className="auth-success-msg">Registration successful! Please login.</p>}
      </header>
      <main className="App-MainContent">
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginForm />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <RegisterForm />} />
          <Route path="/shared-with-me" element={<ProtectedRoute><SharedWithMePage onPlayMedia={handlePlayMedia} /></ProtectedRoute>} />
          <Route path="/watch/:encodedMediaIdFromUrl/together" element={<ProtectedRoute><WatchTogetherPage /></ProtectedRoute>} />
          <Route path="/search-external" element={<ProtectedRoute><ExternalMediaSearchPage /></ProtectedRoute>} /> {/* New Route */}
          <Route path="/" element={ <ProtectedRoute> {loadingMedia && mediaList.length === 0 && !error ? <div className="App-Status App-Loading">Loading media...</div> : error && mediaList.length === 0 && !isRefreshing ? <div className="App-Status App-Error">Error: {error}</div> : (<> <ContinueWatchingSection onPlayMedia={handlePlayMedia} refreshKey={refreshKey} /> <MediaGrid mediaList={filteredMediaList} onPlayMedia={handlePlayMedia} /> </>)} </ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {showStandardPlayer && currentStandardMedia && ( <div className="MediaPlayerOverlay"> <div className="MediaPlayerContainer"> <button onClick={handleCloseStandardPlayer} className="MediaPlayer-CloseButton">&times;</button> <StandardMediaPlayer mediaItem={currentStandardMedia} sourceUrl={getStreamUrl(currentStandardMedia.path)} mediaType={currentStandardMedia.type} title={currentStandardMedia.metadata?.title || currentStandardMedia.name} /> </div> </div> )}
      {showVRPlayer && currentVRMedia && ( <div className="MediaPlayerOverlay VRPlayerOverlay"> <VRPlayer src={getStreamUrl(currentVRMedia.path)} title={currentVRMedia.metadata?.title || currentVRMedia.name} onClose={handleCloseVRPlayer} /> </div> )}
      <footer className="App-Footer"><p>Media Player App</p></footer>
    </div>);
}
function App() { return (<Router><AuthProvider><AppContent /></AuthProvider></Router>); }
export default App;
