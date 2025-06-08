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

User.hasMany(MediaShare, { as: 'OwnedShares', foreignKey: 'OwnerUserId' });
MediaShare.belongsTo(User, { as: 'Owner', foreignKey: 'OwnerUserId' });

User.hasMany(MediaShare, { as: 'ReceivedShares', foreignKey: 'SharedWithUserId' });
MediaShare.belongsTo(User, { as: 'SharedWithUser', foreignKey: 'SharedWithUserId' });

// --- Database Initialization ---
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('[DB] Connection established successfully.');
    const syncOptions = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') ? { alter: true } : {};
    await sequelize.sync(syncOptions);
    console.log('[DB] All models synchronized successfully.');
  } catch (error) {
    console.error('[DB] Unable to connect/sync database:', error);
    process.exit(1);
  }
}

module.exports = {
  sequelize, User, UserMediaProgress, MediaShare,
  initializeDatabase,
};
