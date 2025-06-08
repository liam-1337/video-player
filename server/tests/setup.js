const { initializeDatabase, sequelize, User, UserMediaProgress, MediaShare } = require('../models'); // Ensure all models are imported if needed for comprehensive truncate

beforeAll(async () => {
  // It's crucial that NODE_ENV is set to 'test' for initializeDatabase
  // to use the test database. This should be handled by the test script in package.json.
  // console.log(`[Test Setup] Initializing test database with NODE_ENV: ${process.env.NODE_ENV}`);
  await initializeDatabase();
});

beforeEach(async () => {
  // Clear all data from all tables before each test
  // For SQLite, sequelize.truncate might not work as expected with cascade or restartIdentity.
  // A more robust way for SQLite is to delete from each table.
  // The order matters if there are foreign key constraints.
  // console.log("[Test Setup] Clearing all table data...");
  if (sequelize.getDialect() === 'sqlite') {
    // For SQLite, TRUNCATE is not directly supported in the same way.
    // Deleting from tables in reverse order of dependency or disabling foreign keys temporarily.
    await UserMediaProgress.destroy({ where: {}, force: true });
    await MediaShare.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    // If you have a way to reset sequences in SQLite (e.g., for auto-incrementing IDs), add it here.
    // For example, for `sqlite_sequence` table:
    // await sequelize.query("DELETE FROM sqlite_sequence WHERE name IN ('Users', 'UserMediaProgresses', 'MediaShares');");
  } else {
    // For PostgreSQL, MySQL, etc., truncate with cascade should work.
    await sequelize.truncate({ cascade: true, restartIdentity: true });
  }
  // console.log("[Test Setup] Table data cleared.");
});

afterAll(async () => {
  // console.log("[Test Setup] Closing database connection.");
  await sequelize.close();
  // console.log("[Test Setup] Database connection closed.");
});
