import React, { useState, useCallback } from 'react';
import ExternalMediaSearchBar from '../components/ExternalMediaSearchBar';
import ExternalMediaGrid from '../components/ExternalMediaGrid';
import { searchE621, searchRule34 } from '../services/mediaService';
import './ExternalMediaSearchPage.css';

const ExternalMediaSearchPage = () => {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = useCallback(async (tags, selectedApi) => {
    if (!tags || tags.trim() === '') {
      setError('Please enter tags to search.');
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      let data;
      if (selectedApi === 'e621') {
        data = await searchE621(tags);
      } else if (selectedApi === 'rule34') {
        data = await searchRule34(tags);
      } else {
        throw new Error('Invalid API selected');
      }
      setResults(data || []); // Ensure results is always an array
    } catch (err) {
      console.error(`Error searching ${selectedApi}:`, err);
      setError(err.message || `Failed to fetch results from ${selectedApi}.`);
      setResults([]); // Clear results on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="external-media-search-page">
      <h2>Search External Media</h2>
      <ExternalMediaSearchBar onSearch={handleSearch} />
      {error && <div className="error-message">{error}</div>}
      <ExternalMediaGrid mediaItems={results} isLoading={isLoading} />
    </div>
  );
};

export default ExternalMediaSearchPage;
