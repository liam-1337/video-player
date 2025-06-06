const fs = require('fs-extra');
const path = require('path');
// const mm = require('music-metadata'); // Changed to dynamic import

const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.webm'];
const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac'];
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];
const ALL_SUPPORTED_EXTENSIONS = [
  ...SUPPORTED_VIDEO_EXTENSIONS,
  ...SUPPORTED_AUDIO_EXTENSIONS,
  ...SUPPORTED_IMAGE_EXTENSIONS
];

// baseDir is the root directory that was initially scanned (e.g., /media_library/videos)
async function scanDirectoryRecursive(currentDirPath, baseDir) {
  try {
    const files = await fs.readdir(currentDirPath);
    let mediaFiles = [];

    for (const file of files) {
      const filePath = path.join(currentDirPath, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        mediaFiles.push(...await scanDirectoryRecursive(filePath, baseDir));
      } else {
        const ext = path.extname(file).toLowerCase();
        if (ALL_SUPPORTED_EXTENSIONS.includes(ext)) {
          let metadata = {};
          const type = getTypeFromExtension(ext);
          // Relative path from the initial baseDir
          const relativePath = path.relative(baseDir, filePath);


          try {
            if (type === 'video' || type === 'audio') {
                            const mm = await import('music-metadata');
              const parsedMetadata = await mm.parseFile(filePath, { duration: true });
              metadata.duration = parsedMetadata.format.duration;
              metadata.title = parsedMetadata.common.title || path.basename(file, ext); // Fallback title
              metadata.artist = parsedMetadata.common.artist;
              metadata.album = parsedMetadata.common.album;
              metadata.year = parsedMetadata.common.year;
              if (parsedMetadata.common.picture && parsedMetadata.common.picture.length > 0) {
                metadata.hasCoverArt = true;
              }
            } else if (type === 'image') {
              metadata.dimensions = null; // Placeholder
            }
          } catch (err) {
            console.warn(`Could not parse metadata for ${filePath}: ${err.message}`);
            metadata.error = 'Failed to parse metadata';
            if (!metadata.title) metadata.title = path.basename(file, ext); // Ensure title fallback
          }

          mediaFiles.push({
            id: Buffer.from(relativePath).toString('base64url'), // Create a somewhat stable ID
            name: file,
            path: relativePath, // Path relative to the specific media_library (e.g., videos/movie1.mp4)
            full_disk_path: filePath, // Full path on disk, for server-side access
            type: type,
            metadata: metadata,
            size: stat.size,
            lastModified: stat.mtime
          });
        }
      }
    }
    return mediaFiles;
  } catch (error) {
    // Log error but don't let one problematic directory stop others
    console.error(`Error scanning directory ${currentDirPath}:`, error);
    return []; // Return empty array on error for this path
  }
}


// This is the function that will be called by the API
async function getMediaInDirectories(baseDirs) {
  let allMedia = [];
  for (const baseDir of baseDirs) {
    const absoluteBaseDir = path.resolve(baseDir); // Ensure absolute path
    if (!await fs.pathExists(absoluteBaseDir) || !(await fs.stat(absoluteBaseDir)).isDirectory()) {
      console.warn(`Media directory not found or not a directory: ${absoluteBaseDir}`);
      continue;
    }
    // Pass absoluteBaseDir so relative paths are calculated correctly
    allMedia.push(...await scanDirectoryRecursive(absoluteBaseDir, absoluteBaseDir));
  }
  return allMedia;
}


function getTypeFromExtension(ext) {
  if (SUPPORTED_VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (SUPPORTED_AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) return 'image';
  return 'unknown';
}

// Function to get a single media file's details
async function getMediaFileDetails(filePath, baseDirs) {
  // filePath here is the relative path used as ID
  for (const baseDir of baseDirs) {
    const absoluteBaseDir = path.resolve(baseDir);
    // Construct the full path by joining the base directory with the relative file path
    const fullFilePath = path.resolve(absoluteBaseDir, filePath);

    // Security: Check that the resolved path is still within the intended base directory
    if (!fullFilePath.startsWith(absoluteBaseDir)) {
      console.warn(`Attempt to access file outside base directory: ${fullFilePath}`);
      continue; // Skip to next baseDir or return null if no match
    }

    if (await fs.pathExists(fullFilePath) && (await fs.stat(fullFilePath)).isFile()) {
      const ext = path.extname(fullFilePath).toLowerCase();
      let metadata = {};
      const type = getTypeFromExtension(ext);
      const stat = await fs.stat(fullFilePath);
      try {
        if (type === 'video' || type === 'audio') {
                    const mm = await import('music-metadata');
          const parsedMetadata = await mm.parseFile(fullFilePath, { duration: true });
          metadata.duration = parsedMetadata.format.duration;
          metadata.title = parsedMetadata.common.title || path.basename(fullFilePath, ext);
          metadata.artist = parsedMetadata.common.artist;
          metadata.album = parsedMetadata.common.album;
          metadata.year = parsedMetadata.common.year;
          if (parsedMetadata.common.picture && parsedMetadata.common.picture.length > 0) {
            metadata.hasCoverArt = true;
          }
        } else if (type === 'image') {
          metadata.dimensions = null;
        }
      } catch (err) {
        console.warn(`Could not parse metadata for ${fullFilePath}: ${err.message}`);
        metadata.error = 'Failed to parse metadata';
        if (!metadata.title) metadata.title = path.basename(fullFilePath, ext);
      }

      return {
        id: Buffer.from(filePath).toString('base64url'),
        name: path.basename(fullFilePath),
        path: filePath, // Relative path
        full_disk_path: fullFilePath,
        type: type,
        metadata: metadata,
        size: stat.size,
        lastModified: stat.mtime
      };
    }
  }
  return null; // Not found in any base directory
}


module.exports = { getMediaInDirectories, getMediaFileDetails, scanDirectoryRecursive }; // Expose scanDirectoryRecursive for the /scan endpoint
