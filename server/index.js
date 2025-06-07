const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { URLSearchParams } = require('url');

const { getMediaInDirectories, getMediaFileDetails, scanDirectoryRecursive } = require('./mediaScanner');
const { sequelize, User, UserMediaProgress, MediaShare, initializeDatabase } = require('./models');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secret-and-complex-key-please-change';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

// --- Core Middlewares ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Media Directories & Upload Config ---
const APP_MEDIA_DIRECTORIES = [
    path.resolve(__dirname, 'media_library/videos'),
    path.resolve(__dirname, 'media_library/music'),
    path.resolve(__dirname, 'media_library/images'),
    path.resolve(__dirname, 'media_library/uploads'),
    path.resolve(__dirname, 'media_library/videos_vr')
];
// Ensure all media directories exist on startup
APP_MEDIA_DIRECTORIES.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[Server] Created media directory: ${dir}`);
    }
});
const UPLOAD_DIR = path.resolve(__dirname, 'media_library/uploads'); // Already in APP_MEDIA_DIRECTORIES

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, UPLOAD_DIR); },
    filename: function (req, file, cb) {
        try {
            const decodedFilename = Buffer.from(file.originalname, 'latin1').toString('utf8');
            cb(null, decodedFilename);
        } catch (e) {
            console.warn(`Filename decoding error for ${file.originalname}: ${e.message}, using original.`);
            cb(null, file.originalname);
        }
    }
});
const upload = multer({ storage: storage });

// --- Authentication Middlewares ---
const globalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1];
  if (token == null) return next();
  jwt.verify(token, JWT_SECRET, (err, userPayload) => {
    if (!err) req.user = userPayload;
    else console.log('JWT (optional auth) verification warning:', err.message);
    next();
  });
};
app.use(globalAuthenticateToken);

const requireAuth = (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    next();
};

// --- API Routes (Auth, User, Media, Share, etc.) ---
// (Full definitions from previous step are inserted here by the subtask execution framework)
app.post('/api/auth/register', async (req, res) => { const { username, password, email } = req.body; if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' }); if (email === '') delete req.body.email; try { const hashedPassword = await bcrypt.hash(password, 10); const newUser = await User.create({ username, password: hashedPassword, email: req.body.email }); res.status(201).json({ message: 'User registered successfully!', userId: newUser.id, username: newUser.username }); } catch (error) { console.error('Registration error:', error); if (error.name === 'SequelizeUniqueConstraintError' || error.name === 'SequelizeValidationError') { return res.status(400).json({ error: error.errors.map(e => e.message).join(', ') }); } res.status(500).json({ error: 'Server error during registration.' }); }});
app.post('/api/auth/login', async (req, res) => { const { username, password } = req.body; if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' }); try { const user = await User.findOne({ where: { username } }); if (!user || !await bcrypt.compare(password, user.password)) return res.status(401).json({ error: 'Invalid credentials.' }); const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }); res.json({ message: 'Login successful!', token, user: { id: user.id, username: user.username, email: user.email, preferredTheme: user.preferredTheme, defaultSortOption: user.defaultSortOption }}); } catch (error) { console.error("Login Error:", error); res.status(500).json({ error: 'Server error during login.' }); }});
app.get('/api/auth/profile', requireAuth, async (req, res) => { try { const userProfile = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } }); if (!userProfile) return res.status(404).json({ error: "User profile not found."}); res.json({ user: userProfile }); } catch (error) { console.error("Error fetching profile:", error); res.status(500).json({ error: "Error fetching user profile." }); }});
app.put('/api/user/preferences', requireAuth, async (req, res) => { const { preferredTheme, defaultSortOption } = req.body; try { const user = await User.findByPk(req.user.id); if (!user) return res.status(404).json({ error: 'User not found.' }); if (preferredTheme !== undefined) user.preferredTheme = preferredTheme; if (defaultSortOption !== undefined) user.defaultSortOption = defaultSortOption; await user.save(); const { password, ...userWithoutPassword } = user.get({ plain: true }); res.json({ message: 'Preferences updated successfully.', user: userWithoutPassword }); } catch (error) { console.error('Error updating preferences:', error); res.status(500).json({ error: 'Failed to update preferences.' });}});
app.post('/api/user/media/:mediaId((.*))/progress', requireAuth, async (req, res) => { const { mediaId } = req.params; const { progress, totalDuration } = req.body; if (progress === undefined || progress === null || isNaN(parseFloat(progress))) return res.status(400).json({ error: 'Valid progress required.' }); const decodedMediaId = decodeURIComponent(mediaId); try { const [entry, created] = await UserMediaProgress.findOrCreate({ where: { UserId: req.user.id, mediaId: decodedMediaId }, defaults: { progress:parseFloat(progress), totalDuration:totalDuration !== undefined && !isNaN(parseFloat(totalDuration)) ? parseFloat(totalDuration) : null, lastPlayedAt:new Date() }}); if (!created) { entry.progress = parseFloat(progress); if (totalDuration !== undefined && !isNaN(parseFloat(totalDuration))) entry.totalDuration = parseFloat(totalDuration); else if (totalDuration === null) entry.totalDuration = null; entry.lastPlayedAt = new Date(); await entry.save(); } res.status(200).json({ message: 'Progress saved.', mediaProgress: entry }); } catch (error) { console.error(`Error saving progress for ${decodedMediaId}:`, error); res.status(500).json({ error: 'Failed to save media progress.' });}});
app.get('/api/user/media/continue-watching', requireAuth, async (req, res) => { try { const entries = await UserMediaProgress.findAll({ where: { UserId: req.user.id, progress: { [Op.gt]: 0.1 } }, order: [['lastPlayedAt', 'DESC']], limit: 20 }); if (!entries.length) return res.json([]); const list = []; for (const entry of entries) { const details = await getMediaFileDetails(entry.mediaId, APP_MEDIA_DIRECTORIES); if (details) { const pct = entry.totalDuration && entry.totalDuration > 0 ? (entry.progress / entry.totalDuration) * 100 : 0; if (pct < 98) { details.userProgress = { progress:entry.progress, totalDuration:entry.totalDuration, lastPlayedAt:entry.lastPlayedAt, percentage:parseFloat(pct.toFixed(2)) }; list.push(details); } } } res.json(list); } catch (error) { console.error('Continue watching error:', error); res.status(500).json({ error: 'Failed to fetch list.' });}});
app.post('/api/media/:mediaId((.*))/share', requireAuth, async (req, res) => { const ownerUserId = req.user.id; const mediaId = decodeURIComponent(req.params.mediaId); const { sharedWithUsername } = req.body; if (!sharedWithUsername) return res.status(400).json({ error: 'sharedWithUsername is required.' }); try { const sharedWithUser = await User.findOne({ where: { username: sharedWithUsername } }); if (!sharedWithUser) return res.status(404).json({ error: `User '${sharedWithUsername}' not found.` }); if (sharedWithUser.id === ownerUserId) return res.status(400).json({ error: 'Cannot share media with yourself.' }); const [share, created] = await MediaShare.findOrCreate({ where: { mediaId: mediaId, OwnerUserId: ownerUserId, SharedWithUserId: sharedWithUser.id }, defaults: {}}); if (!created) return res.status(409).json({ message: 'Media already shared with this user.', share }); res.status(201).json({ message: 'Media shared successfully.', share }); } catch (error) { console.error('Error sharing media:', error); res.status(500).json({ error: 'Failed to share media.' }); }});
app.delete('/api/media/:mediaId((.*))/share', requireAuth, async (req, res) => { const ownerUserId = req.user.id; const mediaId = decodeURIComponent(req.params.mediaId); const { sharedWithUserId } = req.body; if (!sharedWithUserId) return res.status(400).json({ error: 'sharedWithUserId is required.' }); try { const result = await MediaShare.destroy({ where: { mediaId: mediaId, OwnerUserId: ownerUserId, SharedWithUserId: parseInt(sharedWithUserId) } }); if (result > 0) res.status(200).json({ message: 'Media unshared successfully.' }); else res.status(404).json({ error: 'Share record not found or not owned by you.' }); } catch (error) { console.error('Error unsharing media:', error); res.status(500).json({ error: 'Failed to unshare media.' }); }});
app.get('/api/media/shared-with-me', requireAuth, async (req, res) => { try { const shares = await MediaShare.findAll({ where: { SharedWithUserId: req.user.id }, include: [{ model: User, as: 'Owner', attributes: ['id', 'username'] }], order: [['sharedAt', 'DESC']] }); if (!shares.length) return res.json([]); const sharedMediaItems = []; for (const share of shares) { const mediaDetails = await getMediaFileDetails(share.mediaId, APP_MEDIA_DIRECTORIES); if (mediaDetails) { mediaDetails.sharedBy = share.Owner ? share.Owner.username : 'Unknown'; mediaDetails.sharedAt = share.sharedAt; const progress = await UserMediaProgress.findOne({ where: { UserId: req.user.id, mediaId: share.mediaId } }); if (progress) mediaDetails.userProgress = { progress:progress.progress, totalDuration:progress.totalDuration, lastPlayedAt:progress.lastPlayedAt, percentage:progress.totalDuration?(progress.progress/progress.totalDuration)*100:0 }; sharedMediaItems.push(mediaDetails); } } res.json(sharedMediaItems); } catch (error) { console.error('Error fetching shared-with-me list:', error); res.status(500).json({ error: 'Failed to fetch shared media.' }); }});
app.get('/api/media/shared-by-me', requireAuth, async (req, res) => { try { const shares = await MediaShare.findAll({ where: { OwnerUserId: req.user.id }, include: [{ model: User, as: 'SharedWithUser', attributes: ['id', 'username'] }], order: [['sharedAt', 'DESC']] }); if (!shares.length) return res.json([]); res.json(shares.map(s => ({ mediaId:s.mediaId, sharedWithUsername:s.SharedWithUser?.username, sharedWithUserId:s.SharedWithUserId, sharedAt:s.sharedAt }))); } catch (error) { console.error('Error fetching shared-by-me list:', error); res.status(500).json({ error: 'Failed to fetch media shared by you.' }); }});
app.get('/api/health', (req, res) => { res.json({ status: 'UP', message: 'Server is healthy' }); });
app.get('/api/media', async (req, res) => { try { let mediaFiles = await getMediaInDirectories(APP_MEDIA_DIRECTORIES); const { sortBy } = req.query; if (req.user && mediaFiles.length > 0) { const userProgressEntries = await UserMediaProgress.findAll({ where: { UserId: req.user.id } }); const progressMap = new Map(userProgressEntries.map(p => [p.mediaId, p])); mediaFiles = mediaFiles.map(mf => { const p = progressMap.get(mf.id); return p ? { ...mf, userProgress: {progress:p.progress,totalDuration:p.totalDuration,lastPlayedAt:p.lastPlayedAt,percentage:p.totalDuration?parseFloat(((p.progress/p.totalDuration)*100).toFixed(2)):0}} : mf; });} if (sortBy) { const [field, orderInput] = sortBy.split('_'); const order = orderInput === 'desc' ? -1 : 1; mediaFiles.sort((a, b) => { let valA, valB; if (field === 'recentlyPlayed') { valA = a.userProgress ? new Date(a.userProgress.lastPlayedAt).getTime() : 0; valB = b.userProgress ? new Date(b.userProgress.lastPlayedAt).getTime() : 0; if (valA === 0 && valB === 0) { valA = new Date(a.lastModified).getTime(); valB = new Date(b.lastModified).getTime(); }  else if (valA === 0) return order === -1 ? 1 : -1; else if (valB === 0) return order === -1 ? -1 : 1;} else { switch (field) { case 'title': valA = (a.metadata?.title||a.name||'').toLowerCase(); valB = (b.metadata?.title||b.name||'').toLowerCase(); break; case 'lastModified': valA = new Date(a.lastModified).getTime(); valB = new Date(b.lastModified).getTime(); break; case 'size': valA = a.size; valB = b.size; break; default: return 0; }} if (valA < valB) return -1 * order; if (valA > valB) return 1 * order; return 0; }); } res.json(mediaFiles); } catch (error) { console.error('Media list error:', error); res.status(500).json({ error: 'Failed to fetch media list' }); }});
app.get('/api/media/file/:filePath((.*))', async (req, res) => { const filePath = req.params.filePath; if (!filePath) return res.status(400).json({ error: 'File path is required' }); try { const mediaFile = await getMediaFileDetails(decodeURIComponent(filePath), APP_MEDIA_DIRECTORIES); if (mediaFile) { if(req.user && mediaFile.id) { const p = await UserMediaProgress.findOne({where:{ UserId: req.user.id, mediaId: mediaFile.id}}); if(p) mediaFile.userProgress = {progress:p.progress,totalDuration:p.totalDuration,lastPlayedAt:p.lastPlayedAt,percentage:p.totalDuration?parseFloat(((p.progress/p.totalDuration)*100).toFixed(2)):0};} res.json(mediaFile); } else res.status(404).json({ error: 'Media file not found' }); } catch (error) { console.error('Media detail error:', error); res.status(500).json({ error: 'Failed to fetch media details' }); }});
app.get('/api/stream/:filePath((.*))', async (req, res) => { const relativeFilePath = req.params.filePath; if (!relativeFilePath) return res.status(400).json({ error: 'File path is required' }); const decodedRelativeFilePath = decodeURIComponent(relativeFilePath); let fullFilePath = null, fileType = ''; for (const baseDir of APP_MEDIA_DIRECTORIES) { const tempPath = path.resolve(baseDir, decodedRelativeFilePath); if (tempPath.startsWith(baseDir) && fs.existsSync(tempPath) && fs.statSync(tempPath).isFile()) { fullFilePath = tempPath; const ext = path.extname(fullFilePath).toLowerCase(); if (['.mp4', '.mkv', '.webm', '.mov', '.avi'].includes(ext)) fileType = 'video/' + ext.substring(1); else if (['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'].includes(ext)) fileType = 'audio/' + (ext === '.mp3' ? 'mpeg' : (ext === '.m4a' ? 'mp4':ext.substring(1))); else if (['.jpg', '.jpeg'].includes(ext)) fileType = 'image/jpeg'; else if (['.png'].includes(ext)) fileType = 'image/png'; else if (['.gif'].includes(ext)) fileType = 'image/gif'; break; }} if (!fullFilePath) return res.status(404).send('File not found.'); if (!fileType && !['.m3u8', '.ts'].includes(path.extname(fullFilePath).toLowerCase())) fileType = 'application/octet-stream'; try { const stat = fs.statSync(fullFilePath); const fileSize = stat.size; if (fileSize === 0) { res.writeHead(200, { 'Content-Length': 0, 'Content-Type': fileType, 'Accept-Ranges': 'bytes' }); res.end(); return; } const range = req.headers.range; if (range) { const parts = range.replace(/bytes=/, "").split("-"); const start = parseInt(parts[0], 10); let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1; if (start >= fileSize) { res.status(416).send('Range not satisfiable'); return; } if (end >= fileSize) end = fileSize - 1; if (start > end) { res.status(416).send('Invalid range'); return; } const chunksize = (end - start) + 1; const file = fs.createReadStream(fullFilePath, {start, end}); res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${fileSize}`, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': fileType }); file.pipe(res); } else { res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': fileType }); fs.createReadStream(fullFilePath).pipe(res); }} catch (error) { console.error('Stream error:', error); if (!res.headersSent) res.status(500).send('Error streaming file.'); }});
app.post('/api/upload', requireAuth, upload.single('mediafile'), async (req, res) => { if (!req.file) return res.status(400).json({ error: 'No file uploaded.' }); const sanitizedFilename = req.file.filename; console.log(`User ${req.user.id} uploaded file: ${sanitizedFilename} to ${req.file.path}`); try { const mediaDetails = await getMediaFileDetails(sanitizedFilename, [UPLOAD_DIR]); if (mediaDetails) res.status(201).json({ message: 'File uploaded and processed!', fileDetails: mediaDetails }); else res.status(201).json({ message: 'File uploaded, metadata retrieval may require full scan or file type not supported by scanner.', filename: sanitizedFilename, path_on_disk: req.file.path, size: req.file.size }); } catch (error) { console.error("Error processing uploaded file metadata:", error); res.status(201).json({ message: 'File uploaded but error during metadata processing.', filename: sanitizedFilename, path_on_disk: req.file.path, processingError: error.message }); }});
app.get('/api/media/scan-external', requireAuth, async (req, res) => { const { directoryPath } = req.query; if (!directoryPath) return res.status(400).json({ error: 'directoryPath required' }); try { const requestedPath = path.resolve(directoryPath); if (directoryPath.includes('..')) return res.status(400).json({ error: 'Invalid path (traversal attempt detected)' }); if (!fs.existsSync(requestedPath) || !fs.statSync(requestedPath).isDirectory()) return res.status(404).json({ error: 'Not found or not a directory' }); const mediaFiles = await scanDirectoryRecursive(requestedPath, requestedPath); res.json(mediaFiles); } catch (error) { console.error('Scan-external error:', error); res.status(500).json({ error: error.message }); }});

// --- Serve Static Files from React App in Production ---
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.resolve(__dirname, '..', 'client', 'build');
  console.log(`[Server] Production mode: Attempting to serve static files from ${clientBuildPath}`);

  if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    // API routes are defined above this, so they take precedence.
    // This catchall is for client-side routing.
    app.get('*', (req, res) => {
      // Ensure API calls don't get index.html (though they should be matched earlier)
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.resolve(clientBuildPath, 'index.html'));
      } else {
        // If an /api/ call somehow reaches here, it's a 404 for the API
        res.status(404).json({ error: 'API endpoint not found.' });
      }
    });
  } else {
    console.error(`[Server] CRITICAL: Client build path not found at ${clientBuildPath}. Client will not be served.`);
  }
}

// --- WebSocket Server Setup ---
const wss = new WebSocket.Server({ server });
const rooms = new Map();
wss.on('connection', (ws, req) => {
  const requestUrl = new URL(req.url, `ws://${req.headers.host}`);
  const mediaId = decodeURIComponent(requestUrl.searchParams.get('mediaId') || '');
  const token = requestUrl.searchParams.get('token');
  ws.userId = null; ws.username = 'Anonymous';
  if (token) { try { const decoded = jwt.verify(token, JWT_SECRET); ws.userId = decoded.id; ws.username = decoded.username; } catch (err) { console.warn(`[WSS] Invalid token: ${err.message}`); }}
  console.log(`[WSS] Client ${ws.username} connected. Room: ${mediaId || 'None'}`);
  if (mediaId) {
    if (!rooms.has(mediaId)) rooms.set(mediaId, new Set()); const room = rooms.get(mediaId); room.add(ws); ws.currentRoom = mediaId;
    broadcastToRoom(mediaId, { type: 'userJoined', userId: ws.userId, username: ws.username, count: room.size }, null);
    if (room.lastKnownState) ws.send(JSON.stringify({ type: 'initialState', ...room.lastKnownState, fromUser: { username: 'server' } }));
  } else { ws.send(JSON.stringify({ type: 'error', message: 'mediaId query param required.' })); }
  ws.on('message', (messageBuffer) => { try { const parsedMessage = JSON.parse(messageBuffer.toString()); if (ws.currentRoom && parsedMessage.type) { const messageToSend = { ...parsedMessage, fromUser: { id: ws.userId, username: ws.username } }; const room = rooms.get(ws.currentRoom); if (room) { let stateChanged = false; if (room.lastKnownState === undefined) room.lastKnownState = {}; if (parsedMessage.type === 'play') { room.lastKnownState.status = 'playing'; stateChanged = true; } else if (parsedMessage.type === 'pause') { room.lastKnownState.status = 'paused'; stateChanged = true; } if (parsedMessage.currentTime !== undefined) { room.lastKnownState.currentTime = parsedMessage.currentTime; stateChanged = true; } if (parsedMessage.duration !== undefined) { room.lastKnownState.duration = parsedMessage.duration; stateChanged = true; } if(stateChanged) room.lastKnownState.lastEventAt = Date.now(); } broadcastToRoom(ws.currentRoom, messageToSend, ws);}} catch (e) { console.error('[WSS] Error processing message:', e); }});
  ws.on('close', () => { if (ws.currentRoom && rooms.has(ws.currentRoom)) { const room = rooms.get(ws.currentRoom); room.delete(ws); if (room.size === 0) { rooms.delete(ws.currentRoom); console.log(`[WSS] Room ${ws.currentRoom} empty, removed.`); } else { broadcastToRoom(ws.currentRoom, { type: 'userLeft', userId: ws.userId, username: ws.username, count: room.size }, null); } } console.log(`[WSS] Client ${ws.username} disconnected from ${ws.currentRoom || 'N/A'}`);});
  ws.on('error', (error) => console.error(`[WSS] Error on client ${ws.username}:`, error));
});
function broadcastToRoom(roomId, message, originatorWs) { if (rooms.has(roomId)) { const room = rooms.get(roomId); const messageString = JSON.stringify(message); for (const client of room) { if (client !== originatorWs && client.readyState === WebSocket.OPEN) { try { client.send(messageString); } catch (e) { console.error('[WSS] Error sending to client:', e); } } } }}
console.log('[WSS] WebSocket server configured.');

// --- Server Start ---
async function startServer() {
  await initializeDatabase();
  server.listen(port, () => {
    console.log(`[Server] HTTP and WebSocket Server listening on port ${port}`);
    if (process.env.NODE_ENV === 'production') {
        console.log('[Server] Application is running in PRODUCTION mode.');
    } else {
        console.log(`[Server] Application is running in DEVELOPMENT mode (NODE_ENV=${process.env.NODE_ENV}).`);
    }
    if (JWT_SECRET === 'your-very-secret-and-complex-key-please-change') {
        console.warn('[SECURITY] JWT_SECRET default value used. Set a strong secret in env vars for production!');
    }
  });
}

startServer();
