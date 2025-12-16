const fc = require('fast-check');
const pool = require('../config/database');
const BfProfile = require('../models/BfProfile');
const AffinitySurveyResults = require('../models/AffinitySurveyResults');
const PersonalityService = require('../services/personalityService');
const Person = require('../models/Person');

/**
 * **Feature: agile-practice-repository, Property 14: Big Five calculation and storage**
 * **Validates: Requirements 10.1**
 */

describe('Personality Profiling - Property Tests', () => {
  let testPersonId;

  beforeEach(async () => {
    // Clean up test data
    await pool.query("DELETE FROM personPracticeAffinity WHERE personId IN (SELECT id FROM Person WHERE email LIKE '%test_personality_%')");
    await pool.query("DELETE FROM affinitySurveyResults WHERE personId IN (SELECT id FROM Person WHERE email LIKE '%test_personality_%')");
    await pool.query("DELETE FROM bfProfile WHERE personId IN (SELECT id FROM Person WHERE email LIKE '%test_personality_%')");
    await pool.query("DELETE FROM Person WHERE email LIKE '%test_personality_%'");

    // Create a test person
    const testPerson = await Person.create({
      name: 'Test Personality User',
      email: `test_personality_${Date.now()}_${Math.random().toString(36).substring(2, 11)}@example.com`,
      password: 'testpassword123',
      roleId: 2
    });
    testPersonId = testPerson.id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query("DELETE FROM personPracticeAffinity WHERE personId IN (SELECT id FROM Person WHERE email LIKE '%test_personality_%')");
    await pool.query("DELETE FROM affinitySurveyResults WHERE personId IN (SELECT id FROM Person WHERE email LIKE '%test_personality_%')");
    await pool.query("DELETE FROM bfProfile WHERE personId IN (SELECT id FROM Person WHERE email LIKE '%test_personality_%')");
    await pool.query("DELETE FROM Person WHERE email LIKE '%test_personality_%'");
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
});