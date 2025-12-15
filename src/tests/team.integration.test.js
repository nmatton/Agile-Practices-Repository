const request = require('supertest');
const app = require('../server');
const pool = require('../config/database');

describe('Team Management Integration Tests', () => {
  let authCookie;
  let userId;

  beforeAll(async () => {
    // Clean up test data in correct order (respecting foreign key constraints)
    await pool.query('DELETE FROM teammember WHERE teamid IN (SELECT id FROM team WHERE name LIKE $1)', ['Test%']);
    await pool.query('DELETE FROM universe WHERE teamid IN (SELECT id FROM team WHERE name LIKE $1)', ['Test%']);
    await pool.query('DELETE FROM team WHERE name LIKE $1', ['Test%']);
    await pool.query('DELETE FROM person WHERE email LIKE $1', ['test%']);
  });

  afterAll(async () => {
    // Clean up test data in correct order (respecting foreign key constraints)
    await pool.query('DELETE FROM teammember WHERE teamid IN (SELECT id FROM team WHERE name LIKE $1)', ['Test%']);
    await pool.query('DELETE FROM universe WHERE teamid IN (SELECT id FROM team WHERE name LIKE $1)', ['Test%']);
    await pool.query('DELETE FROM team WHERE name LIKE $1', ['Test%']);
    await pool.query('DELETE FROM person WHERE email LIKE $1', ['test%']);
  });

  beforeEach(async () => {
    // Create a test user and login
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: `test_${Date.now()}@example.com`,
        password: 'password123',
        confirmPassword: 'password123'
      });

    expect(registerResponse.status).toBe(201);
    userId = registerResponse.body.user.id;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: registerResponse.body.user.email,
        password: 'password123'
      });

    expect(loginResponse.status).toBe(200);
    authCookie = loginResponse.headers['set-cookie'];
  });

  describe('Team Creation', () => {
    it('should create a team and establish membership', async () => {
      const teamData = {
        name: `Test Team ${Date.now()}`,
        description: 'A test team for integration testing'
      };

      const response = await request(app)
        .post('/api/teams')
        .set('Cookie', authCookie)
        .send(teamData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Team created successfully');
      expect(response.body.team.name).toBe(teamData.name);
      expect(response.body.team.description).toBe(teamData.description);
      expect(response.body.universe).toBeDefined();
      expect(response.body.universe.name).toBe(`${teamData.name} Universe`);

      // Verify team membership
      const teamDetailsResponse = await request(app)
        .get(`/api/teams/${response.body.team.id}`)
        .set('Cookie', authCookie);

      expect(teamDetailsResponse.status).toBe(200);
      expect(teamDetailsResponse.body.members).toHaveLength(1);
      expect(teamDetailsResponse.body.members[0].id).toBe(userId);
    });

    it('should reject duplicate team names', async () => {
      const teamName = `Duplicate Team ${Date.now()}`;

      // Create first team
      const firstResponse = await request(app)
        .post('/api/teams')
        .set('Cookie', authCookie)
        .send({
          name: teamName,
          description: 'First team'
        });

      expect(firstResponse.status).toBe(201);

      // Try to create second team with same name
      const secondResponse = await request(app)
        .post('/api/teams')
        .set('Cookie', authCookie)
        .send({
          name: teamName,
          description: 'Second team'
        });

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.error).toBe('Team name already exists');
    });
  });

  describe('Team Invitations', () => {
    let teamId;

    beforeEach(async () => {
      // Create a team for invitation tests
      const teamResponse = await request(app)
        .post('/api/teams')
        .set('Cookie', authCookie)
        .send({
          name: `Invitation Team ${Date.now()}`,
          description: 'Team for testing invitations'
        });

      expect(teamResponse.status).toBe(201);
      teamId = teamResponse.body.team.id;
    });

    it('should send team invitation', async () => {
      const invitationData = {
        email: `invitee_${Date.now()}@example.com`
      };

      const response = await request(app)
        .post(`/api/teams/${teamId}/invite`)
        .set('Cookie', authCookie)
        .send(invitationData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Invitation sent successfully');
      expect(response.body.invitedEmail).toBe(invitationData.email);
    });

    it('should reject invalid email formats', async () => {
      const response = await request(app)
        .post(`/api/teams/${teamId}/invite`)
        .set('Cookie', authCookie)
        .send({
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid email format');
    });

    it('should reject invitation to non-existent team', async () => {
      const response = await request(app)
        .post('/api/teams/99999/invite')
        .set('Cookie', authCookie)
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Team not found');
    });
  });

  describe('Team Joining', () => {
    let teamId;

    beforeEach(async () => {
      // Create a team
      const teamResponse = await request(app)
        .post('/api/teams')
        .set('Cookie', authCookie)
        .send({
          name: `Join Team ${Date.now()}`,
          description: 'Team for testing joining'
        });

      teamId = teamResponse.body.team.id;
    });

    it('should allow user to join team', async () => {
      // Create another user
      const newUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: `newuser_${Date.now()}@example.com`,
          password: 'password123',
          confirmPassword: 'password123'
        });

      const newUserLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: newUserResponse.body.user.email,
          password: 'password123'
        });

      const newUserCookie = newUserLogin.headers['set-cookie'];

      // Join the team
      const joinResponse = await request(app)
        .post(`/api/teams/${teamId}/join`)
        .set('Cookie', newUserCookie);

      expect(joinResponse.status).toBe(200);
      expect(joinResponse.body.message).toBe('Successfully joined team');

      // Verify membership
      const teamDetailsResponse = await request(app)
        .get(`/api/teams/${teamId}`)
        .set('Cookie', newUserCookie);

      expect(teamDetailsResponse.status).toBe(200);
      expect(teamDetailsResponse.body.members).toHaveLength(2);
    });
  });

  describe('Universe Management', () => {
    let teamId;

    beforeEach(async () => {
      // Create a team
      const teamResponse = await request(app)
        .post('/api/teams')
        .set('Cookie', authCookie)
        .send({
          name: `Universe Team ${Date.now()}`,
          description: 'Team for testing universes'
        });

      teamId = teamResponse.body.team.id;
    });

    it('should create universe for team', async () => {
      const universeData = {
        name: `Test Universe ${Date.now()}`,
        description: 'A test universe'
      };

      const response = await request(app)
        .post(`/api/teams/${teamId}/universes`)
        .set('Cookie', authCookie)
        .send(universeData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Universe created successfully');
      expect(response.body.universe.name).toBe(universeData.name);
      expect(response.body.universe.teamId).toBe(teamId);
    });

    it('should get team universes', async () => {
      const response = await request(app)
        .get(`/api/teams/${teamId}/universes`)
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.universes).toBeDefined();
      expect(Array.isArray(response.body.universes)).toBe(true);
      // Should have at least the default universe created during team creation
      expect(response.body.universes.length).toBeGreaterThan(0);
    });
  });
});