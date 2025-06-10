const request = require('supertest');
const app = require('../index'); // Ensure this path is correct
const { User } = require('../models'); // Ensure this path is correct
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Use the same JWT_SECRET as in your main app. For testing, it's often kept simple.
// IMPORTANT: In a real app, this should come from environment variables and be consistent.
const JWT_SECRET = 'your-super-secret-jwt-key-for-dev';

const generateToken = (userId, isAdmin) => {
  return jwt.sign({ id: userId, isAdmin }, JWT_SECRET, { expiresIn: '1h' }); // Ensure id field
};

describe('Admin User Management API (/api/admin/users)', () => {
  let adminUser, normalUser, adminToken, normalToken, createdNormalUserId;

  beforeEach(async () => { // Changed from beforeAll to beforeEach
    // Create users for testing
    // Hash passwords as your User model / auth system likely expects hashed passwords
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Ensure unique usernames if tests run in parallel or if DB is not perfectly clean
    // For simplicity here, appending a timestamp or using a sequence might be needed for true isolation
    // However, the global beforeEach in setup.js should handle cleaning.
    adminUser = await User.create({
      username: 'testAdminUser_' + Date.now(), // Make username unique for each test run
      email: 'admin_' + Date.now() + '@example.com',
      password: hashedPassword,
      isAdmin: true,
    });
    adminToken = generateToken(adminUser.id, adminUser.isAdmin);

    normalUser = await User.create({
      username: 'testNormalUser_' + Date.now(), // Make username unique
      email: 'user_' + Date.now() + '@example.com',
      password: hashedPassword,
      isAdmin: false,
    });
    normalToken = generateToken(normalUser.id, normalUser.isAdmin);
    createdNormalUserId = normalUser.id; // Store ID for later use
  });

  // GET /api/admin/users (List Users)
  describe('GET /api/admin/users', () => {
    it('should list all users for an admin', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      if (res.statusCode === 401) {
        console.log('DEBUG 401 Response Body:', res.body); // Log 401 body
      }
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2); // adminUser and normalUser
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).not.toHaveProperty('password');
    });

    it('should return 403 for a non-admin', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${normalToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app).get('/api/admin/users');
      expect(res.statusCode).toBe(401);
    });
  });

  // GET /api/admin/users/:userId (Get Single User)
  describe('GET /api/admin/users/:userId', () => {
    it('should get a specific user for an admin', async () => {
      const res = await request(app)
        .get(`/api/admin/users/${createdNormalUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(createdNormalUserId);
      expect(res.body.username).toBe(normalUser.username); // Use dynamic username
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return 404 if user not found (admin)', async () => {
      const nonExistentUserId = 99999;
      const res = await request(app)
        .get(`/api/admin/users/${nonExistentUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(404);
    });

    it('should return 403 for a non-admin trying to access a user', async () => {
      const res = await request(app)
        .get(`/api/admin/users/${adminUser.id}`) // Trying to access admin user's details
        .set('Authorization', `Bearer ${normalToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app).get(`/api/admin/users/${createdNormalUserId}`);
      expect(res.statusCode).toBe(401);
    });
  });

  // PUT /api/admin/users/:userId (Update User Admin Status)
  describe('PUT /api/admin/users/:userId', () => {
    it('should allow admin to promote a user to admin', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${createdNormalUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isAdmin: true });
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(createdNormalUserId);
      expect(res.body.isAdmin).toBe(true);

      // Verify in DB
      const updatedUser = await User.findByPk(createdNormalUserId);
      expect(updatedUser.isAdmin).toBe(true);
    });

    it('should allow admin to demote a user from admin', async () => {
      // First, ensure the user is an admin (from previous test or set it)
      await User.update({ isAdmin: true }, { where: { id: createdNormalUserId } });

      const res = await request(app)
        .put(`/api/admin/users/${createdNormalUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isAdmin: false });
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(createdNormalUserId);
      expect(res.body.isAdmin).toBe(false);

      const updatedUser = await User.findByPk(createdNormalUserId);
      expect(updatedUser.isAdmin).toBe(false);
    });

    it('should return 400 if isAdmin is missing in body', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${createdNormalUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}); // Missing isAdmin
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 if isAdmin is not a boolean', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${createdNormalUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isAdmin: 'not-a-boolean' });
      expect(res.statusCode).toBe(400);
    });


    it('should return 404 if user to update is not found', async () => {
      const nonExistentUserId = 99999;
      const res = await request(app)
        .put(`/api/admin/users/${nonExistentUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isAdmin: true });
      expect(res.statusCode).toBe(404);
    });

    it('should return 403 for a non-admin trying to update a user', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${normalToken}`)
        .send({ isAdmin: false });
      expect(res.statusCode).toBe(403);
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${createdNormalUserId}`)
        .send({ isAdmin: true });
      expect(res.statusCode).toBe(401);
    });
  });

  // DELETE /api/admin/users/:userId (Delete User)
  describe('DELETE /api/admin/users/:userId', () => {
    let userToDeleteId;

    beforeEach(async () => {
      // Create a fresh user for each delete test to avoid interference
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('deleteMe123', salt);
      const tempUser = await User.create({ username: 'userToDelete', email: 'delete@example.com', password: hashedPassword, isAdmin: false });
      userToDeleteId = tempUser.id;
    });

    it('should allow admin to delete another user', async () => {
      const res = await request(app)
        .delete(`/api/admin/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('User deleted successfully.');

      const deletedUser = await User.findByPk(userToDeleteId);
      expect(deletedUser).toBeNull();
    });

    it('should return 403 if admin tries to delete themselves', async () => {
      const res = await request(app)
        .delete(`/api/admin/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('Forbidden: Admins cannot delete themselves.');
    });

    it('should return 404 if user to delete is not found', async () => {
      const nonExistentUserId = 99998; // Different from other 404 tests
      const res = await request(app)
        .delete(`/api/admin/users/${nonExistentUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(404);
    });

    it('should return 403 for a non-admin trying to delete a user', async () => {
      const res = await request(app)
        .delete(`/api/admin/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${normalToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app)
        .delete(`/api/admin/users/${userToDeleteId}`);
      expect(res.statusCode).toBe(401);
    });
  });
});
