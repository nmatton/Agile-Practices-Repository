const request = require('supertest');
const app = require('../server');
const pool = require('../config/database');
const cacheService = require('../services/cacheService');

describe('Final System Integration Summary', () => {
  
  afterAll(async () => {
    // Clean up
    try {
      await pool.query("DELETE FROM Person WHERE email LIKE '%final.integration%'");
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Core System Health', () => {
    test('Database connectivity', async () => {
      const result = await pool.query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
    });

    test('Redis connectivity', async () => {
      await cacheService.clearAll();
      // If this doesn't throw, Redis is working
      expect(true).toBe(true);
    });

    test('Health endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.database).toBe('connected');
      expect(response.body.redis).toBe('connected');
    });
  });

  describe('API Endpoints Availability', () => {
    test('API info endpoint', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body.message).toContain('Agile Practice Repository API');
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints.auth).toBe('/api/auth');
      expect(response.body.endpoints.practices).toBe('/api/practices');
      expect(response.body.endpoints.teams).toBe('/api/teams');
    });

    test('Methods API', async () => {
      const response = await request(app)
        .get('/api/methods')
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    test('Activities API', async () => {
      const response = await request(app)
        .get('/api/activities')
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    test('Performance monitoring API', async () => {
      const response = await request(app)
        .get('/api/performance/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.database.connected).toBe(true);
      expect(response.body.cache.connected).toBe(true);
    });

    test('Search functionality', async () => {
      const response = await request(app)
        .get('/api/practices/search')
        .query({ q: 'test', limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Database Schema Integrity', () => {
    test('Core tables exist', async () => {
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN (
            'person', 'team', 'practice', 'practiceversion', 
            'method', 'methodversion', 'activity', 'goal',
            'bfprofile', 'personpracticeaffinity', 'practicegoal'
          )
        ORDER BY table_name
      `);
      
      expect(result.rows.length).toBeGreaterThan(8);
      
      const tableNames = result.rows.map(row => row.table_name);
      expect(tableNames).toContain('person');
      expect(tableNames).toContain('team');
      expect(tableNames).toContain('practice');
      expect(tableNames).toContain('practiceversion');
      expect(tableNames).toContain('practicegoal'); // Added table
    });

    test('Foreign key constraints exist', async () => {
      const result = await pool.query(`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
      `);
      
      expect(result.rows.length).toBeGreaterThan(10);
    });

    test('Sample data exists', async () => {
      const practiceCount = await pool.query('SELECT COUNT(*) FROM Practice');
      const goalCount = await pool.query('SELECT COUNT(*) FROM Goal');
      const activityCount = await pool.query('SELECT COUNT(*) FROM Activity');
      
      expect(parseInt(practiceCount.rows[0].count)).toBeGreaterThan(0);
      expect(parseInt(goalCount.rows[0].count)).toBeGreaterThan(0);
      expect(parseInt(activityCount.rows[0].count)).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    test('Invalid practice ID handling', async () => {
      const response = await request(app)
        .get('/api/practices/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('SQL injection protection', async () => {
      const maliciousInput = "'; DROP TABLE Person; --";
      
      const response = await request(app)
        .get('/api/practices/search')
        .query({ q: maliciousInput })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify Person table still exists
      const tableCheck = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_name = 'person'"
      );
      expect(tableCheck.rows.length).toBe(1);
    });
  });

  describe('Performance Characteristics', () => {
    test('Response times are reasonable', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/methods')
        .query({ page: 1, limit: 10 })
        .expect(200);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should respond within 2 seconds
    });

    test('Concurrent requests handling', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/activities')
          .query({ page: 1, limit: 5 })
          .expect(200)
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });
    });

    test('Memory usage stability', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/api/methods')
          .query({ page: 1, limit: 5 })
          .expect(200);
      }
      
      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory growth should be reasonable (less than 10MB)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('System Integration Status', () => {
    test('All critical components are operational', async () => {
      // Test multiple endpoints to ensure system integration
      const endpoints = [
        '/health',
        '/api',
        '/api/methods',
        '/api/activities',
        '/api/performance/health'
      ];
      
      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect([200, 201]).toContain(response.status);
      }
    });

    test('Database queries are optimized', async () => {
      const startTime = Date.now();
      
      // Test a complex query
      const result = await pool.query(`
        SELECT 
          p.id, p.name,
          COUNT(pv.id) as version_count
        FROM Practice p
        LEFT JOIN practiceVersion pv ON p.id = pv.practiceId
        GROUP BY p.id, p.name
        ORDER BY p.name
        LIMIT 10
      `);
      
      const duration = Date.now() - startTime;
      
      expect(result.rows.length).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});