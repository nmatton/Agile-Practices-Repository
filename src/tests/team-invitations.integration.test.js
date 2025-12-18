const request = require('supertest');
const app = require('../server');
const pool = require('../config/database');
const Person = require('../models/Person');
const Team = require('../models/Team');
const TeamInvitation = require('../models/TeamInvitation');

describe('Team Invitations Integration Tests', () => {
  let testUser, testTeam, agent;

  beforeAll(async () => {
    // Create test user
    testUser = await Person.create({
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'password123'
    });

    // Create test team
    testTeam = await Team.create({
      name: 'Test Team',
      description: 'A test team',
      creatorId: testUser.id
    });

    // Create authenticated agent
    agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'password123'
      });
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM teamInvitation WHERE teamId = $1', [testTeam.id]);
    await pool.query('DELETE FROM teamMember WHERE teamId = $1', [testTeam.id]);
    await pool.query('DELETE FROM Team WHERE id = $1', [testTeam.id]);
    await pool.query('DELETE FROM Person WHERE id = $1', [testUser.id]);
  });

  describe('POST /api/teams/:teamId/invite', () => {
    it('should send invitation to new email', async () => {
      const response = await agent
        .post(`/api/teams/${testTeam.id}/invite`)
        .send({
          email: 'newmember@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Invitation sent successfully');
      expect(response.body.data.invitedEmail).toBe('newmember@example.com');
    });

    it('should add existing user immediately to team', async () => {
      // Create another user
      const existingUser = await Person.create({
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'password123'
      });

      const response = await agent
        .post(`/api/teams/${testTeam.id}/invite`)
        .send({
          email: 'existing@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User added to team immediately (existing account)');
      expect(response.body.data.addedImmediately).toBe(true);

      // Verify user is now a team member
      const isMember = await testTeam.isMember(existingUser.id);
      expect(isMember).toBe(true);

      // Clean up
      await pool.query('DELETE FROM teamMember WHERE personId = $1', [existingUser.id]);
      await pool.query('DELETE FROM Person WHERE id = $1', [existingUser.id]);
    });

    it('should return error for already invited email', async () => {
      // First invitation
      await agent
        .post(`/api/teams/${testTeam.id}/invite`)
        .send({
          email: 'duplicate@example.com'
        });

      // Second invitation to same email should update timestamp
      const response = await agent
        .post(`/api/teams/${testTeam.id}/invite`)
        .send({
          email: 'duplicate@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/teams/:teamId', () => {
    it('should include invitations in team details', async () => {
      const response = await agent
        .get(`/api/teams/${testTeam.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.invitations).toBeDefined();
      expect(Array.isArray(response.body.data.invitations)).toBe(true);
    });
  });

  describe('POST /api/teams/:teamId/invite/:invitationId/resend', () => {
    it('should resend pending invitation', async () => {
      // Create an invitation
      const invitation = await TeamInvitation.create({
        teamId: testTeam.id,
        inviterPersonId: testUser.id,
        invitedEmail: 'resend@example.com'
      });

      const response = await agent
        .post(`/api/teams/${testTeam.id}/invite/${invitation.id}/resend`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Invitation resent successfully');
    });
  });

  describe('User Registration with Pending Invitations', () => {
    it('should automatically add user to teams when registering with invited email', async () => {
      // Create invitation
      await TeamInvitation.create({
        teamId: testTeam.id,
        inviterPersonId: testUser.id,
        invitedEmail: 'autoregister@example.com'
      });

      // Register user with invited email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Auto Register User',
          email: 'autoregister@example.com',
          password: 'password123',
          confirmPassword: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.joinedTeams).toBeDefined();
      expect(response.body.joinedTeams.length).toBeGreaterThan(0);

      // Verify user is team member
      const newUser = await Person.findByEmail('autoregister@example.com');
      const isMember = await testTeam.isMember(newUser.id);
      expect(isMember).toBe(true);

      // Clean up
      await pool.query('DELETE FROM teamMember WHERE personId = $1', [newUser.id]);
      await pool.query('DELETE FROM Person WHERE id = $1', [newUser.id]);
    });
  });
});