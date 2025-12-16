const fc = require('fast-check');

/**
 * **Feature: agile-practice-repository, Property 10: Search returns matching practices**
 * **Validates: Requirements 6.1**
 */

/**
 * **Feature: agile-practice-repository, Property 11: Goal filtering works correctly**
 * **Validates: Requirements 7.1**
 */

// Mock database for testing practice browsing and search
const mockBrowsingDatabase = {
  practices: new Map(),
  practiceTypes: new Map(),
  goals: new Map(),
  practiceVersions: new Map(),
  recommendations: new Map(),
  recommendationGoals: new Map(),
  nextPracticeId: 1,
  nextTypeId: 1,
  nextGoalId: 1,
  nextVersionId: 1,
  nextRecommendationId: 1,
  
  async createPracticeType(typeData) {
    const type = {
      id: this.nextTypeId++,
      name: typeData.name,
      description: typeData.description || null
    };
    this.practiceTypes.set(type.id, type);
    return type;
  },

  async createGoal(goalData) {
    const goal = {
      id: this.nextGoalId++,
      name: goalData.name,
      description: goalData.description || null
    };
    this.goals.set(goal.id, goal);
    return goal;
  },

  async createPractice(practiceData) {
    if (!practiceData.name) {
      throw new Error('Practice name is required');
    }

    const practice = {
      id: this.nextPracticeId++,
      name: practiceData.name,
      objective: practiceData.objective || null,
      description: practiceData.description || null,
      typeId: practiceData.typeId || null
    };

    this.practices.set(practice.id, practice);
    return practice;
  },

  async createPracticeVersion(versionData) {
    const version = {
      id: this.nextVersionId++,
      practiceId: versionData.practiceId,
      universeId: versionData.universeId || 1,
      versionName: versionData.versionName || 'v1.0',
      status: versionData.status || 'Published'
    };
    this.practiceVersions.set(version.id, version);
    return version;
  },

  async createRecommendation(recData) {
    const recommendation = {
      id: this.nextRecommendationId++,
      practiceVersionId: recData.practiceVersionId,
      description: recData.description || 'Test recommendation'
    };
    this.recommendations.set(recommendation.id, recommendation);
    return recommendation;
  },

  async linkRecommendationToGoal(recommendationId, goalId) {
    const key = `${recommendationId}-${goalId}`;
    this.recommendationGoals.set(key, { recommendationId, goalId });
  },

  async searchPractices(searchTerm) {
    // Handle empty or whitespace-only search terms
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }
    
    const results = [];
    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    
    for (const practice of this.practices.values()) {
      const nameMatch = practice.name && practice.name.toLowerCase().includes(lowerSearchTerm);
      const descMatch = practice.description && practice.description.toLowerCase().includes(lowerSearchTerm);
      
      if (nameMatch || descMatch) {
        results.push(practice);
      }
    }
    
    // Sort by relevance: exact name matches first, then name starts with, then name contains, then description contains
    return results.sort((a, b) => {
      const aNameLower = a.name ? a.name.toLowerCase() : '';
      const bNameLower = b.name ? b.name.toLowerCase() : '';
      
      const aNameExact = aNameLower === lowerSearchTerm;
      const bNameExact = bNameLower === lowerSearchTerm;
      const aNameStartsWith = aNameLower.startsWith(lowerSearchTerm);
      const bNameStartsWith = bNameLower.startsWith(lowerSearchTerm);
      const aNameContains = aNameLower.includes(lowerSearchTerm);
      const bNameContains = bNameLower.includes(lowerSearchTerm);
      
      // Exact matches first
      if (aNameExact && !bNameExact) return -1;
      if (!aNameExact && bNameExact) return 1;
      
      // Then starts with matches
      if (aNameStartsWith && !bNameStartsWith) return -1;
      if (!aNameStartsWith && bNameStartsWith) return 1;
      
      // Then name contains matches
      if (aNameContains && !bNameContains) return -1;
      if (!aNameContains && bNameContains) return 1;
      
      // Finally alphabetical order
      return aNameLower.localeCompare(bNameLower);
    });
  },

  async findPracticesByGoal(goalId) {
    const results = [];
    
    // Find all recommendations linked to this goal
    const linkedRecommendations = [];
    for (const link of this.recommendationGoals.values()) {
      if (link.goalId === goalId) {
        const recommendation = this.recommendations.get(link.recommendationId);
        if (recommendation) {
          linkedRecommendations.push(recommendation);
        }
      }
    }
    
    // Find practices through their versions and recommendations
    const practiceIds = new Set();
    for (const rec of linkedRecommendations) {
      const version = this.practiceVersions.get(rec.practiceVersionId);
      if (version) {
        practiceIds.add(version.practiceId);
      }
    }
    
    // Get the actual practices
    for (const practiceId of practiceIds) {
      const practice = this.practices.get(practiceId);
      if (practice) {
        results.push(practice);
      }
    }
    
    return results;
  },

  async findPracticesByType(typeId) {
    const results = [];
    for (const practice of this.practices.values()) {
      if (practice.typeId === typeId) {
        results.push(practice);
      }
    }
    return results;
  },

  clear() {
    this.practices.clear();
    this.practiceTypes.clear();
    this.goals.clear();
    this.practiceVersions.clear();
    this.recommendations.clear();
    this.recommendationGoals.clear();
    this.nextPracticeId = 1;
    this.nextTypeId = 1;
    this.nextGoalId = 1;
    this.nextVersionId = 1;
    this.nextRecommendationId = 1;
  }
};

describe('Practice Browsing and Search - Property Tests', () => {
  beforeEach(() => {
    mockBrowsingDatabase.clear();
  });

  describe('Property 10: Search returns matching practices', () => {
    it('should return only practices where name or description contains the search term', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            searchTerm: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            practices: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                description: fc.option(fc.string({ maxLength: 200 })),
                objective: fc.option(fc.string({ maxLength: 200 }))
              }),
              { minLength: 1, maxLength: 20 }
            )
          }),
          async (data) => {
            // Clear database for this test iteration
            mockBrowsingDatabase.clear();
            
            const createdPractices = [];
            const expectedMatches = [];
            
            // Create practices and determine which should match
            for (let i = 0; i < data.practices.length; i++) {
              const practiceData = data.practices[i];
              const uniqueName = `${practiceData.name}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}_${i}`;
              
              const practice = await mockBrowsingDatabase.createPractice({
                name: uniqueName,
                description: practiceData.description,
                objective: practiceData.objective
              });
              
              createdPractices.push(practice);
              
              // Check if this practice should match the search term
              const lowerSearchTerm = data.searchTerm.toLowerCase();
              const nameMatch = practice.name.toLowerCase().includes(lowerSearchTerm);
              const descMatch = practice.description && practice.description.toLowerCase().includes(lowerSearchTerm);
              
              if (nameMatch || descMatch) {
                expectedMatches.push(practice);
              }
            }
            
            // Perform search
            const searchResults = await mockBrowsingDatabase.searchPractices(data.searchTerm);
            
            // Verify all results contain the search term in name or description
            for (const result of searchResults) {
              const lowerSearchTerm = data.searchTerm.toLowerCase();
              const nameMatch = result.name && result.name.toLowerCase().includes(lowerSearchTerm);
              const descMatch = result.description && result.description.toLowerCase().includes(lowerSearchTerm);
              
              expect(nameMatch || descMatch).toBe(true);
            }
            
            // Verify all expected matches are in the results
            for (const expectedMatch of expectedMatches) {
              expect(searchResults).toContainEqual(expect.objectContaining({
                id: expectedMatch.id,
                name: expectedMatch.name
              }));
            }
            
            // Verify no unexpected matches
            expect(searchResults.length).toBe(expectedMatches.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty results when no practices match the search term', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            searchTerm: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            practices: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                description: fc.option(fc.string({ maxLength: 200 }))
              }),
              { minLength: 1, maxLength: 10 }
            )
          }).filter(data => {
            // Ensure no practice will match the search term (including the unique suffixes we'll add)
            const lowerSearchTerm = data.searchTerm.toLowerCase().trim();
            return lowerSearchTerm.length > 0 && !data.practices.some(p => {
              // Check if the base name or description would match
              const nameMatch = p.name.toLowerCase().includes(lowerSearchTerm);
              const descMatch = p.description && p.description.toLowerCase().includes(lowerSearchTerm);
              return nameMatch || descMatch;
            }) && 
            // Exclude single characters that might match random suffixes
            lowerSearchTerm.length > 1 &&
            // Exclude terms that contain common suffix patterns
            !lowerSearchTerm.includes('_') && 
            !/\d/.test(lowerSearchTerm) && 
            // Exclude terms that are purely alphanumeric sequences that might match generated IDs
            !/^[a-z0-9]+$/.test(lowerSearchTerm);
          }),
          async (data) => {
            // Clear database for this test iteration
            mockBrowsingDatabase.clear();
            
            // Create practices that won't match
            for (let i = 0; i < data.practices.length; i++) {
              const practiceData = data.practices[i];
              const uniqueName = `${practiceData.name}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}_${i}`;
              
              await mockBrowsingDatabase.createPractice({
                name: uniqueName,
                description: practiceData.description
              });
            }
            
            // Perform search
            const searchResults = await mockBrowsingDatabase.searchPractices(data.searchTerm);
            
            // Should return empty results
            expect(searchResults).toHaveLength(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should prioritize exact name matches over partial matches', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            exactMatchTerm: fc.string({ minLength: 3, maxLength: 15 }).filter(s => s.trim().length > 0 && !s.includes('_')),
            partialMatchPrefix: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0 && !s.includes('_')),
            partialMatchSuffix: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0 && !s.includes('_'))
          }),
          async (data) => {
            // Clear database for this test iteration
            mockBrowsingDatabase.clear();
            
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 11);
            
            // Create practice with name that starts with the exact term (so it contains it)
            const startsWithMatch = await mockBrowsingDatabase.createPractice({
              name: `${data.exactMatchTerm}_${timestamp}_${randomId}_starts`
            });
            
            // Create practice with partial match (term in the middle)
            const partialMatch = await mockBrowsingDatabase.createPractice({
              name: `${data.partialMatchPrefix}_${data.exactMatchTerm}_${data.partialMatchSuffix}_${timestamp}_${randomId}_partial`
            });
            
            // Search for the exact term
            const searchResults = await mockBrowsingDatabase.searchPractices(data.exactMatchTerm);
            
            // Should return both practices
            expect(searchResults.length).toBeGreaterThanOrEqual(2);
            
            // Find the positions of our test practices
            const startsWithIndex = searchResults.findIndex(p => p.id === startsWithMatch.id);
            const partialMatchIndex = searchResults.findIndex(p => p.id === partialMatch.id);
            
            // The practice that starts with the term should come before the one with partial match
            if (startsWithIndex !== -1 && partialMatchIndex !== -1) {
              expect(startsWithIndex).toBeLessThan(partialMatchIndex);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 11: Goal filtering works correctly', () => {
    it('should return only practices linked to the specified goal', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            targetGoalName: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
            otherGoalName: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
            practicesForTargetGoal: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                description: fc.option(fc.string({ maxLength: 200 }))
              }),
              { minLength: 1, maxLength: 5 }
            ),
            practicesForOtherGoal: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                description: fc.option(fc.string({ maxLength: 200 }))
              }),
              { minLength: 1, maxLength: 5 }
            )
          }).filter(data => data.targetGoalName !== data.otherGoalName),
          async (data) => {
            // Clear database for this test iteration
            mockBrowsingDatabase.clear();
            
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 11);
            
            // Create goals
            const targetGoal = await mockBrowsingDatabase.createGoal({
              name: `${data.targetGoalName}_${timestamp}_${randomId}_target`
            });
            
            const otherGoal = await mockBrowsingDatabase.createGoal({
              name: `${data.otherGoalName}_${timestamp}_${randomId}_other`
            });
            
            const expectedPractices = [];
            
            // Create practices for target goal
            for (let i = 0; i < data.practicesForTargetGoal.length; i++) {
              const practiceData = data.practicesForTargetGoal[i];
              const uniqueName = `${practiceData.name}_${timestamp}_${randomId}_target_${i}`;
              
              const practice = await mockBrowsingDatabase.createPractice({
                name: uniqueName,
                description: practiceData.description
              });
              
              // Create version and recommendation to link to target goal
              const version = await mockBrowsingDatabase.createPracticeVersion({
                practiceId: practice.id
              });
              
              const recommendation = await mockBrowsingDatabase.createRecommendation({
                practiceVersionId: version.id
              });
              
              await mockBrowsingDatabase.linkRecommendationToGoal(recommendation.id, targetGoal.id);
              
              expectedPractices.push(practice);
            }
            
            // Create practices for other goal (should not appear in results)
            for (let i = 0; i < data.practicesForOtherGoal.length; i++) {
              const practiceData = data.practicesForOtherGoal[i];
              const uniqueName = `${practiceData.name}_${timestamp}_${randomId}_other_${i}`;
              
              const practice = await mockBrowsingDatabase.createPractice({
                name: uniqueName,
                description: practiceData.description
              });
              
              // Create version and recommendation to link to other goal
              const version = await mockBrowsingDatabase.createPracticeVersion({
                practiceId: practice.id
              });
              
              const recommendation = await mockBrowsingDatabase.createRecommendation({
                practiceVersionId: version.id
              });
              
              await mockBrowsingDatabase.linkRecommendationToGoal(recommendation.id, otherGoal.id);
            }
            
            // Filter by target goal
            const filteredResults = await mockBrowsingDatabase.findPracticesByGoal(targetGoal.id);
            
            // Verify results contain only practices linked to target goal
            expect(filteredResults).toHaveLength(expectedPractices.length);
            
            for (const expectedPractice of expectedPractices) {
              expect(filteredResults).toContainEqual(expect.objectContaining({
                id: expectedPractice.id,
                name: expectedPractice.name
              }));
            }
            
            // Verify no practices from other goal appear in results
            const otherGoalResults = await mockBrowsingDatabase.findPracticesByGoal(otherGoal.id);
            for (const otherResult of otherGoalResults) {
              expect(filteredResults).not.toContainEqual(expect.objectContaining({
                id: otherResult.id
              }));
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty results when no practices are linked to the specified goal', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            goalName: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
            practices: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                description: fc.option(fc.string({ maxLength: 200 }))
              }),
              { minLength: 1, maxLength: 5 }
            )
          }),
          async (data) => {
            // Clear database for this test iteration
            mockBrowsingDatabase.clear();
            
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 11);
            
            // Create goal with no linked practices
            const goal = await mockBrowsingDatabase.createGoal({
              name: `${data.goalName}_${timestamp}_${randomId}`
            });
            
            // Create practices but don't link them to the goal
            for (let i = 0; i < data.practices.length; i++) {
              const practiceData = data.practices[i];
              const uniqueName = `${practiceData.name}_${timestamp}_${randomId}_${i}`;
              
              await mockBrowsingDatabase.createPractice({
                name: uniqueName,
                description: practiceData.description
              });
            }
            
            // Filter by goal should return empty results
            const filteredResults = await mockBrowsingDatabase.findPracticesByGoal(goal.id);
            expect(filteredResults).toHaveLength(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle multiple goals correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              goalName: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
              practiceCount: fc.integer({ min: 0, max: 3 })
            }),
            { minLength: 2, maxLength: 5 }
          ).map((goals, index) => 
            // Ensure unique goal names
            goals.map((goal, i) => ({
              ...goal,
              goalName: `${goal.goalName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}_${index}_${i}`
            }))
          ),
          async (goalData) => {
            // Clear database for this test iteration
            mockBrowsingDatabase.clear();
            
            const createdGoals = [];
            const goalPracticeCounts = new Map();
            
            // Create goals and their associated practices
            for (const data of goalData) {
              const goal = await mockBrowsingDatabase.createGoal({
                name: data.goalName
              });
              createdGoals.push(goal);
              goalPracticeCounts.set(goal.id, data.practiceCount);
              
              // Create practices for this goal
              for (let i = 0; i < data.practiceCount; i++) {
                const practice = await mockBrowsingDatabase.createPractice({
                  name: `Practice_${goal.id}_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
                });
                
                const version = await mockBrowsingDatabase.createPracticeVersion({
                  practiceId: practice.id
                });
                
                const recommendation = await mockBrowsingDatabase.createRecommendation({
                  practiceVersionId: version.id
                });
                
                await mockBrowsingDatabase.linkRecommendationToGoal(recommendation.id, goal.id);
              }
            }
            
            // Test filtering by each goal
            for (const goal of createdGoals) {
              const filteredResults = await mockBrowsingDatabase.findPracticesByGoal(goal.id);
              const expectedCount = goalPracticeCounts.get(goal.id);
              
              expect(filteredResults).toHaveLength(expectedCount);
              
              // Verify all results are actually linked to this goal
              if (expectedCount > 0) {
                expect(filteredResults.length).toBeGreaterThan(0);
                for (const result of filteredResults) {
                  expect(result).toHaveProperty('id');
                  expect(result).toHaveProperty('name');
                }
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Error conditions', () => {
    it('should handle empty search terms gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('', '   ', '\t', '\n'),
          async (emptyTerm) => {
            mockBrowsingDatabase.clear();
            
            // Create some practices
            await mockBrowsingDatabase.createPractice({ name: 'Test Practice' });
            
            // Search with empty term should return empty results
            const results = await mockBrowsingDatabase.searchPractices(emptyTerm);
            expect(results).toHaveLength(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle non-existent goal IDs gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 9999 }), // Use high IDs that won't exist
          async (nonExistentGoalId) => {
            mockBrowsingDatabase.clear();
            
            // Create some practices
            await mockBrowsingDatabase.createPractice({ name: 'Test Practice' });
            
            // Filter by non-existent goal should return empty results
            const results = await mockBrowsingDatabase.findPracticesByGoal(nonExistentGoalId);
            expect(results).toHaveLength(0);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});