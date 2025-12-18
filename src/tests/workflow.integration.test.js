const request = require('supertest');
const app = require('../server');
const pool = require('../config/database');
const cacheService = require('../services/cacheService');
const { cleanupTestData, cleanupTestTeams, cleanupTestPractices } = require('./testUtils');

describe('Complete System Integration Tests', () => {
  let testUser, testTeam, testPractice, testUniverse;
  let authCookie;

  beforeAll(async () => {
    // Clear cache before tests
    await cacheService.clearAll();
    
    // Clean up any existing test data
    await cleanupTestData('%integration.test%');
    await cleanupTestTeams('Integration Test%');
  });

  afterAll(async () => {
    // Comprehensive cleanup using test utilities
    await cleanupTestData('%integration.test%');
    await cleanupTestTeams('Integration Test%');
    await cleanupTestPractices('%Integration%');
    
    // Clear cache after tests
    await cacheService.clearAll();
  });

  describe('Complete User Journey: Registration to Practice Adoption', () => {
    
    test('1. User Registration', async () => {
      const userData = {
        name: 'Integration Test User',
        email: `integration.test.${Date.now()}@example.com`,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('registered successfully');
      
      // Store user for cleanup
      testUser = { email: userData.email };
    });

    test('2. User Login', async () => {
      const loginData = {
        email: testUser.email,
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      
      // Store auth cookie and user ID
      authCookie = response.headers['set-cookie'];
      testUser.id = response.body.user.id;
    });

    test('3. Browse Available Practices', async () => {
      const response = await request(app)
        .get('/api/practices')
        .query({ limit: 10, page: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    test('4. Search for Specific Practices', async () => {
      const response = await request(app)
        .get('/api/practices/search')
        .query({ q: 'standup', limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('5. Create a Team', async () => {
      const teamData = {
        name: `Integration Test Team ${Date.now()}`,
        description: 'Team created for integration testing'
      };

      const response = await request(app)
        .post('/api/teams')
        .set('Cookie', authCookie)
        .send(teamData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(teamData.name);
      
      testTeam = response.body.data;
    });

    test('6. Complete Personality Questionnaire', async () => {
      const personalityData = {
        o: 75, // Openness
        c: 65, // Conscientiousness  
        e: 80, // Extraversion
        a: 70, // Agreeableness
        n: 45  // Neuroticism
      };

      const response = await request(app)
        .post('/api/affinity/personality')
        .set('Cookie', authCookie)
        .send(personalityData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.o).toBe(personalityData.o);
      expect(response.body.data.c).toBe(personalityData.c);
    });

    test('7. Get Team Dashboard (Initially Empty)', async () => {
      const response = await request(app)
        .get(`/api/dashboard/teams/${testTeam.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.team.id).toBe(testTeam.id);
      expect(response.body.data.activePractices).toBeDefined();
      expect(response.body.data.oarCoverage).toBeDefined();
    });

    test('8. Add Practice to Team Universe', async () => {
      // First, get available practices to find one to add
      const practicesResponse = await request(app)
        .get('/api/practices')
        .query({ limit: 1 })
        .expect(200);

      if (practicesResponse.body.data && practicesResponse.body.data.length > 0) {
        const practice = practicesResponse.body.data[0];
        
        // Get team universes
        const dashboardResponse = await request(app)
          .get(`/api/dashboard/teams/${testTeam.id}`)
          .set('Cookie', authCookie)
          .expect(200);

        const universes = dashboardResponse.body.data.universes;
        if (universes && universes.length > 0) {
          const universe = universes[0];
          
          const addPracticeData = {
            practiceVersionId: practice.versionId || practice.id,
            universeId: universe.id
          };

          const response = await request(app)
            .post(`/api/dashboard/teams/${testTeam.id}/practices`)
            .set('Cookie', authCookie)
            .send(addPracticeData)
            .expect(201);

          expect(response.body.success).toBe(true);
        }
      }
    });

    test('9. Get Updated Team Dashboard with Practice', async () => {
      const response = await request(app)
        .get(`/api/dashboard/teams/${testTeam.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.teamAffinityStats).toBeDefined();
      expect(response.body.data.oarCoverage.coveragePercentage).toBeGreaterThanOrEqual(0);
    });

    test('10. Get Recommendations for Team', async () => {
      const response = await request(app)
        .get('/api/recommendations/comprehensive')
        .set('Cookie', authCookie)
        .query({ 
          teamMemberIds: testUser.id,
          minAffinityThreshold: 50
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Team Collaboration Workflow', () => {
    let secondUser, secondUserCookie;

    test('1. Second User Registration and Login', async () => {
      const userData = {
        name: 'Second Integration User',
        email: `second.integration.${Date.now()}@example.com`,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      };

      // Register
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      secondUser = loginResponse.body.user;
      secondUserCookie = loginResponse.headers['set-cookie'];
    });

    test('2. Invite Second User to Team', async () => {
      const inviteData = {
        email: secondUser.email,
        message: 'Join our integration test team!'
      };

      const response = await request(app)
        .post(`/api/teams/${testTeam.id}/invite`)
        .set('Cookie', authCookie)
        .send(inviteData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('3. Second User Joins Team', async () => {
      const response = await request(app)
        .post(`/api/teams/${testTeam.id}/join`)
        .set('Cookie', secondUserCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('4. Second User Completes Personality Profile', async () => {
      const personalityData = {
        o: 60, // Different personality profile
        c: 85,
        e: 45,
        a: 90,
        n: 30
      };

      const response = await request(app)
        .post('/api/affinity/personality')
        .set('Cookie', secondUserCookie)
        .send(personalityData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    test('5. Get Updated Team Dashboard with Multiple Members', async () => {
      const response = await request(app)
        .get(`/api/dashboard/teams/${testTeam.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.teamAffinityStats.totalPractices).toBeGreaterThanOrEqual(0);
    });

    test('6. Get Team-Based Recommendations', async () => {
      const memberIds = [testUser.id, secondUser.id];
      
      const response = await request(app)
        .get('/api/recommendations/comprehensive')
        .set('Cookie', authCookie)
        .query({ 
          teamMemberIds: memberIds.join(','),
          minAffinityThreshold: 60
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    afterAll(async () => {
      // Clean up second user
      if (secondUser) {
        await pool.query('DELETE FROM Person WHERE id = $1', [secondUser.id]);
      }
    });
  });

  describe('Recommendation Engine with Realistic Data', () => {
    
    test('1. Create Multiple Practice Affinities', async () => {
      // Get available practices
      const practicesResponse = await request(app)
        .get('/api/practices')
        .query({ limit: 5 })
        .expect(200);

      const practices = practicesResponse.body.data || [];
      
      // Create affinity scores for multiple practices
      for (const practice of practices.slice(0, 3)) {
        const affinityData = {
          practiceVersionId: practice.versionId || practice.id,
          affinity: Math.floor(Math.random() * 100) // Random affinity 0-100
        };

        await request(app)
          .post('/api/affinity/practice')
          .set('Cookie', authCookie)
          .send(affinityData)
          .expect(201);
      }
    });

    test('2. Test Alternative Practice Recommendations', async () => {
      // Get practices with low affinity
      const practicesResponse = await request(app)
        .get('/api/practices')
        .query({ limit: 1 })
        .expect(200);

      if (practicesResponse.body.data && practicesResponse.body.data.length > 0) {
        const practice = practicesResponse.body.data[0];
        
        const response = await request(app)
          .get(`/api/recommendations/alternatives/${practice.versionId || practice.id}`)
          .set('Cookie', authCookie)
          .query({ 
            teamMemberIds: testUser.id,
            minAffinityImprovement: 5
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      }
    });

    test('3. Test Context-Aware Recommendations', async () => {
      const response = await request(app)
        .get('/api/recommendations/context-aware')
        .set('Cookie', authCookie)
        .query({ 
          teamMemberIds: testUser.id
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('4. Flag Practice as Difficult', async () => {
      const practicesResponse = await request(app)
        .get('/api/practices')
        .query({ limit: 1 })
        .expect(200);

      if (practicesResponse.body.data && practicesResponse.body.data.length > 0) {
        const practice = practicesResponse.body.data[0];
        
        const flagData = {
          practiceVersionId: practice.versionId || practice.id,
          reason: 'Too complex for our team size'
        };

        const response = await request(app)
          .post('/api/recommendations/flag-difficulty')
          .set('Cookie', authCookie)
          .send(flagData)
          .expect(201);

        expect(response.body.success).toBe(true);
      }
    });

    test('5. Get Flagged Practices with Alternatives', async () => {
      const response = await request(app)
        .get('/api/recommendations/flagged-practices')
        .set('Cookie', authCookie)
        .query({ 
          teamMemberIds: testUser.id
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Performance and Caching Validation', () => {
    
    test('1. Verify Caching Works for Practice Details', async () => {
      const practicesResponse = await request(app)
        .get('/api/practices')
        .query({ limit: 1 })
        .expect(200);

      if (practicesResponse.body.data && practicesResponse.body.data.length > 0) {
        const practice = practicesResponse.body.data[0];
        
        // First request (should cache)
        const startTime1 = Date.now();
        await request(app)
          .get(`/api/practices/${practice.id}`)
          .expect(200);
        const responseTime1 = Date.now() - startTime1;

        // Second request (should use cache)
        const startTime2 = Date.now();
        const response2 = await request(app)
          .get(`/api/practices/${practice.id}`)
          .expect(200);
        const responseTime2 = Date.now() - startTime2;

        expect(response2.body.success).toBe(true);
        // Second request should be faster (cached)
        expect(responseTime2).toBeLessThanOrEqual(responseTime1 + 50); // Allow some variance
      }
    });

    test('2. Verify Pagination Works Correctly', async () => {
      // Test first page
      const page1Response = await request(app)
        .get('/api/practices')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(page1Response.body.pagination.page).toBe(1);
      expect(page1Response.body.pagination.limit).toBe(2);

      // Test second page
      const page2Response = await request(app)
        .get('/api/practices')
        .query({ page: 2, limit: 2 })
        .expect(200);

      expect(page2Response.body.pagination.page).toBe(2);
      expect(page2Response.body.pagination.limit).toBe(2);
    });

    test('3. Test Performance Monitoring Endpoint', async () => {
      // This test assumes the user has admin role (roleId = 1)
      // In a real scenario, you'd need to create an admin user
      const response = await request(app)
        .get('/api/performance/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.database.connected).toBe(true);
      expect(response.body.cache.connected).toBe(true);
    });

    test('4. Verify Cache Invalidation on Data Changes', async () => {
      if (testTeam) {
        // Get dashboard (should cache)
        await request(app)
          .get(`/api/dashboard/teams/${testTeam.id}`)
          .set('Cookie', authCookie)
          .expect(200);

        // Update team (should invalidate cache)
        const updateData = {
          name: testTeam.name + ' Updated',
          description: 'Updated description'
        };

        await request(app)
          .put(`/api/teams/${testTeam.id}`)
          .set('Cookie', authCookie)
          .send(updateData)
          .expect(200);

        // Get dashboard again (should fetch fresh data)
        const response = await request(app)
          .get(`/api/dashboard/teams/${testTeam.id}`)
          .set('Cookie', authCookie)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.team.name).toBe(updateData.name);
      }
    });
  });

  describe('Comprehensive API Endpoint Validation', () => {
    
    test('1. Validate All API Endpoints Respond Correctly', async () => {
      // Test API info endpoint
      const apiResponse = await request(app)
        .get('/api')
        .expect(200);
      
      expect(apiResponse.body.message).toContain('Agile Practice Repository API');
      expect(apiResponse.body.endpoints).toBeDefined();
      
      // Test health endpoint
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);
      
      expect(healthResponse.body.status).toBe('healthy');
      expect(healthResponse.body.database).toBe('connected');
      expect(healthResponse.body.redis).toBe('connected');
    });

    test('2. Validate Authentication Endpoints', async () => {
      // Test registration validation
      const invalidRegResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: '',
          email: 'invalid-email',
          password: '123',
          confirmPassword: '456'
        })
        .expect(400);
      
      expect(invalidRegResponse.body.success).toBe(false);
      expect(invalidRegResponse.body.errors).toBeDefined();
      
      // Test login with non-existent user
      const invalidLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);
      
      expect(invalidLoginResponse.body.success).toBe(false);
    });

    test('3. Validate Practice Endpoints', async () => {
      // Test practice listing with various parameters
      const practicesResponse = await request(app)
        .get('/api/practices')
        .query({ 
          page: 1, 
          limit: 5,
          type: 'ceremony',
          tag: 'communication'
        })
        .expect(200);
      
      expect(practicesResponse.body.success).toBe(true);
      expect(practicesResponse.body.pagination).toBeDefined();
      
      // Test practice search
      const searchResponse = await request(app)
        .get('/api/practices/search')
        .query({ q: 'standup', limit: 10 })
        .expect(200);
      
      expect(searchResponse.body.success).toBe(true);
      expect(Array.isArray(searchResponse.body.data)).toBe(true);
      
      // Test practice filtering by goals
      const goalFilterResponse = await request(app)
        .get('/api/practices/by-goals')
        .query({ goalIds: '1,2,3' })
        .expect(200);
      
      expect(goalFilterResponse.body.success).toBe(true);
    });

    test('4. Validate Method and Activity Endpoints', async () => {
      // Test methods listing
      const methodsResponse = await request(app)
        .get('/api/methods')
        .query({ page: 1, limit: 5 })
        .expect(200);
      
      expect(methodsResponse.body.success).toBe(true);
      
      // Test activities listing
      const activitiesResponse = await request(app)
        .get('/api/activities')
        .query({ page: 1, limit: 5 })
        .expect(200);
      
      expect(activitiesResponse.body.success).toBe(true);
    });

    test('5. Validate Unauthorized Access Protection', async () => {
      // Test protected endpoints without authentication
      const protectedEndpoints = [
        '/api/teams',
        '/api/dashboard/teams/1',
        '/api/affinity/personality',
        '/api/recommendations/comprehensive',
        '/api/expert/practices'
      ];
      
      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(401);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('authentication');
      }
    });

    test('6. Validate Error Handling for Invalid Data', async () => {
      // Test invalid team creation (without auth)
      const invalidTeamResponse = await request(app)
        .post('/api/teams')
        .send({
          name: '', // Invalid empty name
          description: 'Test description'
        })
        .expect(401); // Should fail on auth first
      
      expect(invalidTeamResponse.body.success).toBe(false);
      
      // Test invalid practice ID
      const invalidPracticeResponse = await request(app)
        .get('/api/practices/99999')
        .expect(404);
      
      expect(invalidPracticeResponse.body.success).toBe(false);
    });

    test('7. Validate Visualization Endpoints', async () => {
      // Test visualization endpoints
      const practicesResponse = await request(app)
        .get('/api/practices')
        .query({ limit: 1 })
        .expect(200);
      
      if (practicesResponse.body.data && practicesResponse.body.data.length > 0) {
        const practice = practicesResponse.body.data[0];
        
        const vizResponse = await request(app)
          .get(`/api/visualization/practice/${practice.id}/cards`)
          .expect(200);
        
        expect(vizResponse.body.success).toBe(true);
        expect(vizResponse.body.data).toBeDefined();
      }
    });

    test('8. Validate Performance Monitoring Endpoints', async () => {
      // Test performance health endpoint
      const perfHealthResponse = await request(app)
        .get('/api/performance/health')
        .expect(200);
      
      expect(perfHealthResponse.body.status).toBe('healthy');
      expect(perfHealthResponse.body.database.connected).toBe(true);
      expect(perfHealthResponse.body.cache.connected).toBe(true);
      
      // Test performance metrics endpoint
      const metricsResponse = await request(app)
        .get('/api/performance/metrics')
        .expect(200);
      
      expect(metricsResponse.body.success).toBe(true);
      expect(metricsResponse.body.data).toBeDefined();
    });
  });

  describe('Data Consistency Validation', () => {
    
    test('1. Verify Database Constraints Are Enforced', async () => {
      // Test foreign key constraints
      try {
        await pool.query(
          'INSERT INTO teammember (teamid, personid) VALUES ($1, $2)',
          [99999, 99999] // Non-existent IDs
        );
        fail('Should have thrown foreign key constraint error');
      } catch (error) {
        expect(error.message).toContain('foreign key');
      }
      
      // Test unique constraints
      const existingUser = await pool.query(
        'SELECT email FROM Person LIMIT 1'
      );
      
      if (existingUser.rows.length > 0) {
        try {
          await pool.query(
            'INSERT INTO Person (name, email, passwordhash, roleid) VALUES ($1, $2, $3, $4)',
            ['Test User', existingUser.rows[0].email, 'hashedpassword', 1]
          );
          fail('Should have thrown unique constraint error');
        } catch (error) {
          expect(error.message).toContain('duplicate key');
        }
      }
    });

    test('2. Verify Cascade Deletes Work Correctly', async () => {
      // Create test data to verify cascade behavior
      const testTeamResult = await pool.query(
        'INSERT INTO Team (name, description) VALUES ($1, $2) RETURNING id',
        ['Cascade Test Team', 'Team for testing cascade deletes']
      );
      const teamId = testTeamResult.rows[0].id;
      
      // Create universe for the team
      const universeResult = await pool.query(
        'INSERT INTO Universe (teamid, name, description) VALUES ($1, $2, $3) RETURNING id',
        [teamId, 'Test Universe', 'Universe for cascade testing']
      );
      const universeId = universeResult.rows[0].id;
      
      // Delete team and verify universe is also deleted
      await pool.query('DELETE FROM Team WHERE id = $1', [teamId]);
      
      const remainingUniverse = await pool.query(
        'SELECT id FROM Universe WHERE id = $1',
        [universeId]
      );
      
      expect(remainingUniverse.rows.length).toBe(0);
    });

    test('3. Verify Transaction Integrity', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Insert test data
        const teamResult = await client.query(
          'INSERT INTO Team (name, description) VALUES ($1, $2) RETURNING id',
          ['Transaction Test Team', 'Team for transaction testing']
        );
        const teamId = teamResult.rows[0].id;
        
        // Simulate an error condition
        await client.query('ROLLBACK');
        
        // Verify data was not committed
        const teamCheck = await pool.query(
          'SELECT id FROM Team WHERE id = $1',
          [teamId]
        );
        
        expect(teamCheck.rows.length).toBe(0);
      } finally {
        client.release();
      }
    });

    test('4. Verify Affinity Calculation Consistency', async () => {
      if (testUser && authCookie) {
        // Create personality profile
        const personalityData = {
          o: 75, c: 65, e: 80, a: 70, n: 45
        };
        
        await request(app)
          .post('/api/affinity/personality')
          .set('Cookie', authCookie)
          .send(personalityData)
          .expect(201);
        
        // Get practices and create affinity scores
        const practicesResponse = await request(app)
          .get('/api/practices')
          .query({ limit: 3 })
          .expect(200);
        
        const practices = practicesResponse.body.data || [];
        
        for (const practice of practices) {
          const affinityData = {
            practiceVersionId: practice.versionId || practice.id,
            affinity: 75
          };
          
          await request(app)
            .post('/api/affinity/practice')
            .set('Cookie', authCookie)
            .send(affinityData)
            .expect(201);
        }
        
        // Verify affinity scores are consistent
        const affinityResponse = await request(app)
          .get('/api/affinity/user-affinities')
          .set('Cookie', authCookie)
          .expect(200);
        
        expect(affinityResponse.body.success).toBe(true);
        expect(affinityResponse.body.data.length).toBeGreaterThan(0);
        
        // Verify each affinity score is within valid range
        affinityResponse.body.data.forEach(affinity => {
          expect(affinity.affinity).toBeGreaterThanOrEqual(0);
          expect(affinity.affinity).toBeLessThanOrEqual(100);
        });
      }
    });
  });

  describe('Performance and Load Testing', () => {
    
    test('1. Test Concurrent User Operations', async () => {
      if (!testUser || !authCookie) {
        return; // Skip if no authenticated user
      }
      
      // Create multiple concurrent requests
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => 
        request(app)
          .get('/api/practices')
          .query({ page: i + 1, limit: 5 })
          .expect(200)
      );
      
      const responses = await Promise.all(concurrentRequests);
      
      // Verify all requests succeeded
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.pagination).toBeDefined();
      });
    });

    test('2. Test Large Dataset Handling', async () => {
      // Test pagination with large page numbers
      const largePageResponse = await request(app)
        .get('/api/practices')
        .query({ page: 100, limit: 50 })
        .expect(200);
      
      expect(largePageResponse.body.success).toBe(true);
      expect(largePageResponse.body.pagination.page).toBe(100);
      
      // Test search with broad terms
      const broadSearchResponse = await request(app)
        .get('/api/practices/search')
        .query({ q: 'a', limit: 100 }) // Very broad search
        .expect(200);
      
      expect(broadSearchResponse.body.success).toBe(true);
    });

    test('3. Test Cache Performance', async () => {
      // Clear cache first
      await cacheService.clearAll();
      
      // First request (should be slower - no cache)
      const startTime1 = Date.now();
      const response1 = await request(app)
        .get('/api/practices')
        .query({ page: 1, limit: 10 })
        .expect(200);
      const duration1 = Date.now() - startTime1;
      
      // Second identical request (should be faster - cached)
      const startTime2 = Date.now();
      const response2 = await request(app)
        .get('/api/practices')
        .query({ page: 1, limit: 10 })
        .expect(200);
      const duration2 = Date.now() - startTime2;
      
      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);
      
      // Second request should be faster or similar (allowing for variance)
      expect(duration2).toBeLessThanOrEqual(duration1 + 100);
    });

    test('4. Test Memory Usage Stability', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform multiple operations
      for (let i = 0; i < 50; i++) {
        await request(app)
          .get('/api/practices')
          .query({ page: Math.floor(Math.random() * 10) + 1, limit: 5 })
          .expect(200);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      // Memory usage should not have grown excessively
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });
  });

  describe('Security and Error Handling Validation', () => {
    
    test('1. Test SQL Injection Protection', async () => {
      // Test malicious input in search
      const maliciousSearch = "'; DROP TABLE Person; --";
      
      const response = await request(app)
        .get('/api/practices/search')
        .query({ q: maliciousSearch })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // Verify Person table still exists
      const tableCheck = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_name = 'person'"
      );
      expect(tableCheck.rows.length).toBe(1);
    });

    test('2. Test Input Validation', async () => {
      // Test various invalid inputs
      const invalidInputs = [
        { endpoint: '/api/practices', query: { page: -1 } },
        { endpoint: '/api/practices', query: { limit: 1000 } },
        { endpoint: '/api/practices/search', query: { q: 'a'.repeat(1000) } }
      ];
      
      for (const test of invalidInputs) {
        const response = await request(app)
          .get(test.endpoint)
          .query(test.query);
        
        // Should either return valid data or proper error
        expect([200, 400, 422]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body.success).toBe(true);
        } else {
          expect(response.body.success).toBe(false);
        }
      }
    });

    test('3. Test Rate Limiting and Resource Protection', async () => {
      // Test multiple rapid requests
      const rapidRequests = Array.from({ length: 20 }, () =>
        request(app)
          .get('/api/practices')
          .query({ page: 1, limit: 1 })
      );
      
      const responses = await Promise.all(rapidRequests);
      
      // All requests should succeed (no rate limiting implemented yet)
      // or some should be rate limited
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });

    test('4. Test Error Recovery', async () => {
      // Test database connection recovery
      const healthBefore = await request(app)
        .get('/health')
        .expect(200);
      
      expect(healthBefore.body.status).toBe('healthy');
      
      // Simulate temporary database issue by making invalid query
      try {
        await pool.query('SELECT * FROM nonexistent_table');
      } catch (error) {
        // Expected to fail
      }
      
      // System should still be healthy
      const healthAfter = await request(app)
        .get('/health')
        .expect(200);
      
      expect(healthAfter.body.status).toBe('healthy');
    });
  });
});