import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MediaItemCard from '../MediaItemCard';

describe('MediaItemCard', () => {
  const mockMediaItem = {
    id: '1',
    name: 'Test Video.mp4',
    type: 'video',
    metadata: {
      title: 'Test Video Title',
      artist: 'Test Artist',
      album: 'Test Album',
      duration: 120,
    },
  };

  const mockAudioItem = {
    id: '2',
    name: 'Test Audio.mp3',
    type: 'audio',
    metadata: {
      title: 'Test Audio Title',
    },
  };

  test('renders video item correctly', () => {
    render(<MediaItemCard mediaItem={mockMediaItem} onPlay={() => {}} />);
    expect(screen.getByText('Test Video Title')).toBeInTheDocument();
    expect(screen.getByText('Artist: Test Artist')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /video/i })).toBeInTheDocument();
  });

  test('renders audio item with minimal metadata correctly', () => {
    render(<MediaItemCard mediaItem={mockAudioItem} onPlay={() => {}} />);
    expect(screen.getByText('Test Audio Title')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /audio/i })).toBeInTheDocument();
    expect(screen.queryByText(/Artist:/)).toBeNull();
    expect(screen.queryByText(/Album:/)).toBeNull();
  });

  test('calls onPlay when clicked', () => {
    const handlePlay = jest.fn();
    render(<MediaItemCard mediaItem={mockMediaItem} onPlay={handlePlay} />);
    fireEvent.click(screen.getByTestId(`media-item-card-${mockMediaItem.id}`));
    expect(handlePlay).toHaveBeenCalledWith(mockMediaItem);
  });
});
