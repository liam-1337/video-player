import axios from 'axios';


export const getMediaList = async () => {
  try {
    const response = await axios.get(`/api/media`); // Use relative path due to proxy
    return response.data;
  } catch (error) {
    console.error('Error fetching media list:', error);
    throw error;
  }
};

export const getMediaFileDetails = async (filePath) => {
  try {
    // File paths can contain special characters, so encode them
    const encodedFilePath = encodeURIComponent(filePath);
    const response = await axios.get(`/api/media/file/${encodedFilePath}`); // Use relative path
    return response.data;
  } catch (error) {
    console.error(`Error fetching media details for ${filePath}:`, error);
    throw error;
  }
};

// Function to construct the stream URL
export const getStreamUrl = (filePath) => {
  const encodedFilePath = encodeURIComponent(filePath);
  // For streaming, the proxy might be tricky with range requests or long-lived connections.
  // It's often more robust to use the full URL for media src attributes.
  // However, if the proxy is set up correctly and handles these well, /api/stream/... would work.
  // Let's try with relative first, assuming proxy handles it.
  return `/api/stream/${encodedFilePath}`;
};

// Function to construct URL for a static asset if backend serves them directly (e.g. cover art)
// This is a placeholder for now, as cover art is not directly served yet.
export const getStaticAssetUrl = (assetPath) => {
    const encodedAssetPath = encodeURIComponent(assetPath);
    return `/api/static/${encodedAssetPath}`; // Assuming a /static route might be added
}
