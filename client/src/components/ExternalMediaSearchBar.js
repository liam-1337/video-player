import React, { useState } from 'react';
import './ExternalMediaSearchBar.css';

const ExternalMediaSearchBar = ({ onSearch }) => {
  const [tags, setTags] = useState('');
  const [selectedApi, setSelectedApi] = useState('e621'); // Default to e621

  const handleSearch = () => {
    if (onSearch) {
      onSearch(tags, selectedApi);
    }
  };

  return (
    <div className="external-media-search-bar">
      <select
        value={selectedApi}
        onChange={(e) => setSelectedApi(e.target.value)}
        className="api-select"
      >
        <option value="e621">e621</option>
        <option value="rule34">Rule34</option>
      </select>
      <input
        type="text"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Enter tags..."
        className="tags-input"
      />
      <button onClick={handleSearch} className="search-button">
        Search
      </button>
    </div>
  );
};

export default ExternalMediaSearchBar;
