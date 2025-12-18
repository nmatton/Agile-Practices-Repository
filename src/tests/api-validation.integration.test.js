const request = require('supertest');
const app = require('../server');
const pool = require('../config/database');
const { cleanupTestData } = require('./testUtils');

describe('API Endpoint Validation Tests', () => {
  let testUser, authCookie;

  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestData('%api.validation%');
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData('%api.validation%');
  });

  describe('Authentication API Validation', () => {
    
    test('POST /api/auth/register - Valid Registration', async () => {
      const userData = {
        name: 'API Validation User',
        email: `api.validation.${Date.now()}@example.com`,
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('registered successfully');
      
      testUser = { email: userData.email };
    });

    test('POST /api/auth/register - Invalid Data Validation', async () => {
      const invalidCases = [
        {
          data: { name: '', email: 'invalid', password: '123', confirmPassword: '456' },
          description: 'Empty name, invalid email, weak password, mismatched confirmation'
        },
        {
          data: { name: 'Test', email: testUser.email, password: 'ValidPass123!', confirmPassword: 'ValidPass123!' },
          description: 'Duplicate email'
        }
      ];

      for (const testCase of invalidCases) {
        const response = await request(app)
          .post('/api/auth/register')
          .send(testCase.data)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors || response.body.message).toBeDefined();
      }
    });

    test('POST /api/auth/login - Valid Login', async () => {
      const loginData = {
        email: testUser.email,
        password: 'ValidPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      
      authCookie = response.headers['set-cookie'];
      testUser.id = response.body.user.id;
    });

    test('POST /api/auth/login - Invalid Credentials', async () => {
      const invalidLogins = [
        { email: 'nonexistent@example.com', password: 'password' },
        { email: testUser.email, password: 'wrongpassword' },
        { email: '', password: '' }
      ];

      for (const loginData of invalidLogins) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);

        expect(response.body.success).toBe(false);
      }
    });

    test('POST /api/auth/logout - Valid Logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /api/auth/me - Authentication Check', async () => {
      // Should fail without authentication
      await request(app)
        .get('/api/auth/me')
        .expect(401);

      // Login again for subsequent tests
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'ValidPassword123!'
        })
        .expect(200);

      authCookie = loginResponse.headers['set-cookie'];

      // Should succeed with authentication
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie)
        .expect(200);

      expect(meResponse.body.success).toBe(true);
      expect(meResponse.body.user.id).toBe(testUser.id);
    });
  });

  describe('Practices API Validation', () => {
    
    test('GET /api/practices - List Practices with Pagination', async () => {
      const testCases = [
        { query: {}, description: 'Default parameters' },
        { query: { page: 1, limit: 5 }, description: 'Custom pagination' },
        { query: { page: 2, limit: 10 }, description: 'Second page' },
        { query: { type: 'ceremony' }, description: 'Filter by type' },
        { query: { tag: 'communication' }, description: 'Filter by tag' }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .get('/api/practices')
          .query(testCase.query)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.pagination).toBeDefined();
        expect(response.body.pagination.page).toBeGreaterThan(0);
        expect(response.body.pagination.limit).toBeGreaterThan(0);
      }
    });

    test('GET /api/practices/search - Search Practices', async () => {
      const searchTerms = ['standup', 'retrospective', 'planning', 'review'];

      for (const term of searchTerms) {
        const response = await request(app)
          .get('/api/practices/search')
          .query({ q: term, limit: 10 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        
        // If results found, verify they contain the search term
        if (response.body.data.length > 0) {
          const hasMatchingResult = response.body.data.some(practice => 
            practice.name.toLowerCase().includes(term.toLowerCase()) ||
            practice.description.toLowerCase().includes(term.toLowerCase())
          );
          expect(hasMatchingResult).toBe(true);
        }
      }
    });

    test('GET /api/practices/:id - Get Practice Details', async () => {
      // First get a practice ID
      const listResponse = await request(app)
        .get('/api/practices')
        .query({ limit: 1 })
        .expect(200);

      if (listResponse.body.data && listResponse.body.data.length > 0) {
        const practiceId = listResponse.body.data[0].id;

        const response = await request(app)
          .get(`/api/practices/${practiceId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.id).toBe(practiceId);
        expect(response.body.data.name).toBeDefined();
        expect(response.body.data.description).toBeDefined();
      }
    });

    test('GET /api/practices/:id - Invalid Practice ID', async () => {
      const response = await request(app)
        .get('/api/practices/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('GET /api/practices/by-goals - Filter by Goals', async () => {
      const response = await request(app)
        .get('/api/practices/by-goals')
        .query({ goalIds: '1,2,3' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Teams API Validation', () => {
    let testTeam;

    test('POST /api/teams - Create Team (Authenticated)', async () => {
      const teamData = {
        name: `API Validation Team ${Date.now()}`,
        description: 'Team created for API validation testing'
      };

      const response = await request(app)
        .post('/api/teams')
        .set('Cookie', authCookie)
        .send(teamData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(teamData.name);
      expect(response.body.data.description).toBe(teamData.description);
      
      testTeam = response.body.data;
    });

    test('POST /api/teams - Create Team (Unauthenticated)', async () => {
      const teamData = {
        name: 'Unauthorized Team',
        description: 'This should fail'
      };

      const response = await request(app)
        .post('/api/teams')
        .send(teamData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('GET /api/teams - List User Teams', async () => {
      const response = await request(app)
        .get('/api/teams')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Should include the team we just created
      const createdTeam = response.body.data.find(team => team.id === testTeam.id);
      expect(createdTeam).toBeDefined();
    });

    test('GET /api/teams/:id - Get Team Details', async () => {
      const response = await request(app)
        .get(`/api/teams/${testTeam.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testTeam.id);
      expect(response.body.data.name).toBe(testTeam.name);
    });

    test('PUT /api/teams/:id - Update Team', async () => {
      const updateData = {
        name: testTeam.name + ' Updated',
        description: 'Updated description for API validation'
      };

      const response = await request(app)
        .put(`/api/teams/${testTeam.id}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });

    test('POST /api/teams/:id/invite - Invite Team Member', async () => {
      const inviteData = {
        email: `invited.${Date.now()}@example.com`,
        message: 'Join our API validation team!'
      };

      const response = await request(app)
        .post(`/api/teams/${testTeam.id}/invite`)
        .set('Cookie', authCookie)
        .send(inviteData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Affinity API Validation', () => {
    
    test('POST /api/affinity/personality - Create Personality Profile', async () => {
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
      expect(response.body.data.e).toBe(personalityData.e);
      expect(response.body.data.a).toBe(personalityData.a);
      expect(response.body.data.n).toBe(personalityData.n);
    });

    test('POST /api/affinity/personality - Invalid Personality Data', async () => {
      const invalidData = {
        o: 150, // Invalid: > 100
        c: -10, // Invalid: < 0
        e: 'invalid', // Invalid: not a number
        a: 70,
        n: 45
      };

      const response = await request(app)
        .post('/api/affinity/personality')
        .set('Cookie', authCookie)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('GET /api/affinity/personality - Get Personality Profile', async () => {
      const response = await request(app)
        .get('/api/affinity/personality')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.o).toBeDefined();
      expect(response.body.data.c).toBeDefined();
      expect(response.body.data.e).toBeDefined();
      expect(response.body.data.a).toBeDefined();
      expect(response.body.data.n).toBeDefined();
    });

    test('POST /api/affinity/practice - Create Practice Affinity', async () => {
      // Get a practice to create affinity for
      const practicesResponse = await request(app)
        .get('/api/practices')
        .query({ limit: 1 })
        .expect(200);

      if (practicesResponse.body.data && practicesResponse.body.data.length > 0) {
        const practice = practicesResponse.body.data[0];
        
        const affinityData = {
          practiceVersionId: practice.versionId || practice.id,
          affinity: 85
        };

        const response = await request(app)
          .post('/api/affinity/practice')
          .set('Cookie', authCookie)
          .send(affinityData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.affinity).toBe(affinityData.affinity);
      }
    });

    test('GET /api/affinity/user-affinities - Get User Affinities', async () => {
      const response = await request(app)
        .get('/api/affinity/user-affinities')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Dashboard API Validation', () => {
    
    test('GET /api/dashboard/teams/:id - Get Team Dashboard', async () => {
      // Get user's teams first
      const teamsResponse = await request(app)
        .get('/api/teams')
        .set('Cookie', authCookie)
        .expect(200);

      if (teamsResponse.body.data && teamsResponse.body.data.length > 0) {
        const team = teamsResponse.body.data[0];

        const response = await request(app)
          .get(`/api/dashboard/teams/${team.id}`)
          .set('Cookie', authCookie)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.team).toBeDefined();
        expect(response.body.data.team.id).toBe(team.id);
        expect(response.body.data.activePractices).toBeDefined();
        expect(response.body.data.oarCoverage).toBeDefined();
      }
    });

    test('GET /api/dashboard/user - Get User Dashboard', async () => {
      const response = await request(app)
        .get('/api/dashboard/user')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.personalityProfile).toBeDefined();
      expect(response.body.data.teams).toBeDefined();
    });
  });

  describe('Recommendations API Validation', () => {
    
    test('GET /api/recommendations/comprehensive - Get Comprehensive Recommendations', async () => {
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

    test('GET /api/recommendations/context-aware - Get Context-Aware Recommendations', async () => {
      const response = await request(app)
        .get('/api/recommendations/context-aware')
        .set('Cookie', authCookie)
        .query({ teamMemberIds: testUser.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Methods and Activities API Validation', () => {
    
    test('GET /api/methods - List Methods', async () => {
      const response = await request(app)
        .get('/api/methods')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    test('GET /api/activities - List Activities', async () => {
      const response = await request(app)
        .get('/api/activities')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('Visualization API Validation', () => {
    
    test('GET /api/visualization/practice/:id/cards - Get Practice Cards', async () => {
      // Get a practice first
      const practicesResponse = await request(app)
        .get('/api/practices')
        .query({ limit: 1 })
        .expect(200);

      if (practicesResponse.body.data && practicesResponse.body.data.length > 0) {
        const practice = practicesResponse.body.data[0];

        const response = await request(app)
          .get(`/api/visualization/practice/${practice.id}/cards`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.cards).toBeDefined();
      }
    });
  });

  describe('Performance API Validation', () => {
    
    test('GET /api/performance/health - System Health Check', async () => {
      const response = await request(app)
        .get('/api/performance/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.database.connected).toBe(true);
      expect(response.body.cache.connected).toBe(true);
      expect(response.body.timestamp).toBeDefined();
    });

    test('GET /api/performance/metrics - System Metrics', async () => {
      const response = await request(app)
        .get('/api/performance/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.memory).toBeDefined();
      expect(response.body.data.uptime).toBeDefined();
    });
  });

  describe('Error Handling Validation', () => {
    
    test('404 - Non-existent Routes', async () => {
      const nonExistentRoutes = [
        '/api/nonexistent',
        '/api/practices/nonexistent/action',
        '/api/teams/99999/nonexistent'
      ];

      for (const route of nonExistentRoutes) {
        const response = await request(app)
          .get(route)
          .expect(404);

        expect(response.body.error).toBeDefined();
      }
    });

    test('401 - Unauthorized Access', async () => {
      const protectedRoutes = [
        { method: 'get', path: '/api/teams' },
        { method: 'post', path: '/api/teams' },
        { method: 'get', path: '/api/dashboard/user' },
        { method: 'post', path: '/api/affinity/personality' }
      ];

      for (const route of protectedRoutes) {
        const response = await request(app)[route.method](route.path);
        
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });

    test('400 - Invalid Request Data', async () => {
      // Test with malformed JSON
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});