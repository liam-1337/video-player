const fs = require('fs-extra');
const path = require('path');
// const mm = require('music-metadata'); // Using dynamic import below

const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.webm', '.mov'];
const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'];
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];
const ALL_SUPPORTED_EXTENSIONS = [
    ...SUPPORTED_VIDEO_EXTENSIONS,
    ...SUPPORTED_AUDIO_EXTENSIONS,
    ...SUPPORTED_IMAGE_EXTENSIONS
];

const VR_FILENAME_TAGS = ['_vr', '_360', '_180', 'vr180', '360video', 'gear360', 'insta360'];

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
                    const relativePath = path.relative(baseDir, filePath);
                    const fileBasename = path.basename(file, ext); // Keep original case for title fallback
                    const fileBasenameLower = fileBasename.toLowerCase();

                    let isVR = false;
                    if (type === 'video') {
                        for (const tag of VR_FILENAME_TAGS) {
                            if (fileBasenameLower.includes(tag)) {
                                isVR = true;
                                break;
                            }
                        }
                    }

                    try {
                        if (type === 'video' || type === 'audio') {
                            const mm = await import('music-metadata'); // Dynamic import
                            const parsedMetadata = await mm.parseFile(filePath, { duration: true });
                            metadata.duration = parsedMetadata.format.duration;
                            metadata.title = parsedMetadata.common.title || fileBasename; // Use original case basename
                            metadata.artist = parsedMetadata.common.artist;
                            metadata.album = parsedMetadata.common.album;
                            metadata.year = parsedMetadata.common.year;
                            if (parsedMetadata.common.picture && parsedMetadata.common.picture.length > 0) {
                                metadata.hasCoverArt = true;
                            }
                        }
                    } catch (err) {
                        console.warn(`Metadata parse error for ${filePath}: ${err.message}`);
                        metadata.error = 'Failed to parse metadata';
                        if (!metadata.title) metadata.title = fileBasename; // Fallback
                    }

                    mediaFiles.push({
                        id: Buffer.from(relativePath).toString('base64url'),
                        name: file, // Original filename with extension
                        path: relativePath,
                        full_disk_path: filePath,
                        type: type,
                        isVR: isVR, // Add isVR flag
                        metadata: metadata,
                        size: stat.size,
                        lastModified: stat.mtime
                    });
                }
            }
        }
        return mediaFiles;
    } catch (error) {
        console.error(`Error scanning directory ${currentDirPath}:`, error);
        return [];
    }
}

async function getMediaInDirectories(baseDirs) {
    let allMedia = [];
    for (const baseDir of baseDirs) {
        const absoluteBaseDir = path.resolve(baseDir);
         if (!await fs.pathExists(absoluteBaseDir) || !(await fs.stat(absoluteBaseDir)).isDirectory()) {
            console.warn(`Media dir not found: ${absoluteBaseDir}`);
            continue;
        }
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

async function getMediaFileDetails(relativeFilePath, baseDirs) {
    for (const baseDir of baseDirs) {
        const absoluteBaseDir = path.resolve(baseDir);
        const fullFilePath = path.resolve(absoluteBaseDir, relativeFilePath);

        if (!fullFilePath.startsWith(absoluteBaseDir)) continue;

        if (await fs.pathExists(fullFilePath) && (await fs.stat(fullFilePath)).isFile()) {
            const stat = await fs.stat(fullFilePath);
            const originalFilenameWithExt = path.basename(fullFilePath);
            const ext = path.extname(fullFilePath).toLowerCase();
            const type = getTypeFromExtension(ext);
            const fileBasename = path.basename(fullFilePath, ext); // Original case
            const fileBasenameLower = fileBasename.toLowerCase();
            let metadata = {};
            let isVR = false;

            if (type === 'video') {
                for (const tag of VR_FILENAME_TAGS) {
                    if (fileBasenameLower.includes(tag)) { isVR = true; break; }
                }
            }

            try {
                if (type === 'video' || type === 'audio') {
                    const mm = await import('music-metadata'); // Dynamic import
                    const parsedMetadata = await mm.parseFile(fullFilePath, { duration: true });
                    metadata.duration = parsedMetadata.format.duration;
                    metadata.title = parsedMetadata.common.title || fileBasename;
                    metadata.artist = parsedMetadata.common.artist;
                    metadata.album = parsedMetadata.common.album;
                    metadata.year = parsedMetadata.common.year;
                    if (parsedMetadata.common.picture && parsedMetadata.common.picture.length > 0) {
                        metadata.hasCoverArt = true;
                    }
                }
            } catch (err) {
                console.warn(`Metadata parse error for ${fullFilePath}: ${err.message}`);
                metadata.error = 'Failed to parse metadata';
                if (!metadata.title) metadata.title = fileBasename;
            }

            return {
                id: Buffer.from(relativeFilePath).toString('base64url'),
                name: originalFilenameWithExt,
                path: relativeFilePath,
                full_disk_path: fullFilePath,
                type: type,
                isVR: isVR,
                metadata: metadata,
                size: stat.size,
                lastModified: stat.mtime
            };
        }
    }
    return null;
}

module.exports = { getMediaInDirectories, getMediaFileDetails, scanDirectoryRecursive };
