const request = require('supertest');
const app = require('../index');
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock fs.promises for log reading tests
jest.mock('fs', () => ({
  ...jest.requireActual('fs'), // Retain other fs parts
  promises: {
    readFile: jest.fn(),
    // stat: jest.fn(), // Mock other methods if server code uses them
  },
}));
const fsPromises = require('fs').promises; // Get the mocked version

const JWT_SECRET = 'your-super-secret-jwt-key-for-dev';

const generateToken = (userId, isAdmin) => {
  return jwt.sign({ userId, isAdmin }, JWT_SECRET, { expiresIn: '1h' });
};

describe('Admin System API (/api/admin/system & /api/admin/logs)', () => {
  let adminUser, normalUser, adminToken, normalToken;

  beforeAll(async () => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    adminUser = await User.create({
      username: 'systemAdminUser', // Unique username
      email: 'system_admin@example.com',
      password: hashedPassword,
      isAdmin: true,
    });
    adminToken = generateToken(adminUser.id, adminUser.isAdmin);

    normalUser = await User.create({
      username: 'systemNormalUser', // Unique username
      email: 'system_user@example.com',
      password: hashedPassword,
      isAdmin: false,
    });
    normalToken = generateToken(normalUser.id, normalUser.isAdmin);
  });

  beforeEach(() => {
    jest.clearAllMocks(); // Clear mock calls before each test
  });

  // GET /api/admin/system/status
  describe('GET /api/admin/system/status', () => {
    it('should get system status for an admin', async () => {
      const res = await request(app)
        .get('/api/admin/system/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('platform');
      expect(res.body).toHaveProperty('architecture');
      expect(res.body).toHaveProperty('nodeVersion');
      expect(res.body).toHaveProperty('totalMemory');
      expect(res.body).toHaveProperty('freeMemory');
      expect(res.body).toHaveProperty('cpuCount');
    });

    it('should return 403 for a non-admin', async () => {
      const res = await request(app)
        .get('/api/admin/system/status')
        .set('Authorization', `Bearer ${normalToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app).get('/api/admin/system/status');
      expect(res.statusCode).toBe(401);
    });
  });

  // GET /api/admin/logs/:logtype
  describe('GET /api/admin/logs/:logtype', () => {
    it('should get app logs for an admin', async () => {
      const mockLogData = 'app_line1\napp_line2\napp_line3';
      fsPromises.readFile.mockResolvedValue(mockLogData);

      const res = await request(app)
        .get('/api/admin/logs/app')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(fsPromises.readFile).toHaveBeenCalledWith(expect.stringContaining('server.log'), 'utf8');
      expect(res.body).toEqual(['app_line1', 'app_line2', 'app_line3']);
    });

    it('should get error logs for an admin', async () => {
      const mockLogData = 'error_line1\nerror_line2';
      fsPromises.readFile.mockResolvedValue(mockLogData);

      const res = await request(app)
        .get('/api/admin/logs/error')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(fsPromises.readFile).toHaveBeenCalledWith(expect.stringContaining('server.err'), 'utf8');
      expect(res.body).toEqual(['error_line1', 'error_line2']);
    });

    it('should return 404 if log file not found', async () => {
      const error = new Error("File not found");
      error.code = 'ENOENT'; // Simulate ENOENT error
      fsPromises.readFile.mockRejectedValue(error);

      const res = await request(app)
        .get('/api/admin/logs/app')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/Log file not found/);
    });

    it('should return 500 on other read errors', async () => {
      fsPromises.readFile.mockRejectedValue(new Error('Some other read error'));

      const res = await request(app)
        .get('/api/admin/logs/error')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toMatch(/Error reading log file/);
    });

    it('should return 400 for an invalid log type', async () => {
      const res = await request(app)
        .get('/api/admin/logs/invalidtype')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid log type specified. Use "app" or "error".');
      expect(fsPromises.readFile).not.toHaveBeenCalled();
    });

    it('should return 403 for a non-admin trying to access logs', async () => {
      const res = await request(app)
        .get('/api/admin/logs/app')
        .set('Authorization', `Bearer ${normalToken}`);
      expect(res.statusCode).toBe(403);
      expect(fsPromises.readFile).not.toHaveBeenCalled();
    });

    it('should return 401 if no token is provided when accessing logs', async () => {
      const res = await request(app).get('/api/admin/logs/app');
      expect(res.statusCode).toBe(401);
      expect(fsPromises.readFile).not.toHaveBeenCalled();
    });
  });
});
