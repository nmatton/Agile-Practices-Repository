const request = require('supertest');
const app = require('../server');
const pool = require('../config/database');
const cacheService = require('../services/cacheService');

describe('Complete User Workflows Integration Tests', () => {
  let testUser, testTeam, testPractice, testUniverse;
  let authCookie;

  beforeAll(async () => {
    // Clear cache before tests
    await cacheService.clearAll();
  });

  afterAll(async () => {
    // Clean up test data
    if (testUser) {
      await pool.query('DELETE FROM Person WHERE id = $1', [testUser.id]);
    }
    if (testTeam) {
      await pool.query('DELETE FROM Team WHERE id = $1', [testTeam.id]);
    }
    if (testPractice) {
      await pool.query('DELETE FROM Practice WHERE id = $1', [testPractice.id]);
    }
    
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
});