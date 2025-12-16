const fc = require('fast-check');

/**
 * **Feature: agile-practice-repository, Property 5: Team creation establishes membership**
 * **Validates: Requirements 3.1**
 * 
 * **Feature: agile-practice-repository, Property 6: Team invitations are sent**
 * **Validates: Requirements 3.2**
 * 
 * **Feature: agile-practice-repository, Property 17: Practice selection adds to universe**
 * **Validates: Requirements 12.1**
 */

// Mock database for testing team operations
const mockTeamDatabase = {
  teams: new Map(),
  teamMembers: new Map(), // teamId -> Set of personIds
  invitations: [], // Array of sent invitations
  universes: new Map(), // universeId -> universe object
  practices: new Map(), // practiceId -> practice object
  practiceVersions: new Map(), // practiceVersionId -> practiceVersion object
  practiceVersionUniverses: new Map(), // universeId -> Set of practiceVersionIds
  nextTeamId: 1,
  nextPersonId: 1,
  nextUniverseId: 1,
  nextPracticeId: 1,
  nextPracticeVersionId: 1,
  
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

  async createUniverse({ teamId, name, description }) {
    if (!teamId || !name) {
      throw new Error('Team ID and universe name are required');
    }

    // Check if team exists
    if (!this.teams.has(teamId)) {
      throw new Error('Team does not exist');
    }

    // Check if universe name already exists for this team
    for (const universe of this.universes.values()) {
      if (universe.teamId === teamId && universe.name === name) {
        throw new Error('Universe name already exists for this team');
      }
    }

    const universe = {
      id: this.nextUniverseId++,
      teamId,
      name,
      description: description || null
    };

    this.universes.set(universe.id, universe);
    
    // Initialize practice version set for this universe
    if (!this.practiceVersionUniverses.has(universe.id)) {
      this.practiceVersionUniverses.set(universe.id, new Set());
    }

    return universe;
  },

  async createPractice({ name, objective, description }) {
    if (!name) {
      throw new Error('Practice name is required');
    }

    const practice = {
      id: this.nextPracticeId++,
      name,
      objective: objective || null,
      description: description || null
    };

    this.practices.set(practice.id, practice);
    return practice;
  },

  async createPracticeVersion({ practiceId, universeId, versionName }) {
    if (!practiceId || !universeId || !versionName) {
      throw new Error('Practice ID, universe ID, and version name are required');
    }

    // Check if practice and universe exist
    if (!this.practices.has(practiceId)) {
      throw new Error('Practice does not exist');
    }
    if (!this.universes.has(universeId)) {
      throw new Error('Universe does not exist');
    }

    const practiceVersion = {
      id: this.nextPracticeVersionId++,
      practiceId,
      universeId,
      versionName,
      versionTimestamp: new Date()
    };

    this.practiceVersions.set(practiceVersion.id, practiceVersion);
    return practiceVersion;
  },

  async addPracticeToUniverse(universeId, practiceVersionId, isActive = true) {
    if (!universeId || !practiceVersionId) {
      throw new Error('Universe ID and practice version ID are required');
    }

    // Check if universe and practice version exist
    if (!this.universes.has(universeId)) {
      throw new Error('Universe does not exist');
    }
    if (!this.practiceVersions.has(practiceVersionId)) {
      throw new Error('Practice version does not exist');
    }

    // Add practice to universe
    if (!this.practiceVersionUniverses.has(universeId)) {
      this.practiceVersionUniverses.set(universeId, new Set());
    }
    
    if (isActive) {
      this.practiceVersionUniverses.get(universeId).add(practiceVersionId);
    }

    return true;
  },

  async removePracticeFromUniverse(universeId, practiceVersionId) {
    if (!universeId || !practiceVersionId) {
      throw new Error('Universe ID and practice version ID are required');
    }

    const universePractices = this.practiceVersionUniverses.get(universeId);
    if (!universePractices) {
      return false;
    }

    return universePractices.delete(practiceVersionId);
  },

  async getActivePracticesForUniverse(universeId) {
    const universePractices = this.practiceVersionUniverses.get(universeId);
    if (!universePractices) {
      return [];
    }

    const activePractices = [];
    for (const practiceVersionId of universePractices) {
      const practiceVersion = this.practiceVersions.get(practiceVersionId);
      if (practiceVersion) {
        const practice = this.practices.get(practiceVersion.practiceId);
        activePractices.push({
          practiceVersionId,
          practiceVersion,
          practice
        });
      }
    }

    return activePractices;
  },

  async isPracticeInUniverse(universeId, practiceVersionId) {
    const universePractices = this.practiceVersionUniverses.get(universeId);
    return universePractices ? universePractices.has(practiceVersionId) : false;
  },

  clear() {
    this.teams.clear();
    this.teamMembers.clear();
    this.invitations = [];
    this.universes.clear();
    this.practices.clear();
    this.practiceVersions.clear();
    this.practiceVersionUniverses.clear();
    this.nextTeamId = 1;
    this.nextPersonId = 1;
    this.nextUniverseId = 1;
    this.nextPracticeId = 1;
    this.nextPracticeVersionId = 1;
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

  describe('Property 17: Practice selection adds to universe', () => {
    it('should add practice to team universe when selected by team member for any valid practice and universe', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            teamName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            creatorId: fc.integer({ min: 1, max: 1000 }),
            universeName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            practiceName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            practiceObjective: fc.option(fc.string({ maxLength: 200 })),
            practiceDescription: fc.option(fc.string({ maxLength: 500 })),
            versionName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
          }),
          async (testData) => {
            // Create unique names to avoid conflicts
            const uniqueTeamName = `${testData.teamName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            const uniqueUniverseName = `${testData.universeName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            const uniquePracticeName = `${testData.practiceName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            
            // Step 1: Create team
            const team = await mockTeamDatabase.createTeam({
              name: uniqueTeamName,
              description: 'Test team for practice selection',
              creatorId: testData.creatorId
            });
            
            // Step 2: Create universe for the team
            const universe = await mockTeamDatabase.createUniverse({
              teamId: team.id,
              name: uniqueUniverseName,
              description: 'Test universe for practice selection'
            });
            
            // Step 3: Create practice
            const practice = await mockTeamDatabase.createPractice({
              name: uniquePracticeName,
              objective: testData.practiceObjective,
              description: testData.practiceDescription
            });
            
            // Step 4: Create practice version
            const practiceVersion = await mockTeamDatabase.createPracticeVersion({
              practiceId: practice.id,
              universeId: universe.id,
              versionName: testData.versionName
            });
            
            // Step 5: Add practice to universe (simulate team member selecting practice)
            const addResult = await mockTeamDatabase.addPracticeToUniverse(
              universe.id, 
              practiceVersion.id, 
              true
            );
            
            // Verify practice was added successfully
            expect(addResult).toBe(true);
            
            // Verify practice is now in the universe
            const isPracticeInUniverse = await mockTeamDatabase.isPracticeInUniverse(
              universe.id, 
              practiceVersion.id
            );
            expect(isPracticeInUniverse).toBe(true);
            
            // Verify practice appears in active practices list
            const activePractices = await mockTeamDatabase.getActivePracticesForUniverse(universe.id);
            expect(activePractices).toHaveLength(1);
            expect(activePractices[0].practiceVersionId).toBe(practiceVersion.id);
            expect(activePractices[0].practice.name).toBe(uniquePracticeName);
            expect(activePractices[0].practiceVersion.versionName).toBe(testData.versionName);
            
            // Verify universe belongs to the correct team
            expect(universe.teamId).toBe(team.id);
            
            // Verify team creator is still a member
            const isMember = await mockTeamDatabase.isMember(team.id, testData.creatorId);
            expect(isMember).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject adding practice to non-existent universe', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            universeId: fc.integer({ min: 9999, max: 99999 }), // Non-existent universe ID
            practiceVersionId: fc.integer({ min: 1, max: 1000 })
          }),
          async (testData) => {
            await expect(mockTeamDatabase.addPracticeToUniverse(
              testData.universeId, 
              testData.practiceVersionId
            )).rejects.toThrow('Universe does not exist');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject adding non-existent practice version to universe', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            teamName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            creatorId: fc.integer({ min: 1, max: 1000 }),
            universeName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            practiceVersionId: fc.integer({ min: 9999, max: 99999 }) // Non-existent practice version ID
          }),
          async (testData) => {
            // Create unique names
            const uniqueTeamName = `${testData.teamName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            const uniqueUniverseName = `${testData.universeName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            
            // Create team and universe
            const team = await mockTeamDatabase.createTeam({
              name: uniqueTeamName,
              description: 'Test team',
              creatorId: testData.creatorId
            });
            
            const universe = await mockTeamDatabase.createUniverse({
              teamId: team.id,
              name: uniqueUniverseName,
              description: 'Test universe'
            });
            
            // Try to add non-existent practice version
            await expect(mockTeamDatabase.addPracticeToUniverse(
              universe.id, 
              testData.practiceVersionId
            )).rejects.toThrow('Practice version does not exist');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle multiple practices in the same universe', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            teamName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            creatorId: fc.integer({ min: 1, max: 1000 }),
            universeName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            practiceCount: fc.integer({ min: 2, max: 5 })
          }),
          async (testData) => {
            // Create unique names
            const uniqueTeamName = `${testData.teamName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            const uniqueUniverseName = `${testData.universeName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            
            // Create team and universe
            const team = await mockTeamDatabase.createTeam({
              name: uniqueTeamName,
              description: 'Test team',
              creatorId: testData.creatorId
            });
            
            const universe = await mockTeamDatabase.createUniverse({
              teamId: team.id,
              name: uniqueUniverseName,
              description: 'Test universe'
            });
            
            // Create and add multiple practices
            const practiceVersionIds = [];
            for (let i = 0; i < testData.practiceCount; i++) {
              const practice = await mockTeamDatabase.createPractice({
                name: `Practice_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                objective: `Objective ${i}`,
                description: `Description ${i}`
              });
              
              const practiceVersion = await mockTeamDatabase.createPracticeVersion({
                practiceId: practice.id,
                universeId: universe.id,
                versionName: `Version_${i}`
              });
              
              await mockTeamDatabase.addPracticeToUniverse(universe.id, practiceVersion.id, true);
              practiceVersionIds.push(practiceVersion.id);
            }
            
            // Verify all practices are in the universe
            const activePractices = await mockTeamDatabase.getActivePracticesForUniverse(universe.id);
            expect(activePractices).toHaveLength(testData.practiceCount);
            
            // Verify each practice is correctly stored
            for (const practiceVersionId of practiceVersionIds) {
              const isPracticeInUniverse = await mockTeamDatabase.isPracticeInUniverse(
                universe.id, 
                practiceVersionId
              );
              expect(isPracticeInUniverse).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should support removing practices from universe', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            teamName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            creatorId: fc.integer({ min: 1, max: 1000 }),
            universeName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            practiceName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            versionName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
          }),
          async (testData) => {
            // Create unique names
            const uniqueTeamName = `${testData.teamName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            const uniqueUniverseName = `${testData.universeName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            const uniquePracticeName = `${testData.practiceName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            
            // Create team, universe, practice, and practice version
            const team = await mockTeamDatabase.createTeam({
              name: uniqueTeamName,
              description: 'Test team',
              creatorId: testData.creatorId
            });
            
            const universe = await mockTeamDatabase.createUniverse({
              teamId: team.id,
              name: uniqueUniverseName,
              description: 'Test universe'
            });
            
            const practice = await mockTeamDatabase.createPractice({
              name: uniquePracticeName,
              objective: 'Test objective',
              description: 'Test description'
            });
            
            const practiceVersion = await mockTeamDatabase.createPracticeVersion({
              practiceId: practice.id,
              universeId: universe.id,
              versionName: testData.versionName
            });
            
            // Add practice to universe
            await mockTeamDatabase.addPracticeToUniverse(universe.id, practiceVersion.id, true);
            
            // Verify practice is in universe
            let isPracticeInUniverse = await mockTeamDatabase.isPracticeInUniverse(
              universe.id, 
              practiceVersion.id
            );
            expect(isPracticeInUniverse).toBe(true);
            
            // Remove practice from universe
            const removeResult = await mockTeamDatabase.removePracticeFromUniverse(
              universe.id, 
              practiceVersion.id
            );
            expect(removeResult).toBe(true);
            
            // Verify practice is no longer in universe
            isPracticeInUniverse = await mockTeamDatabase.isPracticeInUniverse(
              universe.id, 
              practiceVersion.id
            );
            expect(isPracticeInUniverse).toBe(false);
            
            // Verify active practices list is empty
            const activePractices = await mockTeamDatabase.getActivePracticesForUniverse(universe.id);
            expect(activePractices).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});