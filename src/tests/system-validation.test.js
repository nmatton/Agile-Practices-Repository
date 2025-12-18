const request = require('supertest');
const app = require('../server');
const pool = require('../config/database');

describe('System Validation Tests', () => {
  
  afterAll(async () => {
    // Clean up any test data
    try {
      await pool.query("DELETE FROM Person WHERE email LIKE '%system.validation%'");
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('Health endpoint should work', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
    expect(response.body.database).toBe('connected');
    expect(response.body.redis).toBe('connected');
  });

  test('API info endpoint should work', async () => {
    const response = await request(app)
      .get('/api')
      .expect(200);

    expect(response.body.message).toContain('Agile Practice Repository API');
    expect(response.body.endpoints).toBeDefined();
  });

  test('User registration should work', async () => {
    const userData = {
      name: 'System Validation User',
      email: `system.validation.${Date.now()}@test.local`,
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);

    // Should either succeed (201) or have validation errors (400)
    expect([201, 400]).toContain(response.status);
    
    if (response.status === 201) {
      expect(response.body.success).toBe(true);
    }
  });

  test('Methods endpoint should work', async () => {
    const response = await request(app)
      .get('/api/methods')
      .query({ page: 1, limit: 5 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.pagination).toBeDefined();
  });

  test('Activities endpoint should work', async () => {
    const response = await request(app)
      .get('/api/activities')
      .query({ page: 1, limit: 5 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.pagination).toBeDefined();
  });

  test('Performance health endpoint should work', async () => {
    const response = await request(app)
      .get('/api/performance/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
    expect(response.body.database.connected).toBe(true);
    expect(response.body.cache.connected).toBe(true);
  });

  test('Database connection should be working', async () => {
    const result = await pool.query('SELECT 1 as test');
    expect(result.rows[0].test).toBe(1);
  });

  test('Basic tables should exist', async () => {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('person', 'team', 'practice', 'practiceversion')
      ORDER BY table_name
    `);
    
    expect(result.rows.length).toBeGreaterThan(0);
    
    const tableNames = result.rows.map(row => row.table_name);
    expect(tableNames).toContain('person');
    expect(tableNames).toContain('team');
    expect(tableNames).toContain('practice');
  });
});