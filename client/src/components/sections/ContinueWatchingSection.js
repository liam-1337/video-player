import React, { useState, useEffect, useCallback } from 'react';
import { getContinueWatchingList } from '../../services/mediaService';
import MediaItemCard from '../MediaItemCard';
import './ContinueWatchingSection.css';
import { useAuth } from '../../contexts/AuthContext';

const ContinueWatchingSection = ({ onPlayMedia, refreshKey }) => { // Added refreshKey prop
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  const fetchItems = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]); return;
    }
    setLoading(true); setError(null);
    try {
      const data = await getContinueWatchingList();
      setItems(data || []);
    } catch (err) {
      setError('Could not load continue watching list.'); console.error(err);
    } finally { setLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, refreshKey]); // Re-fetch if auth state or refreshKey changes

  if (!isAuthenticated || (items.length === 0 && !loading && !error)) {
    return null;
  }

  return (
    <div className="ContinueWatchingSection">
      <h3>Continue Watching</h3>
      {loading && <p className="CW-Status">Loading...</p>}
      {error && <p className="CW-Status CW-Error">{error}</p>}
      {!loading && !error && items.length === 0 && <p className="CW-Status">No items to continue watching.</p>}
      {!loading && !error && items.length > 0 && (
        <div className="ContinueWatchingGrid">
          {items.map(item => (
            <MediaItemCard
              key={item.id + '-continue'}
              mediaItem={item}
              onPlay={onPlayMedia}
              userProgress={item.userProgress}
            />
          ))}
        </div>
      )}
    </div>
  );
};
export default ContinueWatchingSection;
