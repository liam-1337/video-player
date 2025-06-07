const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path =require('path');
const { searchE621, searchRule34 } = require('./externalApiControllers');
const { getMediaInDirectories, getMediaFileDetails } = require('./mediaScanner'); // Import scanner and details function

const app = express();
const port = process.env.PORT || 3001;

// Paths from environment variables passed by Electron main process
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
const mediaLibraryPath = process.env.MEDIA_LIBRARY_PATH || path.join(__dirname, 'media_library');

// Ensure media library directory exists
if (!fs.existsSync(mediaLibraryPath)){
    fs.mkdirSync(mediaLibraryPath, { recursive: true });
    console.log(`Created media library directory at ${mediaLibraryPath}`);
} else {
    console.log(`Media library directory already exists at ${mediaLibraryPath}`);
}

// Setup SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log(`Connected to SQLite database at ${dbPath}`);
    db.serialize(() => {
      // Create a table if it doesn't exist
      db.run("CREATE TABLE IF NOT EXISTS media_files (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, path TEXT UNIQUE, type TEXT, is_vr BOOLEAN, duration REAL, title TEXT, artist TEXT, album TEXT, year INTEGER, size INTEGER, last_modified TEXT, has_cover_art BOOLEAN)", (err) => {
        if (err) {
          console.error('Error creating media_files table', err.message);
        } else {
          // Scan media library and populate database after table is ensured
          console.log('Scanning media library...');
          getMediaInDirectories([mediaLibraryPath])
            .then(mediaItems => {
              console.log(`Found ${mediaItems.length} media items.`);
              const stmt = db.prepare("INSERT OR IGNORE INTO media_files (name, path, type, is_vr, duration, title, artist, album, year, size, last_modified, has_cover_art) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
              mediaItems.forEach(item => {
                stmt.run(
                  item.name,
                  item.path,
                  item.type,
                  item.isVR,
                  item.metadata?.duration,
                  item.metadata?.title || path.basename(item.name, path.extname(item.name)), // Fallback title
                  item.metadata?.artist,
                  item.metadata?.album,
                  item.metadata?.year,
                  item.size,
                  item.lastModified?.toISOString(),
                  item.metadata?.hasCoverArt || false
                );
              });
              stmt.finalize(err => {
                if (err) console.error("Error inserting media items:", err.message);
                else console.log("Media library scan and database population complete.");
              });
            })
            .catch(scanError => {
              console.error("Error scanning media library:", scanError);
            });
        }
      });
    });
  }
});

// Endpoint for streaming media
app.get('/api/stream/:filePath', async (req, res) => {
  try {
    const encodedPath = req.params.filePath;
    const decodedPath = decodeURIComponent(encodedPath);
    // Construct full path. Ensure it's within the mediaLibraryPath for security.
    const fullFilePath = path.resolve(mediaLibraryPath, decodedPath);

    if (!fullFilePath.startsWith(path.resolve(mediaLibraryPath))) {
      return res.status(403).send('Forbidden: Access denied.');
    }

    if (!fs.existsSync(fullFilePath)) {
      return res.status(404).send('File not found.');
    }

    const stat = fs.statSync(fullFilePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(fullFilePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'application/octet-stream', // Generic, or determine from file ext
      };
      // Determine Content-Type based on extension
      const ext = path.extname(decodedPath).toLowerCase();
      if (ext === '.mp4') head['Content-Type'] = 'video/mp4';
      else if (ext === '.mkv') head['Content-Type'] = 'video/x-matroska';
      else if (ext === '.webm') head['Content-Type'] = 'video/webm';
      else if (ext === '.mp3') head['Content-Type'] = 'audio/mpeg';
      else if (ext === '.flac') head['Content-Type'] = 'audio/flac';
      // Add more types as needed

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'application/octet-stream', // Generic, or determine from file ext
      };
      const ext = path.extname(decodedPath).toLowerCase();
      if (ext === '.mp4') head['Content-Type'] = 'video/mp4';
      else if (ext === '.mkv') head['Content-Type'] = 'video/x-matroska';
      // Add more types

      res.writeHead(200, head);
      fs.createReadStream(fullFilePath).pipe(res);
    }
  } catch (error) {
    console.error('Error streaming media:', error);
    // Avoid sending detailed error messages to client for security
    if (!res.headersSent) {
        res.status(500).send('Error streaming media.');
    } else {
        // If headers already sent, we might only be able to end the response
        res.end();
    }
  }
});

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).send({ status: 'UP', message: 'Server is healthy.' });
});

// Endpoint to list media files
app.get('/api/media', (req, res) => {
  db.all("SELECT id, name, path, type, is_vr, duration, title, artist, album, year, size, last_modified, has_cover_art FROM media_files ORDER BY title ASC", [], (err, rows) => {
    if (err) {
      res.status(500).send({ error: err.message });
      return;
    }
    // Map has_cover_art to boolean for client
    const results = rows.map(row => ({...row, has_cover_art: !!row.has_cover_art, is_vr: !!row.is_vr }));
    res.send(results);
  });
});

// Endpoint for single media file details
app.get('/api/media/file/:filePath', async (req, res) => {
  try {
    const encodedPath = req.params.filePath;
    const decodedPath = decodeURIComponent(encodedPath);
    // The mediaScanner.getMediaFileDetails expects an array of base directories.
    // For simplicity, we'll use the same mediaLibraryPath as used for scanning.
    // In a multi-library setup, this might need adjustment.
    const details = await getMediaFileDetails(decodedPath, [mediaLibraryPath]);
    if (details) {
      res.json(details);
    } else {
      res.status(404).send('Media file not found or not accessible.');
    }
  } catch (error) {
    console.error('Error getting media file details:', error);
    res.status(500).send('Error getting media file details.');
  }
});

// CORS and JSON middleware should be before routes
app.use(cors());
app.use(express.json());

app.get('/api/e621/search', searchE621);
app.get('/api/rule34/search', searchRule34);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Database path: ${dbPath}`);
  console.log(`Media library path: ${mediaLibraryPath}`);
});
