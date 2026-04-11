import request from 'supertest';
import app from '../../src/app.js';
import mongoose from 'mongoose';
import User from '../../src/models/userModel.js';

describe('Auth Module Integration Tests', () => {
  const testUser = {
    firstName: 'QA',
    lastName: 'Engineer',
    email: 'qa@example.com',
    password: 'Password123!'
  };

  beforeAll(async () => {
    // Clear test user if exists
    await User.deleteMany({ email: testUser.email });
  });

  afterAll(async () => {
    await User.deleteMany({ email: testUser.email });
    // Keep connection open if managed by app, or close if this is a standalone test
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email);
    });

    it('should fail with duplicate email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(400); // or 409 depending on implementation
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('should fail with invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
