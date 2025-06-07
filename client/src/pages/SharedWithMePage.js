import React, { useState, useEffect, useCallback } from 'react';
import { getSharedWithMeList } from '../../services/mediaService';
import MediaGrid from '../components/MediaGrid';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const SharedWithMePage = ({ onPlayMedia }) => {
  const [sharedItems, setSharedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const fetchSharedItems = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/login'); return;
    }
    setLoading(true); setError(null);
    try {
      const data = await getSharedWithMeList();
      setSharedItems(data || []);
    } catch (err) {
      setError('Failed to load shared items.'); console.error(err);
    } finally { setLoading(false); }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    fetchSharedItems();
  }, [fetchSharedItems]);

  if (loading) return <div className="App-Status App-Loading">Loading shared media...</div>;
  if (error) return <div className="App-Status App-Error">{error}</div>;

  return (
    <div className="SharedWithMePage PageContent">
      <h2>Shared With Me</h2>
      {sharedItems.length === 0 ? (
        <p>No media has been shared with you yet.</p>
      ) : (
        <MediaGrid mediaList={sharedItems} onPlayMedia={onPlayMedia} />
      )}
    </div>
  );
};
export default SharedWithMePage;
