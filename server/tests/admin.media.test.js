const request = require('supertest');
const app = require('../index');
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock the mediaScanner module
jest.mock('../mediaScanner', () => ({
  getMediaInDirectories: jest.fn(),
  getMediaFileDetails: jest.fn(),
  // scanDirectoryRecursive is also exported but not directly used by these routes
}));
// Import the mocked functions after jest.mock has been called
const { getMediaInDirectories, getMediaFileDetails } = require('../mediaScanner');


const JWT_SECRET = 'your-super-secret-jwt-key-for-dev'; // Consistent with app and other tests

const generateToken = (userId, isAdmin) => {
  return jwt.sign({ id: userId, isAdmin }, JWT_SECRET, { expiresIn: '1h' }); // Ensure id field
};

describe('Admin Media API (/api/admin/media)', () => {
  let adminUser, normalUser, adminToken, normalToken;

  beforeEach(async () => { // Changed from beforeAll
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    adminUser = await User.create({
      username: 'mediaAdminUser_' + Date.now(), // Unique username
      email: 'media_admin_' + Date.now() + '@example.com',
      password: hashedPassword,
      isAdmin: true,
    });
    adminToken = generateToken(adminUser.id, adminUser.isAdmin);

    normalUser = await User.create({
      username: 'mediaNormalUser_' + Date.now(), // Unique username
      email: 'media_user_' + Date.now() + '@example.com',
      password: hashedPassword,
      isAdmin: false,
    });
    normalToken = generateToken(normalUser.id, normalUser.isAdmin);

    // Clear all mock implementations and calls before each test (moved from separate beforeEach)
    jest.clearAllMocks();
  });

  // GET /api/admin/media (List Media)
  describe('GET /api/admin/media', () => {
    it('should list media for an admin', async () => {
      const mockMediaList = [{ id: '1', name: 'video.mp4', path: 'videos/video.mp4', type: 'video' }];
      getMediaInDirectories.mockResolvedValue(mockMediaList);

      const res = await request(app)
        .get('/api/admin/media')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockMediaList);
      expect(getMediaInDirectories).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for a non-admin', async () => {
      const res = await request(app)
        .get('/api/admin/media')
        .set('Authorization', `Bearer ${normalToken}`);
      expect(res.statusCode).toBe(403);
      expect(getMediaInDirectories).not.toHaveBeenCalled();
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app).get('/api/admin/media');
      expect(res.statusCode).toBe(401);
      expect(getMediaInDirectories).not.toHaveBeenCalled();
    });
  });

  // GET /api/admin/media/details/* (Get Media Details)
  describe('GET /api/admin/media/details/:filepath', () => {
    const testFilePath = 'videos/video.mp4';
    const encodedTestFilePath = encodeURIComponent(testFilePath);

    it('should get media details for an admin', async () => {
      const mockMediaDetail = { id: '1', name: 'video.mp4', path: testFilePath, type: 'video', size: 12345 };
      getMediaFileDetails.mockResolvedValue(mockMediaDetail);

      const res = await request(app)
        .get(`/api/admin/media/details/${encodedTestFilePath}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockMediaDetail);
      expect(getMediaFileDetails).toHaveBeenCalledWith(testFilePath, expect.any(Array));
    });

    it('should return 404 if media not found (admin)', async () => {
      getMediaFileDetails.mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/admin/media/details/${encodedTestFilePath}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
      expect(getMediaFileDetails).toHaveBeenCalledWith(testFilePath, expect.any(Array));
    });

    it('should return 400 if filepath is missing', async () => {
        const res = await request(app)
          .get(`/api/admin/media/details/`) // No filepath
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(400); // Based on server-side check
        expect(getMediaFileDetails).not.toHaveBeenCalled();
      });

    it('should return 403 for a non-admin', async () => {
      const res = await request(app)
        .get(`/api/admin/media/details/${encodedTestFilePath}`)
        .set('Authorization', `Bearer ${normalToken}`);
      expect(res.statusCode).toBe(403);
      expect(getMediaFileDetails).not.toHaveBeenCalled();
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app).get(`/api/admin/media/details/${encodedTestFilePath}`);
      expect(res.statusCode).toBe(401);
      expect(getMediaFileDetails).not.toHaveBeenCalled();
    });
  });

  // POST /api/admin/media/rescan (Rescan Media)
  describe('POST /api/admin/media/rescan', () => {
    it('should trigger rescan for an admin and return item count', async () => {
      const mockScannedMedia = [{ id: '1', name: 'new.mp4' }, { id: '2', name: 'another.flac' }];
      getMediaInDirectories.mockResolvedValue(mockScannedMedia);

      const res = await request(app)
        .post('/api/admin/media/rescan')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Media rescan initiated successfully.');
      expect(res.body.itemCount).toBe(mockScannedMedia.length);
      expect(getMediaInDirectories).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for a non-admin', async () => {
      const res = await request(app)
        .post('/api/admin/media/rescan')
        .set('Authorization', `Bearer ${normalToken}`);
      expect(res.statusCode).toBe(403);
      expect(getMediaInDirectories).not.toHaveBeenCalled();
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app).post('/api/admin/media/rescan');
      expect(res.statusCode).toBe(401);
      expect(getMediaInDirectories).not.toHaveBeenCalled();
    });
  });
});
