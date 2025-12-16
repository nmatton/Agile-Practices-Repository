const fc = require('fast-check');
const request = require('supertest');
const app = require('../server');
const Person = require('../models/Person');
const pool = require('../config/database');

/**
 * **Feature: agile-practice-repository, Property 2: Invalid registration is rejected**
 * **Validates: Requirements 1.2**
 */

/**
 * **Feature: agile-practice-repository, Property 3: Valid authentication grants access**
 * **Validates: Requirements 2.1**
 */

/**
 * **Feature: agile-practice-repository, Property 4: Invalid authentication is denied**
 * **Validates: Requirements 2.2**
 */

describe('Authentication Security - Property Tests', () => {
  beforeEach(async () => {
    // Clean up test data in correct order (respecting foreign key constraints)
    await pool.query("DELETE FROM personpracticeaffinity WHERE personid IN (SELECT id FROM Person WHERE email LIKE '%test_%')");
    await pool.query("DELETE FROM affinitysurveyresults WHERE personid IN (SELECT id FROM Person WHERE email LIKE '%test_%')");
    await pool.query("DELETE FROM bfprofile WHERE personid IN (SELECT id FROM Person WHERE email LIKE '%test_%')");
    await pool.query("DELETE FROM Person WHERE email LIKE '%test_%'");
  });

  afterAll(async () => {
    // Clean up test data in correct order (respecting foreign key constraints)
    await pool.query("DELETE FROM personpracticeaffinity WHERE personid IN (SELECT id FROM Person WHERE email LIKE '%test_%')");
    await pool.query("DELETE FROM affinitysurveyresults WHERE personid IN (SELECT id FROM Person WHERE email LIKE '%test_%')");
    await pool.query("DELETE FROM bfprofile WHERE personid IN (SELECT id FROM Person WHERE email LIKE '%test_%')");
    await pool.query("DELETE FROM Person WHERE email LIKE '%test_%'");
  });

  describe('Property 2: Invalid registration is rejected', () => {
    it('should reject registration with invalid email formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            email: fc.string({ minLength: 1, maxLength: 50 }).filter(s => 
              s.trim().length > 0 && 
              (!s.includes('@') || !s.includes('.') || s.startsWith('@') || s.endsWith('@'))
            ),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            confirmPassword: fc.string({ minLength: 8, maxLength: 50 })
          }),
          async (userData) => {
            userData.confirmPassword = userData.password; // Ensure passwords match
            
            const response = await request(app)
              .post('/api/auth/register')
              .send(userData);
            
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid email format');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject registration with mismatched passwords', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            email: fc.emailAddress().map(email => `test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}_${email}`),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            confirmPassword: fc.string({ minLength: 8, maxLength: 50 })
          }).filter(data => data.password !== data.confirmPassword),
          async (userData) => {
            const response = await request(app)
              .post('/api/auth/register')
              .send(userData);
            
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Passwords do not match');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject registration with duplicate emails', async () => {
      const testEmail = `test_duplicate_${Date.now()}_${Math.random().toString(36).substring(2, 11)}@example.com`;
      
      // First registration should succeed
      const firstUser = {
        name: 'First User',
        email: testEmail,
        password: 'password123',
        confirmPassword: 'password123'
      };
      
      const firstResponse = await request(app)
        .post('/api/auth/register')
        .send(firstUser);
      
      expect(firstResponse.status).toBe(201);
      
      // Second registration with same email should fail
      const secondUser = {
        name: 'Second User',
        email: testEmail,
        password: 'differentpassword',
        confirmPassword: 'differentpassword'
      };
      
      const secondResponse = await request(app)
        .post('/api/auth/register')
        .send(secondUser);
      
      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.error).toBe('Email already exists');
    });
  });

  describe('Property 3: Valid authentication grants access', () => {
    it('should grant access for any valid user credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            email: fc.emailAddress().map(email => `test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}_${email}`),
            password: fc.string({ minLength: 8, maxLength: 50 })
          }),
          async (userData) => {
            // First register the user
            const registerResponse = await request(app)
              .post('/api/auth/register')
              .send({
                ...userData,
                confirmPassword: userData.password
              });
            
            expect(registerResponse.status).toBe(201);
            
            // Then try to login
            const loginResponse = await request(app)
              .post('/api/auth/login')
              .send({
                email: userData.email,
                password: userData.password
              });
            
            expect(loginResponse.status).toBe(200);
            expect(loginResponse.body.message).toBe('Login successful');
            expect(loginResponse.body.user).toBeDefined();
            expect(loginResponse.body.user.email).toBe(userData.email);
            expect(loginResponse.body.user.name).toBe(userData.name);
            expect(loginResponse.body.user.passwordHash).toBeUndefined();
            
            // Verify session was created by accessing protected endpoint
            const agent = request.agent(app);
            const loginWithAgent = await agent
              .post('/api/auth/login')
              .send({
                email: userData.email,
                password: userData.password
              });
            
            expect(loginWithAgent.status).toBe(200);
            
            const meResponse = await agent.get('/api/auth/me');
            expect(meResponse.status).toBe(200);
            expect(meResponse.body.user.email).toBe(userData.email);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 4: Invalid authentication is denied', () => {
    it('should deny access for any invalid password', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            email: fc.emailAddress().map(email => `test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}_${email}`),
            correctPassword: fc.string({ minLength: 8, maxLength: 50 }),
            wrongPassword: fc.string({ minLength: 8, maxLength: 50 })
          }).filter(data => data.correctPassword !== data.wrongPassword),
          async (userData) => {
            // First register the user
            const registerResponse = await request(app)
              .post('/api/auth/register')
              .send({
                name: userData.name,
                email: userData.email,
                password: userData.correctPassword,
                confirmPassword: userData.correctPassword
              });
            
            expect(registerResponse.status).toBe(201);
            
            // Try to login with wrong password
            const loginResponse = await request(app)
              .post('/api/auth/login')
              .send({
                email: userData.email,
                password: userData.wrongPassword
              });
            
            expect(loginResponse.status).toBe(401);
            expect(loginResponse.body.error).toBe('Invalid credentials');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should deny access for non-existent users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress().map(email => `nonexistent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}_${email}`),
            password: fc.string({ minLength: 8, maxLength: 50 })
          }),
          async (userData) => {
            const loginResponse = await request(app)
              .post('/api/auth/login')
              .send(userData);
            
            expect(loginResponse.status).toBe(401);
            expect(loginResponse.body.error).toBe('Invalid credentials');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should deny access to protected endpoints without authentication', async () => {
      const protectedEndpoints = [
        '/api/auth/me',
        '/api/auth/profile',
        '/api/auth/admin'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(401);
        expect(response.body.error).toMatch(/Authentication required|Not authenticated/);
      }
    });

    it('should deny access to role-specific endpoints for insufficient roles', async () => {
      // Create a regular team member (roleId = 2)
      const teamMemberEmail = `test_member_${Date.now()}_${Math.random().toString(36).substring(2, 11)}@example.com`;
      
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Team Member',
          email: teamMemberEmail,
          password: 'password123',
          confirmPassword: 'password123'
        });
      
      expect(registerResponse.status).toBe(201);
      
      // Login as team member
      const agent = request.agent(app);
      const loginResponse = await agent
        .post('/api/auth/login')
        .send({
          email: teamMemberEmail,
          password: 'password123'
        });
      
      expect(loginResponse.status).toBe(200);
      
      // Team member should be able to access profile (requires team member role)
      const profileResponse = await agent.get('/api/auth/profile');
      expect(profileResponse.status).toBe(200);
      
      // But should NOT be able to access admin (requires expert role)
      const adminResponse = await agent.get('/api/auth/admin');
      expect(adminResponse.status).toBe(403);
      expect(adminResponse.body.error).toBe('Insufficient permissions');
    });
  });
});