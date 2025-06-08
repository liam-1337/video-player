const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const os = require('os'); // Import os module
const fs = require('fs').promises; // Import fs.promises for async file operations
const path = require('path'); // Import path module
const { searchE621, searchRule34 } = require('./externalApiControllers');
const { User } = require('./models');
const { getMediaInDirectories, getMediaFileDetails } = require('./mediaScanner'); // Import mediaScanner functions

// In a production app, this secret should be stored in an environment variable
const JWT_SECRET = 'your-super-secret-jwt-key-for-dev';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/e621/search', searchE621);
app.get('/api/rule34/search', searchRule34);

// --- Auth Middleware ---
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: Missing or invalid token.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User not found.' });
    }

    req.user = user; // Attach user to request
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Unauthorized: Invalid or expired token.' });
    }
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Internal server error during authentication.' });
  }
};

// --- Admin Middleware ---
const isAdminMiddleware = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Admin access required.' });
  }
};

// --- Admin Routes ---
// Apply authMiddleware before isAdminMiddleware for the admin stats route
app.get('/api/admin/stats', authMiddleware, isAdminMiddleware, async (req, res) => {
  try {
    const userCount = await User.count();
    const mediaItems = await getMediaInDirectories(mediaBaseDirectories); // mediaBaseDirectories is defined below
    const mediaCount = mediaItems.length;
    res.json({ users: userCount, media: mediaCount });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Error fetching admin stats.' });
  }
});

// Get system status (Admin only)
app.get('/api/admin/system/status', authMiddleware, isAdminMiddleware, async (req, res) => {
  try {
    const status = {
      uptime: process.uptime(),
      platform: os.platform(),
      architecture: os.arch(),
      nodeVersion: process.version,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
    };
    res.json(status);
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({ message: 'Error fetching system status.' });
  }
});

// Get details for a specific media file (Admin only)
app.get('/api/admin/media/details/*', authMiddleware, isAdminMiddleware, async (req, res) => {
  try {
    const relativeFilePath = req.params[0];
    if (!relativeFilePath) {
      return res.status(400).json({ message: 'Bad Request: File path is required.' });
    }
    const details = await getMediaFileDetails(relativeFilePath, mediaBaseDirectories);
    if (details) {
      res.json(details);
    } else {
      res.status(404).json({ message: 'Media file not found or not accessible.' });
    }
  } catch (error) {
    console.error(`Error fetching media details for ${req.params[0]}:`, error);
    res.status(500).json({ message: 'Error fetching media details.' });
  }
});

// Trigger a rescan of media directories (Admin only)
app.post('/api/admin/media/rescan', authMiddleware, isAdminMiddleware, async (req, res) => {
  try {
    const mediaItems = await getMediaInDirectories(mediaBaseDirectories);
    res.json({ message: 'Media rescan initiated successfully.', itemCount: mediaItems.length });
  } catch (error) {
    console.error('Error during media rescan:', error);
    res.status(500).json({ message: 'Error during media rescan.' });
  }
});

// Define media directories (Consider making this configurable)
const mediaBaseDirectories = [
  'server/media_library/videos',
  'server/media_library/music',
  'server/media_library/images',
  'server/media_library/videos_vr'
];

// Get all media items (Admin only)
app.get('/api/admin/media', authMiddleware, isAdminMiddleware, async (req, res) => {
  try {
    const mediaItems = await getMediaInDirectories(mediaBaseDirectories);
    res.json(mediaItems);
  } catch (error) {
    console.error('Error scanning media directories:', error);
    res.status(500).json({ message: 'Error scanning media directories.' });
  }
});

// Get all users (Admin only)
app.get('/api/admin/users', authMiddleware, isAdminMiddleware, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'isAdmin', 'createdAt', 'updatedAt'], // Select specific attributes, excluding password
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ message: 'Error fetching users.' });
  }
});

// Get a specific user by ID (Admin only)
app.get('/api/admin/users/:userId', authMiddleware, isAdminMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'isAdmin', 'createdAt', 'updatedAt'], // Select specific attributes, excluding password
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    console.error(`Error fetching user with ID ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Error fetching user.' });
  }
});

// Update a user's isAdmin status (Admin only)
app.put('/api/admin/users/:userId', authMiddleware, isAdminMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;
    const { isAdmin } = req.body;

    if (typeof isAdmin !== 'boolean') {
      return res.status(400).json({ message: 'Bad Request: isAdmin field (boolean) is required.' });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.isAdmin = isAdmin;
    await user.save();

    const { password, ...updatedUserWithoutPassword } = user.get({ plain: true });
    res.json(updatedUserWithoutPassword);

  } catch (error) {
    console.error(`Error updating user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Error updating user.' });
  }
});

// Delete a user (Admin only)
app.delete('/api/admin/users/:userId', authMiddleware, isAdminMiddleware, async (req, res) => {
  try {
    const userIdToDelete = parseInt(req.params.userId, 10); // Ensure userId is an integer for comparison

    // Check if the admin is trying to delete themselves
    if (req.user.id === userIdToDelete) {
      return res.status(403).json({ message: 'Forbidden: Admins cannot delete themselves.' });
    }

    const user = await User.findByPk(userIdToDelete);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await user.destroy();
    res.status(200).json({ message: 'User deleted successfully.' }); // Or res.status(204).send();

  } catch (error) {
    console.error(`Error deleting user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Error deleting user.' });
  }
});

// Get server logs (Admin only)
app.get('/api/admin/logs/:logtype', authMiddleware, isAdminMiddleware, async (req, res) => {
  const { logtype } = req.params;
  let logFilePath;
  const numberOfLines = 100; // Number of lines to retrieve

  if (logtype === 'app') {
    logFilePath = path.join(__dirname, 'server.log');
  } else if (logtype === 'error') {
    logFilePath = path.join(__dirname, 'server.err');
  } else {
    return res.status(400).json({ message: 'Invalid log type specified. Use "app" or "error".' });
  }

  try {
    const data = await fs.readFile(logFilePath, 'utf8');
    const lines = data.split(/\r?\n/); // Split by newline, handling both \n and \r\n
    const lastLines = lines.slice(Math.max(lines.length - numberOfLines, 0));
    res.json(lastLines);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: `Log file not found: ${path.basename(logFilePath)}` });
    }
    console.error(`Error reading log file ${logtype}:`, error);
    res.status(500).json({ message: `Error reading log file: ${path.basename(logFilePath)}` });
  }
});

// module.parent is deprecated, use require.main
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
module.exports = app; // Export app for testing
