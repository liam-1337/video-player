const express = require('express');
const path = require('path');
const fs = require('fs'); // Added fs module
const { getMediaInDirectories, getMediaFileDetails, scanDirectoryRecursive } = require('./mediaScanner');

const app = express();
const port = process.env.PORT || 3001;

const MEDIA_DIRECTORIES = [
  path.resolve(__dirname, 'media_library/videos'),
  path.resolve(__dirname, 'media_library/music'),
  path.resolve(__dirname, 'media_library/images')
];
console.log('Resolved Media Directories:', MEDIA_DIRECTORIES);

app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', message: 'Server is healthy' });
});

app.get('/api/media', async (req, res) => {
  try {
    const mediaFiles = await getMediaInDirectories(MEDIA_DIRECTORIES);
    res.json(mediaFiles);
  } catch (error) {
    console.error('Error fetching media list:', error);
    res.status(500).json({ error: 'Failed to fetch media list', details: error.message });
  }
});

app.get('/api/media/file/:filePath', async (req, res) => {
  const filePath = req.params.filePath; // Changed back to req.params.filePath
  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' });
  }
  try {
    const decodedFilePath = decodeURIComponent(filePath);
    const mediaFile = await getMediaFileDetails(decodedFilePath, MEDIA_DIRECTORIES);
    if (mediaFile) {
      res.json(mediaFile);
    } else {
      res.status(404).json({ error: 'Media file not found' });
    }
  } catch (error) {
    console.error(`Error fetching media file ${filePath}:`, error);
    res.status(500).json({ error: 'Failed to fetch media file details', details: error.message });
  }
});

// Streaming Endpoint
app.get('/api/stream/:filePath', async (req, res) => {
  const relativeFilePath = req.params.filePath; // Changed back to req.params.filePath
  if (!relativeFilePath) {
    return res.status(400).json({ error: 'File path is required for streaming.' });
  }

  const decodedRelativeFilePath = decodeURIComponent(relativeFilePath);
  let fullFilePath = null;
  let fileType = '';

  // Find the actual file path on disk
  // This logic is simplified; ideally, getMediaFileDetails would be reused or a dedicated function.
  for (const baseDir of MEDIA_DIRECTORIES) {
    const tempPath = path.resolve(baseDir, decodedRelativeFilePath);
    if (tempPath.startsWith(baseDir) && fs.existsSync(tempPath) && fs.statSync(tempPath).isFile()) {
      fullFilePath = tempPath;
      const ext = path.extname(fullFilePath).toLowerCase();
      if (['.mp4', '.mkv', '.webm'].includes(ext)) fileType = 'video/' + ext.substring(1);
      else if (['.mp3', '.wav', '.ogg', '.flac'].includes(ext)) fileType = 'audio/' + (ext === '.mp3' ? 'mpeg' : ext.substring(1));
      // Add more image types if needed for streaming (though typically not streamed with range requests)
      else if (['.jpg', '.jpeg'].includes(ext)) fileType = 'image/jpeg';
      else if (['.png'].includes(ext)) fileType = 'image/png';
      break;
    }
  }

  if (!fullFilePath) {
    return res.status(404).send('File not found or access denied.');
  }
  if (!fileType) {
    return res.status(400).send('Unsupported file type for streaming.');
  }

  try {
    const stat = fs.statSync(fullFilePath);
    const fileSize = stat.size;

    // If the file is empty, always return 200 OK with Content-Length: 0
    if (fileSize === 0) {
      res.writeHead(200, {
        'Content-Length': 0,
        'Content-Type': fileType,
        'Accept-Ranges': 'bytes' // Still indicate range support generally
      });
      res.end();
      return;
    }

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
        return;
      }
      if (end >= fileSize) { // Ensure end is within bounds
        end = fileSize - 1;
      }

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(fullFilePath, {start, end});
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': fileType,
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': fileType,
      };
      res.writeHead(200, head);
      fs.createReadStream(fullFilePath).pipe(res);
    }
  } catch (error) {
    console.error(`Error streaming file ${decodedRelativeFilePath}:`, error);
    // Check if headers already sent
    if (!res.headersSent) {
      res.status(500).send('Error streaming file.');
    } else {
      // If headers sent, an error during streaming likely means the client connection was lost
      // or the stream was prematurely closed. We can't send a new status code here.
      console.error('Headers already sent, could not send 500 for streaming error.');
    }
  }
});


app.get('/api/media/scan-external', async (req, res) => {
  const { directoryPath } = req.query;
  if (!directoryPath) {
    return res.status(400).json({ error: 'directoryPath query parameter is required' });
  }
  try {
    const requestedPath = path.resolve(directoryPath);
    if (requestedPath.includes('..')) {
      return res.status(400).json({ error: 'Invalid directory path (traversal attempt detected)' });
    }
    if (! (await fs.pathExists(requestedPath)) || !(await fs.stat(requestedPath)).isDirectory() ){
      return res.status(404).json({ error: 'Directory not found or is not a directory' });
    }
    const mediaFiles = await scanDirectoryRecursive(requestedPath, requestedPath);
    res.json(mediaFiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Serving media from: ${MEDIA_DIRECTORIES.join(', ')}`);
});
