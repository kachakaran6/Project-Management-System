import request from 'supertest';
import app from '../../src/app.js';

export const getAuthToken = async (email, password) => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
  
  return {
    accessToken: res.body.data.accessToken,
    organizationId: res.body.data.user.organizationId,
    userId: res.body.data.user.id
  };
};

export const apiRequest = () => request(app);
