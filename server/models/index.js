const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const dbPath = process.env.NODE_ENV === 'test'
  ? path.join(__dirname, '../database/test_database.sqlite')
  : path.join(__dirname, '../database/database.sqlite');

console.log(`[DB] Using database at: ${dbPath}`);

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false, // Changed to 'development' for logging
});

// --- User Model ---
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  username: { type: DataTypes.STRING, allowNull: false, unique: { name: 'unique_username', msg: 'Username already exists.'} },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: { name: 'unique_email', msg: 'Email already registered.'},
    validate: { isEmail: { msg: "Invalid email format." } }
  },
  password: { type: DataTypes.STRING, allowNull: false },
  preferredTheme: { type: DataTypes.STRING, allowNull: true, defaultValue: 'light' },
  defaultSortOption: { type: DataTypes.STRING, allowNull: true, defaultValue: 'lastModified_desc' },
  isAdmin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { timestamps: true });

// --- UserMediaProgress Model ---
const UserMediaProgress = sequelize.define('UserMediaProgress', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  mediaId: { type: DataTypes.STRING, allowNull: false },
  progress: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  totalDuration: { type: DataTypes.FLOAT, allowNull: true },
  lastPlayedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  timestamps: true,
  indexes: [ { unique: true, fields: ['UserId', 'mediaId'] } ]
});

// --- MediaShare Model ---
const MediaShare = sequelize.define('MediaShare', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    mediaId: { type: DataTypes.STRING, allowNull: false },
    sharedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    // OwnerUserId and SharedWithUserId are added via associations
}, {
    timestamps: true,
    indexes: [
        { unique: true, fields: ['mediaId', 'OwnerUserId', 'SharedWithUserId'], name: 'unique_media_share' }
    ]
});

// --- Associations ---
User.hasMany(UserMediaProgress, { foreignKey: 'UserId' });
UserMediaProgress.belongsTo(User, { foreignKey: 'UserId' });

let isSynced = false; // Flag to ensure sync runs only once in test env

User.hasMany(MediaShare, { as: 'OwnedShares', foreignKey: 'OwnerUserId' });
MediaShare.belongsTo(User, { as: 'Owner', foreignKey: 'OwnerUserId' });

User.hasMany(MediaShare, { as: 'ReceivedShares', foreignKey: 'SharedWithUserId' });
MediaShare.belongsTo(User, { as: 'SharedWithUser', foreignKey: 'SharedWithUserId' });

// --- Database Initialization ---
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('[DB] Connection established successfully.');

    if (isSynced && process.env.NODE_ENV === 'test') {
      console.log('[DB] Models already synchronized (test environment).');
      return;
    }

    const syncOptions = (process.env.NODE_ENV === 'test') ? {} : (process.env.NODE_ENV === 'development' ? { alter: true } : {}); // Simpler sync for test
    try {
      await sequelize.sync(syncOptions);
      console.log('[DB] All models synchronized successfully.');
      isSynced = true; // Set flag after successful sync
    } catch (syncError) {
      console.error('[DB] Error during sequelize.sync():', syncError.message);
      if (syncError.original) {
        console.error('[DB] Original sync error:', syncError.original);
      }
      process.exit(1); // Exit if sync fails
    }
  } catch (error) {
    console.error('[DB] Unable to connect/sync database:', error);
    console.error('[DB] Error during sequelize.authenticate():', error.message);
    if (error.original) {
      console.error('[DB] Original error:', error.original);
    }
    process.exit(1);
  }
}

module.exports = {
  sequelize, User, UserMediaProgress, MediaShare,
  initializeDatabase,
};
