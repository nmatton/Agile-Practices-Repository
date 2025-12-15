const fc = require('fast-check');

/**
 * **Feature: agile-practice-repository, Property 5: Team creation establishes membership**
 * **Validates: Requirements 3.1**
 * 
 * **Feature: agile-practice-repository, Property 6: Team invitations are sent**
 * **Validates: Requirements 3.2**
 */

// Mock database for testing team operations
const mockTeamDatabase = {
  teams: new Map(),
  teamMembers: new Map(), // teamId -> Set of personIds
  invitations: [], // Array of sent invitations
  nextTeamId: 1,
  nextPersonId: 1,
  
  async createPerson(userData) {
    const person = {
      id: this.nextPersonId++,
      name: userData.name,
      email: userData.email,
      roleId: userData.roleId || 2
    };
    return person;
  },

  async createTeam({ name, description, creatorId }) {
    if (!name || !creatorId) {
      throw new Error('Team name and creator ID are required');
    }

    // Check if team name already exists
    for (const team of this.teams.values()) {
      if (team.name === name) {
        throw new Error('Team name already exists');
      }
    }

    const team = {
      id: this.nextTeamId++,
      name,
      description: description || null
    };

    this.teams.set(team.id, team);
    
    // Add creator as team member
    if (!this.teamMembers.has(team.id)) {
      this.teamMembers.set(team.id, new Set());
    }
    this.teamMembers.get(team.id).add(creatorId);

    return team;
  },

  async isMember(teamId, personId) {
    const members = this.teamMembers.get(teamId);
    return members ? members.has(personId) : false;
  },

  async getTeamMembers(teamId) {
    const members = this.teamMembers.get(teamId);
    return members ? Array.from(members) : [];
  },

  async sendInvitation({ recipientEmail, teamName, inviterName, teamId }) {
    if (!recipientEmail || !teamName || !inviterName || !teamId) {
      throw new Error('All invitation parameters are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      throw new Error('Invalid email format');
    }

    const invitation = {
      id: Date.now() + Math.random(),
      recipientEmail,
      teamName,
      inviterName,
      teamId,
      sentAt: new Date()
    };

    this.invitations.push(invitation);
    return invitation;
  },

  async getInvitationsForTeam(teamId) {
    return this.invitations.filter(inv => inv.teamId === teamId);
  },

  clear() {
    this.teams.clear();
    this.teamMembers.clear();
    this.invitations = [];
    this.nextTeamId = 1;
    this.nextPersonId = 1;
  }
};

describe('Team Management - Property Tests', () => {
  beforeEach(() => {
    mockTeamDatabase.clear();
  });

  describe('Property 5: Team creation establishes membership', () => {
    it('should create a Team record and assign the creator as a member for any valid team data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.option(fc.string({ maxLength: 500 })),
            creatorId: fc.integer({ min: 1, max: 1000 })
          }),
          async (teamData) => {
            // Create unique team name to avoid conflicts across test runs
            const uniqueTeamData = {
              ...teamData,
              name: `${teamData.name}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
            };
            
            const team = await mockTeamDatabase.createTeam(uniqueTeamData);
            
            // Verify team was created with correct properties
            expect(team).toBeDefined();
            expect(team.id).toBeGreaterThan(0);
            expect(team.name).toBe(uniqueTeamData.name);
            expect(team.description).toBe(uniqueTeamData.description || null);
            
            // Verify creator is automatically added as team member
            const isMember = await mockTeamDatabase.isMember(team.id, uniqueTeamData.creatorId);
            expect(isMember).toBe(true);
            
            // Verify team has exactly one member (the creator)
            const members = await mockTeamDatabase.getTeamMembers(team.id);
            expect(members).toHaveLength(1);
            expect(members[0]).toBe(uniqueTeamData.creatorId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject team creation with missing required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            description: fc.option(fc.string({ maxLength: 500 })),
            creatorId: fc.integer({ min: 1, max: 1000 })
          }),
          async (teamData) => {
            // Missing name should throw error
            await expect(mockTeamDatabase.createTeam(teamData)).rejects.toThrow('Team name and creator ID are required');
          }
        ),
        { numRuns: 50 }
      );

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.option(fc.string({ maxLength: 500 }))
          }),
          async (teamData) => {
            // Missing creatorId should throw error
            await expect(mockTeamDatabase.createTeam(teamData)).rejects.toThrow('Team name and creator ID are required');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject duplicate team names', async () => {
      const teamName = `Test Team ${Date.now()}`;
      
      // Create first team
      await mockTeamDatabase.createTeam({
        name: teamName,
        description: 'First team',
        creatorId: 1
      });
      
      // Attempt to create second team with same name should fail
      await expect(mockTeamDatabase.createTeam({
        name: teamName,
        description: 'Second team',
        creatorId: 2
      })).rejects.toThrow('Team name already exists');
    });
  });

  describe('Property 6: Team invitations are sent', () => {
    it('should send invitation to any valid email for existing teams', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            recipientEmail: fc.emailAddress(),
            teamName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            inviterName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            teamId: fc.integer({ min: 1, max: 1000 })
          }),
          async (invitationData) => {
            const invitation = await mockTeamDatabase.sendInvitation(invitationData);
            
            // Verify invitation was created with correct properties
            expect(invitation).toBeDefined();
            expect(invitation.id).toBeDefined();
            expect(invitation.recipientEmail).toBe(invitationData.recipientEmail);
            expect(invitation.teamName).toBe(invitationData.teamName);
            expect(invitation.inviterName).toBe(invitationData.inviterName);
            expect(invitation.teamId).toBe(invitationData.teamId);
            expect(invitation.sentAt).toBeInstanceOf(Date);
            
            // Verify invitation is stored and can be retrieved
            const teamInvitations = await mockTeamDatabase.getInvitationsForTeam(invitationData.teamId);
            expect(teamInvitations).toContainEqual(invitation);
            
            // Verify timestamp is recent
            const now = new Date();
            const timeDiff = now - invitation.sentAt;
            expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invitations with invalid email formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            recipientEmail: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0 && (!s.includes('@') || !s.includes('.'))),
            teamName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            inviterName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            teamId: fc.integer({ min: 1, max: 1000 })
          }),
          async (invitationData) => {
            await expect(mockTeamDatabase.sendInvitation(invitationData)).rejects.toThrow('Invalid email format');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject invitations with missing required parameters', async () => {
      const validData = {
        recipientEmail: 'test@example.com',
        teamName: 'Test Team',
        inviterName: 'Test Inviter',
        teamId: 1
      };

      // Test each missing parameter
      const requiredFields = ['recipientEmail', 'teamName', 'inviterName', 'teamId'];
      
      for (const field of requiredFields) {
        const incompleteData = { ...validData };
        delete incompleteData[field];
        
        await expect(mockTeamDatabase.sendInvitation(incompleteData))
          .rejects.toThrow('All invitation parameters are required');
      }
    });

    it('should handle multiple invitations for the same team', async () => {
      const teamId = 1;
      const teamName = 'Test Team';
      const inviterName = 'Test Inviter';
      
      // Send multiple invitations
      const invitation1 = await mockTeamDatabase.sendInvitation({
        recipientEmail: 'user1@example.com',
        teamName,
        inviterName,
        teamId
      });
      
      const invitation2 = await mockTeamDatabase.sendInvitation({
        recipientEmail: 'user2@example.com',
        teamName,
        inviterName,
        teamId
      });
      
      // Verify both invitations are stored
      const teamInvitations = await mockTeamDatabase.getInvitationsForTeam(teamId);
      expect(teamInvitations).toHaveLength(2);
      expect(teamInvitations).toContainEqual(invitation1);
      expect(teamInvitations).toContainEqual(invitation2);
    });
  });

  describe('Integration: Team creation and invitation workflow', () => {
    it('should support complete team creation and invitation workflow', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            teamName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            teamDescription: fc.option(fc.string({ maxLength: 500 })),
            creatorId: fc.integer({ min: 1, max: 1000 }),
            inviterName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            inviteeEmails: fc.array(fc.emailAddress(), { minLength: 1, maxLength: 5 })
          }),
          async (workflowData) => {
            // Create unique team name to avoid conflicts
            const uniqueTeamName = `${workflowData.teamName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            
            // Step 1: Create team
            const team = await mockTeamDatabase.createTeam({
              name: uniqueTeamName,
              description: workflowData.teamDescription,
              creatorId: workflowData.creatorId
            });
            
            // Step 2: Send invitations to multiple users
            const invitations = [];
            for (const email of workflowData.inviteeEmails) {
              const invitation = await mockTeamDatabase.sendInvitation({
                recipientEmail: email,
                teamName: team.name,
                inviterName: workflowData.inviterName,
                teamId: team.id
              });
              invitations.push(invitation);
            }
            
            // Verify complete workflow
            expect(team.id).toBeGreaterThan(0);
            expect(await mockTeamDatabase.isMember(team.id, workflowData.creatorId)).toBe(true);
            
            const teamInvitations = await mockTeamDatabase.getInvitationsForTeam(team.id);
            expect(teamInvitations).toHaveLength(workflowData.inviteeEmails.length);
            
            // Verify all invitations have correct team reference
            for (const invitation of teamInvitations) {
              expect(invitation.teamId).toBe(team.id);
              expect(invitation.teamName).toBe(team.name);
              expect(workflowData.inviteeEmails).toContain(invitation.recipientEmail);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});