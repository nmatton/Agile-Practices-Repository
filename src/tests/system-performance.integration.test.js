const request = require('supertest');
const app = require('../server');
const pool = require('../config/database');
const cacheService = require('../services/cacheService');
const { cleanupTestData } = require('./testUtils');

describe('System Performance Integration Tests', () => {
  let testUser, authCookie;

  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestData('%performance.test%');
    
    // Create test user for authenticated tests
    const userData = {
      name: 'Performance Test User',
      email: `performance.test.${Date.now()}@example.com`,
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!'
    };

    await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      })
      .expect(200);

    testUser = loginResponse.body.user;
    authCookie = loginResponse.headers['set-cookie'];
  });

  afterAll(async () => {
    await cleanupTestData('%performance.test%');
  });

  describe('Database Performance Tests', () => {
    
    test('Database Connection Pool Performance', async () => {
      const startTime = Date.now();
      
      // Execute multiple concurrent database queries
      const queries = Array.from({ length: 20 }, () => 
        pool.query('SELECT COUNT(*) FROM Practice')
      );
      
      const results = await Promise.all(queries);
      const duration = Date.now() - startTime;
      
      // All queries should succeed
      results.forEach(result => {
        expect(result.rows).toBeDefined();
        expect(result.rows.length).toBe(1);
      });
      
      // Should complete within reasonable time (5 seconds)
      expect(duration).toBeLessThan(5000);
      
      console.log(`Database pool test: ${queries.length} queries in ${duration}ms`);
    });

    test('Complex Query Performance', async () => {
      const startTime = Date.now();
      
      // Execute complex query with joins
      const result = await pool.query(`
        SELECT 
          p.id, p.name, p.description,
          pv.versionname,
          COUNT(DISTINCT a.id) as activity_count,
          COUNT(DISTINCT g.id) as guideline_count
        FROM Practice p
        LEFT JOIN practiceversion pv ON p.id = pv.practiceid
        LEFT JOIN practiceversionactivity pva ON pv.id = pva.practiceversionid
        LEFT JOIN activity a ON pva.activityid = a.id
        LEFT JOIN guideline g ON pv.id = g.practiceversionid
        GROUP BY p.id, p.name, p.description, pv.versionname
        LIMIT 50
      `);
      
      const duration = Date.now() - startTime;
      
      expect(result.rows).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      
      console.log(`Complex query test: ${result.rows.length} rows in ${duration}ms`);
    });

    test('Pagination Performance', async () => {
      const pageSize = 20;
      const testPages = 5;
      const durations = [];
      
      for (let page = 1; page <= testPages; page++) {
        const startTime = Date.now();
        
        const response = await request(app)
          .get('/api/practices')
          .query({ page, limit: pageSize })
          .expect(200);
        
        const duration = Date.now() - startTime;
        durations.push(duration);
        
        expect(response.body.success).toBe(true);
        expect(response.body.pagination.page).toBe(page);
      }
      
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      
      // Average response time should be reasonable
      expect(avgDuration).toBeLessThan(1000);
      expect(maxDuration).toBeLessThan(2000);
      
      console.log(`Pagination test: avg ${avgDuration.toFixed(2)}ms, max ${maxDuration}ms`);
    });
  });

  describe('Cache Performance Tests', () => {
    
    test('Cache Hit vs Miss Performance', async () => {
      await cacheService.clearAll();
      
      // First request (cache miss)
      const startTime1 = Date.now();
      const response1 = await request(app)
        .get('/api/practices')
        .query({ page: 1, limit: 10 })
        .expect(200);
      const cacheMissDuration = Date.now() - startTime1;
      
      // Second request (cache hit)
      const startTime2 = Date.now();
      const response2 = await request(app)
        .get('/api/practices')
        .query({ page: 1, limit: 10 })
        .expect(200);
      const cacheHitDuration = Date.now() - startTime2;
      
      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);
      
      // Cache hit should be faster or similar
      expect(cacheHitDuration).toBeLessThanOrEqual(cacheMissDuration + 50);
      
      console.log(`Cache test: miss ${cacheMissDuration}ms, hit ${cacheHitDuration}ms`);
    });

    test('Cache Invalidation Performance', async () => {
      // Populate cache
      await request(app)
        .get('/api/practices')
        .query({ page: 1, limit: 5 })
        .expect(200);
      
      // Measure cache clear performance
      const startTime = Date.now();
      await cacheService.clearAll();
      const clearDuration = Date.now() - startTime;
      
      expect(clearDuration).toBeLessThan(1000); // Should clear quickly
      
      console.log(`Cache clear test: ${clearDuration}ms`);
    });

    test('Memory Usage During Cache Operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform multiple cache operations
      for (let i = 0; i < 50; i++) {
        await request(app)
          .get('/api/practices')
          .query({ page: Math.floor(i / 10) + 1, limit: 5 })
          .expect(200);
      }
      
      const afterCacheMemory = process.memoryUsage();
      
      // Clear cache
      await cacheService.clearAll();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      const memoryGrowth = afterCacheMemory.heapUsed - initialMemory.heapUsed;
      const memoryRecovered = afterCacheMemory.heapUsed - finalMemory.heapUsed;
      
      console.log(`Memory test: grew ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB, recovered ${(memoryRecovered / 1024 / 1024).toFixed(2)}MB`);
      
      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });

  describe('API Response Time Tests', () => {
    
    test('Authentication Endpoint Performance', async () => {
      const testCases = [
        { endpoint: '/api/auth/me', method: 'get', authenticated: true },
        { endpoint: '/api/auth/logout', method: 'post', authenticated: true }
      ];
      
      for (const testCase of testCases) {
        const startTime = Date.now();
        
        const requestBuilder = request(app)[testCase.method](testCase.endpoint);
        if (testCase.authenticated) {
          requestBuilder.set('Cookie', authCookie);
        }
        
        await requestBuilder.expect(200);
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(500); // Should respond within 500ms
        
        console.log(`${testCase.method.toUpperCase()} ${testCase.endpoint}: ${duration}ms`);
      }
    });

    test('Practice Endpoints Performance', async () => {
      const endpoints = [
        '/api/practices',
        '/api/practices/search?q=standup',
        '/api/practices/by-goals?goalIds=1,2'
      ];
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        
        await request(app)
          .get(endpoint)
          .expect(200);
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(1000); // Should respond within 1 second
        
        console.log(`GET ${endpoint}: ${duration}ms`);
      }
    });

    test('Dashboard Endpoint Performance', async () => {
      // Create a team first
      const teamResponse = await request(app)
        .post('/api/teams')
        .set('Cookie', authCookie)
        .send({
          name: `Performance Test Team ${Date.now()}`,
          description: 'Team for performance testing'
        })
        .expect(201);
      
      const teamId = teamResponse.body.data.id;
      
      const startTime = Date.now();
      
      await request(app)
        .get(`/api/dashboard/teams/${teamId}`)
        .set('Cookie', authCookie)
        .expect(200);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Dashboard can be more complex
      
      console.log(`Dashboard endpoint: ${duration}ms`);
    });
  });

  describe('Concurrent User Simulation', () => {
    
    test('Multiple Concurrent Users - Read Operations', async () => {
      const concurrentUsers = 10;
      const requestsPerUser = 5;
      
      const startTime = Date.now();
      
      // Simulate multiple users making concurrent requests
      const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
        const requests = Array.from({ length: requestsPerUser }, (_, reqIndex) => 
          request(app)
            .get('/api/practices')
            .query({ page: reqIndex + 1, limit: 5 })
            .expect(200)
        );
        
        return Promise.all(requests);
      });
      
      const results = await Promise.all(userPromises);
      const totalDuration = Date.now() - startTime;
      
      // Verify all requests succeeded
      results.forEach(userResults => {
        userResults.forEach(response => {
          expect(response.body.success).toBe(true);
        });
      });
      
      const totalRequests = concurrentUsers * requestsPerUser;
      const avgResponseTime = totalDuration / totalRequests;
      
      console.log(`Concurrent test: ${totalRequests} requests in ${totalDuration}ms (avg: ${avgResponseTime.toFixed(2)}ms per request)`);
      
      // Should handle concurrent load reasonably
      expect(totalDuration).toBeLessThan(10000); // Within 10 seconds
      expect(avgResponseTime).toBeLessThan(1000); // Average under 1 second
    });

    test('Mixed Read/Write Operations Under Load', async () => {
      const startTime = Date.now();
      
      // Mix of read and write operations
      const operations = [
        // Read operations
        ...Array.from({ length: 20 }, () => 
          request(app).get('/api/practices').query({ page: 1, limit: 5 })
        ),
        // Write operations (authenticated)
        ...Array.from({ length: 5 }, (_, i) => 
          request(app)
            .post('/api/teams')
            .set('Cookie', authCookie)
            .send({
              name: `Load Test Team ${Date.now()}-${i}`,
              description: 'Team created during load test'
            })
        )
      ];
      
      const results = await Promise.all(operations);
      const totalDuration = Date.now() - startTime;
      
      // Check results
      const readResults = results.slice(0, 20);
      const writeResults = results.slice(20);
      
      readResults.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
      
      writeResults.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
      
      console.log(`Mixed operations test: ${operations.length} operations in ${totalDuration}ms`);
      
      expect(totalDuration).toBeLessThan(15000); // Within 15 seconds
    });
  });

  describe('Resource Usage Monitoring', () => {
    
    test('Memory Usage Stability', async () => {
      const measurements = [];
      
      // Take initial measurement
      measurements.push(process.memoryUsage());
      
      // Perform operations and measure memory
      for (let i = 0; i < 10; i++) {
        // Perform some operations
        await Promise.all([
          request(app).get('/api/practices').query({ page: 1, limit: 10 }),
          request(app).get('/api/methods').query({ page: 1, limit: 5 }),
          request(app).get('/api/activities').query({ page: 1, limit: 5 })
        ]);
        
        measurements.push(process.memoryUsage());
      }
      
      // Analyze memory usage
      const heapUsages = measurements.map(m => m.heapUsed);
      const maxHeap = Math.max(...heapUsages);
      const minHeap = Math.min(...heapUsages);
      const heapGrowth = maxHeap - minHeap;
      
      console.log(`Memory stability test: min ${(minHeap / 1024 / 1024).toFixed(2)}MB, max ${(maxHeap / 1024 / 1024).toFixed(2)}MB, growth ${(heapGrowth / 1024 / 1024).toFixed(2)}MB`);
      
      // Memory growth should be reasonable
      expect(heapGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });

    test('Database Connection Pool Usage', async () => {
      const startTime = Date.now();
      
      // Create many concurrent database operations
      const dbOperations = Array.from({ length: 50 }, () => 
        pool.query('SELECT COUNT(*) FROM Practice WHERE id > $1', [Math.floor(Math.random() * 100)])
      );
      
      const results = await Promise.all(dbOperations);
      const duration = Date.now() - startTime;
      
      // All operations should succeed
      results.forEach(result => {
        expect(result.rows).toBeDefined();
      });
      
      console.log(`DB pool test: ${dbOperations.length} operations in ${duration}ms`);
      
      // Should handle the load without timeout
      expect(duration).toBeLessThan(5000);
    });

    test('Response Size Optimization', async () => {
      const endpoints = [
        { path: '/api/practices', query: { limit: 1 } },
        { path: '/api/practices', query: { limit: 50 } },
        { path: '/api/practices/search', query: { q: 'standup', limit: 10 } }
      ];
      
      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint.path)
          .query(endpoint.query)
          .expect(200);
        
        const responseSize = JSON.stringify(response.body).length;
        const itemCount = response.body.data ? response.body.data.length : 0;
        
        console.log(`${endpoint.path}: ${itemCount} items, ${(responseSize / 1024).toFixed(2)}KB`);
        
        // Response size should be reasonable
        expect(responseSize).toBeLessThan(1024 * 1024); // Less than 1MB
        
        // Should have pagination info for large responses
        if (itemCount > 10) {
          expect(response.body.pagination).toBeDefined();
        }
      }
    });
  });

  describe('System Health Under Load', () => {
    
    test('Health Check Reliability Under Load', async () => {
      // Start background load
      const backgroundLoad = Array.from({ length: 20 }, () => 
        request(app).get('/api/practices').query({ page: 1, limit: 5 })
      );
      
      // Check health multiple times during load
      const healthChecks = Array.from({ length: 5 }, () => 
        request(app).get('/health').expect(200)
      );
      
      const [loadResults, healthResults] = await Promise.all([
        Promise.all(backgroundLoad),
        Promise.all(healthChecks)
      ]);
      
      // All operations should succeed
      loadResults.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      healthResults.forEach(response => {
        expect(response.body.status).toBe('healthy');
        expect(response.body.database).toBe('connected');
        expect(response.body.redis).toBe('connected');
      });
    });

    test('Error Recovery and Resilience', async () => {
      // Test system recovery after errors
      try {
        // Attempt invalid operation
        await pool.query('SELECT * FROM nonexistent_table');
      } catch (error) {
        // Expected to fail
      }
      
      // System should still be healthy
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);
      
      expect(healthResponse.body.status).toBe('healthy');
      
      // Normal operations should still work
      const practicesResponse = await request(app)
        .get('/api/practices')
        .query({ limit: 5 })
        .expect(200);
      
      expect(practicesResponse.body.success).toBe(true);
    });
  });
});