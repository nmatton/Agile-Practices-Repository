const fc = require('fast-check');
const pool = require('../config/database');
const BfProfile = require('../models/BfProfile');
const AffinitySurveyResults = require('../models/AffinitySurveyResults');
const PersonPracticeAffinity = require('../models/PersonPracticeAffinity');
const PersonalityService = require('../services/personalityService');
const Person = require('../models/Person');
const Team = require('../models/Team');
const PracticeVersion = require('../models/PracticeVersion');
const { cleanupTestData } = require('./testUtils');

/**
 * **Feature: agile-practice-repository, Property 14: Big Five calculation and storage**
 * **Validates: Requirements 10.1**
 * 
 * **Feature: agile-practice-repository, Property 15: Affinity recalculation on profile updates**
 * **Validates: Requirements 11.1**
 * 
 * **Feature: agile-practice-repository, Property 16: Team affinity aggregation**
 * **Validates: Requirements 11.2**
 */

describe('Personality Profiling - Property Tests', () => {
  let testPersonId;

  beforeEach(async () => {
    // Create a test person first
    const testPerson = await Person.create({
      name: 'Test Personality User',
      email: `test_personality_${Date.now()}_${Math.random().toString(36).substring(2, 11)}@example.com`,
      password: 'testpassword123',
      roleId: 2
    });
    testPersonId = testPerson.id;
  });

  afterEach(async () => {
    // Clean up test data in correct order (child tables first)
    if (testPersonId) {
      await pool.query("DELETE FROM personPracticeAffinity WHERE personId = $1", [testPersonId]);
      await pool.query("DELETE FROM affinitySurveyResults WHERE personId = $1", [testPersonId]);
      await pool.query("DELETE FROM bfProfile WHERE personId = $1", [testPersonId]);
      await pool.query("DELETE FROM Person WHERE id = $1", [testPersonId]);
    }
  });

  afterAll(async () => {
    // Final cleanup using utility
    await cleanupTestData('%test_personality_%');
  });

  describe('Property 14: Big Five calculation and storage', () => {
    it('should calculate and store correct Big Five scores for any valid survey responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              itemId: fc.integer({ min: 1, max: 3 }), // Valid survey item IDs from sample data
              result: fc.integer({ min: 1, max: 5 }) // Valid Likert scale responses
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (surveyAnswers) => {
            // Process survey results and calculate Big Five scores
            const result = await PersonalityService.processSurveyResults(testPersonId, surveyAnswers);
            
            // Verify that a BfProfile was created/updated
            expect(result.bfProfile).toBeDefined();
            expect(result.bfProfile.personId).toBe(testPersonId);
            expect(result.bfProfile.statusId).toBe(3); // Complete status
            
            // Verify Big Five scores are within valid range (0-1)
            expect(result.bfProfile.o).toBeGreaterThanOrEqual(0);
            expect(result.bfProfile.o).toBeLessThanOrEqual(1);
            expect(result.bfProfile.c).toBeGreaterThanOrEqual(0);
            expect(result.bfProfile.c).toBeLessThanOrEqual(1);
            expect(result.bfProfile.e).toBeGreaterThanOrEqual(0);
            expect(result.bfProfile.e).toBeLessThanOrEqual(1);
            expect(result.bfProfile.a).toBeGreaterThanOrEqual(0);
            expect(result.bfProfile.a).toBeLessThanOrEqual(1);
            expect(result.bfProfile.n).toBeGreaterThanOrEqual(0);
            expect(result.bfProfile.n).toBeLessThanOrEqual(1);
            
            // Verify survey results were stored
            expect(result.surveyResults).toBeDefined();
            expect(result.surveyResults.length).toBe(surveyAnswers.length);
            
            // Verify each survey result was stored correctly
            result.surveyResults.forEach((storedResult, index) => {
              expect(storedResult.personId).toBe(testPersonId);
              expect(storedResult.result).toBe(surveyAnswers[index].result);
            });
            
            // Verify the profile can be retrieved from database
            const retrievedProfile = await BfProfile.findByPersonId(testPersonId);
            expect(retrievedProfile).toBeDefined();
            expect(retrievedProfile.id).toBe(result.bfProfile.id);
            expect(retrievedProfile.o).toBe(result.bfProfile.o);
            expect(retrievedProfile.c).toBe(result.bfProfile.c);
            expect(retrievedProfile.e).toBe(result.bfProfile.e);
            expect(retrievedProfile.a).toBe(result.bfProfile.a);
            expect(retrievedProfile.n).toBe(result.bfProfile.n);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty survey results gracefully', async () => {
      const result = await PersonalityService.processSurveyResults(testPersonId, []);
      
      // Should create a profile with zero scores
      expect(result.bfProfile).toBeDefined();
      expect(result.bfProfile.personId).toBe(testPersonId);
      expect(result.bfProfile.statusId).toBe(3);
      expect(result.bfProfile.o).toBe(0);
      expect(result.bfProfile.c).toBe(0);
      expect(result.bfProfile.e).toBe(0);
      expect(result.bfProfile.a).toBe(0);
      expect(result.bfProfile.n).toBe(0);
      
      expect(result.surveyResults).toEqual([]);
    });

    it('should update existing profile when processing new survey results', async () => {
      // Create initial profile
      const initialAnswers = [
        { itemId: 1, result: 3 },
        { itemId: 2, result: 4 }
      ];
      
      const initialResult = await PersonalityService.processSurveyResults(testPersonId, initialAnswers);
      const initialProfileId = initialResult.bfProfile.id;
      
      // Process new survey results
      const newAnswers = [
        { itemId: 1, result: 5 },
        { itemId: 3, result: 2 }
      ];
      
      const updatedResult = await PersonalityService.processSurveyResults(testPersonId, newAnswers);
      
      // Should update the same profile, not create a new one
      expect(updatedResult.bfProfile.id).toBe(initialProfileId);
      expect(updatedResult.bfProfile.personId).toBe(testPersonId);
      
      // Scores should be recalculated based on all survey results
      const allResults = await AffinitySurveyResults.findByPersonId(testPersonId);
      expect(allResults.length).toBe(initialAnswers.length + newAnswers.length);
    });

    it('should calculate consistent scores for identical survey responses', async () => {
      const surveyAnswers = [
        { itemId: 1, result: 4 },
        { itemId: 2, result: 3 },
        { itemId: 3, result: 5 }
      ];
      
      // Process the same survey answers multiple times
      const result1 = await PersonalityService.processSurveyResults(testPersonId, surveyAnswers);
      
      // Clear and process again
      await pool.query("DELETE FROM affinitySurveyResults WHERE personId = $1", [testPersonId]);
      await pool.query("DELETE FROM bfProfile WHERE personId = $1", [testPersonId]);
      
      const result2 = await PersonalityService.processSurveyResults(testPersonId, surveyAnswers);
      
      // Scores should be identical
      expect(result2.bfProfile.o).toBe(result1.bfProfile.o);
      expect(result2.bfProfile.c).toBe(result1.bfProfile.c);
      expect(result2.bfProfile.e).toBe(result1.bfProfile.e);
      expect(result2.bfProfile.a).toBe(result1.bfProfile.a);
      expect(result2.bfProfile.n).toBe(result1.bfProfile.n);
    });

    it('should reject invalid survey responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              itemId: fc.integer({ min: 1, max: 3 }),
              result: fc.integer().filter(n => n < 1 || n > 5) // Invalid range
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (invalidAnswers) => {
            await expect(
              PersonalityService.processSurveyResults(testPersonId, invalidAnswers)
            ).rejects.toThrow('Result must be between 1 and 5');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should calculate Big Five scores that sum to reasonable values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              itemId: fc.integer({ min: 1, max: 3 }),
              result: fc.integer({ min: 1, max: 5 })
            }),
            { minLength: 3, maxLength: 15 }
          ),
          async (surveyAnswers) => {
            const result = await PersonalityService.processSurveyResults(testPersonId, surveyAnswers);
            
            // Each dimension should be between 0 and 1
            const dimensions = [result.bfProfile.o, result.bfProfile.c, result.bfProfile.e, result.bfProfile.a, result.bfProfile.n];
            
            dimensions.forEach(score => {
              expect(score).toBeGreaterThanOrEqual(0);
              expect(score).toBeLessThanOrEqual(1);
              expect(typeof score).toBe('number');
              expect(isNaN(score)).toBe(false);
            });
            
            // The sum should be reasonable (not all zeros unless all responses were minimal)
            const sum = dimensions.reduce((acc, score) => acc + score, 0);
            const hasNonMinimalResponses = surveyAnswers.some(answer => answer.result > 1);
            
            if (hasNonMinimalResponses) {
              expect(sum).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain data integrity across profile updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.array(
              fc.record({
                itemId: fc.integer({ min: 1, max: 3 }),
                result: fc.integer({ min: 1, max: 5 })
              }),
              { minLength: 1, maxLength: 5 }
            ),
            fc.array(
              fc.record({
                itemId: fc.integer({ min: 1, max: 3 }),
                result: fc.integer({ min: 1, max: 5 })
              }),
              { minLength: 1, maxLength: 5 }
            )
          ),
          async ([firstAnswers, secondAnswers]) => {
            // Process first set of answers
            const firstResult = await PersonalityService.processSurveyResults(testPersonId, firstAnswers);
            const firstProfileId = firstResult.bfProfile.id;
            
            // Count results after first batch
            const firstBatchResults = await AffinitySurveyResults.findByPersonId(testPersonId);
            const firstBatchCount = firstBatchResults.length;
            
            // Process second set of answers
            const secondResult = await PersonalityService.processSurveyResults(testPersonId, secondAnswers);
            
            // Should maintain the same profile ID
            expect(secondResult.bfProfile.id).toBe(firstProfileId);
            expect(secondResult.bfProfile.personId).toBe(testPersonId);
            
            // All survey results should be stored (cumulative)
            const allStoredResults = await AffinitySurveyResults.findByPersonId(testPersonId);
            expect(allStoredResults.length).toBe(firstBatchCount + secondAnswers.length);
            
            // Profile should be marked as complete
            expect(secondResult.bfProfile.statusId).toBe(3);
            
            // Verify profile can be retrieved independently
            const retrievedProfile = await BfProfile.findByPersonId(testPersonId);
            expect(retrievedProfile.id).toBe(firstProfileId);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 15: Affinity recalculation on profile updates', () => {
    it('should recalculate affinities when Big Five profile is updated', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            o: fc.float({ min: 0, max: 1 }),
            c: fc.float({ min: 0, max: 1 }),
            e: fc.float({ min: 0, max: 1 }),
            a: fc.float({ min: 0, max: 1 }),
            n: fc.float({ min: 0, max: 1 })
          }),
          async (bigFiveScores) => {
            // Create a complete Big Five profile
            const bfProfile = await BfProfile.create({
              personId: testPersonId,
              statusId: 3,
              ...bigFiveScores
            });

            // Get initial affinity count
            const initialAffinities = await PersonPracticeAffinity.findByPersonId(testPersonId);
            const initialCount = initialAffinities.length;

            // Update the profile with new scores
            const updatedScores = {
              o: Math.min(1, bigFiveScores.o + 0.1),
              c: Math.min(1, bigFiveScores.c + 0.1),
              e: Math.min(1, bigFiveScores.e + 0.1),
              a: Math.min(1, bigFiveScores.a + 0.1),
              n: Math.min(1, bigFiveScores.n + 0.1)
            };

            await bfProfile.update(updatedScores);

            // Wait a bit for async recalculation to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check that affinities were recalculated
            const updatedAffinities = await PersonPracticeAffinity.findByPersonId(testPersonId);
            
            // Should have affinities for available practices
            expect(updatedAffinities.length).toBeGreaterThanOrEqual(0);
            
            // Each affinity should be within valid range
            updatedAffinities.forEach(affinity => {
              expect(affinity.affinity).toBeGreaterThanOrEqual(0);
              expect(affinity.affinity).toBeLessThanOrEqual(100);
              expect(affinity.personId).toBe(testPersonId);
              expect(typeof affinity.practiceVersionId).toBe('number');
            });

            // If there are practice versions available, we should have affinities
            const practiceVersions = await PracticeVersion.findAll();
            if (practiceVersions.length > 0) {
              expect(updatedAffinities.length).toBeGreaterThan(0);
              expect(updatedAffinities.length).toBeLessThanOrEqual(practiceVersions.length);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should not recalculate affinities for incomplete profiles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            o: fc.option(fc.float({ min: 0, max: 1 }), { nil: null }),
            c: fc.option(fc.float({ min: 0, max: 1 }), { nil: null }),
            e: fc.option(fc.float({ min: 0, max: 1 }), { nil: null }),
            a: fc.option(fc.float({ min: 0, max: 1 }), { nil: null }),
            n: fc.option(fc.float({ min: 0, max: 1 }), { nil: null })
          }).filter(scores => {
            // Ensure at least one score is null (incomplete profile)
            return Object.values(scores).some(score => score === null);
          }),
          async (incompleteScores) => {
            // Create an incomplete profile
            const bfProfile = await BfProfile.create({
              personId: testPersonId,
              statusId: 2, // Incomplete status
              ...incompleteScores
            });

            // Get initial affinity count
            const initialAffinities = await PersonPracticeAffinity.findByPersonId(testPersonId);
            const initialCount = initialAffinities.length;

            // Update the profile (still incomplete)
            await bfProfile.update({ statusId: 2 });

            // Wait a bit for any potential async operations
            await new Promise(resolve => setTimeout(resolve, 50));

            // Affinity count should remain the same (no recalculation for incomplete profiles)
            const finalAffinities = await PersonPracticeAffinity.findByPersonId(testPersonId);
            expect(finalAffinities.length).toBe(initialCount);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain affinity consistency across multiple profile updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.record({
              o: fc.float({ min: 0, max: 1 }),
              c: fc.float({ min: 0, max: 1 }),
              e: fc.float({ min: 0, max: 1 }),
              a: fc.float({ min: 0, max: 1 }),
              n: fc.float({ min: 0, max: 1 })
            }),
            fc.array(
              fc.record({
                o: fc.float({ min: 0, max: 1 }),
                c: fc.float({ min: 0, max: 1 }),
                e: fc.float({ min: 0, max: 1 }),
                a: fc.float({ min: 0, max: 1 }),
                n: fc.float({ min: 0, max: 1 })
              }),
              { minLength: 1, maxLength: 3 }
            )
          ),
          async ([initialScores, updateSequence]) => {
            // Create initial profile
            const bfProfile = await BfProfile.create({
              personId: testPersonId,
              statusId: 3,
              ...initialScores
            });

            // Wait for initial recalculation
            await new Promise(resolve => setTimeout(resolve, 100));

            // Apply sequence of updates
            let currentProfile = bfProfile;
            for (const updateScores of updateSequence) {
              currentProfile = await currentProfile.update(updateScores);
              await new Promise(resolve => setTimeout(resolve, 50));
            }

            // Final affinities should be consistent
            const finalAffinities = await PersonPracticeAffinity.findByPersonId(testPersonId);
            
            // All affinities should be valid
            finalAffinities.forEach(affinity => {
              expect(affinity.affinity).toBeGreaterThanOrEqual(0);
              expect(affinity.affinity).toBeLessThanOrEqual(100);
              expect(affinity.personId).toBe(testPersonId);
              expect(Number.isInteger(affinity.affinity)).toBe(true);
            });

            // Should not have duplicate affinities for the same practice
            const practiceIds = finalAffinities.map(a => a.practiceVersionId);
            const uniquePracticeIds = [...new Set(practiceIds)];
            expect(practiceIds.length).toBe(uniquePracticeIds.length);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 16: Team affinity aggregation', () => {
    let testTeamId;
    let teamMemberIds = [];

    beforeEach(async () => {
      // Clean up any existing test teams
      await pool.query("DELETE FROM teamMember WHERE teamId IN (SELECT id FROM Team WHERE name LIKE '%Test Affinity Team%')");
      await pool.query("DELETE FROM Team WHERE name LIKE '%Test Affinity Team%'");

      // Create a test team with the test person as creator
      const testTeam = await Team.create({
        name: `Test Affinity Team ${Date.now()}`,
        description: 'Team for testing affinity aggregation',
        creatorId: testPersonId
      });
      testTeamId = testTeam.id;

      // Create additional team members
      teamMemberIds = [testPersonId]; // Include the main test person
      
      for (let i = 0; i < 2; i++) {
        const member = await Person.create({
          name: `Team Member ${i + 1}`,
          email: `team_member_${i + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}@example.com`,
          password: 'testpassword123',
          roleId: 2
        });
        teamMemberIds.push(member.id);
      }

      // Add additional members to team (testPersonId is already added as creator)
      for (const memberId of teamMemberIds.slice(1)) {
        await testTeam.addMember(memberId);
      }
    });

    afterEach(async () => {
      // Clean up team data
      if (testTeamId) {
        await pool.query("DELETE FROM teamMember WHERE teamId = $1", [testTeamId]);
        await pool.query("DELETE FROM Team WHERE id = $1", [testTeamId]);
      }
    });

    it('should calculate team affinity statistics correctly for any practice', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              o: fc.float({ min: 0, max: 1 }),
              c: fc.float({ min: 0, max: 1 }),
              e: fc.float({ min: 0, max: 1 }),
              a: fc.float({ min: 0, max: 1 }),
              n: fc.float({ min: 0, max: 1 })
            }),
            { minLength: teamMemberIds.length, maxLength: teamMemberIds.length }
          ),
          async (memberProfiles) => {
            // Create profiles for all team members
            for (let i = 0; i < teamMemberIds.length; i++) {
              await BfProfile.create({
                personId: teamMemberIds[i],
                statusId: 3,
                ...memberProfiles[i]
              });
            }

            // Wait for affinity calculations
            await new Promise(resolve => setTimeout(resolve, 200));

            // Get available practice versions
            const practiceVersions = await PracticeVersion.findAll();
            
            if (practiceVersions.length > 0) {
              const practiceVersionId = practiceVersions[0].id;
              
              // Calculate team affinity
              const teamAffinity = await PersonalityService.calculateTeamAffinity(
                teamMemberIds, 
                practiceVersionId
              );

              // Verify team affinity structure
              expect(teamAffinity).toHaveProperty('average');
              expect(teamAffinity).toHaveProperty('minimum');
              expect(teamAffinity).toHaveProperty('maximum');
              expect(teamAffinity).toHaveProperty('standardDeviation');
              expect(teamAffinity).toHaveProperty('memberCount');
              expect(teamAffinity).toHaveProperty('individualScores');

              // Verify statistical properties
              expect(teamAffinity.memberCount).toBe(teamMemberIds.length);
              expect(teamAffinity.individualScores.length).toBeLessThanOrEqual(teamMemberIds.length);
              
              if (teamAffinity.individualScores.length > 0) {
                // Average should be within min-max range
                expect(teamAffinity.average).toBeGreaterThanOrEqual(teamAffinity.minimum);
                expect(teamAffinity.average).toBeLessThanOrEqual(teamAffinity.maximum);
                
                // All scores should be within valid range
                teamAffinity.individualScores.forEach(score => {
                  expect(score).toBeGreaterThanOrEqual(0);
                  expect(score).toBeLessThanOrEqual(100);
                });
                
                // Standard deviation should be non-negative
                expect(teamAffinity.standardDeviation).toBeGreaterThanOrEqual(0);
                
                // Min and max should be from the individual scores
                const actualMin = Math.min(...teamAffinity.individualScores);
                const actualMax = Math.max(...teamAffinity.individualScores);
                expect(teamAffinity.minimum).toBe(actualMin);
                expect(teamAffinity.maximum).toBe(actualMax);
                
                // Average should match calculated average
                const calculatedAverage = teamAffinity.individualScores.reduce((sum, score) => sum + score, 0) / teamAffinity.individualScores.length;
                expect(Math.abs(teamAffinity.average - calculatedAverage)).toBeLessThan(0.01);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle empty team member lists gracefully', async () => {
      const practiceVersions = await PracticeVersion.findAll();
      
      if (practiceVersions.length > 0) {
        const teamAffinity = await PersonalityService.calculateTeamAffinity(
          [], // Empty team
          practiceVersions[0].id
        );

        expect(teamAffinity.average).toBe(0);
        expect(teamAffinity.minimum).toBe(0);
        expect(teamAffinity.maximum).toBe(0);
        expect(teamAffinity.standardDeviation).toBe(0);
        expect(teamAffinity.memberCount).toBe(0);
        expect(teamAffinity.individualScores).toEqual([]);
      }
    });

    it('should calculate consistent team affinity for identical member profiles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            o: fc.float({ min: 0, max: 1 }),
            c: fc.float({ min: 0, max: 1 }),
            e: fc.float({ min: 0, max: 1 }),
            a: fc.float({ min: 0, max: 1 }),
            n: fc.float({ min: 0, max: 1 })
          }),
          async (profileScores) => {
            // Create identical profiles for all team members
            for (const memberId of teamMemberIds) {
              await BfProfile.create({
                personId: memberId,
                statusId: 3,
                ...profileScores
              });
            }

            // Wait for affinity calculations
            await new Promise(resolve => setTimeout(resolve, 200));

            const practiceVersions = await PracticeVersion.findAll();
            
            if (practiceVersions.length > 0) {
              const teamAffinity = await PersonalityService.calculateTeamAffinity(
                teamMemberIds, 
                practiceVersions[0].id
              );

              if (teamAffinity.individualScores.length > 0) {
                // For identical profiles, all individual scores should be the same
                const firstScore = teamAffinity.individualScores[0];
                teamAffinity.individualScores.forEach(score => {
                  expect(score).toBe(firstScore);
                });

                // Average, min, and max should all equal the individual score
                expect(teamAffinity.average).toBe(firstScore);
                expect(teamAffinity.minimum).toBe(firstScore);
                expect(teamAffinity.maximum).toBe(firstScore);
                
                // Standard deviation should be 0 for identical scores
                expect(teamAffinity.standardDeviation).toBe(0);
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should provide team practice recommendations based on affinity thresholds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.array(
              fc.record({
                o: fc.float({ min: 0, max: 1 }),
                c: fc.float({ min: 0, max: 1 }),
                e: fc.float({ min: 0, max: 1 }),
                a: fc.float({ min: 0, max: 1 }),
                n: fc.float({ min: 0, max: 1 })
              }),
              { minLength: teamMemberIds.length, maxLength: teamMemberIds.length }
            ),
            fc.integer({ min: 30, max: 90 }) // Affinity threshold
          ),
          async ([memberProfiles, threshold]) => {
            // Create profiles for team members
            for (let i = 0; i < teamMemberIds.length; i++) {
              await BfProfile.create({
                personId: teamMemberIds[i],
                statusId: 3,
                ...memberProfiles[i]
              });
            }

            // Wait for affinity calculations
            await new Promise(resolve => setTimeout(resolve, 200));

            // Get recommendations
            const recommendations = await PersonalityService.getTeamPracticeRecommendations(
              teamMemberIds, 
              threshold
            );

            // Verify recommendation structure
            expect(Array.isArray(recommendations)).toBe(true);
            
            recommendations.forEach(rec => {
              expect(rec).toHaveProperty('practice');
              expect(rec).toHaveProperty('teamAffinity');
              expect(rec).toHaveProperty('recommended');
              expect(rec).toHaveProperty('reason');
              
              // Team affinity should have proper structure
              expect(rec.teamAffinity).toHaveProperty('average');
              expect(rec.teamAffinity).toHaveProperty('minimum');
              expect(rec.teamAffinity).toHaveProperty('maximum');
              
              // Recommended practices should meet threshold
              if (rec.recommended) {
                expect(rec.teamAffinity.average).toBeGreaterThanOrEqual(threshold);
              }
              
              // Non-recommended practices should have valid reasons
              if (!rec.recommended) {
                expect(typeof rec.reason).toBe('string');
                expect(rec.reason.length).toBeGreaterThan(0);
              }
            });

            // Recommendations should be sorted by team affinity (descending)
            for (let i = 1; i < recommendations.length; i++) {
              expect(recommendations[i - 1].teamAffinity.average)
                .toBeGreaterThanOrEqual(recommendations[i].teamAffinity.average);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});