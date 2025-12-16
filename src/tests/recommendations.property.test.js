const fc = require('fast-check');
const RecommendationService = require('../services/recommendationService');
const PersonalityService = require('../services/personalityService');
const pool = require('../config/database');

// Mock database for property testing
const mockDb = {
  practices: new Map(),
  practiceVersions: new Map(),
  goals: new Map(),
  recommendations: new Map(),
  recommendationGoals: new Map(),
  persons: new Map(),
  affinities: new Map(),
  flags: new Map(),
  
  nextPracticeId: 1,
  nextVersionId: 1,
  nextGoalId: 1,
  nextRecommendationId: 1,
  nextPersonId: 1,
  nextAffinityId: 1,
  nextFlagId: 1,
  
  async createPractice(practiceData) {
    const practice = {
      id: this.nextPracticeId++,
      name: practiceData.name || `Practice ${this.nextPracticeId}`,
      objective: practiceData.objective || 'Test objective',
      description: practiceData.description || 'Test description'
    };
    this.practices.set(practice.id, practice);
    return practice;
  },
  
  async createPracticeVersion(versionData) {
    const version = {
      id: this.nextVersionId++,
      practiceId: versionData.practiceId,
      name: versionData.name || `Version ${this.nextVersionId}`,
      statusId: versionData.statusId || 2 // Published
    };
    this.practiceVersions.set(version.id, version);
    return version;
  },
  
  async createGoal(goalData) {
    const goal = {
      id: this.nextGoalId++,
      name: goalData.name || `Goal ${this.nextGoalId}`,
      description: goalData.description || 'Test goal description'
    };
    this.goals.set(goal.id, goal);
    return goal;
  },
  
  async createRecommendation(recData) {
    const recommendation = {
      id: this.nextRecommendationId++,
      practiceVersionId: recData.practiceVersionId,
      description: recData.description || 'Test recommendation',
      typeId: recData.typeId || 1 // Helpful
    };
    this.recommendations.set(recommendation.id, recommendation);
    return recommendation;
  },
  
  async linkRecommendationToGoal(recommendationId, goalId) {
    const key = `${recommendationId}-${goalId}`;
    this.recommendationGoals.set(key, { recommendationId, goalId });
  },
  
  async createPerson(personData) {
    const person = {
      id: this.nextPersonId++,
      name: personData.name || `Person ${this.nextPersonId}`,
      email: personData.email || `person${this.nextPersonId}@test.com`
    };
    this.persons.set(person.id, person);
    return person;
  },
  
  async createAffinity(affinityData) {
    const affinity = {
      id: this.nextAffinityId++,
      personId: affinityData.personId,
      practiceVersionId: affinityData.practiceVersionId,
      affinity: affinityData.affinity
    };
    this.affinities.set(affinity.id, affinity);
    return affinity;
  },
  
  async flagPractice(flagData) {
    const flag = {
      id: this.nextFlagId++,
      personId: flagData.personId,
      practiceVersionId: flagData.practiceVersionId,
      reason: flagData.reason || 'Test difficulty'
    };
    this.flags.set(flag.id, flag);
    return flag;
  },
  
  clear() {
    this.practices.clear();
    this.practiceVersions.clear();
    this.goals.clear();
    this.recommendations.clear();
    this.recommendationGoals.clear();
    this.persons.clear();
    this.affinities.clear();
    this.flags.clear();
    
    this.nextPracticeId = 1;
    this.nextVersionId = 1;
    this.nextGoalId = 1;
    this.nextRecommendationId = 1;
    this.nextPersonId = 1;
    this.nextAffinityId = 1;
    this.nextFlagId = 1;
  }
};

// Mock pool.query to use our mock database
const originalQuery = pool.query;

function mockPoolQuery(query, params = []) {
  // Mock queries for finding alternative practices with same goals
  if (query.includes('SELECT DISTINCT g.id, g.name, g.description FROM Goal g')) {
    const practiceVersionId = params[0];
    const goals = [];
    
    // Find recommendations for this practice version
    for (const [recId, rec] of mockDb.recommendations) {
      if (rec.practiceVersionId === practiceVersionId) {
        // Find goals linked to this recommendation
        for (const [key, link] of mockDb.recommendationGoals) {
          if (link.recommendationId === recId) {
            const goal = mockDb.goals.get(link.goalId);
            if (goal) {
              goals.push(goal);
            }
          }
        }
      }
    }
    
    return Promise.resolve({ rows: goals });
  }
  
  // Mock queries for finding alternative practice versions
  if (query.includes('SELECT DISTINCT pv.id, pv.practiceId, p.name, p.description, p.objective')) {
    const goalIds = params[0];
    const excludePracticeVersionId = params[1];
    const minGoalCount = params[2];
    
    const alternatives = [];
    
    for (const [versionId, version] of mockDb.practiceVersions) {
      if (versionId === excludePracticeVersionId) continue;
      
      // Count how many of the target goals this practice covers
      let goalCount = 0;
      for (const [recId, rec] of mockDb.recommendations) {
        if (rec.practiceVersionId === versionId) {
          for (const [key, link] of mockDb.recommendationGoals) {
            if (link.recommendationId === recId && goalIds.includes(link.goalId)) {
              goalCount++;
            }
          }
        }
      }
      
      if (goalCount >= minGoalCount) {
        const practice = mockDb.practices.get(version.practiceId);
        if (practice) {
          alternatives.push({
            id: versionId,
            practiceid: practice.id,
            name: practice.name,
            description: practice.description,
            objective: practice.objective
          });
        }
      }
    }
    
    return Promise.resolve({ rows: alternatives });
  }
  
  // Mock queries for context-aware recommendations
  if (query.includes('SELECT DISTINCT pv.id, pv.practiceId, p.name, p.description, p.objective')) {
    const alternatives = [];
    
    for (const [versionId, version] of mockDb.practiceVersions) {
      
      const practice = mockDb.practices.get(version.practiceId);
      if (practice) {
        // Find a recommendation for this practice
        const rec = Array.from(mockDb.recommendations.values())
          .find(r => r.practiceVersionId === versionId && r.typeId === 1);
        
        if (rec) {
          alternatives.push({
            id: versionId,
            practiceid: practice.id,
            name: practice.name,
            description: practice.description,
            objective: practice.objective,
            recommendationtext: rec.description,
            recommendationtype: rec.typeId
          });
        }
      }
    }
    
    return Promise.resolve({ rows: alternatives });
  }
  
  // Mock queries for flagged practices
  if (query.includes('SELECT DISTINCT pdf.practiceVersionId, pdf.reason')) {
    const teamMemberIds = params[0];
    const flagged = [];
    
    for (const [flagId, flag] of mockDb.flags) {
      if (teamMemberIds.includes(flag.personId)) {
        const version = mockDb.practiceVersions.get(flag.practiceVersionId);
        const practice = version ? mockDb.practices.get(version.practiceId) : null;
        
        if (practice) {
          flagged.push({
            practiceversionid: flag.practiceVersionId,
            practiceid: practice.id,
            name: practice.name,
            description: practice.description,
            flagcount: 1,
            reason: flag.reason
          });
        }
      }
    }
    
    return Promise.resolve({ rows: flagged });
  }
  
  // Default to original query for other cases
  return originalQuery.call(pool, query, params);
}

// Mock PersonalityService.calculateTeamAffinity
const originalCalculateTeamAffinity = PersonalityService.calculateTeamAffinity;
PersonalityService.calculateTeamAffinity = async (teamMemberIds, practiceVersionId) => {
  // Calculate mock team affinity based on individual affinities
  const individualAffinities = [];
  
  for (const personId of teamMemberIds) {
    const affinity = Array.from(mockDb.affinities.values())
      .find(a => a.personId === personId && a.practiceVersionId === practiceVersionId);
    
    if (affinity) {
      individualAffinities.push(affinity.affinity);
    } else {
      // Generate a random affinity if none exists
      individualAffinities.push(Math.floor(Math.random() * 100));
    }
  }
  
  if (individualAffinities.length === 0) {
    return { average: 50, minimum: 50, maximum: 50, standardDeviation: 0 };
  }
  
  const average = individualAffinities.reduce((sum, val) => sum + val, 0) / individualAffinities.length;
  const minimum = Math.min(...individualAffinities);
  const maximum = Math.max(...individualAffinities);
  
  return {
    average: Math.round(average),
    minimum,
    maximum,
    standardDeviation: 0,
    memberCount: teamMemberIds.length,
    individualScores: individualAffinities
  };
};

describe('Recommendation Service Property Tests', () => {
  beforeEach(() => {
    mockDb.clear();
    pool.query = mockPoolQuery;
  });
  
  afterAll(() => {
    pool.query = originalQuery;
    PersonalityService.calculateTeamAffinity = originalCalculateTeamAffinity;
  });

  /**
   * **Feature: agile-practice-repository, Property 18: Recommendations cover same objectives**
   * **Validates: Requirements 13.1**
   */
  describe('Property 18: Recommendations cover same objectives', () => {
    it('should recommend alternative practices that cover the same OARs with higher affinity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // Number of shared goals
          fc.integer({ min: 2, max: 6 }), // Number of team members
          fc.integer({ min: 2, max: 8 }), // Number of alternative practices
          fc.integer({ min: 10, max: 50 }), // Current practice affinity (low)
          fc.integer({ min: 60, max: 90 }), // Alternative practice affinity (high)
          async (goalCount, teamSize, altCount, currentAffinity, altAffinity) => {
            // Setup: Create goals
            const goals = [];
            for (let i = 0; i < goalCount; i++) {
              const goal = await mockDb.createGoal({ 
                name: `Goal ${i + 1}`,
                description: `Test goal ${i + 1}`
              });
              goals.push(goal);
            }
            
            // Setup: Create team members
            const teamMembers = [];
            for (let i = 0; i < teamSize; i++) {
              const person = await mockDb.createPerson({
                name: `Person ${i + 1}`,
                email: `person${i + 1}@test.com`
              });
              teamMembers.push(person);
            }
            const teamMemberIds = teamMembers.map(p => p.id);
            
            // Setup: Create current practice with low affinity
            const currentPractice = await mockDb.createPractice({
              name: 'Current Practice',
              objective: 'Current objective'
            });
            const currentVersion = await mockDb.createPracticeVersion({
              practiceId: currentPractice.id,
              name: 'Current Version'
            });
            
            // Create recommendation linking current practice to goals
            const currentRec = await mockDb.createRecommendation({
              practiceVersionId: currentVersion.id,
              description: 'Current recommendation'
            });
            
            // Link current practice to all goals
            for (const goal of goals) {
              await mockDb.linkRecommendationToGoal(currentRec.id, goal.id);
            }
            
            // Set low affinity for current practice
            for (const person of teamMembers) {
              await mockDb.createAffinity({
                personId: person.id,
                practiceVersionId: currentVersion.id,
                affinity: currentAffinity
              });
            }
            
            // Setup: Create alternative practices with higher affinity
            const alternatives = [];
            for (let i = 0; i < altCount; i++) {
              const altPractice = await mockDb.createPractice({
                name: `Alternative Practice ${i + 1}`,
                objective: `Alternative objective ${i + 1}`
              });
              const altVersion = await mockDb.createPracticeVersion({
                practiceId: altPractice.id,
                name: `Alternative Version ${i + 1}`
              });
              
              // Create recommendation for alternative
              const altRec = await mockDb.createRecommendation({
                practiceVersionId: altVersion.id,
                description: `Alternative recommendation ${i + 1}`
              });
              
              // Link alternative to same goals (at least 70% overlap)
              const goalsToLink = goals.slice(0, Math.ceil(goals.length * 0.7));
              for (const goal of goalsToLink) {
                await mockDb.linkRecommendationToGoal(altRec.id, goal.id);
              }
              
              // Set higher affinity for alternative
              for (const person of teamMembers) {
                await mockDb.createAffinity({
                  personId: person.id,
                  practiceVersionId: altVersion.id,
                  affinity: altAffinity + Math.floor(Math.random() * 10) // Slight variation
                });
              }
              
              alternatives.push(altVersion);
            }
            
            // Test: Get alternative recommendations
            const recommendations = await RecommendationService.findAlternativePractices(
              currentVersion.id,
              teamMemberIds,
              10 // Minimum improvement
            );
            
            // Verify: All recommendations should cover the same objectives
            expect(Array.isArray(recommendations)).toBe(true);
            
            for (const rec of recommendations) {
              // Each recommendation should have higher affinity than current
              expect(rec.alternativeAffinity.average).toBeGreaterThan(currentAffinity + 10);
              
              // Each recommendation should have shared goals
              expect(Array.isArray(rec.sharedGoals)).toBe(true);
              expect(rec.sharedGoals.length).toBeGreaterThan(0);
              
              // Shared goals should be a subset of the original goals
              const sharedGoalIds = rec.sharedGoals.map(g => g.id);
              const originalGoalIds = goals.map(g => g.id);
              for (const sharedId of sharedGoalIds) {
                expect(originalGoalIds).toContain(sharedId);
              }
              
              // Should have affinity improvement
              expect(rec.affinityImprovement).toBeGreaterThan(10);
              expect(rec.recommended).toBe(true);
            }
            
            // Recommendations should be sorted by affinity improvement (descending)
            for (let i = 1; i < recommendations.length; i++) {
              expect(recommendations[i - 1].affinityImprovement)
                .toBeGreaterThanOrEqual(recommendations[i].affinityImprovement);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
    
    it('should return empty array when no alternatives cover the same objectives', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }), // Number of goals for current practice
          fc.integer({ min: 2, max: 4 }), // Number of team members
          fc.integer({ min: 1, max: 3 }), // Number of alternative practices
          async (goalCount, teamSize, altCount) => {
            // Setup: Create goals for current practice
            const currentGoals = [];
            for (let i = 0; i < goalCount; i++) {
              const goal = await mockDb.createGoal({ 
                name: `Current Goal ${i + 1}`
              });
              currentGoals.push(goal);
            }
            
            // Setup: Create different goals for alternatives
            const altGoals = [];
            for (let i = 0; i < goalCount; i++) {
              const goal = await mockDb.createGoal({ 
                name: `Alt Goal ${i + 1}`
              });
              altGoals.push(goal);
            }
            
            // Setup: Create team members
            const teamMembers = [];
            for (let i = 0; i < teamSize; i++) {
              const person = await mockDb.createPerson({
                name: `Person ${i + 1}`
              });
              teamMembers.push(person);
            }
            const teamMemberIds = teamMembers.map(p => p.id);
            
            // Setup: Create current practice
            const currentPractice = await mockDb.createPractice({
              name: 'Current Practice'
            });
            const currentVersion = await mockDb.createPracticeVersion({
              practiceId: currentPractice.id
            });
            
            const currentRec = await mockDb.createRecommendation({
              practiceVersionId: currentVersion.id
            });
            
            // Link current practice to its goals
            for (const goal of currentGoals) {
              await mockDb.linkRecommendationToGoal(currentRec.id, goal.id);
            }
            
            // Setup: Create alternatives with different goals
            for (let i = 0; i < altCount; i++) {
              const altPractice = await mockDb.createPractice({
                name: `Alternative ${i + 1}`
              });
              const altVersion = await mockDb.createPracticeVersion({
                practiceId: altPractice.id
              });
              
              const altRec = await mockDb.createRecommendation({
                practiceVersionId: altVersion.id
              });
              
              // Link to different goals (no overlap)
              for (const goal of altGoals) {
                await mockDb.linkRecommendationToGoal(altRec.id, goal.id);
              }
            }
            
            // Test: Get alternatives
            const recommendations = await RecommendationService.findAlternativePractices(
              currentVersion.id,
              teamMemberIds,
              10
            );
            
            // Verify: Should return empty array when no shared objectives
            expect(Array.isArray(recommendations)).toBe(true);
            expect(recommendations.length).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});